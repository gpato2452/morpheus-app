const LLMClient = require('./llm')

const SYSTEM_PROMPT = `You are an intent classifier for a personal AI executive assistant called Morpheus.

Classify the user message and respond ONLY with valid JSON matching this exact schema:
{
  "intent": "simple_response|email|calendar|task|document|research|followup|unknown",
  "action": "create|read|update|delete|search|respond",
  "confidence": 0.95,
  "priority": "urgent|high|normal|low",
  "language": "es|en"
}

Rules:
- simple_response: greetings, casual conversation, simple questions answerable without tools
- email: anything involving reading, drafting, sending, or replying to emails
- calendar: scheduling, checking availability, creating/modifying events
- task: creating or checking tasks, todos, reminders
- document: Google Docs, Google Drive, files
- research: web research, looking up information
- followup: follow-up reminders, pending items, commitments
- unknown: anything unclear, use confidence < 0.7

Respond ONLY with JSON. No markdown. No explanation.`

async function classify(userMessage, settings) {
  const llm = new LLMClient(settings)

  const result = await llm.complete(
    [{ role: 'user', content: userMessage }],
    { fast: true, systemPrompt: SYSTEM_PROMPT }
  )

  try {
    const text = result.content.trim()
    const jsonText = text.startsWith('{') ? text : text.match(/\{[\s\S]+\}/)?.[0] || '{}'
    return JSON.parse(jsonText)
  } catch {
    return {
      intent: 'unknown',
      action: 'respond',
      confidence: 0.5,
      priority: 'normal',
      language: 'es',
    }
  }
}

module.exports = { classify }
