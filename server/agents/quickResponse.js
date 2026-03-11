const LLMClient = require('../llm')

const SYSTEM_PROMPT = `Eres Morpheus, un asistente ejecutivo personal inteligente y directo.
Responde de forma concisa y útil. Habla en el mismo idioma que el usuario.
No tienes herramientas disponibles en este modo — solo responde con conocimiento general.
Sé natural, profesional y eficiente. Máximo 3 párrafos.`

async function quickResponse(userMessage, settings, history = []) {
  const llm = new LLMClient(settings)

  const messages = [
    ...history.slice(-10),
    { role: 'user', content: userMessage },
  ]

  const result = await llm.complete(messages, {
    fast: true,
    systemPrompt: SYSTEM_PROMPT,
  })

  return result.content
}

module.exports = { quickResponse }
