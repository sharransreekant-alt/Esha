import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { ParseRequestSchema } from '../../shared/parsedLog'
import { modelCall, type Env } from './config'
import { verifyIdToken } from './auth'
import { checkRate } from './rateLimit'
import { parseLog } from './parseLog'
import { ShortcutSetupSchema, createShortcutKey, quickLog, quickUndo } from './quickLog'
import { AskRequestSchema, QuestionsRequestSchema, ask, appointmentQuestions } from './ask'

const BROWSER_ROUTES = ['/parseLog', '/shortcutKey', '/ask', '/appointmentQuestions']

// Nothing in this file logs the utterance, the request body or the model output.

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  const allowed = env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  if (!origin || !allowed.includes(origin)) return {}
  return {
    'Access-Control-Allow-Origin':  origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age':       '86400',
    'Vary':                         'Origin',
  }
}

function modelError(error: unknown): 'busy' | 'upstream' | null {
  if (error instanceof Anthropic.RateLimitError || error instanceof OpenAI.RateLimitError) return 'busy'
  if (error instanceof Anthropic.APIError || error instanceof OpenAI.APIError) {
    console.error('model_api_error', error.status)
    return 'upstream'
  }
  return null
}

// Shortcuts are built by hand, so accept the sentence however it arrives: a JSON field
// called text (any capitalisation), the only field in the body, a form field, or plain text.
export function spokenText(raw: string, contentType: string): string | null {
  const body = raw.trim()
  if (!body) return null
  let found: unknown = body
  try {
    const json = JSON.parse(body)
    if (typeof json === 'string') found = json
    else if (json && typeof json === 'object') {
      const entries = Object.entries(json as Record<string, unknown>)
      const named = entries.find(([k]) => k.trim().toLowerCase() === 'text')
      const strings = entries.filter(([, v]) => typeof v === 'string')
      found = named ? named[1] : strings.length === 1 ? strings[0][1] : null
    } else found = null
  } catch {
    if (contentType.includes('form')) {
      const form = new URLSearchParams(body)
      found = form.get('text') ?? form.get('Text') ?? ([...form.values()].length === 1 ? [...form.values()][0] : null)
    }
  }
  return typeof found === 'string' && found.trim() ? found.trim() : null
}

// Called by a phone shortcut, not a browser: authenticated by the shortcut's private key,
// answers in plain text for the phone to read aloud.
async function shortcutRoute(request: Request, env: Env, ctx: ExecutionContext, path: string): Promise<Response> {
  // The key normally rides in the address (?key=...), which needs no hand-typed header
  const auth = new URL(request.url).searchParams.get('key') || request.headers.get('Authorization')
  // Always HTTP 200: the Shortcuts app shows a bare error for anything else and never reads
  // the explanation aloud. The real outcome is in the X-Outcome header.
  const say = (status: number, text: string, timing = '') => new Response(text, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Outcome': String(status), ...(timing ? { 'X-Timing': timing } : {}) } })
  try {
    if (path === '/quickUndo') {
      const r = await quickUndo(env, auth)
      return say(r.status, r.say)
    }
    const text = spokenText(await request.text(), request.headers.get('Content-Type') || '')
    if (text === null) return say(400, "The shortcut didn't send any words. In Get Contents of URL, the request body needs a field named text, set to Dictated Text.")
    const r = await quickLog(env, ctx, auth, text)
    return say(r.status, r.say, r.timing)
  } catch (error) {
    if (!modelError(error)) console.error('quick_failed')
    return say(500, 'Something went wrong, so nothing was saved. Please try again or use the app.')
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const path = new URL(request.url).pathname
    if (request.method === 'POST' && (path === '/quickLog' || path === '/quickUndo')) return shortcutRoute(request, env, ctx, path)

    const cors = corsHeaders(request.headers.get('Origin'), env)
    const json = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors } })

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (request.method !== 'POST' || !BROWSER_ROUTES.includes(path)) return json(404, { error: 'not_found' })
    // Browsers always send Origin on cross-origin POSTs; reject anything not on the list.
    if (!cors['Access-Control-Allow-Origin']) return json(403, { error: 'origin_not_allowed' })

    const uid = await verifyIdToken(request.headers.get('Authorization'), env.FIREBASE_PROJECT_ID)
    if (!uid) return json(401, { error: 'unauthenticated' })

    let body: unknown
    try { body = await request.json() } catch { return json(400, { error: 'bad_request' }) }

    if (path === '/shortcutKey') {
      const setup = ShortcutSetupSchema.safeParse(body)
      if (!setup.success) return json(400, { error: 'bad_request' })
      const key = await createShortcutKey(env, uid, setup.data)
      return key ? json(200, { key }) : json(403, { error: 'session_mismatch' })
    }

    const schema = path === '/ask' ? AskRequestSchema : path === '/appointmentQuestions' ? QuestionsRequestSchema : ParseRequestSchema
    const req = schema.safeParse(body)
    if (!req.success) return json(400, { error: 'bad_request' })

    const rate = await checkRate(env.RATE, uid)
    if (rate.verdict !== 'ok') return json(429, { error: rate.verdict === 'day' ? 'daily_limit' : 'rate_limited' })
    ctx.waitUntil(rate.record)

    try {
      if (path === '/ask') {
        const reply = await ask(modelCall(env, 'ask'), req.data as any)
        return reply ? json(200, reply) : json(422, { error: 'invalid_output' })
      }
      if (path === '/appointmentQuestions') {
        const questions = await appointmentQuestions(modelCall(env, 'ask'), req.data as any)
        return questions ? json(200, { questions }) : json(422, { error: 'invalid_output' })
      }
      const result = await parseLog(modelCall(env), req.data as any)
      if (!result.ok) return json(422, { error: result.reason })
      return json(200, { log: result.log })
    } catch (error) {
      const kind = modelError(error)
      if (kind === 'busy') return json(503, { error: 'busy' })
      if (kind === 'upstream') return json(502, { error: 'upstream' })
      console.error('parse_failed')
      return json(500, { error: 'internal' })
    }
  },
} satisfies ExportedHandler<Env>
