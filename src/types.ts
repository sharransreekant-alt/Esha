import { Timestamp } from 'firebase/firestore'

export type FeedType = 'rightBreast' | 'leftBreast' | 'expressed' | 'formula'

export interface FeedComponent {
  feedType: FeedType
  duration?: number | null
  volume?:   number | null
}

export type EntryType = 'feed' | 'solids' | 'wee' | 'poo' | 'massage' | 'tummyTime' | 'vitaminD' | 'note'

export interface Entry {
  id:         string
  type:       EntryType
  timestamp:  Timestamp
  loggedBy:   string
  // feed-specific
  feedType?:  FeedType
  components?: FeedComponent[]
  duration?:  number | null
  volume?:    number | null
  // solids-specific: foods are lower-case; firstFoods are the ones logged for the first time
  foods?:      string[]
  firstFoods?: string[]
  // shared optional
  notes?:     string | null
  // set on entries created from a spoken or typed sentence
  source?:      'voice'
  rawSpan?:     string
  utteranceId?: string
}

export interface GrowthEntry {
  id:        string
  timestamp: Timestamp
  loggedBy:  string
  weight?:   number | null   // grams
  length?:   number | null   // cm
  head?:     number | null   // cm
  notes?:    string | null
}

export interface JournalEntry {
  id:        string
  timestamp: Timestamp
  loggedBy:  string
  text:      string
  mood?:     string
}

export interface HandoverEntry {
  id:          string
  timestamp:   Timestamp
  from:        string
  status:      string
  notes?:      string | null
  lastFeedAgo?: string | null
}

export type View = 'home' | 'today' | 'history' | 'more' | 'growth' | 'insights' | 'journal' | 'handover' | 'askai' | 'appointments' | 'notes' | 'goals' | 'foods' | 'shortcut' | 'account' | 'family'


export const FEED_LABELS: Record<FeedType, string> = {
  rightBreast: 'Right Breast',
  leftBreast:  'Left Breast',
  expressed:   'Expressed',
  formula:     'Formula',
}

export const FEED_EMOJI: Record<FeedType, string> = {
  rightBreast: '🤱',
  leftBreast:  '🤱',
  expressed:   '🍶',
  formula:     '🍼',
}

// Profile for the original shared lists, which were created before profiles were stored.
// Every family folder carries its own babyName and babyDob; code reads those via useApp().
export const LEGACY_BABY_NAME = 'Esha'
export const LEGACY_BABY_DOB  = new Date('2026-03-03T01:50:00Z')
export const DEFAULT_FEED_CYCLE_HOURS = 4

export interface Appointment {
  id:          string
  type:        string
  icon:        string
  date:        string
  time?:       string
  location?:   string
  doctor?:     string
  questions:   string[]
  completed:   boolean
  outcome?:    string
  weight?:     number
  vaccines?:   string
  followUp?:   string
  loggedBy:    string
  createdAt:   string
}
