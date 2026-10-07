import { RATE_PER_MINUTE, RATE_PER_DAY } from './config'

// Fixed-window counters in KV. Not atomic, which is acceptable for abuse and cost
// control: a burst can overshoot by a few requests, never by an order of magnitude.
async function bump(kv: KVNamespace, key: string, limit: number, ttlSeconds: number): Promise<boolean> {
  const count = parseInt((await kv.get(key)) || '0')
  if (count >= limit) return false
  await kv.put(key, String(count + 1), { expirationTtl: ttlSeconds })
  return true
}

export async function checkRate(kv: KVNamespace, uid: string, now = Date.now()): Promise<'ok' | 'minute' | 'day'> {
  const day    = new Date(now).toISOString().slice(0, 10)
  const minute = Math.floor(now / 60000)
  // Check the day cap first so a capped user does not keep writing minute keys.
  const dayCount = parseInt((await kv.get(`d:${uid}:${day}`)) || '0')
  if (dayCount >= RATE_PER_DAY) return 'day'
  if (!(await bump(kv, `m:${uid}:${minute}`, RATE_PER_MINUTE, 120))) return 'minute'
  await kv.put(`d:${uid}:${day}`, String(dayCount + 1), { expirationTtl: 2 * 86400 })
  return 'ok'
}
