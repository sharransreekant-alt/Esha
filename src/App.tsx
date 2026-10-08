import React, { useState, useEffect } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import { ToastProvider } from './components/Toast'
import { SetupScreen } from './components/SetupScreen'
import { Header } from './components/Header'
import { Nav } from './components/Nav'
import { LogView } from './components/LogView'
import { TodayView } from './components/TodayView'
import { HistoryView } from './components/HistoryView'
import { MoreView } from './components/MoreView'
import { GrowthView } from './components/GrowthView'
import { InsightsView } from './components/InsightsView'
import { JournalView } from './components/JournalView'
import { HandoverView } from './components/HandoverView'
import { AppointmentsView } from './components/AppointmentsView'
import { NotesView } from './components/NotesView'
import { FoodsView } from './components/FoodsView'
import { ShortcutView } from './components/ShortcutView'
import { GoalsSettingsView } from './components/GoalsSettingsView'
import { AskAI } from './components/AskAI'
import { EveningSummary } from './components/EveningSummary'

function AppShell() {
  const {
    who, view, loading,
    handovers, hasUnreadHandover, setView,
    eveningSeen, markEveningSeen, refresh,
  } = useApp()

  // Auto-refresh when app comes back to foreground (fixes iOS PWA stale data)
  useEffect(() => {
    let hiddenAt = 0
    function handleVisibility() {
      if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return }
      // A quick app switch keeps the live connection; only reload after a real absence
      if (hiddenAt && Date.now() - hiddenAt > 5 * 60000) refresh()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [refresh])

  const [showEvening, setShowEvening] = useState(false)

  // Show evening summary once per day after 6pm
  useEffect(() => {
    const hour = new Date().getHours()
    const today = new Date().toDateString()
    if (hour >= 18 && eveningSeen !== today) {
      const t = setTimeout(() => setShowEvening(true), 1500)
      return () => clearTimeout(t)
    }
  }, [eveningSeen])

  function closeEvening() {
    markEveningSeen()
    setShowEvening(false)
  }

  // Not set up yet
  if (!who) return <SetupScreen />

  // Loading
  if (loading) return <div className="spin" />

  const subViews = ['growth', 'insights', 'journal', 'handover', 'appointments', 'notes', 'goals', 'foods', 'shortcut']
  const isSubView = subViews.includes(view)
  const unread = hasUnreadHandover()

  return (
    <>
      <Header />
      <Nav />

      {/* Handover banner */}
      {unread && !isSubView && (
        <div onClick={() => setView('handover')} style={{ background: 'linear-gradient(135deg,#e8fff4,#f0fff8)', borderBottom: '1px solid rgba(62,184,118,0.2)', padding: '12px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)' }}>🤝 {handovers[0]?.from} left a handover note</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>Tap to read</div>
          </div>
          <div style={{ fontSize: 20, color: 'var(--muted)' }}>›</div>
        </div>
      )}

      {/* Views */}
      {view === 'home'     && <LogView />}
        {view === 'today'    && <TodayView />}
        {view === 'history'  && <HistoryView />}
        {view === 'more'     && <MoreView />}
        {view === 'growth'   && <GrowthView />}
        {view === 'insights' && <InsightsView />}
        {view === 'journal'  && <JournalView />}
        {view === 'handover'     && <HandoverView />}
        {view === 'appointments' && <AppointmentsView />}
        {view === 'notes'        && <NotesView />}
        {view === 'foods'        && <FoodsView />}
        {view === 'shortcut'     && <ShortcutView />}
        {view === 'goals'         && <GoalsSettingsView />}

      {/* Evening summary */}
      {showEvening && <EveningSummary onClose={closeEvening} />}

      {/* AI floating button — always visible */}
      <AskAI />
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </AppProvider>
  )
}
