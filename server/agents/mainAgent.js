const LLMClient = require('../llm')
const { v4: uuidv4 } = require('uuid')
const { getGmailTools, executeGmailTool } = require('../tools/gmail')
const { getCalendarTools, executeCalendarTool } = require('../tools/calendar')
const { getDriveTools, executeDriveTool } = require('../tools/drive')
const { getGHLTools, executeGHLTool, GHL_APPROVAL_REQUIRED } = require('../tools/ghl')

// Actions that require user approval before execution
const APPROVAL_REQUIRED = new Set([
  'gmail_send', 'gmail_reply', 'gmail_delete',
  'calendar_create', 'calendar_update', 'calendar_delete',
  'drive_delete',
  ...GHL_APPROVAL_REQUIRED,
])

const SYSTEM_PROMPT = `Eres Morpheus, un asistente ejecutivo personal de producción.

Actúas como un asistente real: razonas, planificas y ejecutas acciones en Google Workspace y GoHighLevel CRM.

REGLAS CRÍTICAS:
1. NUNCA ejecutes acciones irreversibles sin aprobación del usuario
2. Cuando necesites enviar email/SMS, crear/borrar eventos, crear contactos → prepara el plan y espera aprobación
3. Leer emails, ver calendario, buscar contactos en GHL → puedes hacerlo directamente
4. Máximo 3 acciones por request. Si necesitas más, consulta al usuario
5. Responde en el mismo idioma que el usuario
6. Si no puedes completar algo, dilo claramente

Tienes acceso a Gmail, Google Calendar, Google Drive y GoHighLevel CRM.`

async function runMainAgent(userMessage, settings, history = [], googleAuth = null) {
  const llm = new LLMClient(settings)

  // Build available tools
  const tools = []
  if (googleAuth) {
    tools.push(...getGmailTools())
    tools.push(...getCalendarTools())
    tools.push(...getDriveTools())
  }
  if (settings.ghl_api_key) {
    tools.push(...getGHLTools())
  }

  const messages = [
    ...history.slice(-15),
    { role: 'user', content: userMessage },
  ]

  let iterations = 0
  const MAX_ITER = 5

  while (iterations < MAX_ITER) {
    iterations++

    const result = await llm.complete(messages, {
      fast: false,
      systemPrompt: SYSTEM_PROMPT,
      tools: tools.length > 0 ? tools : null,
    })

    // No tool calls → final response
    if (!result.tool_calls || result.tool_calls.length === 0) {
      return { response: result.content, pendingAction: null }
    }

    // Process tool calls
    for (const toolCall of result.tool_calls) {
      const toolName = toolCall.function.name
      const toolArgs = JSON.parse(toolCall.function.arguments || '{}')

      // Requires approval?
      if (APPROVAL_REQUIRED.has(toolName)) {
        return {
          response: null,
          pendingAction: buildPendingAction(toolName, toolArgs, googleAuth),
        }
      }

      // Execute read-only tool
      let toolResult
      try {
        toolResult = await executeTool(toolName, toolArgs, googleAuth)
      } catch (err) {
        toolResult = { error: err.message }
      }

      // Add tool result to conversation
      messages.push({ role: 'assistant', content: result.content, tool_calls: result.tool_calls })
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult),
      })
    }
  }

  return { response: 'No pude completar la tarea en el número de pasos permitido.', pendingAction: null }
}

async function executeTool(name, args, googleAuth) {
  if (name.startsWith('gmail_')) return executeGmailTool(name, args, googleAuth)
  if (name.startsWith('calendar_')) return executeCalendarTool(name, args, googleAuth)
  if (name.startsWith('drive_')) return executeDriveTool(name, args, googleAuth)
  throw new Error(`Unknown tool: ${name}`)
}

function buildPendingAction(toolName, toolArgs, googleAuth) {
  const summaries = {
    gmail_send: `Enviar email a ${toolArgs.to} — "${toolArgs.subject}"`,
    gmail_reply: `Responder email — "${toolArgs.subject || 'sin asunto'}"`,
    gmail_delete: `Borrar email ID ${toolArgs.message_id}`,
    calendar_create: `Crear evento: "${toolArgs.summary}" el ${toolArgs.start}`,
    calendar_update: `Modificar evento ID ${toolArgs.event_id}`,
    calendar_delete: `Borrar evento ID ${toolArgs.event_id}`,
    drive_delete: `Borrar archivo ID ${toolArgs.file_id}`,
  }

  return {
    id: uuidv4(),
    tool: toolName,
    args: toolArgs,
    summary: summaries[toolName] || toolName,
    execute: async () => executeTool(toolName, toolArgs, googleAuth),
  }
}

module.exports = { runMainAgent }
