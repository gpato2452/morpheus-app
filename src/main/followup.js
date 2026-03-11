const LLMClient = require('./llm')

const SYSTEM_PROMPT = `You are a follow-up detector for a personal AI assistant.

Analyze the conversation and detect if there are any commitments, pending items, deadlines, or follow-up actions.

Respond ONLY with valid JSON:
{
  "detects_followup": true,
  "type": "email_reply|task_blocked|meeting_prep|commitment|deadline|none",
  "context": "brief description of what needs follow-up",
  "due_date": "ISO8601 date or null"
}

If no follow-up needed, return: {"detects_followup": false, "type": "none", "context": "", "due_date": null}

Respond ONLY with JSON. No markdown.`

async function detectFollowup(userMessage, agentResponse, settings) {
  const llm = new LLMClient(settings)

  const result = await llm.complete(
    [{
      role: 'user',
      content: `User said: "${userMessage}"\n\nAssistant responded: "${agentResponse}"\n\nDetect follow-up actions.`,
    }],
    { fast: true, systemPrompt: SYSTEM_PROMPT }
  )

  try {
    const text = result.content.trim()
    const jsonText = text.startsWith('{') ? text : text.match(/\{[\s\S]+\}/)?.[0] || '{}'
    return JSON.parse(jsonText)
  } catch {
    return { detects_followup: false, type: 'none', context: '', due_date: null }
  }
}

module.exports = { detectFollowup }
