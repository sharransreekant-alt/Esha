// Voice logging without opening the app: a phone shortcut posts the spoken sentence
// with a private key, and the worker parses it and saves the entries as that parent.
import { z } from 'zod'
import type { RecentEvent, ParseRequest } from '../../shared/parsedLog'
import { planSaves, type SavePayload, type SavePlan } from '../../src/voice/applyParsedLog'
import { normFood } from '../../src/utils/foodNames'
import { ageBand } from '../../src/utils/ageBand'
import { modelCall, type Env } from './config'
import { parseLog } from './parseLog'
import { checkRate } from './rateLimit'
import { Firestore, FirestoreError, exchangeRefreshToken } from './firestore'
import { localTimeIn, zonedToDate, spokenTime, isTimeZone } from './time'

const ENTRIES = 'esha_entries'
const UNDO_WINDOW_SECONDS = 60 * 60

interface Shortcut { uid: string; who: string; refreshToken: string; timeZone: string; dob: string }

export const ShortcutSetupSchema = z.object({
  refreshToken: z.string().min(20).max(2000),
  who:          z.string().trim().min(1).max(40),
  timeZone:     z.string().max(64).refine(isTimeZone),
  dob:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

const SAFETY = "This app can't give medical advice. If you're worried about your baby, call Healthdirect on 1800 022 222, see your GP, or call triple zero in an emergency."

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('')
}

// Issues the private key a shortcut uses. Called from the app by a signed-in parent.
export async function createShortcutKey(env: Env, uid: string, body: z.infer<typeof ShortcutSetupSchema>): Promise<string | null> {
  // The refresh token must belong to the caller, or one parent could log as another
  const session = await exchangeRefreshToken(body.refreshToken, env.FIREBASE_API_KEY)
  if (!session || session.uid !== uid) return null

  const key = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const hash = await sha256(key)

  // One key per app install: making a new one switches the old one off
  const previous = await env.RATE.get(`sc-uid:${uid}`)
  if (previous) await env.RATE.delete(`sc:${previous}`)

  const record: Shortcut = { uid, who: body.who, refreshToken: body.refreshToken, timeZone: body.timeZone, dob: body.dob }
  await env.RATE.put(`sc:${hash}`, JSON.stringify(record))
  await env.RATE.put(`sc-uid:${uid}`, hash)
  return key
}

async function loadShortcut(env: Env, authHeader: string | null): Promise<{ sc: Shortcut; hash: string } | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  const hash = await sha256(authHeader.slice(7).trim())
  const raw = await env.RATE.get(`sc:${hash}`)
  return raw ? { sc: JSON.parse(raw) as Shortcut, hash } : null
}

function toRecent(docs: Record<string, any>[], timeZone: string): RecentEvent[] {
  const out: RecentEvent[] = []
  for (const d of docs) {
    if (!(d.timestamp instanceof Date) || typeof d.type !== 'string') continue
    const parts = d.type !== 'feed' ? null
      : (Array.isArray(d.components) && d.components.length ? d.components : d.feedType ? [d] : [])
          .slice(0, 8).map((c: any) => ({ feedType: c.feedType, minutes: c.duration ?? null, ml: c.volume ?? null }))
    out.push({ type: d.type as RecentEvent['type'], at: localTimeIn(d.timestamp, timeZone), by: String(d.loggedBy || 'someone').slice(0, 40), components: parts })
    if (out.length === 8) break
  }
  return out
}

function lastBottle(docs: Record<string, any>[]): 'expressed' | 'formula' | null {
  for (const d of docs) {
    if (d.type !== 'feed') continue
    const parts: any[] = Array.isArray(d.components) && d.components.length ? d.components : d.feedType ? [d] : []
    for (const c of [...parts].reverse()) if (c.feedType === 'expressed' || c.feedType === 'formula') return c.feedType
  }
  return null
}

const SIDE: Record<string, string> = { leftBreast: 'left side', rightBreast: 'right side', expressed: 'expressed', formula: 'formula' }

function describe(p: SavePayload): string {
  switch (p.type) {
    case 'feed':      return `a feed of ${(p.components || []).map(c => c.duration ? `${c.duration} minutes ${SIDE[c.feedType]}` : `${c.volume} mils ${SIDE[c.feedType]}`).join(' and ')}`
    case 'solids':    return `solids of ${(p.foods || []).join(' and ')}`
    case 'wee':       return 'a wee'
    case 'poo':       return 'a poo'
    case 'vitaminD':  return 'vitamin D'
    case 'massage':   return p.duration ? `a ${p.duration} minute massage` : 'a massage'
    case 'tummyTime': return p.duration ? `${p.duration} minutes of tummy time` : 'tummy time'
    case 'note':      return 'a note'
  }
}

const list = (xs: string[]) => xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`

// What the phone reads back. Facts only.
export function spokenSummary(plan: SavePlan, now: Date, timeZone: string): string {
  const out: string[] = []
  if (plan.save.length) {
    const times = plan.save.map(i => i.payload._t.getTime())
    const sameTime = times.every(t => t === times[0])
    const when = sameTime && Math.abs(times[0] - now.getTime()) > 2 * 60000 ? ` at ${spokenTime(new Date(times[0]), timeZone)}` : ''
    out.push(`Saved ${list(plan.save.map(i => describe(i.payload)))}${when}.`)
  }
  if (plan.confirm.length) {
    out.push(`I wasn't sure about ${list(plan.confirm.map(i => `"${i.payload.rawSpan}"`))}, so I didn't save that. Please add it in the app.`)
  }
  if (plan.unsupported.length) out.push("Timers by voice aren't available yet.")
  if (!out.length) out.push("I couldn't work out what to log, so nothing was saved.")
  if (plan.redFlag) out.push(`${plan.redFlag}. ${SAFETY}`)
  return out.join(' ')
}

export interface QuickResult { status: number; say: string }

export async function quickLog(env: Env, authHeader: string | null, text: string): Promise<QuickResult> {
  const found = await loadShortcut(env, authHeader)
  if (!found) return { status: 401, say: "This shortcut's key isn't recognised. Create a new one in the app under More." }
  const { sc, hash } = found

  const utterance = text.trim().slice(0, 600)
  if (!utterance) return { status: 400, say: "I didn't hear anything, so nothing was saved." }

  const rate = await checkRate(env.RATE, sc.uid)
  if (rate !== 'ok') return { status: 429, say: rate === 'day' ? "Today's voice limit is reached. Please log in the app." : 'Too many in a row. Try again in a minute.' }

  const session = await exchangeRefreshToken(sc.refreshToken, env.FIREBASE_API_KEY)
  if (!session) return { status: 401, say: 'This shortcut needs setting up again. Create a new key in the app under More.' }
  const db = new Firestore(env.FIREBASE_PROJECT_ID, session.idToken)

  try {
    const now = new Date()
    const [recentDocs, solidsDocs] = await Promise.all([
      db.latest(ENTRIES, 'timestamp', 40),
      db.whereEquals(ENTRIES, 'type', 'solids', ['foods']),
    ])
    const knownFoods = new Set<string>()
    for (const d of solidsDocs) for (const f of (d.foods as unknown[] | undefined) || []) if (typeof f === 'string') knownFoods.add(normFood(f))

    const req: ParseRequest = {
      utterance,
      nowLocal: localTimeIn(now, sc.timeZone),
      timeZone: sc.timeZone,
      ageBand:  ageBand(new Date(`${sc.dob}T00:00:00Z`), now),
      timerState: null,
      lastBottleType: lastBottle(recentDocs),
      recentEvents: toRecent(recentDocs, sc.timeZone),
    }
    const parsed = await parseLog(modelCall(env), req)
    if (!parsed.ok) return { status: 422, say: "I couldn't catch that, so nothing was saved. Please try again." }

    const utteranceId = `${now.getTime()}-sc`
    const plan = planSaves(parsed.log, now, utteranceId, knownFoods, local => zonedToDate(local, sc.timeZone))

    if (plan.save.length) {
      const docs = plan.save.map(({ payload }) => {
        const { _t, ...rest } = payload
        return { ...rest, loggedBy: sc.who, timestamp: _t }
      })
      const ids = await db.createAll(ENTRIES, docs)
      await env.RATE.put(`sc-last:${hash}`, JSON.stringify(ids), { expirationTtl: UNDO_WINDOW_SECONDS })
    }
    return { status: 200, say: spokenSummary(plan, now, sc.timeZone) }
  } catch (error) {
    if (error instanceof FirestoreError && (error.status === 401 || error.status === 403)) {
      return { status: 403, say: "This phone isn't allowed to save to the log, so nothing was saved." }
    }
    if (error instanceof FirestoreError && error.status === 429) {
      return { status: 503, say: "The database has reached today's limit, so nothing was saved. Please try later." }
    }
    throw error
  }
}

// Removes whatever the last spoken log from this shortcut created, within the hour.
export async function quickUndo(env: Env, authHeader: string | null): Promise<QuickResult> {
  const found = await loadShortcut(env, authHeader)
  if (!found) return { status: 401, say: "This shortcut's key isn't recognised." }
  const raw = await env.RATE.get(`sc-last:${found.hash}`)
  const ids: string[] = raw ? JSON.parse(raw) : []
  if (!ids.length) return { status: 200, say: 'There is nothing recent to undo.' }

  const session = await exchangeRefreshToken(found.sc.refreshToken, env.FIREBASE_API_KEY)
  if (!session) return { status: 401, say: 'This shortcut needs setting up again.' }
  await new Firestore(env.FIREBASE_PROJECT_ID, session.idToken).deleteAll(ENTRIES, ids)
  await env.RATE.delete(`sc-last:${found.hash}`)
  return { status: 200, say: `Removed the last ${ids.length === 1 ? 'entry' : `${ids.length} entries`}.` }
}
