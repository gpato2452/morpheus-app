import React, { useState } from 'react'

export default function ApprovalCard({ action, onApprove, onReject }) {
  const [status, setStatus] = useState('pending') // pending | approved | rejected

  async function handleApprove() {
    setStatus('approved')
    await onApprove()
  }

  async function handleReject() {
    setStatus('rejected')
    await onReject()
  }

  const icons = {
    gmail_send: '📧',
    gmail_reply: '↩️',
    gmail_delete: '🗑️',
    calendar_create: '📅',
    calendar_update: '✏️',
    calendar_delete: '🗑️',
    drive_delete: '🗑️',
  }

  const icon = icons[action.tool] || '⚡'

  return (
    <div className={`approval-card ${status}`}>
      <div className="approval-header">
        <span className="approval-icon">{icon}</span>
        <span className="approval-title">Acción pendiente de aprobación</span>
      </div>

      <div className="approval-summary">{action.summary}</div>

      {action.args && (
        <details className="approval-details">
          <summary>Ver detalles</summary>
          <pre>{JSON.stringify(action.args, null, 2)}</pre>
        </details>
      )}

      {status === 'pending' && (
        <div className="approval-buttons">
          <button className="btn-approve" onClick={handleApprove}>
            ✓ Aprobar
          </button>
          <button className="btn-reject" onClick={handleReject}>
            ✗ Descartar
          </button>
        </div>
      )}

      {status === 'approved' && (
        <div className="approval-status approved">✓ Aprobado — ejecutando...</div>
      )}

      {status === 'rejected' && (
        <div className="approval-status rejected">✗ Descartado</div>
      )}
    </div>
  )
}
