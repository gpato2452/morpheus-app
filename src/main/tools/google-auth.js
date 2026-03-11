const { google } = require('googleapis')
const http = require('http')
const { shell } = require('electron')
const url = require('url')

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents',
]

const PORT = 42813

function getOAuth2Client(cfg) {
  return new google.auth.OAuth2(
    cfg.google_client_id,
    cfg.google_client_secret,
    `http://localhost:${PORT}/oauth/callback`
  )
}

async function connectGoogle(settings, emit) {
  const cfg = settings.get()

  if (!cfg.google_client_id || !cfg.google_client_secret) {
    throw new Error('Google Client ID y Client Secret son requeridos. Agrégalos en Settings.')
  }

  const oauth2Client = getOAuth2Client(cfg)

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  })

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const parsed = url.parse(req.url, true)

      if (parsed.pathname !== '/oauth/callback') return

      const code = parsed.query.code
      if (!code) {
        res.end('Error: no authorization code received.')
        server.close()
        reject(new Error('No authorization code'))
        return
      }

      try {
        const { tokens } = await oauth2Client.getToken(code)
        settings.save({ google_authenticated: true, google_tokens: tokens })
        emit({ type: 'google_connected' })

        res.end('<html><body><h2>✓ Morpheus conectado a Google.</h2><p>Puedes cerrar esta ventana.</p></body></html>')
        server.close()
        resolve(tokens)
      } catch (err) {
        res.end('Error obteniendo tokens.')
        server.close()
        reject(err)
      }
    })

    server.listen(PORT, () => {
      shell.openExternal(authUrl)
    })

    // Timeout after 5 min
    setTimeout(() => {
      server.close()
      reject(new Error('OAuth timeout'))
    }, 5 * 60 * 1000)
  })
}

function disconnectGoogle(settings) {
  settings.save({ google_authenticated: false, google_tokens: null })
}

function buildAuthClient(tokens, cfg) {
  const client = getOAuth2Client(cfg)
  client.setCredentials(tokens)
  return client
}

module.exports = { connectGoogle, disconnectGoogle, buildAuthClient }
