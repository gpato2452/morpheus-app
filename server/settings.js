const fs = require('fs')
const path = require('path')
const os = require('os')

const dataDir = path.join(os.homedir(), '.morpheus')
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
const settingsPath = path.join(dataDir, 'settings.json')

const DEFAULTS = {
  llm_provider: 'openai',
  llm_model_complex: 'gpt-4o',
  llm_model_fast: 'gpt-4o-mini',
  api_key: '',
  google_authenticated: false,
  google_tokens: null,
  google_client_id: '',
  google_client_secret: '',
  memory_enabled: true,
  memory_window: 20,
  language: 'es',
  user_name: '',
  timezone: 'America/Mexico_City',
  ghl_api_key: '',
  ghl_location_id: '',
}

function get() {
  try { return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(settingsPath, 'utf8')) } }
  catch { return { ...DEFAULTS } }
}

function save(updates) {
  const next = { ...get(), ...updates }
  fs.writeFileSync(settingsPath, JSON.stringify(next, null, 2))
}

module.exports = { get, save }
