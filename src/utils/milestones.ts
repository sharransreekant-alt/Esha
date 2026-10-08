// Age-banded developmental milestones and care guidance
// All guidance written independently based on WHO, NHMRC Australia, and AAP recommendations

export interface GoalSet {
  feedsPerDay:     number
  weesPerDay:      number
  poosPerDay:      number  // -1 means "variable — see guidance"
  massagesPerDay:  number
  vitaminDPerDay:  number
  tummyTimeMins:   number  // new goal — minutes per day total
  solidsPerDay:    number  // solids meals per day; 0 hides the goal
}

export interface Milestone {
  id:           string
  label:        string     // e.g. "3–6 weeks"
  weekStart:    number
  weekEnd:      number
  goals:        GoalSet
  // Guidance content
  feedVolume:   string     // per-feed volume guidance
  totalDailyMl: string     // total daily ml guidance
  feedFreq:     string     // feed frequency guidance
  poosNote:     string     // important poo context for this age
  growthNote:   string     // growth spurt / weight gain expectations
  whatToExpect: string[]   // 3-4 key things to watch for
  parentTips:   string[]   // practical tips
  // For goal update notifications
  goalChanges?: {
    field:  string
    from:   number
    to:     number
    reason: string
  }[]
}

export const MILESTONES: Milestone[] = [
  {
    id:        '0-3w',
    label:     '0–3 weeks',
    weekStart: 0,
    weekEnd:   3,
    goals: {
      feedsPerDay:    10, weesPerDay: 6, poosPerDay:   3,
      massagesPerDay: 1,  vitaminDPerDay: 1, tummyTimeMins: 5,
      solidsPerDay: 0,
    },
    feedVolume:   '45–90ml per feed',
    totalDailyMl: '500–600ml per day (formula/expressed)',
    feedFreq:     'Every 2–3 hours, 8–12 times per day',
    poosNote:     'Frequent poos are normal — expect 3–6 per day. Mustard yellow and seedy if breastfed, tan/yellow if formula.',
    growthNote:   'Babies typically lose up to 10% of birth weight in the first few days, then regain it by 2 weeks. After that, expect 150–200g gain per week.',
    whatToExpect: [
      'Very frequent feeding — this is normal and builds milk supply',
      'Lots of sleep (16–18 hours per day) broken into short chunks',
      'Jaundice may appear around day 3 — yellow tinge to skin and eyes. Mild cases resolve on their own',
      'Growth spurt around day 7–10 — expect cluster feeding and more fussiness',
    ],
    parentTips: [
      'Feed on demand — don\'t watch the clock, watch her hunger cues',
      'Wet nappy count is your best gauge of adequate feeding',
      'Tummy time can be done on your chest — she doesn\'t need to be on the floor yet',
      'If she hasn\'t regained birth weight by 2 weeks, see your midwife',
    ],
  },
  {
    id:        '3-6w',
    label:     '3–6 weeks',
    weekStart: 3,
    weekEnd:   6,
    goals: {
      feedsPerDay:    9, weesPerDay: 6, poosPerDay:   3,
      massagesPerDay: 1, vitaminDPerDay: 1, tummyTimeMins: 10,
      solidsPerDay: 0,
    },
    feedVolume:   '60–120ml per feed',
    totalDailyMl: '540–720ml per day',
    feedFreq:     'Every 2.5–3 hours, 8–10 times per day',
    poosNote:     'Still expect 2–5 poos per day. Breastfed poos remain loose and seedy.',
    growthNote:   'Gaining 150–200g per week is on track. 6-week check will confirm she\'s tracking her percentile curve.',
    whatToExpect: [
      'Growth spurt at 3 weeks — cluster feeding is normal and doesn\'t mean low supply',
      'Social smiling starts around 4–6 weeks — the first real smile is coming',
      'More alert windows during the day',
      '6-week check — first vaccinations happen here',
    ],
    parentTips: [
      'Introduce tummy time on a firm surface — a rolled towel under the chest helps',
      'Respond to cries promptly — you cannot spoil a baby this young',
      'Start thinking about a loose routine — feed, play, sleep',
    ],
  },
  {
    id:        '6-12w',
    label:     '6–12 weeks',
    weekStart: 6,
    weekEnd:   12,
    goals: {
      feedsPerDay:    8, weesPerDay: 6, poosPerDay:   1,
      massagesPerDay: 1, vitaminDPerDay: 1, tummyTimeMins: 15,
      solidsPerDay: 0,
    },
    feedVolume:   '90–150ml per feed',
    totalDailyMl: '720–900ml per day',
    feedFreq:     'Every 3 hours, 7–9 times per day',
    poosNote:     'Goal set to 1 per day as a general guide. Breastfed babies can sometimes go several days without a poo and this is completely normal — don\'t worry if she misses this goal some days. Formula-fed babies should poo at least once per day.',
    growthNote:   'Weight gain slows slightly to 100–150g per week from around 3 months. Still expect steady upward tracking.',
    whatToExpect: [
      'Breastfed poo frequency drops dramatically — do not panic if she skips days',
      'She\'ll start cooing and "talking" back to you',
      'First real social smiles and some laughing',
      'More predictable wake windows starting to emerge',
    ],
    parentTips: [
      'Tummy time should now be on the floor — aim for 15 minutes spread across the day',
      'Talk to her constantly — narrate what you\'re doing',
      'If breastfed and no poo for 7+ days with a hard belly, consult your GP',
    ],
    goalChanges: [
      { field: 'feedsPerDay',   from: 9,  to: 8,  reason: 'Babies can usually take more at each feed by this age, so fewer feeds are suggested.' },
      { field: 'poosPerDay',    from: 3,  to: 1,  reason: 'From 6 weeks, one poo a day is a reasonable goal — breastfed babies can vary day to day and that\'s normal.' },
      { field: 'tummyTimeMins', from: 10, to: 15, reason: 'Tummy time should increase to build neck and shoulder strength ahead of rolling.' },
    ],
  },
  {
    id:        '3-4m',
    label:     '3–4 months',
    weekStart: 12,
    weekEnd:   18,
    goals: {
      feedsPerDay:    7, weesPerDay: 6, poosPerDay:   1,
      massagesPerDay: 1, vitaminDPerDay: 1, tummyTimeMins: 20,
      solidsPerDay: 0,
    },
    feedVolume:   '120–180ml per feed',
    totalDailyMl: '840–1080ml per day',
    feedFreq:     'Every 3–3.5 hours, 6–8 times per day',
    poosNote:     'Goal set to 1 per day. Breastfed babies remain variable — some days none, some days more. Formula-fed: 1–3 times per day is normal.',
    growthNote:   'Weight gain continues at 100–150g per week. By 4 months most babies have doubled their birth weight.',
    whatToExpect: [
      '4-month sleep regression is real — more night waking after better stretches is typical',
      'Rolling from tummy to back may begin',
      'Grabbing objects intentionally',
      'Second set of vaccinations at 4 months',
    ],
    parentTips: [
      'The 4-month sleep regression is developmental, not a problem to fix',
      'Offer tummy time after every nappy change — short and frequent is better than long and infrequent',
      'She can now hold objects — soft rattles and textured rings are great',
    ],
    goalChanges: [
      { field: 'feedsPerDay',   from: 8,  to: 7,  reason: 'By 3 months many babies take larger feeds with longer gaps, so 7 feeds per day is suggested.' },
      { field: 'massagesPerDay',from: 4,  to: 3,  reason: 'Massage remains valuable but 3 times per day is sufficient from this age.' },
      { field: 'tummyTimeMins', from: 15, to: 20, reason: 'Tummy time target increases to support rolling development.' },
    ],
  },
  {
    id:        '4-6m',
    label:     '4–6 months',
    weekStart: 18,
    weekEnd:   26,
    goals: {
      feedsPerDay:    6, weesPerDay: 6, poosPerDay:   1,
      massagesPerDay: 1, vitaminDPerDay: 1, tummyTimeMins: 30,
      solidsPerDay: 0,
    },
    feedVolume:   '150–210ml per feed',
    totalDailyMl: '900–1200ml per day',
    feedFreq:     'Every 3.5–4 hours, 5–7 times per day',
    poosNote:     'Poos will change significantly when solids are introduced around 6 months.',
    growthNote:   'Weight gain continues to slow — 80–120g per week is normal. By 6 months babies weigh roughly 2.5x their birth weight.',
    whatToExpect: [
      'Sitting with support developing',
      'Solids introduction around 6 months — signs of readiness: sitting with support, showing interest in food',
      'Drooling increases — teething may begin (first tooth usually 4–7 months)',
      'Sleep may consolidate into longer overnight stretches',
    ],
    parentTips: [
      'Don\'t rush solids before 6 months — gut maturity matters',
      'Let her bear weight on her legs when you hold her upright — this builds strength',
      'She\'ll start imitating sounds — repeat them back',
    ],
    goalChanges: [
      { field: 'feedsPerDay',   from: 7,  to: 6,  reason: 'At 4–6 months many babies take more at each feed, so 6 feeds per day is suggested.' },
      { field: 'tummyTimeMins', from: 20, to: 30, reason: 'Aim for 30 minutes total per day to support rolling, sitting and crawling development.' },
    ],
  },
  {
    id:        '6-9m',
    label:     '6–9 months',
    weekStart: 26,
    weekEnd:   39,
    goals: {
      feedsPerDay:    5, weesPerDay: 6, poosPerDay: 1,
      massagesPerDay: 1, vitaminDPerDay: 1, tummyTimeMins: 30,
      solidsPerDay: 1,
    },
    feedVolume:   '180–240ml per feed',
    totalDailyMl: '900–1080ml milk + solids starting',
    feedFreq:     'Every 4 hours, 4–6 times per day (plus solids 1–2x)',
    poosNote:     'Goal set to 1 per day. Poos change significantly with solids — more solid, stronger smelling, varied frequency.',
    growthNote:   'Weight gain continues to slow — 60–100g per week. Focus shifts from milk volume to variety of solid foods.',
    whatToExpect: [
      'Solids are well underway — iron-rich foods are the priority',
      'Sitting independently likely by 7–8 months',
      'Babbling increases — consonant sounds like "ba", "da", "ma"',
      'Separation anxiety may peak',
    ],
    parentTips: [
      'Milk (breast or formula) remains the primary nutrition until 12 months',
      'Offer solids after milk feeds — food is for exploring, not replacing milk',
      'Finger foods help develop pincer grip',
    ],
    goalChanges: [
      { field: 'feedsPerDay', from: 6, to: 5, reason: 'With solids now being introduced, 5 milk feeds per day is appropriate.' },
      { field: 'solidsPerDay', from: 0, to: 1, reason: 'Adds a daily solids meal to your goals. Set it to 0 in Goals if you would rather not track solids.' },
    ],
  },
]

export function getMilestoneForAge(weekAge: number): Milestone {
  for (const m of MILESTONES) {
    if (weekAge >= m.weekStart && weekAge < m.weekEnd) return m
  }
  // Return last milestone if beyond all ranges
  return MILESTONES[MILESTONES.length - 1]
}

export function getPendingGoalUpdate(
  currentGoals: GoalSet,
  weekAge: number
): { milestone: Milestone; changes: NonNullable<Milestone['goalChanges']> } | null {
  const milestone = getMilestoneForAge(weekAge)
  if (!milestone.goalChanges?.length) return null

  // Check if any goal has actually changed from current
  const actualChanges = milestone.goalChanges.filter(c => {
    const currentVal = currentGoals[c.field as keyof GoalSet]
    return currentVal !== c.to
  })

  if (!actualChanges.length) return null
  return { milestone, changes: actualChanges }
}

// Saved goals from before a goal existed are missing its field; fill those from the age suggestion.
export function fillGoals(saved: Partial<GoalSet> | undefined, weekAge: number): GoalSet {
  return { ...getMilestoneForAge(weekAge).goals, ...(saved || {}) }
}

export const DEFAULT_GOALS: GoalSet = {
  feedsPerDay:    10,
  weesPerDay:     6,
  poosPerDay:     3,
  massagesPerDay: 1,
  vitaminDPerDay: 1,
  tummyTimeMins:  5,
  solidsPerDay:   0,
}
