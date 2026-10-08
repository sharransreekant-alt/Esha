import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { ParseRequestSchema } from '../../shared/parsedLog'
import { modelCall, type Env } from './config'
import { verifyIdToken } from './auth'
import { checkRate } from './rateLimit'
import { parseLog } from './parseLog'
import { ShortcutSetupSchema, createShortcutKey, quickLog, quickUndo } from './quickLog'

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

// Called by a phone shortcut, not a browser: authenticated by the shortcut's private key,
// answers in plain text for the phone to read aloud.
async function shortcutRoute(request: Request, env: Env, path: string): Promise<Response> {
  const say = (status: number, text: string) => new Response(text, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  try {
    if (path === '/quickUndo') {
      const r = await quickUndo(env, request.headers.get('Authorization'))
      return say(r.status, r.say)
    }
    const body = await request.json().catch(() => null) as { text?: unknown } | null
    const r = await quickLog(env, request.headers.get('Authorization'), typeof body?.text === 'string' ? body.text : '')
    return say(r.status, r.say)
  } catch (error) {
    if (!modelError(error)) console.error('quick_failed')
    return say(500, 'Something went wrong, so nothing was saved. Please try again or use the app.')
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname
    if (request.method === 'POST' && (path === '/quickLog' || path === '/quickUndo')) return shortcutRoute(request, env, path)

    const cors = corsHeaders(request.headers.get('Origin'), env)
    const json = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors } })

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (request.method !== 'POST' || (path !== '/parseLog' && path !== '/shortcutKey')) return json(404, { error: 'not_found' })
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

    const req = ParseRequestSchema.safeParse(body)
    if (!req.success) return json(400, { error: 'bad_request' })

    const rate = await checkRate(env.RATE, uid)
    if (rate !== 'ok') return json(429, { error: rate === 'day' ? 'daily_limit' : 'rate_limited' })

    try {
      const result = await parseLog(modelCall(env), req.data)
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
