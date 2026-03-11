/**
 * Main Morpheus pipeline — same flow as n8n workflow, now in code:
 * message → classify → route → (quick | main agent) → followup (parallel) → memory
 */

const { classify } = require('./classifier')
const { quickResponse } = require('./agents/quickResponse')
const { runMainAgent } = require('./agents/mainAgent')
const { detectFollowup } = require('./followup')

const SIMPLE_INTENTS = new Set(['simple_response'])
const SIMPLE_CONFIDENCE_THRESHOLD = 0.85

async function handleMessage(userMessage, cfg, { emit, pendingActions, db }) {
  emit({ type: 'thinking', message: 'Clasificando...' })

  // ── Step 1: Intent Classifier ─────────────────────────────────
  const intent = await classify(userMessage, cfg)
  emit({ type: 'intent', intent })

  // ── Step 2: Intent Router ─────────────────────────────────────
  const isSimple =
    SIMPLE_INTENTS.has(intent.intent) &&
    intent.confidence >= SIMPLE_CONFIDENCE_THRESHOLD

  // ── Step 3: Route ─────────────────────────────────────────────
  let response = null
  let pendingAction = null
  const history = cfg.memory_enabled ? db.getRecentMessages(20) : []

  if (isSimple) {
    emit({ type: 'thinking', message: 'Respuesta rápida...' })
    response = await quickResponse(userMessage, cfg, history)
  } else {
    emit({ type: 'thinking', message: 'Pensando...' })

    const googleAuth = cfg.google_authenticated && cfg.google_tokens
      ? cfg.google_tokens
      : null

    const result = await runMainAgent(userMessage, cfg, history, googleAuth)
    response = result.response
    pendingAction = result.pendingAction
  }

  // ── Step 4: Parallel — Follow-up detection ────────────────────
  if (response && cfg.memory_enabled) {
    detectFollowup(userMessage, response, cfg)
      .then((fu) => {
        if (fu.detects_followup) {
          db.saveFollowup({ type: fu.type, context: fu.context, due_date: fu.due_date })
          emit({ type: 'followup_detected', followup: fu })
        }
      })
      .catch(() => {}) // non-blocking
  }

  return { response, pendingAction, intent: intent.intent }
}

module.exports = { handleMessage }
