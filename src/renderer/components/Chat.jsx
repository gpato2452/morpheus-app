import React, { useState, useRef, useEffect } from 'react'
import ApprovalCard from './ApprovalCard'
import { api, subscribeToEvents } from '../api'

export default function Chat({ messages, settings, onSettingsRequired }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [thinkingText, setThinkingText] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  useEffect(() => {
    return subscribeToEvents((event) => {
      if (event.type === 'thinking') setThinkingText(event.message)
      if (event.type === 'message' && event.role === 'assistant') { setThinkingText(''); setLoading(false) }
      if (event.type === 'approval_required') { setThinkingText(''); setLoading(false) }
    })
  }, [])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    if (!settings?.api_key) { onSettingsRequired(); return }
    setInput('')
    setLoading(true)
    await api.sendMessage(text)
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="chat">
      <div className="chat-header">
        <h1>Morpheus</h1>
        {settings?.google_authenticated && <span className="google-badge">● Google conectado</span>}
      </div>
      <div className="messages">
        {messages.length === 0 && (
          <div className="empty-state"><p>Hola. Soy Morpheus.</p><p>Escríbeme lo que necesitas.</p></div>
        )}
        {messages.map((msg) => {
          if (msg.type === 'approval') {
            return <ApprovalCard key={msg.id} action={msg.action} onApprove={() => api.approveAction(msg.action.id)} onReject={() => api.rejectAction(msg.action.id)} />
          }
          return (
            <div key={msg.id} className={`message ${msg.role}`}>
              {msg.intent && msg.role === 'assistant' && <span className="intent-tag">{msg.intent}</span>}
              <div className="bubble">{msg.content}</div>
            </div>
          )
        })}
        {loading && (
          <div className="message assistant">
            <div className="bubble thinking">
              <span className="dots">···</span>
              {thinkingText && <span className="thinking-text"> {thinkingText}</span>}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="input-area">
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
          placeholder="Escribe un mensaje... (Enter para enviar)" rows={1} disabled={loading} />
        <button onClick={send} disabled={loading || !input.trim()} className="send-btn">↑</button>
      </div>
    </div>
  )
}
