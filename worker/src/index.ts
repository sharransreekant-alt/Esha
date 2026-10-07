import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { ParseRequestSchema } from '../../shared/parsedLog'
import { modelCall, type Env } from './config'
import { verifyIdToken } from './auth'
import { checkRate } from './rateLimit'
import { parseLog } from './parseLog'

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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request.headers.get('Origin'), env)
    const json = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors } })

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (new URL(request.url).pathname !== '/parseLog' || request.method !== 'POST') return json(404, { error: 'not_found' })
    // Browsers always send Origin on cross-origin POSTs; reject anything not on the list.
    if (!cors['Access-Control-Allow-Origin']) return json(403, { error: 'origin_not_allowed' })

    const uid = await verifyIdToken(request.headers.get('Authorization'), env.FIREBASE_PROJECT_ID)
    if (!uid) return json(401, { error: 'unauthenticated' })

    let body: unknown
    try { body = await request.json() } catch { return json(400, { error: 'bad_request' }) }
    const req = ParseRequestSchema.safeParse(body)
    if (!req.success) return json(400, { error: 'bad_request' })

    const rate = await checkRate(env.RATE, uid)
    if (rate !== 'ok') return json(429, { error: rate === 'day' ? 'daily_limit' : 'rate_limited' })

    try {
      const result = await parseLog(modelCall(env), req.data)
      if (!result.ok) return json(422, { error: result.reason })
      return json(200, { log: result.log })
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError || error instanceof OpenAI.RateLimitError) return json(503, { error: 'busy' })
      if (error instanceof Anthropic.APIError || error instanceof OpenAI.APIError) {
        console.error('model_api_error', error.status)
        return json(502, { error: 'upstream' })
      }
      console.error('parse_failed')
      return json(500, { error: 'internal' })
    }
  },
} satisfies ExportedHandler<Env>
