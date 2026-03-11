import React, { useEffect, useState } from 'react'
import { api } from '../api'

const PRIORITY_ORDER = { urgent: 0, high: 1, normal: 2, low: 3 }
const PRIORITY_COLORS = { urgent: '#ff4444', high: '#ff8800', normal: '#888', low: '#aaa' }

export default function TasksView() {
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    api.getTasks().then(setTasks)
  }, [])

  const sorted = [...tasks].sort(
    (a, b) => (PRIORITY_ORDER[a.priority] || 2) - (PRIORITY_ORDER[b.priority] || 2)
  )

  return (
    <div className="data-view">
      <h2>Tareas pendientes</h2>
      {tasks.length === 0 ? (
        <p className="empty">No hay tareas pendientes.</p>
      ) : (
        <ul className="item-list">
          {sorted.map(task => (
            <li key={task.id} className="item-card">
              <div className="item-header">
                <span className="priority-dot" style={{ background: PRIORITY_COLORS[task.priority] }} />
                <strong>{task.title}</strong>
                <span className="item-date">{task.due_date || ''}</span>
              </div>
              {task.description && <p className="item-desc">{task.description}</p>}
              <div className="item-meta">
                <span className="tag">{task.status}</span>
                {task.project && <span className="tag">{task.project}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
