// HTTP API client — replaces Electron IPC
const BASE = '/api'

export const api = {
  // Chat
  sendMessage: (message) =>
    fetch(`${BASE}/chat/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) }).then(r => r.json()),

  approveAction: (id) =>
    fetch(`${BASE}/chat/approve/${id}`, { method: 'POST' }).then(r => r.json()),

  rejectAction: (id) =>
    fetch(`${BASE}/chat/reject/${id}`, { method: 'POST' }).then(r => r.json()),

  getHistory: () =>
    fetch(`${BASE}/chat/history`).then(r => r.json()),

  // Settings
  getSettings: () =>
    fetch(`${BASE}/settings`).then(r => r.json()),

  saveSettings: (settings) =>
    fetch(`${BASE}/settings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) }).then(r => r.json()),

  // Google
  connectGoogle: () =>
    fetch(`${BASE}/google/connect`, { method: 'POST' }).then(r => r.json()),

  disconnectGoogle: () =>
    fetch(`${BASE}/google/disconnect`, { method: 'POST' }).then(r => r.json()),

  // Data
  getTasks: () =>
    fetch(`${BASE}/data/tasks`).then(r => r.json()),

  getFollowups: () =>
    fetch(`${BASE}/data/followups`).then(r => r.json()),
}

// SSE event stream
export function subscribeToEvents(onEvent) {
  const es = new EventSource('/api/events')
  es.onmessage = (e) => {
    try { onEvent(JSON.parse(e.data)) } catch {}
  }
  es.onerror = () => {
    setTimeout(() => subscribeToEvents(onEvent), 3000) // reconnect
    es.close()
  }
  return () => es.close()
}
