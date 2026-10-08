import type { Entry, EntryType, FeedComponent } from '../types'
import { ParsedEvent, ParsedLog, fromLocalTime } from '../../shared/parsedLog'
import { normFood, showFood } from '../utils/foodNames'

export const SILENT_SAVE_THRESHOLD = 0.85
const FUTURE_TOLERANCE_MS = 5 * 60000

// What saveEntry accepts.
export type SavePayload = Omit<Entry, 'id' | 'loggedBy' | 'timestamp'> & { _t: Date }

export interface PlannedItem {
  payload:  SavePayload
  label:    string          // short human summary, e.g. "Feed · Left 10 min + Expressed 60 ml"
  question: string | null   // set when the item needs a tap before saving
}

export interface SavePlan {
  save:        PlannedItem[]   // saved without asking
  confirm:     PlannedItem[]   // shown as one-tap "Add"
  unsupported: string[]        // understood but not available yet (timer commands)
  redFlag:     string | null
}

const TITLES: Record<EntryType, string> = {
  feed: 'Feed', solids: 'Solids', wee: 'Wee', poo: 'Poo', massage: 'Massage',
  tummyTime: 'Tummy time', vitaminD: 'Vitamin D', note: 'Note',
}
const SIDE: Record<string, string> = { leftBreast: 'Left', rightBreast: 'Right', expressed: 'Expressed', formula: 'Formula' }

function fmtClock(d: Date): string {
  return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function feedComponents(e: ParsedEvent): FeedComponent[] {
  const out: FeedComponent[] = []
  for (const c of e.components || []) {
    const breast = c.feedType === 'leftBreast' || c.feedType === 'rightBreast'
    if (breast && c.minutes && c.minutes > 0)  out.push({ feedType: c.feedType, duration: Math.round(c.minutes) })
    if (!breast && c.ml && c.ml > 0)           out.push({ feedType: c.feedType, volume: Math.round(c.ml) })
  }
  return out
}

// Returns null when the event cannot be turned into a saveable entry at all.
function toPayload(e: ParsedEvent, at: Date, utteranceId: string, knownFoods: Set<string>): { payload: SavePayload; label: string } | null {
  const meta = { source: 'voice' as const, rawSpan: e.rawSpan, utteranceId, _t: at }
  const note = e.note?.trim() || null

  switch (e.type) {
    case 'feed': {
      const components = feedComponents(e)
      if (!components.length) return null
      const duration = components.reduce((s, c) => s + (c.duration || 0), 0)
      const volume   = components.reduce((s, c) => s + (c.volume   || 0), 0)
      const detail   = components.map(c => `${SIDE[c.feedType]} ${c.duration ? `${c.duration} min` : `${c.volume} ml`}`).join(' + ')
      return {
        payload: { type: 'feed', feedType: components[0].feedType, components, duration: duration || null, volume: volume || null, notes: note, ...meta },
        label: `Feed · ${detail}`,
      }
    }
    case 'massage':
    case 'tummyTime': {
      const mins = e.minutes && e.minutes > 0 ? Math.round(e.minutes) : null
      return {
        payload: { type: e.type, ...(mins ? { duration: mins } : {}), notes: note, ...meta },
        label: mins ? `${TITLES[e.type]} · ${mins} min` : TITLES[e.type],
      }
    }
    case 'wee':
    case 'poo':
    case 'vitaminD':
      return { payload: { type: e.type, notes: note, ...meta }, label: TITLES[e.type] }
    case 'solids': {
      const foods = [...new Set((e.foods || []).map(normFood).filter(Boolean))]
      if (!foods.length) return null
      // First time if the parent said so, or if the food has never been logged before
      const firstFoods = foods.filter(f => e.firstTime || !knownFoods.has(f))
      return {
        payload: { type: 'solids', foods, ...(firstFoods.length ? { firstFoods } : {}), notes: note, ...meta },
        label: `Solids · ${foods.map(showFood).join(', ')}`,
      }
    }
    case 'note': {
      const text = note || e.rawSpan.trim()
      return text ? { payload: { type: 'note', notes: text, ...meta }, label: `Note · ${text}` } : null
    }
  }
}

// Pure: decides what to save silently and what to ask about. No I/O.
// `toDate` turns the parser's local wall-clock time into an instant. The app uses the
// device clock; the server passes one that knows the family's timezone.
export function planSaves(
  log: ParsedLog, now: Date, utteranceId: string, knownFoods: Set<string> = new Set(),
  toDate: (local: string) => Date | null = fromLocalTime, threshold = SILENT_SAVE_THRESHOLD,
): SavePlan {
  const plan: SavePlan = { save: [], confirm: [], unsupported: [], redFlag: log.redFlag?.reason ?? null }

  const questions = new Map<number, string>()
  for (const n of log.needsConfirm) {
    if (n.eventIndex !== null && !questions.has(n.eventIndex)) questions.set(n.eventIndex, n.question)
  }

  log.events.forEach((e, i) => {
    const parsedAt = toDate(e.at)
    const inFuture = !!parsedAt && parsedAt.getTime() > now.getTime() + FUTURE_TOLERANCE_MS
    // A time a few minutes ahead is the parent rounding ("11:30" said at 11:26): treat it as now
    const at = !parsedAt || parsedAt.getTime() > now.getTime() ? now : parsedAt
    const built = toPayload(e, at, utteranceId, knownFoods)

    if (!built) {
      // Nothing usable was extracted. Keep the words as a note the parent can add.
      const text = e.rawSpan.trim()
      if (text) plan.confirm.push({
        payload:  { type: 'note', notes: text, source: 'voice', rawSpan: e.rawSpan, utteranceId, _t: now },
        label:    `Note · ${text}`,
        question: questions.get(i) || `Didn't catch the details of "${text}". Save as a note?`,
      })
      return
    }

    const item: PlannedItem = { ...built, label: `${built.label} · ${fmtClock(at)}`, question: null }
    const unsure = e.confidence < threshold || questions.has(i) || !parsedAt || inFuture
    if (unsure) plan.confirm.push({ ...item, question: questions.get(i) || `Add ${item.label}?` })
    else        plan.save.push(item)
  })

  for (const c of log.commands) plan.unsupported.push(c.rawSpan)
  return plan
}
