import { ensureSignedIn } from '../firebase'
import { Entry } from '../types'
import { toDate } from '../utils/helpers'
import {
  ParsedLog, ParsedLogSchema, ParseRequest, RecentEvent, AgeBand,
  validateParsedLog, toLocalTime,
} from '../../shared/parsedLog'

// Set VITE_PARSE_URL to the deployed worker. In `npm run dev` it defaults to `wrangler dev`.
export const PARSE_URL: string =
  import.meta.env.VITE_PARSE_URL || (import.meta.env.DEV ? 'http://localhost:8787' : '')

export const voiceEnabled = !!PARSE_URL

export class ParseError extends Error {
  constructor(public kind: 'sign_in' | 'rate' | 'daily' | 'network' | 'unparsed') { super(kind) }
}

const RECENT_COUNT = 8

// Type, time, feed parts and who logged it. Notes text is deliberately left out.
export function recentEvents(entries: Entry[]): RecentEvent[] {
  return entries.slice(0, RECENT_COUNT).map(e => ({
    type: e.type,
    at:   toLocalTime(toDate(e.timestamp)),
    by:   (e.loggedBy || 'someone').slice(0, 40),
    components: e.type === 'feed'
      ? (e.components?.length ? e.components : e.feedType ? [{ feedType: e.feedType, duration: e.duration, volume: e.volume }] : [])
          .slice(0, 8)
          .map(c => ({ feedType: c.feedType, minutes: c.duration ?? null, ml: c.volume ?? null }))
      : null,
  }))
}

export async function requestParse(utterance: string, entries: Entry[], band: AgeBand, now: Date): Promise<ParsedLog> {
  let token: string
  try { token = await ensureSignedIn() } catch { throw new ParseError('sign_in') }

  const body: ParseRequest = {
    utterance: utterance.trim().slice(0, 600),
    nowLocal:  toLocalTime(now),
    timeZone:  Intl.DateTimeFormat().resolvedOptions().timeZone || 'Australia/Sydney',
    ageBand:   band,
    timerState: null,
    recentEvents: recentEvents(entries),
  }

  let res: Response
  try {
    res = await fetch(`${PARSE_URL}/parseLog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  } catch { throw new ParseError('network') }

  if (res.status === 401) throw new ParseError('sign_in')
  if (res.status === 429) {
    const err = await res.json().catch(() => ({}))
    throw new ParseError(err?.error === 'daily_limit' ? 'daily' : 'rate')
  }
  if (res.status === 422) throw new ParseError('unparsed')
  if (!res.ok) throw new ParseError('network')

  const data = await res.json().catch(() => null)
  const parsed = ParsedLogSchema.safeParse(data?.log)
  if (!parsed.success || validateParsedLog(parsed.data) !== null) throw new ParseError('unparsed')
  return parsed.data
}
