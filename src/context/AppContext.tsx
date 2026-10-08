import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import {
  collection, addDoc, deleteDoc, updateDoc, doc, setDoc,
  query, orderBy, where, limit, onSnapshot, Timestamp, writeBatch
} from 'firebase/firestore'
import { db, ensureSignedIn } from '../firebase'
import {
  Entry, GrowthEntry, JournalEntry, HandoverEntry, Appointment,
  View, DEFAULT_FEED_CYCLE_HOURS, DEFAULT_BABY_NAME, DEFAULT_BABY_DOB
} from '../types'
import { GoalSet, DEFAULT_GOALS, fillGoals } from '../utils/milestones'
import { toDate } from '../utils/helpers'

interface AppState {
  view:           View
  entries:        Entry[]
  growth:         GrowthEntry[]
  journal:        JournalEntry[]
  handovers:      HandoverEntry[]
  loading:        boolean
  who:            string
  reminderDismissed: boolean
  eveningSeen:    string
  handoverSeen:   number
  notifPermission: NotificationPermission | 'unsupported'
  refreshKey:     number
  appointments:   Appointment[]
  activeGoals:    GoalSet
  theme:          'light' | 'dark'
  feedCycleHours: number
  babyDob:        Date
  babyName:       string
  settingsLoaded: boolean   // false until saved goals and settings have arrived
  historyDays:    number    // how many days of entries are loaded
}

interface AppContextValue extends AppState {
  setView:       (v: View) => void
  setWho:        (w: string) => void
  saveEntry:     (data: Omit<Entry, 'id' | 'loggedBy' | 'timestamp'> & { _t?: Date }) => Promise<string>
  updateEntry:   (id: string, data: Partial<Entry>) => Promise<void>
  removeEntry:   (id: string) => Promise<void>
  saveGrowth:    (data: Omit<GrowthEntry, 'id' | 'loggedBy' | 'timestamp'>) => Promise<void>
  removeGrowth:  (id: string) => Promise<void>
  saveJournal:   (data: Omit<JournalEntry, 'id' | 'loggedBy' | 'timestamp'>) => Promise<void>
  removeJournal: (id: string) => Promise<void>
  saveHandover:  (data: Omit<HandoverEntry, 'id' | 'from' | 'timestamp'>) => Promise<void>
  removeHandover:(id: string) => Promise<void>
  importEntries: (entries: object[]) => Promise<void>
  dismissReminder: () => void
  markEveningSeen: () => void
  markHandoverSeen: () => void
  requestNotifPermission: () => Promise<void>
  reminderActive: () => boolean
  nextFeedIn:    () => number | null
  hasUnreadHandover: () => boolean
  refresh:            () => void
  appointments:       Appointment[]
  saveAppointment:    (data: Partial<Appointment>) => Promise<void>
  updateAppointment:  (id: string, data: Partial<Appointment>) => Promise<void>
  removeAppointment:  (id: string) => Promise<void>
  activeGoals:        GoalSet
  acceptGoalUpdate:   (changes: Partial<GoalSet>) => Promise<void>
  toggleTheme:        () => void
  setFeedCycleHours:  (hours: number) => Promise<void>
  historyStart:       Date        // entries older than this are not loaded yet
  loadOlderEntries:   () => void
}

const Ctx = createContext<AppContextValue | null>(null)

// Settings may carry the date of birth as an ISO string; fall back to the built-in one
function parseDob(v: unknown): Date {
  const d = typeof v === 'string' ? new Date(v) : null
  return d && !isNaN(d.getTime()) ? d : DEFAULT_BABY_DOB
}

const RECENT_DAYS = 14
const OLDER_STEP_DAYS = 30

function computeDefaultTheme(): 'light' | 'dark' {
  const stored = localStorage.getItem('eshaTheme')
  if (stored === 'light' || stored === 'dark') return stored
  const hour = new Date().getHours()
  return (hour >= 19 || hour < 7) ? 'dark' : 'light'
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    view:    'home',
    entries: [], growth: [], journal: [], handovers: [],
    loading: true,
    who:     localStorage.getItem('eshaWho') || '',
    reminderDismissed: false,
    eveningSeen:  localStorage.getItem('eveningSeen') || '',
    handoverSeen: parseInt(localStorage.getItem('handoverSeen') || '0'),
    notifPermission: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
    refreshKey: 0,
    appointments: [],
    activeGoals: DEFAULT_GOALS,
    theme: computeDefaultTheme(),
    feedCycleHours: DEFAULT_FEED_CYCLE_HOURS,
    babyDob: DEFAULT_BABY_DOB,
    babyName: DEFAULT_BABY_NAME,
    settingsLoaded: false,
    historyDays: RECENT_DAYS,
  })

  // Entries arrive from three listeners: the recent window, plus all notes and all solids
  // (both small, and both needed in full by their own screens). Loading every entry ever
  // logged on each app open is what exhausts the database's daily read allowance.
  const [recentEntries, setRecentEntries] = useState<Entry[]>([])
  const [noteEntries,   setNoteEntries]   = useState<Entry[]>([])
  const [solidsEntries, setSolidsEntries] = useState<Entry[]>([])

  const historyStart = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - state.historyDays)
    return d
  }, [state.historyDays, state.refreshKey])

  const entries = useMemo(() => {
    const byId = new Map<string, Entry>()
    for (const e of [...noteEntries, ...solidsEntries, ...recentEntries]) byId.set(e.id, e)
    return [...byId.values()].sort((a, b) => toDate(b.timestamp).getTime() - toDate(a.timestamp).getTime())
  }, [recentEntries, noteEntries, solidsEntries])

  const set = useCallback((patch: Partial<AppState>) =>
    setState(s => ({ ...s, ...patch })), [])

  // Apply theme to <html> whenever it changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme)
  }, [state.theme])

  const toggleTheme = () => {
    const next = state.theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('eshaTheme', next)
    set({ theme: next })
  }

  // Sign in before reading anything, so the database rules can require it.
  // If sign-in fails we still try to subscribe; the rules decide what happens.
  const [authReady, setAuthReady] = useState(false)
  useEffect(() => {
    ensureSignedIn().catch(() => {}).finally(() => setAuthReady(true))
  }, [])

  // Firebase subscriptions
  useEffect(() => {
    if (!state.who || !authReady) return
    let loaded = { entries: false, growth: false, journal: false, handover: false }
    const checkDone = () => {
      if (loaded.entries) set({ loading: false })
    }
    // Failsafe — show after 5s no matter what
    const t = setTimeout(() => set({ loading: false }), 5000)

    const unsubs = [
      onSnapshot(query(collection(db, 'esha_entries'), where('timestamp', '>=', Timestamp.fromDate(historyStart)), orderBy('timestamp', 'desc')),
        snap => { setRecentEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as Entry))); loaded.entries = true; checkDone() },
        () => { loaded.entries = true; checkDone() }),
      onSnapshot(query(collection(db, 'esha_entries'), where('type', '==', 'note')),
        snap => setNoteEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as Entry))), () => {}),
      onSnapshot(query(collection(db, 'esha_entries'), where('type', '==', 'solids')),
        snap => setSolidsEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as Entry))), () => {}),
      onSnapshot(query(collection(db, 'esha_growth'), orderBy('timestamp', 'desc')),
        snap => { set({ growth: snap.docs.map(d => ({ id: d.id, ...d.data() } as GrowthEntry)) }); loaded.growth = true },
        () => { loaded.growth = true }),
      onSnapshot(query(collection(db, 'esha_journal'), orderBy('timestamp', 'desc')),
        snap => { set({ journal: snap.docs.map(d => ({ id: d.id, ...d.data() } as JournalEntry)) }); loaded.journal = true },
        () => { loaded.journal = true }),
      onSnapshot(query(collection(db, 'esha_handover'), orderBy('timestamp', 'desc'), limit(20)),
        snap => { set({ handovers: snap.docs.map(d => ({ id: d.id, ...d.data() } as HandoverEntry)) }); loaded.handover = true },
        () => { loaded.handover = true }),
      onSnapshot(query(collection(db, 'esha_appointments'), orderBy('createdAt', 'desc')),
        snap => { set({ appointments: snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)) }) },
        () => {}
      ),
      onSnapshot(doc(db, 'esha_settings', 'config'),
        snap => { set({ settingsLoaded: true }); if (snap.exists()) { const d = snap.data(); if (d) set({ activeGoals: d.activeGoals ? fillGoals(d.activeGoals, (Date.now() - parseDob(d.babyDob).getTime()) / (7 * 86400000)) : DEFAULT_GOALS, feedCycleHours: d.feedCycleHours || DEFAULT_FEED_CYCLE_HOURS, babyDob: parseDob(d.babyDob), babyName: typeof d.babyName === 'string' && d.babyName.trim() ? d.babyName.trim() : DEFAULT_BABY_NAME }) } },
        () => {}
      ),
    ]

    return () => { clearTimeout(t); unsubs.forEach(u => u()) }
  }, [state.who, authReady, state.refreshKey, historyStart, set])

  // Helpers
  const lastFeed = useCallback((): Date | null => {
    const f = entries.find(e => e.type === 'feed')
    return f ? toDate(f.timestamp) : null
  }, [entries])

  const reminderActive = useCallback((): boolean => {
    if (state.reminderDismissed) return false
    const lf = lastFeed()
    if (!lf) return false
    const cycleMs = state.feedCycleHours * 60 * 60 * 1000
    const remindAtMs = cycleMs - 30 * 60000
    const el = Date.now() - lf.getTime()
    return el >= remindAtMs && el < cycleMs + 30 * 60000
  }, [state.reminderDismissed, state.feedCycleHours, lastFeed])

  const nextFeedIn = useCallback((): number | null => {
    const lf = lastFeed()
    if (!lf) return null
    const cycleMs = state.feedCycleHours * 60 * 60 * 1000
    const ms = lf.getTime() + cycleMs - Date.now()
    return ms > 0 ? ms : 0
  }, [lastFeed, state.feedCycleHours])

  const hasUnreadHandover = useCallback((): boolean => {
    const h = state.handovers[0]
    if (!h) return false
    return toDate(h.timestamp).getTime() > state.handoverSeen && h.from !== state.who
  }, [state.handovers, state.handoverSeen, state.who])

  // Write ops
  const saveEntry = async (data: Omit<Entry, 'id' | 'loggedBy' | 'timestamp'> & { _t?: Date }) => {
    const { _t, ...rest } = data as any
    const ref = await addDoc(collection(db, 'esha_entries'), {
      ...rest, loggedBy: state.who,
      timestamp: Timestamp.fromDate(_t || new Date()),
    })
    return ref.id
  }

  const updateEntry = async (id: string, data: Partial<Entry>) => {
    const { timestamp, ...rest } = data as any
    const patch: any = { ...rest }
    if (timestamp) patch.timestamp = Timestamp.fromDate(toDate(timestamp))
    await updateDoc(doc(db, 'esha_entries', id), patch)
  }

  const removeEntry   = (id: string) => deleteDoc(doc(db, 'esha_entries', id))
  const removeGrowth  = (id: string) => deleteDoc(doc(db, 'esha_growth', id))
  const removeJournal = (id: string) => deleteDoc(doc(db, 'esha_journal', id))
  const removeHandover= (id: string) => deleteDoc(doc(db, 'esha_handover', id))

  const saveGrowth = async (data: Omit<GrowthEntry, 'id' | 'loggedBy' | 'timestamp'>) =>
    addDoc(collection(db, 'esha_growth'), { ...data, loggedBy: state.who, timestamp: Timestamp.now() }).then(() => {})

  const saveJournal = async (data: Omit<JournalEntry, 'id' | 'loggedBy' | 'timestamp'>) =>
    addDoc(collection(db, 'esha_journal'), { ...data, loggedBy: state.who, timestamp: Timestamp.now() }).then(() => {})

  const saveHandover = async (data: Omit<HandoverEntry, 'id' | 'from' | 'timestamp'>) =>
    addDoc(collection(db, 'esha_handover'), { ...data, from: state.who, timestamp: Timestamp.now() }).then(() => {})

  const importEntries = async (entries: object[]) => {
    const CHUNK = 400
    for (let i = 0; i < entries.length; i += CHUNK) {
      const batch = writeBatch(db)
      entries.slice(i, i + CHUNK).forEach((entry: any) => {
        const ref = doc(collection(db, 'esha_entries'))
        const ts = entry.timestamp ? Timestamp.fromDate(new Date(entry.timestamp)) : Timestamp.now()
        batch.set(ref, { ...entry, timestamp: ts })
      })
      await batch.commit()
    }
  }

  function stripUndefined(obj: Record<string, any>): Record<string, any> {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null))
  }
  const saveAppointment = async (data: Partial<Appointment>) => {
    const payload = stripUndefined({ ...data } as Record<string, any>)
    if (!payload.createdAt) payload.createdAt = new Date().toISOString()
    await addDoc(collection(db, 'esha_appointments'), payload)
  }
  const updateAppointment = async (id: string, data: Partial<Appointment>) => {
    await updateDoc(doc(db, 'esha_appointments', id), stripUndefined(data as Record<string, any>))
  }
  const removeAppointment = (id: string) => deleteDoc(doc(db, 'esha_appointments', id))

  const loadOlderEntries = () => setState(s => ({ ...s, historyDays: s.historyDays + OLDER_STEP_DAYS }))

  const refresh = () => setState(s => ({ ...s, loading: true, refreshKey: s.refreshKey + 1 }))

  // Writes only the goals that changed. Saving the whole set from one phone's copy could
  // silently undo a change the other parent had just made.
  const acceptGoalUpdate = async (changes: Partial<GoalSet>) => {
    await setDoc(doc(db, 'esha_settings', 'config'), { activeGoals: changes }, { merge: true })
    setState(s => ({ ...s, activeGoals: { ...s.activeGoals, ...changes } }))
  }

  const setFeedCycleHours = async (hours: number) => {
    await setDoc(doc(db, 'esha_settings', 'config'), { feedCycleHours: hours }, { merge: true })
    set({ feedCycleHours: hours })
  }

  const requestNotifPermission = async () => {
    if (typeof Notification === 'undefined') return
    const p = await Notification.requestPermission()
    set({ notifPermission: p })
  }

  const setView  = (view: View)  => set({ view })
  const setWho   = (who: string) => { localStorage.setItem('eshaWho', who); set({ who }) }
  const dismissReminder  = () => set({ reminderDismissed: true })
  const markEveningSeen  = () => { const t = new Date().toDateString(); localStorage.setItem('eveningSeen', t); set({ eveningSeen: t }) }
  const markHandoverSeen = () => {
    const h = state.handovers[0]
    if (!h) return
    const t = toDate(h.timestamp).getTime()
    localStorage.setItem('handoverSeen', String(t))
    set({ handoverSeen: t })
  }

  return (
    <Ctx.Provider value={{
      ...state, entries, historyStart, loadOlderEntries, setView, setWho,
      saveEntry, updateEntry, removeEntry,
      saveGrowth, removeGrowth,
      saveJournal, removeJournal,
      saveHandover, removeHandover,
      importEntries,
      dismissReminder, markEveningSeen, markHandoverSeen,
      requestNotifPermission,
      reminderActive, nextFeedIn, hasUnreadHandover,
      refresh,
      activeGoals: state.activeGoals,
      acceptGoalUpdate,
      toggleTheme,
      setFeedCycleHours,
      appointments: state.appointments,
      saveAppointment, updateAppointment, removeAppointment,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
