import React, { useEffect, useState } from 'react'
import { api } from '../api'

const TYPE_ICONS = {
  email_reply: '📧',
  task_blocked: '🚧',
  meeting_prep: '📅',
  commitment: '🤝',
  deadline: '⏰',
  none: '🔔',
}

export default function FollowupsView({ onLoad }) {
  const [followups, setFollowups] = useState([])

  useEffect(() => {
    api.getFollowups().then(data => {
      setFollowups(data)
      onLoad?.()
    })
  }, [])

  return (
    <div className="data-view">
      <h2>Follow-ups pendientes</h2>
      {followups.length === 0 ? (
        <p className="empty">No hay follow-ups pendientes.</p>
      ) : (
        <ul className="item-list">
          {followups.map(fu => (
            <li key={fu.id} className="item-card">
              <div className="item-header">
                <span className="fu-icon">{TYPE_ICONS[fu.type] || '🔔'}</span>
                <strong>{fu.type.replace('_', ' ')}</strong>
                {fu.due_date && <span className="item-date">{fu.due_date}</span>}
              </div>
              {fu.context && <p className="item-desc">{fu.context}</p>}
              <div className="item-meta">
                <span className="tag">{fu.status}</span>
                <span className="tag created">{fu.created_at?.slice(0, 10)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
