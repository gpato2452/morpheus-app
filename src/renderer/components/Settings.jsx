import React, { useState, useEffect } from 'react'
import { api } from '../api'

const PROVIDERS = {
  openai: { label: 'OpenAI', models_complex: ['gpt-4o', 'gpt-4-turbo'], models_fast: ['gpt-4o-mini', 'gpt-3.5-turbo'] },
  anthropic: { label: 'Anthropic (Claude)', models_complex: ['claude-opus-4-6', 'claude-sonnet-4-6'], models_fast: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6'] },
  openrouter: { label: 'OpenRouter', models_complex: ['openai/gpt-4o', 'anthropic/claude-opus-4-6'], models_fast: ['openai/gpt-4o-mini', 'anthropic/claude-haiku-4-5'] },
}

export default function Settings({ settings, onSave }) {
  const [form, setForm] = useState(settings || {})
  const [saved, setSaved] = useState(false)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => { if (settings) setForm(settings) }, [settings])

  const update = (k, v) => { setForm(p => ({ ...p, [k]: v })); setSaved(false) }
  const provider = PROVIDERS[form.llm_provider] || PROVIDERS.openai

  function save() { onSave(form); setSaved(true); setTimeout(() => setSaved(false), 2000) }

  async function connectGoogle() {
    setConnecting(true)
    try {
      const res = await api.connectGoogle()
      if (res.ok) update('google_authenticated', true)
      else alert(`Error: ${res.error}`)
    } finally { setConnecting(false) }
  }

  return (
    <div className="settings">
      <h2>Settings</h2>

      <section className="settings-section">
        <h3>Modelo de IA</h3>
        <label>Proveedor</label>
        <select value={form.llm_provider || 'openai'} onChange={e => update('llm_provider', e.target.value)}>
          {Object.entries(PROVIDERS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <label>API Key</label>
        <input type="password" value={form.api_key || ''} onChange={e => update('api_key', e.target.value)} placeholder="sk-..." />
        <label>Modelo complejo</label>
        <select value={form.llm_model_complex || ''} onChange={e => update('llm_model_complex', e.target.value)}>
          {provider.models_complex.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <label>Modelo rápido</label>
        <select value={form.llm_model_fast || ''} onChange={e => update('llm_model_fast', e.target.value)}>
          {provider.models_fast.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </section>

      <section className="settings-section">
        <h3>Google Workspace</h3>
        <label>Google Client ID</label>
        <input type="text" value={form.google_client_id || ''} onChange={e => update('google_client_id', e.target.value)} placeholder="xxxx.apps.googleusercontent.com" />
        <label>Google Client Secret</label>
        <input type="password" value={form.google_client_secret || ''} onChange={e => update('google_client_secret', e.target.value)} placeholder="GOCSPX-..." />
        {form.google_authenticated
          ? <div className="google-status connected">● Google conectado <button className="btn-small" onClick={() => { api.disconnectGoogle(); update('google_authenticated', false) }}>Desconectar</button></div>
          : <button className="btn-primary" onClick={connectGoogle} disabled={connecting || !form.google_client_id}>
              {connecting ? 'Conectando...' : 'Conectar Google'}
            </button>
        }
      </section>

      <section className="settings-section">
        <h3>GoHighLevel</h3>
        <label>GHL API Key</label>
        <input type="password" value={form.ghl_api_key || ''} onChange={e => update('ghl_api_key', e.target.value)} placeholder="Bearer token de GHL" />
        <label>GHL Location ID</label>
        <input type="text" value={form.ghl_location_id || ''} onChange={e => update('ghl_location_id', e.target.value)} placeholder="Location ID de tu cuenta" />
      </section>

      <section className="settings-section">
        <h3>Preferencias</h3>
        <label>Tu nombre</label>
        <input type="text" value={form.user_name || ''} onChange={e => update('user_name', e.target.value)} placeholder="gpato" />
        <label>Idioma</label>
        <select value={form.language || 'es'} onChange={e => update('language', e.target.value)}>
          <option value="es">Español</option>
          <option value="en">English</option>
        </select>
        <label>Zona horaria</label>
        <input type="text" value={form.timezone || ''} onChange={e => update('timezone', e.target.value)} placeholder="America/Mexico_City" />
        <div className="toggle-row">
          <label>Memoria habilitada</label>
          <input type="checkbox" checked={!!form.memory_enabled} onChange={e => update('memory_enabled', e.target.checked)} />
        </div>
      </section>

      <button className="btn-primary btn-save" onClick={save}>{saved ? '✓ Guardado' : 'Guardar cambios'}</button>
    </div>
  )
}
