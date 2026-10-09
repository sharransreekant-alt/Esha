import { describe, it, expect } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { Entry } from '../src/types'
import { solidsShown } from '../src/utils/solids'

const NOW = new Date(2026, 9, 9)
const bornWeeksAgo = (w: number) => new Date(NOW.getTime() - w * 7 * 86400000)
const solidsEntry = { id: 's', type: 'solids', loggedBy: 'A', timestamp: Timestamp.fromDate(NOW), foods: ['pear'] } as Entry

describe('whether solids appear', () => {
  it('stays hidden for a newborn', () => {
    expect(solidsShown(bornWeeksAgo(5), [], 0, NOW)).toBe(false)
    expect(solidsShown(bornWeeksAgo(16), [], 0, NOW)).toBe(false)
  })
  it('appears from about four months', () => {
    expect(solidsShown(bornWeeksAgo(17), [], 0, NOW)).toBe(true)
    expect(solidsShown(bornWeeksAgo(31), [], 0, NOW)).toBe(true)
  })
  it('appears earlier if the family has logged solids or set a solids goal', () => {
    expect(solidsShown(bornWeeksAgo(12), [solidsEntry], 0, NOW)).toBe(true)
    expect(solidsShown(bornWeeksAgo(12), [], 1, NOW)).toBe(true)
  })
})
