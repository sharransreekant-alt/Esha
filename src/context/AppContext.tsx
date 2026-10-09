import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import {
  collection, addDoc, deleteDoc, updateDoc, doc, setDoc,
  query, orderBy, where, limit, onSnapshot, getDoc, Timestamp
} from 'firebase/firestore'
import { onIdTokenChanged, User } from 'firebase/auth'
import { db, auth, ensureSignedIn } from '../firebase'
import {
  Entry, GrowthEntry, JournalEntry, HandoverEntry, Appointment,
  View, DEFAULT_FEED_CYCLE_HOURS, LEGACY_BABY_NAME, LEGACY_BABY_DOB
} from '../types'
import { GoalSet, DEFAULT_GOALS, fillGoals } from '../utils/milestones'
import { toDate } from '../utils/helpers'
import { DataPaths, LEGACY, familyPaths } from '../family/paths'
import { solidsShown } from '../utils/solids'

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
  legacyMoved:    boolean   // the original shared lists have been retired in favour of a family folder
}

// Which family this account belongs to, and whether the app has switched to its folder yet.
export interface FamilyLink { id: string | null; usingFamily: boolean; loaded: boolean }

// Who this phone is signed in as. `email` is null until a real account is attached.
export interface Account { uid: string; email: string | null; name: string | null; signedIn: boolean }

// Attaching Google or email to an existing identity leaves the top-level fields empty,
// so fall back to what the sign-in provider reported.
function toAccount(u: User | null): Account {
  const p = u?.providerData.find(d => d.email || d.displayName)
  return {
    uid: u?.uid || '',
    email: u?.email || p?.email || null,
    name: u?.displayName || p?.displayName || null,
    signedIn: !!u && !u.isAnonymous,
  }
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
  solidsOn:           boolean     // whether solids appear in the app for this baby
  account:            Account
  family:             FamilyLink
  paths:              DataPaths   // where this phone is reading and writing right now
  previewingCopy:     boolean
  setPreviewingCopy:  (on: boolean) => void
  refreshAccount:     () => void
  authReady:          boolean
  loadOlderEntries:   () => void
}

const Ctx = createContext<AppContextValue | null>(null)

// Settings may carry the date of birth as an ISO string; fall back to the built-in one
function parseDob(v: unknown, fallback: Date): Date {
  const d = typeof v === 'string' ? new Date(v) : null
  return d && !isNaN(d.getTime()) ? d : fallback
}

// The profile this phone last saw, so the right name and age show the moment the app opens.
function savedProfile(): { babyName: string; babyDob: Date } {
  try {
    const p = JSON.parse(localStorage.getItem('babyProfile') || 'null')
    if (p?.babyName) return { babyName: p.babyName, babyDob: parseDob(p.babyDob, new Date()) }
  } catch {}
  return { babyName: 'Baby', babyDob: new Date() }
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
    ...savedProfile(),
    settingsLoaded: false,
    historyDays: RECENT_DAYS,
    legacyMoved: false,
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
  const [account, setAccount] = useState<Account>(toAccount(null))
  const refreshAccount = useCallback(() => setAccount(toAccount(auth.currentUser)), [])
  // onIdTokenChanged, not onAuthStateChanged: attaching an account to the phone's existing
  // identity keeps the same user, which the latter never reports.
  useEffect(() => onIdTokenChanged(auth, u => {
    setAccount(toAccount(u))
    // Signed out: go back to an anonymous identity so the app keeps working
    if (!u) ensureSignedIn().catch(() => {})
  }), [])
  useEffect(() => {
    ensureSignedIn().catch(() => {}).finally(() => setAuthReady(true))
  }, [])

  // The account's pointer to its family. Only real accounts have one.
  const [family, setFamily] = useState<FamilyLink>({ id: null, usingFamily: false, loaded: false })
  useEffect(() => {
    if (!account.uid) return
    if (!account.signedIn) { setFamily({ id: null, usingFamily: false, loaded: true }); return }
    // Start from what this phone last knew, so the app opens straight away and still
    // opens with no connection. The live value replaces it as soon as it arrives.
    const key = `familyLink:${account.uid}`
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null')
      if (saved?.id) setFamily({ id: saved.id, usingFamily: !!saved.usingFamily, loaded: true })
    } catch {}
    return onSnapshot(doc(db, 'users', account.uid),
      snap => {
        const d = snap.data()
        const link = { id: (d?.familyId as string) || null, usingFamily: !!d?.usingFamily }
        try { localStorage.setItem(key, JSON.stringify(link)) } catch {}
        setFamily({ ...link, loaded: true })
      },
      () => setFamily(f => ({ ...f, loaded: true })))
  }, [account.uid, account.signedIn])

  // On a new phone the parent's display name isn't stored yet: take it from the family
  useEffect(() => {
    if (state.who || !family.id || !account.uid) return
    getDoc(doc(db, 'families', family.id, 'members', account.uid))
      .then(m => { const name = m.data()?.name; if (typeof name === 'string' && name.trim()) setWho(name.trim()) })
      .catch(() => {})
  }, [state.who, family.id, account.uid])

  // Looking at the copied data before switching to it. Read-only: see assertLive below.
  const [previewingCopy, setPreviewingCopy] = useState(false)
  const inFamily = !!family.id && (family.usingFamily || previewingCopy)
  const paths = useMemo(() => inFamily ? familyPaths(family.id!) : LEGACY, [inFamily, family.id])
  const readOnlyPreview = previewingCopy && !family.usingFamily
  const assertLive = () => {
    // The old lists are closed once the family has moved; this phone must join first
    if (state.legacyMoved && !inFamily) { alert('This log has moved to a family folder. Join it from the More → Family screen to keep logging.'); throw new Error('moved') }
    if (!readOnlyPreview) return
    alert("You're viewing the copied data, which is read-only. Go back to live in More → Family to log.")
    throw new Error('preview is read-only')
  }

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
      onSnapshot(query(collection(db, paths.entries), where('timestamp', '>=', Timestamp.fromDate(historyStart)), orderBy('timestamp', 'desc')),
        snap => { setRecentEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as Entry))); loaded.entries = true; checkDone() },
        () => { loaded.entries = true; checkDone() }),
      onSnapshot(query(collection(db, paths.entries), where('type', '==', 'note')),
        snap => setNoteEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as Entry))), () => {}),
      onSnapshot(query(collection(db, paths.entries), where('type', '==', 'solids')),
        snap => setSolidsEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as Entry))), () => {}),
      onSnapshot(query(collection(db, paths.growth), orderBy('timestamp', 'desc')),
        snap => { set({ growth: snap.docs.map(d => ({ id: d.id, ...d.data() } as GrowthEntry)) }); loaded.growth = true },
        () => { loaded.growth = true }),
      onSnapshot(query(collection(db, paths.journal), orderBy('timestamp', 'desc')),
        snap => { set({ journal: snap.docs.map(d => ({ id: d.id, ...d.data() } as JournalEntry)) }); loaded.journal = true },
        () => { loaded.journal = true }),
      onSnapshot(query(collection(db, paths.handovers), orderBy('timestamp', 'desc'), limit(20)),
        snap => { set({ handovers: snap.docs.map(d => ({ id: d.id, ...d.data() } as HandoverEntry)) }); loaded.handover = true },
        () => { loaded.handover = true }),
      onSnapshot(query(collection(db, paths.appointments), orderBy('createdAt', 'desc')),
        snap => { set({ appointments: snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)) }) },
        () => {}
      ),
      onSnapshot(doc(db, paths.settings),
        snap => {
          const d = snap.data() || {}
          const legacy = paths === LEGACY
          const weekAge = (dob: Date) => (Date.now() - dob.getTime()) / (7 * 86400000)
          const babyDob  = parseDob(d.babyDob, legacy ? LEGACY_BABY_DOB : new Date())
          const babyName = typeof d.babyName === 'string' && d.babyName.trim() ? d.babyName.trim() : legacy ? LEGACY_BABY_NAME : 'Baby'
          set({ settingsLoaded: true, legacyMoved: legacy && !!d.movedToFamily })
          if (!snap.exists()) return
          try { localStorage.setItem('babyProfile', JSON.stringify({ babyName, babyDob: babyDob.toISOString() })) } catch {}
          set({ activeGoals: fillGoals(d.activeGoals, weekAge(babyDob)), feedCycleHours: d.feedCycleHours || DEFAULT_FEED_CYCLE_HOURS, babyDob, babyName })
        },
        () => {}
      ),
    ]

    return () => { clearTimeout(t); unsubs.forEach(u => u()) }
  }, [state.who, authReady, account.uid, paths, state.refreshKey, historyStart, set])

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
    assertLive()
    const { _t, ...rest } = data as any
    const ref = await addDoc(collection(db, paths.entries), {
      ...rest, loggedBy: state.who,
      timestamp: Timestamp.fromDate(_t || new Date()),
    })
    return ref.id
  }

  const updateEntry = async (id: string, data: Partial<Entry>) => {
    assertLive()
    const { timestamp, ...rest } = data as any
    const patch: any = { ...rest }
    if (timestamp) patch.timestamp = Timestamp.fromDate(toDate(timestamp))
    await updateDoc(doc(db, paths.entries, id), patch)
  }

  const removeEntry = async (id: string) => { assertLive(); await deleteDoc(doc(db, paths.entries, id)) }
  const removeGrowth = async (id: string) => { assertLive(); await deleteDoc(doc(db, paths.growth, id)) }
  const removeJournal = async (id: string) => { assertLive(); await deleteDoc(doc(db, paths.journal, id)) }
  const removeHandover = async (id: string) => { assertLive(); await deleteDoc(doc(db, paths.handovers, id)) }

  const saveGrowth = async (data: Omit<GrowthEntry, 'id' | 'loggedBy' | 'timestamp'>) => {
    assertLive()
    await addDoc(collection(db, paths.growth), { ...data, loggedBy: state.who, timestamp: Timestamp.now() })
  }

  const saveJournal = async (data: Omit<JournalEntry, 'id' | 'loggedBy' | 'timestamp'>) => {
    assertLive()
    await addDoc(collection(db, paths.journal), { ...data, loggedBy: state.who, timestamp: Timestamp.now() })
  }

  const saveHandover = async (data: Omit<HandoverEntry, 'id' | 'from' | 'timestamp'>) => {
    assertLive()
    await addDoc(collection(db, paths.handovers), { ...data, from: state.who, timestamp: Timestamp.now() })
  }

  function stripUndefined(obj: Record<string, any>): Record<string, any> {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null))
  }
  const saveAppointment = async (data: Partial<Appointment>) => {
    assertLive()
    const payload = stripUndefined({ ...data } as Record<string, any>)
    if (!payload.createdAt) payload.createdAt = new Date().toISOString()
    await addDoc(collection(db, paths.appointments), payload)
  }
  const updateAppointment = async (id: string, data: Partial<Appointment>) => {
    assertLive()
    await updateDoc(doc(db, paths.appointments, id), stripUndefined(data as Record<string, any>))
  }
  const removeAppointment = async (id: string) => { assertLive(); await deleteDoc(doc(db, paths.appointments, id)) }

  const loadOlderEntries = () => setState(s => ({ ...s, historyDays: s.historyDays + OLDER_STEP_DAYS }))

  const refresh = () => setState(s => ({ ...s, loading: true, refreshKey: s.refreshKey + 1 }))

  // Writes only the goals that changed. Saving the whole set from one phone's copy could
  // silently undo a change the other parent had just made.
  const acceptGoalUpdate = async (changes: Partial<GoalSet>) => {
    assertLive()
    await setDoc(doc(db, paths.settings), { activeGoals: changes }, { merge: true })
    setState(s => ({ ...s, activeGoals: { ...s.activeGoals, ...changes } }))
  }

  const setFeedCycleHours = async (hours: number) => {
    assertLive()
    await setDoc(doc(db, paths.settings), { feedCycleHours: hours }, { merge: true })
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
      ...state, entries, solidsOn: solidsShown(state.babyDob, solidsEntries, state.activeGoals.solidsPerDay), historyStart, loadOlderEntries, account, authReady, refreshAccount, family, paths, previewingCopy, setPreviewingCopy, setView, setWho,
      saveEntry, updateEntry, removeEntry,
      saveGrowth, removeGrowth,
      saveJournal, removeJournal,
      saveHandover, removeHandover,
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
