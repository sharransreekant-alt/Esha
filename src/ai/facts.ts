import { Entry } from '../types'
import { toDate, feedVolume } from '../utils/helpers'

// The plain-text summary of the log that the assistant answers from.
// Deliberately leaves out the baby's name, the date of birth, who logged what, and
// free-text notes: the assistant only gets counts, times, amounts and food names.

const SOURCE: Record<string, string> = { leftBreast: 'left', rightBreast: 'right', expressed: 'expressed', formula: 'formula' }

function clock(d: Date): string {
  return d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
}
function span(mins: number): string {
  const h = Math.floor(mins / 60), m = Math.round(mins % 60)
  return h ? `${h} h ${m} min` : `${m} min`
}
function feedParts(e: Entry): string {
  const parts = e.components?.length ? e.components : e.feedType ? [{ feedType: e.feedType, duration: e.duration, volume: e.volume }] : []
  return parts.map(c => `${SOURCE[c.feedType]} ${c.duration ? `${c.duration} min` : c.volume ? `${c.volume} ml` : ''}`.trim()).join(' + ') || 'no details'
}
const times = (es: Entry[]) => es.map(e => clock(toDate(e.timestamp))).join(', ')

export function buildFacts(entries: Entry[], feedCycleHours: number, now: Date = new Date()): string {
  const dayKey = (d: Date) => d.toDateString()
  const on = (key: string) => entries.filter(e => dayKey(toDate(e.timestamp)) === key)
    .sort((a, b) => toDate(a.timestamp).getTime() - toDate(b.timestamp).getTime())
  const of = (es: Entry[], type: Entry['type']) => es.filter(e => e.type === type)

  const today = on(dayKey(now))
  const feeds = of(today, 'feed'), solids = of(today, 'solids'), wees = of(today, 'wee'), poos = of(today, 'poo')
  const vitD = of(today, 'vitaminD'), massages = of(today, 'massage')
  const tummy = of(today, 'tummyTime').reduce((s, e) => s + (Number(e.duration) || 0), 0)
  const ml = today.reduce((s, e) => s + feedVolume(e), 0)

  const lines: string[] = [
    `Now: ${now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}, ${clock(now)}`,
    `Feed timing setting chosen by the parents: every ${feedCycleHours} hours`,
    '',
    'Today so far:',
    `- Feeds: ${feeds.length}${ml ? ` (${ml} ml total)` : ''}${feeds.length ? `: ${feeds.map(f => `${clock(toDate(f.timestamp))} ${feedParts(f)}`).join('; ')}` : ''}`,
    `- Solids meals: ${solids.length}${solids.length ? `: ${solids.map(s => `${clock(toDate(s.timestamp))} ${(s.foods || []).join(', ')}${s.firstFoods?.length ? ` (first time: ${s.firstFoods.join(', ')})` : ''}`).join('; ')}` : ''}`,
    `- Wees: ${wees.length}${wees.length ? ` (${times(wees)})` : ''}`,
    `- Poos: ${poos.length}${poos.length ? ` (${times(poos)})` : ''}`,
    `- Vitamin D: ${vitD.length ? `logged at ${times(vitD)}` : 'not logged'}`,
    `- Tummy time: ${tummy} min`,
    `- Massages: ${massages.length}`,
  ]

  const lastFeed = entries.filter(e => e.type === 'feed' && toDate(e.timestamp) <= now)
    .sort((a, b) => toDate(b.timestamp).getTime() - toDate(a.timestamp).getTime())[0]
  if (lastFeed) {
    const at = toDate(lastFeed.timestamp)
    lines.push(`Last feed: ${dayKey(at) === dayKey(now) ? '' : 'yesterday or earlier, '}${clock(at)}, ${span((now.getTime() - at.getTime()) / 60000)} ago (${feedParts(lastFeed)})`)
  } else {
    lines.push('Last feed: none in the loaded log')
  }

  lines.push('', 'Previous 7 days:')
  const gaps: number[] = []
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now); d.setDate(d.getDate() - i)
    const es = on(dayKey(d))
    const fs = of(es, 'feed')
    const dayMl = es.reduce((s, e) => s + feedVolume(e), 0)
    const foods = [...new Set(of(es, 'solids').flatMap(s => s.foods || []))]
    lines.push(`- ${d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}: ${fs.length} feeds${dayMl ? ` (${dayMl} ml)` : ''}, ${of(es, 'wee').length} wees, ${of(es, 'poo').length} poos${foods.length ? `, solids: ${foods.join(', ')}` : ''}`)
    for (let j = 1; j < fs.length; j++) {
      const gap = (toDate(fs[j].timestamp).getTime() - toDate(fs[j - 1].timestamp).getTime()) / 60000
      if (gap > 0) gaps.push(gap)
    }
  }
  if (gaps.length) lines.push(`Average gap between feeds within a day, previous 7 days: ${span(gaps.reduce((s, g) => s + g, 0) / gaps.length)}`)

  return lines.join('\n')
}
