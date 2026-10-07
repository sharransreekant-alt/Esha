import { describe, it, expect } from 'vitest'
import { ageBand } from '../src/utils/ageBand'

const born = new Date(2026, 2, 3)   // 3 Mar 2026

describe('ageBand', () => {
  it.each([
    [new Date(2026, 2, 3),   '0-6w'],
    [new Date(2026, 3, 13),  '0-6w'],   // 41 days
    [new Date(2026, 3, 14),  '6w-3m'],  // 42 days
    [new Date(2026, 5, 2),   '6w-3m'],
    [new Date(2026, 5, 3),   '3-6m'],
    [new Date(2026, 8, 2),   '3-6m'],
    [new Date(2026, 8, 3),   '6-9m'],
    [new Date(2026, 9, 7),   '6-9m'],   // 7 months
    [new Date(2026, 11, 3),  '9-12m'],
    [new Date(2027, 2, 2),   '9-12m'],
    [new Date(2027, 2, 3),   '12m+'],
    [new Date(2028, 0, 1),   '12m+'],
  ])('%s -> %s', (now, band) => {
    expect(ageBand(born, now as Date)).toBe(band)
  })
})
