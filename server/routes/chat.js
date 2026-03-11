const express = require('express')
const { handleMessage } = require('../pipeline')
const db = require('../db')
const settings = require('../settings')

// Pending actions awaiting approval
const pendingActions = new Map()

module.exports = function (emit) {
  const router = express.Router()

  router.post('/send', async (req, res) => {
    const { message } = req.body
    if (!message) return res.status(400).json({ error: 'message required' })

    const cfg = settings.get()
    if (!cfg.api_key) return res.json({ error: 'No API key. Configure in Settings.' })

    db.saveMessage({ role: 'user', content: message })

    res.json({ ok: true }) // respond immediately, updates via SSE

    try {
      const result = await handleMessage(message, cfg, { emit, pendingActions, db })

      if (result.response) {
        db.saveMessage({ role: 'assistant', content: result.response, intent: result.intent })
        emit({ type: 'message', role: 'assistant', content: result.response, intent: result.intent })
      }
      if (result.pendingAction) {
        pendingActions.set(result.pendingAction.id, result.pendingAction)
        emit({ type: 'approval_required', action: {
          id: result.pendingAction.id,
          tool: result.pendingAction.tool,
          summary: result.pendingAction.summary,
          args: result.pendingAction.args,
        }})
      }
    } catch (err) {
      console.error('Pipeline error:', err)
      emit({ type: 'message', role: 'assistant', content: `Error: ${err.message}` })
    }
  })

  router.post('/approve/:id', async (req, res) => {
    const action = pendingActions.get(req.params.id)
    if (!action) return res.status(404).json({ error: 'Action not found' })
    try {
      await action.execute()
      pendingActions.delete(req.params.id)
      const msg = `✓ ${action.summary} — ejecutado.`
      db.saveMessage({ role: 'assistant', content: msg })
      emit({ type: 'message', role: 'assistant', content: msg })
      res.json({ ok: true })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  router.post('/reject/:id', (req, res) => {
    pendingActions.delete(req.params.id)
    const msg = 'Acción cancelada.'
    db.saveMessage({ role: 'assistant', content: msg })
    emit({ type: 'message', role: 'assistant', content: msg })
    res.json({ ok: true })
  })

  router.get('/history', (req, res) => {
    res.json(db.getMessages(50))
  })

  return router
}
