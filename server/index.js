const express = require('express')
const path = require('path')
const fs = require('fs')
const http = require('http')
const { EventEmitter } = require('events')

const app = express()
const PORT = process.env.PORT || 3131

// SSE clients registry
const bus = new EventEmitter()

app.use(express.json())

// Serve built React frontend + landing page
const distPath = path.join(__dirname, '../dist')
const rootPath = path.join(__dirname, '..')
app.use(express.static(distPath))

// Landing page
app.get('/landing', (req, res) => {
  res.sendFile(path.join(rootPath, 'landing.html'))
})

// ── SSE endpoint ──────────────────────────────────────────────
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`)
  bus.on('event', send)

  req.on('close', () => bus.off('event', send))
})

const emit = (event) => bus.emit('event', event)

// ── API routes ────────────────────────────────────────────────
const chatRouter = require('./routes/chat')(emit)
const settingsRouter = require('./routes/settings')
const googleRouter = require('./routes/google')(emit)
const dataRouter = require('./routes/data')

app.use('/api/chat', chatRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/google', googleRouter)
app.use('/api/data', dataRouter)

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

// ── Start ─────────────────────────────────────────────────────
const server = http.createServer(app)
server.listen(PORT, () => {
  console.log(`\n  Morpheus running at http://localhost:${PORT}\n`)
  // Auto-open browser
  import('open').then(({ default: openBrowser }) => {
    openBrowser(`http://localhost:${PORT}`)
  }).catch(() => {})
})

process.on('SIGINT', () => { server.close(); process.exit(0) })
process.on('SIGTERM', () => { server.close(); process.exit(0) })
