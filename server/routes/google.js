const express = require('express')
const { connectGoogle, disconnectGoogle } = require('../tools/google-auth')
const settings = require('../settings')

module.exports = function (emit) {
  const router = express.Router()

  router.post('/connect', async (req, res) => {
    try {
      await connectGoogle(settings, emit)
      res.json({ ok: true })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  router.post('/disconnect', (req, res) => {
    disconnectGoogle(settings)
    res.json({ ok: true })
  })

  return router
}
