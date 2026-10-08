import { describe, it, expect } from 'vitest'
import { planSaves } from '../src/voice/applyParsedLog'
import { ParsedEvent, ParsedLog, ParsedLogSchema, validateParsedLog, fromLocalTime, toLocalTime } from '../shared/parsedLog'

const NOW = new Date(2026, 9, 7, 3, 12)   // 7 Oct 2026, 03:12 local

function ev(over: Partial<ParsedEvent>): ParsedEvent {
  return {
    type: 'wee', at: '2026-10-07T03:12', components: null, minutes: null, foods: null,
    firstTime: null, note: null, confidence: 0.95, rawSpan: 'wee', ...over,
  }
}
function log(events: ParsedEvent[], over: Partial<ParsedLog> = {}): ParsedLog {
  return { commands: [], events, needsConfirm: [], redFlag: null, ...over }
}

describe('planSaves', () => {
  it('saves wee and poo as two entries', () => {
    const plan = planSaves(log([ev({}), ev({ type: 'poo', rawSpan: 'poo' })]), NOW, 'u1')
    expect(plan.save.map(i => i.payload.type)).toEqual(['wee', 'poo'])
    expect(plan.confirm).toEqual([])
    expect(plan.save.every(i => i.payload.source === 'voice' && i.payload.utteranceId === 'u1')).toBe(true)
  })

  it('resolves "60ml formula at 3am" to one formula feed at 03:00', () => {
    const plan = planSaves(log([ev({
      type: 'feed', at: '2026-10-07T03:00', rawSpan: '60ml formula at 3am',
      components: [{ feedType: 'formula', minutes: null, ml: 60 }],
    })]), NOW, 'u1')
    const p = plan.save[0].payload
    expect(p).toMatchObject({ type: 'feed', feedType: 'formula', volume: 60, duration: null })
    expect(p.components).toEqual([{ feedType: 'formula', volume: 60 }])
    expect(p._t).toEqual(new Date(2026, 9, 7, 3, 0))
  })

  it('keeps a breast side plus expressed as one feed with two parts', () => {
    const plan = planSaves(log([
      ev({
        type: 'feed', rawSpan: 'left side ten minutes then 60ml expressed',
        components: [
          { feedType: 'leftBreast', minutes: 10, ml: null },
          { feedType: 'expressed',  minutes: null, ml: 60 },
        ],
      }),
      ev({}),
    ]), NOW, 'u1')
    expect(plan.save).toHaveLength(2)
    expect(plan.save[0].payload).toMatchObject({
      type: 'feed', feedType: 'leftBreast', duration: 10, volume: 60,
      components: [{ feedType: 'leftBreast', duration: 10 }, { feedType: 'expressed', volume: 60 }],
    })
    expect(plan.save[1].payload.type).toBe('wee')
  })

  it('handles newborn-sized values', () => {
    const plan = planSaves(log([ev({
      type: 'feed', rawSpan: 'right 7 minutes left 5 then 25 expressed',
      components: [
        { feedType: 'rightBreast', minutes: 7, ml: null },
        { feedType: 'leftBreast',  minutes: 5, ml: null },
        { feedType: 'expressed',   minutes: null, ml: 25 },
      ],
    })]), NOW, 'u1')
    expect(plan.save[0].payload).toMatchObject({ duration: 12, volume: 25 })
  })

  it('asks instead of saving below the threshold', () => {
    const plan = planSaves(log([ev({ confidence: 0.84 }), ev({ type: 'poo', confidence: 0.85 })]), NOW, 'u1')
    expect(plan.save.map(i => i.payload.type)).toEqual(['poo'])
    expect(plan.confirm.map(i => i.payload.type)).toEqual(['wee'])
    expect(plan.confirm[0].question).toBeTruthy()
  })

  it('asks when the parser attached a question, even at high confidence', () => {
    const plan = planSaves(log([ev({})], {
      needsConfirm: [{ question: 'Already logged a wee at 3:10 by Sam. Add anyway?', eventIndex: 0, options: null }],
    }), NOW, 'u1')
    expect(plan.save).toEqual([])
    expect(plan.confirm[0].question).toBe('Already logged a wee at 3:10 by Sam. Add anyway?')
  })

  it('never silently saves a time in the future', () => {
    const plan = planSaves(log([ev({ at: '2026-10-07T15:00' })]), NOW, 'u1')
    expect(plan.save).toEqual([])
    expect(plan.confirm[0].payload._t).toEqual(NOW)
  })

  it('treats a time a few minutes ahead as now and still saves it', () => {
    const plan = planSaves(log([ev({ at: '2026-10-07T03:15' })]), NOW, 'u1')
    expect(plan.confirm).toEqual([])
    expect(plan.save[0].payload._t).toEqual(NOW)
  })

  it('never silently saves a feed with no usable quantity', () => {
    const plan = planSaves(log([ev({
      type: 'feed', rawSpan: 'had a feed',
      components: [{ feedType: 'formula', minutes: null, ml: null }],
    })]), NOW, 'u1')
    expect(plan.save).toEqual([])
    expect(plan.confirm[0].payload).toMatchObject({ type: 'note', notes: 'had a feed' })
  })

  it('saves solids as one entry with a food list', () => {
    const plan = planSaves(log([ev({
      type: 'solids', foods: ['Pumpkin', ' avocado '], firstTime: false, rawSpan: 'had pumpkin and avocado',
    })]), NOW, 'u1', new Set(['pumpkin', 'avocado']))
    expect(plan.save).toHaveLength(1)
    expect(plan.save[0].payload).toMatchObject({ type: 'solids', foods: ['pumpkin', 'avocado'] })
    expect(plan.save[0].payload).not.toHaveProperty('firstFoods')
  })

  it('marks a food as first time when the parent says so', () => {
    const plan = planSaves(log([ev({ type: 'solids', foods: ['egg'], firstTime: true, rawSpan: 'tried egg for the first time' })]), NOW, 'u1', new Set(['egg']))
    expect(plan.save[0].payload.firstFoods).toEqual(['egg'])
  })

  it('marks only never-logged foods as first time otherwise', () => {
    const plan = planSaves(log([ev({ type: 'solids', foods: ['oats', 'pear'], firstTime: false, rawSpan: 'oats and pear' })]), NOW, 'u1', new Set(['oats']))
    expect(plan.save[0].payload.firstFoods).toEqual(['pear'])
  })

  it('asks rather than saving solids with no foods', () => {
    const plan = planSaves(log([ev({ type: 'solids', foods: [], firstTime: false, rawSpan: 'she had lunch' })]), NOW, 'u1')
    expect(plan.save).toEqual([])
    expect(plan.confirm[0].payload).toMatchObject({ type: 'note', notes: 'she had lunch' })
  })

  it('saves durations for massage and tummy time', () => {
    const plan = planSaves(log([ev({ type: 'tummyTime', minutes: 5 }), ev({ type: 'massage', minutes: null })]), NOW, 'u1')
    expect(plan.save[0].payload).toMatchObject({ type: 'tummyTime', duration: 5 })
    expect(plan.save[1].payload).not.toHaveProperty('duration')
  })

  it('turns unmapped speech into a note rather than dropping it', () => {
    const plan = planSaves(log([ev({ type: 'note', note: null, rawSpan: 'she rolled over' })]), NOW, 'u1')
    expect(plan.save[0].payload).toMatchObject({ type: 'note', notes: 'she rolled over' })
  })

  it('reports timer commands as not yet supported and saves nothing for them', () => {
    const plan = planSaves(log([], {
      commands: [{ type: 'timer_start', kind: 'feed_left', startedAt: null, rawSpan: 'start left feed' }],
    }), NOW, 'u1')
    expect(plan.save).toEqual([])
    expect(plan.unsupported).toEqual(['start left feed'])
  })

  it('carries the red flag reason and still saves the log', () => {
    const plan = planSaves(log([ev({
      type: 'feed', components: [{ feedType: 'formula', minutes: null, ml: 60 }],
    })], { redFlag: { reason: 'Mentioned a fever' } }), NOW, 'u1')
    expect(plan.redFlag).toBe('Mentioned a fever')
    expect(plan.save).toHaveLength(1)
  })
})

describe('parsed log schema', () => {
  it('rejects unknown event types', () => {
    expect(ParsedLogSchema.safeParse(log([{ ...ev({}), type: 'sleep' } as any])).success).toBe(false)
  })
  it('rejects a missing rawSpan', () => {
    const { rawSpan, ...rest } = ev({})
    expect(ParsedLogSchema.safeParse(log([rest as any])).success).toBe(false)
  })
  it('flags times with an offset and out-of-range confidence', () => {
    expect(validateParsedLog(log([ev({ at: '2026-10-07T03:00:00+11:00' })]))).toMatch(/local time/)
    expect(validateParsedLog(log([ev({ confidence: 1.2 })]))).toMatch(/confidence/)
    expect(validateParsedLog(log([ev({})]))).toBeNull()
  })
  it('round-trips local times', () => {
    expect(toLocalTime(fromLocalTime('2026-10-07T03:05')!)).toBe('2026-10-07T03:05')
    expect(fromLocalTime('3am')).toBeNull()
  })
})
