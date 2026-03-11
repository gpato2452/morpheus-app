const path = require('path')
const { app } = require('electron')
const fs = require('fs')

const settingsPath = path.join(app.getPath('userData'), 'settings.json')

const DEFAULTS = {
  llm_provider: 'openai',
  llm_model_complex: 'gpt-4o',
  llm_model_fast: 'gpt-4o-mini',
  api_key: '',
  google_authenticated: false,
  google_tokens: null,
  memory_enabled: true,
  memory_window: 20,
  language: 'es',
  user_name: '',
  timezone: 'America/Mexico_City',
}

function get() {
  try {
    const raw = fs.readFileSync(settingsPath, 'utf8')
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

function save(updates) {
  const current = get()
  const next = { ...current, ...updates }
  fs.writeFileSync(settingsPath, JSON.stringify(next, null, 2))
}

module.exports = { get, save }
