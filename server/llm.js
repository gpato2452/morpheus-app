/**
 * Multi-provider LLM client.
 * Supports: openai, anthropic, openrouter
 */

class LLMClient {
  constructor(settings) {
    this.provider = settings.llm_provider || 'openai'
    this.apiKey = settings.api_key
    this.modelFast = settings.llm_model_fast || 'gpt-4o-mini'
    this.modelComplex = settings.llm_model_complex || 'gpt-4o'
  }

  async complete(messages, { fast = false, tools = null, systemPrompt = null } = {}) {
    const model = fast ? this.modelFast : this.modelComplex
    const msgs = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages

    switch (this.provider) {
      case 'openai':
      case 'openrouter':
        return this._openai(msgs, model, tools)
      case 'anthropic':
        return this._anthropic(msgs, model, tools, systemPrompt)
      default:
        throw new Error(`Unknown provider: ${this.provider}`)
    }
  }

  async _openai(messages, model, tools) {
    const baseURL = this.provider === 'openrouter'
      ? 'https://openrouter.ai/api/v1'
      : 'https://api.openai.com/v1'

    const body = { model, messages }
    if (tools) body.tools = tools

    const res = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`LLM API error ${res.status}: ${err}`)
    }

    const data = await res.json()
    const choice = data.choices[0]

    return {
      content: choice.message.content || '',
      tool_calls: choice.message.tool_calls || [],
      finish_reason: choice.finish_reason,
    }
  }

  async _anthropic(messages, model, tools, systemPrompt) {
    const body = {
      model,
      max_tokens: 4096,
      messages: messages.filter(m => m.role !== 'system'),
    }
    if (systemPrompt) body.system = systemPrompt
    if (tools) {
      body.tools = tools.map(t => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters,
      }))
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Anthropic API error ${res.status}: ${err}`)
    }

    const data = await res.json()
    const textBlock = data.content.find(b => b.type === 'text')
    const toolBlocks = data.content.filter(b => b.type === 'tool_use')

    return {
      content: textBlock?.text || '',
      tool_calls: toolBlocks.map(b => ({
        id: b.id,
        type: 'function',
        function: { name: b.name, arguments: JSON.stringify(b.input) },
      })),
      finish_reason: data.stop_reason,
    }
  }
}

module.exports = LLMClient
