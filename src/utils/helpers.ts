import { Timestamp } from 'firebase/firestore'
import { Entry, FeedComponent } from '../types'

export function toDate(ts: Timestamp | Date | null | undefined): Date {
  if (!ts) return new Date(0)
  if (ts instanceof Timestamp) return ts.toDate()
  return ts
}

export function fmtTime(ts: Timestamp | Date | null | undefined): string {
  return toDate(ts).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function fmtDate(ts: Timestamp | Date | null | undefined): string {
  return toDate(ts).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

export function fmtDateLabel(ts: Timestamp | Date | null | undefined): string {
  const d = toDate(ts)
  const s = d.toDateString()
  if (s === new Date().toDateString()) return 'Today'
  if (s === new Date(Date.now() - 86400000).toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })
}

export function timeSince(d: Date | Timestamp | null | undefined): string {
  const m = Math.floor((Date.now() - toDate(d).getTime()) / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60), r = m % 60
  return r ? `${h}h ${r}m ago` : `${h}h ago`
}

export function timeUntil(ms: number): string {
  const m = Math.round(ms / 60000)
  if (m <= 0)  return 'now'
  if (m < 60)  return `${m} min`
  const h = Math.floor(m / 60), r = m % 60
  return r ? `${h}h ${r}m` : `${h}h`
}

export function nowInput(): string {
  const n = new Date()
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`
}

export function inputToDate(v: string): Date {
  // Handles "HH:MM", "YYYY-MM-DDTHH:MM", or full ISO string
  if (v.includes('T')) {
    const d = new Date(v)
    if (!isNaN(d.getTime())) return d
  }
  // Legacy: just a time string HH:MM — use today's date
  const [h, m] = v.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d
}

export function fmtMs(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function babyAge(born: Date): string {
  const ms   = Date.now() - born.getTime()
  const days = Math.floor(ms / 86400000)
  const w = Math.floor(days / 7), r = days % 7
  if (w === 0) return `${days} ${days !== 1 ? 'days' : 'day'} old`
  return `${w}w ${r}d old`
}

export function feedVolume(e: Entry): number {
  if (e.components?.length) return e.components.reduce((s, c) => s + (Number(c.volume) || 0), 0)
  return Number(e.volume) || 0
}

export function feedDetail(e: Entry): string {
  if (e.components?.length) {
    return e.components.map((c: FeedComponent) => {
      const parts = [`${c.feedType === 'rightBreast' || c.feedType === 'leftBreast' ? '🤱' : c.feedType === 'expressed' ? '🍶' : '🍼'} ${c.feedType === 'rightBreast' ? 'Right' : c.feedType === 'leftBreast' ? 'Left' : c.feedType === 'expressed' ? 'Expressed' : 'Formula'}`]
      if (c.duration) parts.push(`${c.duration} min`)
      if (c.volume)   parts.push(`${c.volume} ml`)
      return parts.join(' ')
    }).join(' + ')
  }
  const parts: string[] = []
  if (e.feedType) parts.push(`${e.feedType}`)
  if (e.duration) parts.push(`${e.duration} min`)
  if (e.volume)   parts.push(`${e.volume} ml`)
  return parts.join(' · ')
}

export function todayOnly(entries: Entry[]): Entry[] {
  const t = new Date().toDateString()
  return entries.filter(e => toDate(e.timestamp).toDateString() === t)
}
