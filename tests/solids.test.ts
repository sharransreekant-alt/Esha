import { describe, it, expect } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { Entry } from '../src/types'
import { foodsTried, quickFoods, splitFoods, solidsDetail } from '../src/utils/solids'

const solids = (day: number, foods: string[], extra: Partial<Entry> = {}): Entry => ({
  id: `e${day}${foods.join('')}`, type: 'solids', loggedBy: 'A',
  timestamp: Timestamp.fromDate(new Date(2026, 9, day, 12)), foods, ...extra,
})

describe('solids helpers', () => {
  it('splits typed foods', () => {
    expect(splitFoods('Oats, pear and  Lentil Rice')).toEqual(['oats', 'pear', 'lentil rice'])
    expect(splitFoods('egg, Egg')).toEqual(['egg'])
    expect(splitFoods('  ')).toEqual([])
  })

  it('lists each food with its first date and count', () => {
    const list = foodsTried([solids(5, ['oats', 'pear']), solids(3, ['oats']), solids(7, ['Egg'])])
    const oats = list.find(f => f.name === 'oats')!
    expect(oats.count).toBe(2)
    expect(oats.first).toEqual(new Date(2026, 9, 3, 12))
    expect(list.map(f => f.name).sort()).toEqual(['egg', 'oats', 'pear'])
  })

  it('ignores non-solids entries', () => {
    expect(foodsTried([{ ...solids(1, ['oats']), type: 'note' }])).toEqual([])
  })

  it('offers the most-logged foods first', () => {
    expect(quickFoods([solids(5, ['oats', 'pear']), solids(3, ['oats']), solids(7, ['egg'])])).toEqual(['oats', 'egg', 'pear'])
  })

  it('describes an entry as facts only', () => {
    expect(solidsDetail(solids(1, ['oats', 'pear'], { firstFoods: ['pear'], notes: 'half a bowl' }))).toBe('Oats, Pear · first time: Pear · half a bowl')
  })
})
