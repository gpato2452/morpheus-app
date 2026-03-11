const { google } = require('googleapis')
const { buildAuthClient } = require('./google-auth')
const settings = require('../settings')

function getGmailClient(tokens) {
  const cfg = settings.get()
  const auth = buildAuthClient(tokens, cfg)
  return google.gmail({ version: 'v1', auth })
}

// Tool definitions for LLM
function getGmailTools() {
  return [
    {
      type: 'function',
      function: {
        name: 'gmail_list',
        description: 'List recent emails from Gmail inbox',
        parameters: {
          type: 'object',
          properties: {
            max_results: { type: 'number', description: 'Max emails to return (default 10)' },
            query: { type: 'string', description: 'Gmail search query (e.g. "from:carlos is:unread")' },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'gmail_get',
        description: 'Get full content of a specific email',
        parameters: {
          type: 'object',
          properties: {
            message_id: { type: 'string', description: 'Gmail message ID' },
          },
          required: ['message_id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'gmail_send',
        description: 'Send an email (REQUIRES USER APPROVAL)',
        parameters: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Recipient email address' },
            subject: { type: 'string', description: 'Email subject' },
            body: { type: 'string', description: 'Email body (plain text)' },
            cc: { type: 'string', description: 'CC email address (optional)' },
          },
          required: ['to', 'subject', 'body'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'gmail_reply',
        description: 'Reply to an existing email thread (REQUIRES USER APPROVAL)',
        parameters: {
          type: 'object',
          properties: {
            message_id: { type: 'string', description: 'Message ID to reply to' },
            body: { type: 'string', description: 'Reply text' },
          },
          required: ['message_id', 'body'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'gmail_delete',
        description: 'Delete an email (REQUIRES USER APPROVAL)',
        parameters: {
          type: 'object',
          properties: {
            message_id: { type: 'string', description: 'Gmail message ID to delete' },
          },
          required: ['message_id'],
        },
      },
    },
  ]
}

async function executeGmailTool(name, args, tokens) {
  const gmail = getGmailClient(tokens)

  switch (name) {
    case 'gmail_list': {
      const res = await gmail.users.messages.list({
        userId: 'me',
        maxResults: args.max_results || 10,
        q: args.query || 'in:inbox',
      })
      const messages = res.data.messages || []

      // Fetch subject + snippet for each
      const details = await Promise.all(
        messages.slice(0, 10).map(async (m) => {
          const msg = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'metadata' })
          const headers = msg.data.payload.headers
          const subject = headers.find(h => h.name === 'Subject')?.value || '(sin asunto)'
          const from = headers.find(h => h.name === 'From')?.value || ''
          return { id: m.id, subject, from, snippet: msg.data.snippet }
        })
      )
      return { emails: details }
    }

    case 'gmail_get': {
      const msg = await gmail.users.messages.get({ userId: 'me', id: args.message_id })
      const headers = msg.data.payload.headers
      const body = extractBody(msg.data.payload)
      return {
        id: args.message_id,
        subject: headers.find(h => h.name === 'Subject')?.value,
        from: headers.find(h => h.name === 'From')?.value,
        to: headers.find(h => h.name === 'To')?.value,
        body,
      }
    }

    case 'gmail_send': {
      const raw = buildRawEmail({
        to: args.to, subject: args.subject, body: args.body, cc: args.cc
      })
      const res = await gmail.users.messages.send({ userId: 'me', requestBody: { raw } })
      return { id: res.data.id, status: 'sent' }
    }

    case 'gmail_reply': {
      const orig = await gmail.users.messages.get({ userId: 'me', id: args.message_id, format: 'metadata' })
      const threadId = orig.data.threadId
      const subject = orig.data.payload.headers.find(h => h.name === 'Subject')?.value || ''
      const toHeader = orig.data.payload.headers.find(h => h.name === 'From')?.value || ''

      const raw = buildRawEmail({ to: toHeader, subject: `Re: ${subject}`, body: args.body, threadId })
      const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw, threadId },
      })
      return { id: res.data.id, status: 'sent' }
    }

    case 'gmail_delete': {
      await gmail.users.messages.trash({ userId: 'me', id: args.message_id })
      return { status: 'deleted' }
    }

    default:
      throw new Error(`Unknown gmail tool: ${name}`)
  }
}

function buildRawEmail({ to, subject, body, cc, threadId }) {
  const lines = [
    `To: ${to}`,
    cc ? `Cc: ${cc}` : null,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ].filter(Boolean)

  return Buffer.from(lines.join('\r\n')).toString('base64url')
}

function extractBody(payload) {
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf8')
  }
  for (const part of payload.parts || []) {
    const text = extractBody(part)
    if (text) return text
  }
  return ''
}

module.exports = { getGmailTools, executeGmailTool }
