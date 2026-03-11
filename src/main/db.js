/**
 * Simple JSON file storage — no native dependencies.
 * Works with any Node.js version without compilation.
 */

const fs = require('fs')
const path = require('path')
const { app } = require('electron')

const dataDir = app.getPath('userData')

function load(file) {
  const p = path.join(dataDir, file)
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {
    return []
  }
}

function save(file, data) {
  const p = path.join(dataDir, file)
  fs.writeFileSync(p, JSON.stringify(data, null, 2))
}

function nextId(arr) {
  return arr.length > 0 ? Math.max(...arr.map(i => i.id || 0)) + 1 : 1
}

// ── Messages ──────────────────────────────────────────────
module.exports.saveMessage = function ({ role, content, intent = null }) {
  const msgs = load('messages.json')
  msgs.push({ id: nextId(msgs), role, content, intent, created_at: new Date().toISOString() })
  save('messages.json', msgs)
}

module.exports.getMessages = function (limit = 50) {
  const msgs = load('messages.json')
  return msgs.slice(-limit)
}

module.exports.getRecentMessages = function (n = 20) {
  const msgs = load('messages.json')
  return msgs.slice(-n).map(m => ({ role: m.role, content: m.content }))
}

// ── Tasks ─────────────────────────────────────────────────
module.exports.saveTask = function ({ title, description, status, priority, due_date, project }) {
  const tasks = load('tasks.json')
  tasks.push({
    id: nextId(tasks),
    title,
    description: description || null,
    status: status || 'pending',
    priority: priority || 'normal',
    due_date: due_date || null,
    project: project || null,
    created_at: new Date().toISOString(),
  })
  save('tasks.json', tasks)
}

module.exports.getTasks = function () {
  return load('tasks.json').filter(t => t.status !== 'done')
}

// ── Follow-ups ────────────────────────────────────────────
module.exports.saveFollowup = function ({ type, context, due_date }) {
  const fus = load('followups.json')
  fus.push({
    id: nextId(fus),
    type,
    context: context || null,
    due_date: due_date || null,
    status: 'pending',
    created_at: new Date().toISOString(),
  })
  save('followups.json', fus)
}

module.exports.getFollowups = function () {
  return load('followups.json').filter(f => f.status === 'pending')
}
