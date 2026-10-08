import { describe, it, expect } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { Entry } from '../src/types'
import { buildFacts } from '../src/ai/facts'

const NOW = new Date(2026, 9, 9, 9, 40)
let n = 0
const at = (day: number, h: number, m: number, e: Partial<Entry>): Entry =>
  ({ id: `e${n++}`, loggedBy: 'Priya', timestamp: Timestamp.fromDate(new Date(2026, 9, day, h, m)), type: 'wee', ...e } as Entry)

const entries: Entry[] = [
  at(9, 6, 10, { type: 'feed', components: [{ feedType: 'formula', volume: 180 }], volume: 180 }),
  at(9, 7, 40, { type: 'feed', components: [{ feedType: 'leftBreast', duration: 10 }, { feedType: 'expressed', volume: 60 }], volume: 60, notes: 'Esha was fussy' }),
  at(9, 8, 0,  { type: 'solids', foods: ['oats', 'pear'], firstFoods: ['pear'] }),
  at(9, 6, 15, { type: 'wee' }), at(9, 8, 30, { type: 'wee' }),
  at(9, 8, 5,  { type: 'vitaminD' }),
  at(9, 9, 0,  { type: 'tummyTime', duration: 12 }),
  at(9, 7, 0,  { type: 'note', notes: 'call Dr Nguyen about Esha' }),
  at(8, 8, 0,  { type: 'feed', components: [{ feedType: 'formula', volume: 150 }], volume: 150 }),
  at(8, 12, 0, { type: 'feed', components: [{ feedType: 'formula', volume: 150 }], volume: 150 }),
  at(8, 12, 30, { type: 'poo' }),
  at(8, 13, 0, { type: 'solids', foods: ['egg'] }),
]

describe('facts sent to the assistant', () => {
  const facts = buildFacts(entries, 4, NOW)

  it('summarises today with times and amounts', () => {
    expect(facts).toContain('Feeds: 2 (240 ml total): 6:10 am formula 180 ml; 7:40 am left 10 min + expressed 60 ml')
    expect(facts).toContain('Solids meals: 1: 8:00 am oats, pear (first time: pear)')
    expect(facts).toContain('Wees: 2 (6:15 am, 8:30 am)')
    expect(facts).toContain('Poos: 0')
    expect(facts).toContain('Vitamin D: logged at 8:05 am')
    expect(facts).toContain('Tummy time: 12 min')
  })

  it('gives the last feed and how long ago', () => {
    expect(facts).toContain('Last feed: 7:40 am, 2 h 0 min ago (left 10 min + expressed 60 ml)')
  })

  it('summarises previous days and the feed gap', () => {
    expect(facts).toMatch(/Thu,? 8 Oct: 2 feeds \(300 ml\), 0 wees, 1 poos, solids: egg/)
    expect(facts).toContain('Average gap between feeds within a day, previous 7 days: 4 h 0 min')
  })

  it('never includes notes text, who logged, or a name', () => {
    expect(facts).not.toMatch(/Esha|Priya|Nguyen|fussy/)
  })

  it('copes with an empty log', () => {
    const empty = buildFacts([], 4, NOW)
    expect(empty).toContain('Feeds: 0')
    expect(empty).toContain('Last feed: none in the loaded log')
  })
})
