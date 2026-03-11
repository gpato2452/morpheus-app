const { google } = require('googleapis')
const { buildAuthClient } = require('./google-auth')
const settings = require('../settings')

function getDriveClient(tokens) {
  const cfg = settings.get()
  const auth = buildAuthClient(tokens, cfg)
  return google.drive({ version: 'v3', auth })
}

function getDriveTools() {
  return [
    {
      type: 'function',
      function: {
        name: 'drive_search',
        description: 'Search files in Google Drive',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query (e.g. "name contains presupuesto")' },
            max_results: { type: 'number', description: 'Max results (default 10)' },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'drive_delete',
        description: 'Delete a file from Google Drive (REQUIRES USER APPROVAL)',
        parameters: {
          type: 'object',
          properties: {
            file_id: { type: 'string', description: 'Google Drive file ID' },
          },
          required: ['file_id'],
        },
      },
    },
  ]
}

async function executeDriveTool(name, args, tokens) {
  const drive = getDriveClient(tokens)

  switch (name) {
    case 'drive_search': {
      const res = await drive.files.list({
        q: args.query,
        pageSize: args.max_results || 10,
        fields: 'files(id, name, mimeType, modifiedTime, webViewLink)',
      })
      return { files: res.data.files || [] }
    }

    case 'drive_delete': {
      await drive.files.delete({ fileId: args.file_id })
      return { status: 'deleted' }
    }

    default:
      throw new Error(`Unknown drive tool: ${name}`)
  }
}

module.exports = { getDriveTools, executeDriveTool }
