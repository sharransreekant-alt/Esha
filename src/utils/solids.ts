import { Entry } from '../types'
import { toDate } from './helpers'

// Foods are stored lower-case so "Pear" and "pear " are the same food.
export function normFood(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function showFood(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Splits typed text like "oats, pear and egg" into separate foods.
export function splitFoods(text: string): string[] {
  const seen = new Set<string>()
  return text.split(/,|\n|\band\b|&|\+/i).map(normFood).filter(f => f && !seen.has(f) && !!seen.add(f))
}

export interface FoodTried { name: string; first: Date; last: Date; count: number }

// Every food ever logged, with when it was first logged and how often. Facts only.
export function foodsTried(entries: Entry[]): FoodTried[] {
  const map = new Map<string, FoodTried>()
  for (const e of entries) {
    if (e.type !== 'solids') continue
    const at = toDate(e.timestamp)
    for (const raw of e.foods || []) {
      const name = normFood(raw)
      if (!name) continue
      const f = map.get(name)
      if (!f) map.set(name, { name, first: at, last: at, count: 1 })
      else {
        f.count++
        if (at < f.first) f.first = at
        if (at > f.last)  f.last  = at
      }
    }
  }
  return [...map.values()]
}

// Foods for the quick-pick chips: most often logged first, recent ones breaking ties.
export function quickFoods(entries: Entry[]): string[] {
  return foodsTried(entries)
    .sort((a, b) => b.count - a.count || b.last.getTime() - a.last.getTime())
    .map(f => f.name)
}

export function solidsDetail(e: Entry): string {
  const foods = (e.foods || []).map(showFood).join(', ')
  const first = (e.firstFoods || []).map(showFood).join(', ')
  return [foods, first && `first time: ${first}`, e.notes].filter(Boolean).join(' · ')
}
