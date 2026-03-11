import React, { useState, useEffect } from 'react'
import Chat from './components/Chat'
import Settings from './components/Settings'
import TasksView from './components/TasksView'
import FollowupsView from './components/FollowupsView'
import { api, subscribeToEvents } from './api'

const VIEWS = {
  chat: { label: '💬', title: 'Chat' },
  tasks: { label: '✓', title: 'Tareas' },
  followups: { label: '🔔', title: 'Follow-ups' },
  settings: { label: '⚙', title: 'Settings' },
}

export default function App() {
  const [view, setView] = useState('chat')
  const [settings, setSettings] = useState(null)
  const [messages, setMessages] = useState([])
  const [badges, setBadges] = useState({ followups: 0 })

  useEffect(() => {
    api.getSettings().then(setSettings)
    api.getHistory().then(msgs => setMessages(msgs.map(m => ({ ...m, id: m.id || Date.now() }))))

    const unsub = subscribeToEvents((event) => {
      if (event.type === 'message') {
        setMessages(prev => [...prev, { id: Date.now() + Math.random(), role: event.role, content: event.content, intent: event.intent }])
      }
      if (event.type === 'approval_required') {
        setMessages(prev => [...prev, { id: `approval-${event.action.id}`, role: 'system', type: 'approval', action: event.action }])
      }
      if (event.type === 'followup_detected') {
        setBadges(prev => ({ ...prev, followups: prev.followups + 1 }))
      }
      if (event.type === 'google_connected') {
        api.getSettings().then(setSettings)
      }
    })
    return unsub
  }, [])

  async function saveSettings(s) {
    await api.saveSettings(s)
    setSettings(s)
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">M</div>
        <nav className="nav">
          {Object.entries(VIEWS).map(([key, { label, title }]) => (
            <button key={key} className={`nav-btn ${view === key ? 'active' : ''}`} onClick={() => setView(key)} title={title}>
              {label}
              {badges[key] > 0 && <span className="badge">{badges[key]}</span>}
            </button>
          ))}
        </nav>
      </aside>
      <main className="main">
        {view === 'chat' && <Chat messages={messages} settings={settings} onSettingsRequired={() => setView('settings')} />}
        {view === 'tasks' && <TasksView />}
        {view === 'followups' && <FollowupsView onLoad={() => setBadges(prev => ({ ...prev, followups: 0 }))} />}
        {view === 'settings' && <Settings settings={settings} onSave={saveSettings} />}
      </main>
    </div>
  )
}
