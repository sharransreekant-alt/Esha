import { describe, it, expect } from 'vitest'
import { localTimeIn, zonedToDate, spokenTime } from '../src/time'
import { encodeFields, decodeFields } from '../src/firestore'
import { spokenSummary } from '../src/quickLog'
import type { SavePlan, PlannedItem } from '../../src/voice/applyParsedLog'

const SYD = 'Australia/Sydney'

describe('timezone conversion', () => {
  it('reads a Sydney clock from an instant (daylight time, UTC+11)', () => {
    expect(localTimeIn(new Date('2026-10-07T12:26:00Z'), SYD)).toBe('2026-10-07T23:26')
  })
  it('reads a Sydney clock in winter (UTC+10)', () => {
    expect(localTimeIn(new Date('2026-07-01T17:05:00Z'), SYD)).toBe('2026-07-02T03:05')
  })
  it('turns a Sydney clock time back into the right instant', () => {
    expect(zonedToDate('2026-10-07T23:30', SYD)!.toISOString()).toBe('2026-10-07T12:30:00.000Z')
    expect(zonedToDate('2026-07-02T03:05', SYD)!.toISOString()).toBe('2026-07-01T17:05:00.000Z')
  })
  it('round-trips in other zones', () => {
    for (const tz of ['Australia/Perth', 'Europe/London', 'America/New_York', 'Asia/Kolkata']) {
      const d = new Date('2026-03-15T08:45:00Z')
      expect(zonedToDate(localTimeIn(d, tz), tz)!.getTime()).toBe(d.getTime())
    }
  })
  it('rejects anything that is not a local time', () => {
    expect(zonedToDate('3am', SYD)).toBeNull()
  })
  it('speaks times the way a person would', () => {
    expect(spokenTime(new Date('2026-10-07T12:30:00Z'), SYD)).toBe('11:30 pm')
  })
})

describe('firestore encoding', () => {
  it('round-trips an entry the way the app stores it', () => {
    const entry = {
      type: 'feed', feedType: 'leftBreast', loggedBy: 'Sam', notes: null, duration: 10, volume: 60,
      components: [{ feedType: 'leftBreast', duration: 10 }, { feedType: 'expressed', volume: 60 }],
      timestamp: new Date('2026-10-07T12:30:00Z'), source: 'voice',
    }
    const fields = encodeFields(entry)
    expect(fields.duration).toEqual({ integerValue: '10' })
    expect(fields.timestamp).toEqual({ timestampValue: '2026-10-07T12:30:00.000Z' })
    expect(fields.notes).toEqual({ nullValue: null })
    expect(decodeFields(fields)).toEqual(entry)
  })
  it('leaves out undefined fields', () => {
    expect(encodeFields({ a: 1, b: undefined })).toEqual({ a: { integerValue: '1' } })
  })
})

describe('spoken summary', () => {
  const NOW = new Date('2026-10-07T12:45:00Z')   // 11:45 pm in Sydney
  const item = (payload: any): PlannedItem => ({ payload: { rawSpan: 'x', ...payload }, label: '', question: null })
  const plan = (over: Partial<SavePlan>): SavePlan => ({ save: [], confirm: [], unsupported: [], redFlag: null, ...over })

  it('reads back a feed and a wee with the time when it is not now', () => {
    const at = new Date('2026-10-07T12:30:00Z')
    const said = spokenSummary(plan({ save: [
      item({ type: 'feed', components: [{ feedType: 'formula', volume: 180 }], _t: at }),
      item({ type: 'wee', _t: at }),
    ] }), NOW, SYD)
    expect(said).toBe('Saved a feed of 180 mils formula and a wee at 11:30 pm.')
  })
  it('leaves the time out when it just happened', () => {
    expect(spokenSummary(plan({ save: [item({ type: 'poo', _t: NOW })] }), NOW, SYD)).toBe('Saved a poo.')
  })
  it('describes breast sides and solids', () => {
    const said = spokenSummary(plan({ save: [
      item({ type: 'feed', components: [{ feedType: 'leftBreast', duration: 10 }, { feedType: 'expressed', volume: 60 }], _t: NOW }),
      item({ type: 'solids', foods: ['oats', 'pear'], _t: NOW }),
    ] }), NOW, SYD)
    expect(said).toBe('Saved a feed of 10 minutes left side and 60 mils expressed and solids of oats and pear.')
  })
  it('says what it was unsure about and that it was not saved', () => {
    const said = spokenSummary(plan({ confirm: [item({ type: 'note', rawSpan: 'fed at 2', _t: NOW })] }), NOW, SYD)
    expect(said).toContain('"fed at 2"')
    expect(said).toContain("didn't save")
  })
  it('says so when nothing could be logged', () => {
    expect(spokenSummary(plan({}), NOW, SYD)).toMatch(/nothing was saved/)
  })
  it('always reads the safety message with a red flag, after the saved items', () => {
    const said = spokenSummary(plan({ save: [item({ type: 'wee', _t: NOW })], redFlag: 'Mentioned a fever' }), NOW, SYD)
    expect(said.startsWith('Saved a wee.')).toBe(true)
    expect(said).toContain('1800 022 222')
    expect(said).toContain('triple zero')
  })
})
