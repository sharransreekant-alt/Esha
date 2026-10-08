import { RATE_PER_MINUTE, RATE_PER_DAY } from './config'

export interface RateCheck {
  verdict: 'ok' | 'minute' | 'day'
  // Counter updates. Hand to ctx.waitUntil so the reply doesn't wait on storage writes.
  record: Promise<unknown>
}

// Fixed-window counters in KV. Not atomic, which is acceptable for abuse and cost
// control: a burst can overshoot by a few requests, never by an order of magnitude.
export async function checkRate(kv: KVNamespace, uid: string, now = Date.now()): Promise<RateCheck> {
  const dayKey    = `d:${uid}:${new Date(now).toISOString().slice(0, 10)}`
  const minuteKey = `m:${uid}:${Math.floor(now / 60000)}`
  const [day, minute] = (await Promise.all([kv.get(dayKey), kv.get(minuteKey)])).map(v => parseInt(v || '0'))

  if (day >= RATE_PER_DAY)       return { verdict: 'day',    record: Promise.resolve() }
  if (minute >= RATE_PER_MINUTE) return { verdict: 'minute', record: Promise.resolve() }
  return {
    verdict: 'ok',
    record: Promise.all([
      kv.put(minuteKey, String(minute + 1), { expirationTtl: 120 }),
      kv.put(dayKey,    String(day + 1),    { expirationTtl: 2 * 86400 }),
    ]),
  }
}
