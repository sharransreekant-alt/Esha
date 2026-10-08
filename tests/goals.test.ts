import { describe, it, expect } from 'vitest'
import { fillGoals, getMilestoneForAge, getPendingGoalUpdate, MILESTONES } from '../src/utils/milestones'

const OLD_SAVED = { feedsPerDay: 5, weesPerDay: 6, poosPerDay: 1, massagesPerDay: 1, vitaminDPerDay: 1, tummyTimeMins: 30 }

describe('solids goal', () => {
  it('is off before six months and one a day from six months', () => {
    for (const m of MILESTONES) expect(m.goals.solidsPerDay).toBe(m.weekStart >= 26 ? 1 : 0)
    expect(getMilestoneForAge(2).goals.solidsPerDay).toBe(0)
    expect(getMilestoneForAge(31).goals.solidsPerDay).toBe(1)
  })

  it('fills the missing field in goals saved before it existed, by age', () => {
    expect(fillGoals(OLD_SAVED, 31).solidsPerDay).toBe(1)
    expect(fillGoals(OLD_SAVED, 10).solidsPerDay).toBe(0)
  })

  it('keeps every value the parents already chose', () => {
    expect(fillGoals({ ...OLD_SAVED, feedsPerDay: 7, solidsPerDay: 2 }, 31)).toMatchObject({ feedsPerDay: 7, solidsPerDay: 2, tummyTimeMins: 30 })
  })

  it('does not raise a goal-update prompt for a family already at six months', () => {
    expect(getPendingGoalUpdate(fillGoals(OLD_SAVED, 31), 31)).toBeNull()
  })
})
