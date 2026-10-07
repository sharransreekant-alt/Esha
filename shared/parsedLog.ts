// Contract between the app and the parseLog worker. Imported by both.
// Fields are nullable rather than optional so the schema works as a
// structured-output format (every key is always present).
import { z } from 'zod'

export const AGE_BANDS = ['0-6w', '6w-3m', '3-6m', '6-9m', '9-12m', '12m+'] as const
export const AgeBandSchema = z.enum(AGE_BANDS)
export type AgeBand = z.infer<typeof AgeBandSchema>

export const FeedTypeSchema = z.enum(['leftBreast', 'rightBreast', 'expressed', 'formula'])

export const EVENT_TYPES = ['feed', 'solids', 'wee', 'poo', 'massage', 'vitaminD', 'tummyTime', 'note'] as const
export const EventTypeSchema = z.enum(EVENT_TYPES)

// Local wall-clock time in the parent's timezone, no offset: "2026-10-07T03:10"
export const LOCAL_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

export const FeedPartSchema = z.object({
  feedType: FeedTypeSchema,
  minutes:  z.number().nullable(),   // breast sides
  ml:       z.number().nullable(),   // expressed or formula
})

export const ParsedEventSchema = z.object({
  type:       EventTypeSchema,
  at:         z.string(),                       // local time, see LOCAL_TIME_RE
  components: z.array(FeedPartSchema).nullable(), // feed only
  minutes:    z.number().nullable(),            // massage, tummyTime
  foods:      z.array(z.string()).nullable(),   // solids only
  firstTime:  z.boolean().nullable(),           // solids only
  note:       z.string().nullable(),
  confidence: z.number(),                       // 0 to 1
  rawSpan:    z.string(),                       // the words that produced this event
})

export const ParsedCommandSchema = z.object({
  type:      z.enum(['timer_start', 'timer_switch', 'timer_stop']),
  kind:      z.enum(['feed_left', 'feed_right', 'tummy']).nullable(),
  startedAt: z.string().nullable(),             // local time, backdated starts
  rawSpan:   z.string(),
})

export const NeedsConfirmSchema = z.object({
  question:   z.string(),
  eventIndex: z.number().nullable(),
  options:    z.array(z.string()).nullable(),
})

export const ParsedLogSchema = z.object({
  commands:     z.array(ParsedCommandSchema),
  events:       z.array(ParsedEventSchema),
  needsConfirm: z.array(NeedsConfirmSchema),
  redFlag:      z.object({ reason: z.string() }).nullable(),
})

export type FeedPart      = z.infer<typeof FeedPartSchema>
export type ParsedEvent   = z.infer<typeof ParsedEventSchema>
export type ParsedCommand = z.infer<typeof ParsedCommandSchema>
export type ParsedLog     = z.infer<typeof ParsedLogSchema>

// Structured outputs guarantee shape, not ranges. These are checked after.
export function validateParsedLog(log: ParsedLog): string | null {
  for (const [i, e] of log.events.entries()) {
    if (!LOCAL_TIME_RE.test(e.at)) return `events[${i}].at is not a local time`
    if (e.confidence < 0 || e.confidence > 1) return `events[${i}].confidence out of range`
    if (!e.rawSpan.trim()) return `events[${i}].rawSpan is empty`
  }
  for (const [i, c] of log.commands.entries()) {
    if (c.startedAt !== null && !LOCAL_TIME_RE.test(c.startedAt)) return `commands[${i}].startedAt is not a local time`
  }
  return null
}

export const RecentEventSchema = z.object({
  type:       EventTypeSchema,
  at:         z.string().regex(LOCAL_TIME_RE),
  by:         z.string().max(40),
  components: z.array(FeedPartSchema).max(8).nullable(),
})

export const TimerStateSchema = z.object({
  kind:      z.enum(['feed_left', 'feed_right', 'tummy']),
  startedAt: z.string().regex(LOCAL_TIME_RE),
})

export const ParseRequestSchema = z.object({
  utterance:    z.string().trim().min(1).max(600),
  nowLocal:     z.string().regex(LOCAL_TIME_RE),
  timeZone:     z.string().max(64),
  ageBand:      AgeBandSchema,
  timerState:   TimerStateSchema.nullable(),
  // Source of the family's most recent bottle feed, so "180 ml" needs no follow-up question
  lastBottleType: z.enum(['expressed', 'formula']).nullable().optional(),
  recentEvents: z.array(RecentEventSchema).max(12),
})
export type ParseRequest = z.infer<typeof ParseRequestSchema>
export type RecentEvent  = z.infer<typeof RecentEventSchema>

export function toLocalTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export function fromLocalTime(s: string): Date | null {
  if (!LOCAL_TIME_RE.test(s)) return null
  const [date, time] = s.split('T')
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi]    = time.split(':').map(Number)
  const out = new Date(y, mo - 1, d, h, mi, 0, 0)
  return isNaN(out.getTime()) ? null : out
}
