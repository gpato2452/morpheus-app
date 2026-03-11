const fs = require('fs')
const path = require('path')
const os = require('os')

const dataDir = path.join(os.homedir(), '.morpheus')
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

function load(file) {
  try { return JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8')) } catch { return [] }
}
function save(file, data) { fs.writeFileSync(path.join(dataDir, file), JSON.stringify(data, null, 2)) }
function nextId(arr) { return arr.length > 0 ? Math.max(...arr.map(i => i.id || 0)) + 1 : 1 }

module.exports.saveMessage = ({ role, content, intent = null }) => {
  const msgs = load('messages.json')
  msgs.push({ id: nextId(msgs), role, content, intent, created_at: new Date().toISOString() })
  save('messages.json', msgs)
}
module.exports.getMessages = (limit = 50) => load('messages.json').slice(-limit)
module.exports.getRecentMessages = (n = 20) => load('messages.json').slice(-n).map(m => ({ role: m.role, content: m.content }))
module.exports.saveTask = ({ title, description, status, priority, due_date, project }) => {
  const tasks = load('tasks.json')
  tasks.push({ id: nextId(tasks), title, description: description || null, status: status || 'pending', priority: priority || 'normal', due_date: due_date || null, project: project || null, created_at: new Date().toISOString() })
  save('tasks.json', tasks)
}
module.exports.getTasks = () => load('tasks.json').filter(t => t.status !== 'done')
module.exports.saveFollowup = ({ type, context, due_date }) => {
  const fus = load('followups.json')
  fus.push({ id: nextId(fus), type, context: context || null, due_date: due_date || null, status: 'pending', created_at: new Date().toISOString() })
  save('followups.json', fus)
}
module.exports.getFollowups = () => load('followups.json').filter(f => f.status === 'pending')
