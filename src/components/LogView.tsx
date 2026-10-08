import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { EntryList } from './EntryList'
import { FeedModal } from './modals/FeedModal'
import { SolidsModal } from './modals/SolidsModal'
import { Entry, FeedComponent } from '../types'
import { inputToDate, fmtTime, fmtMs } from '../utils/helpers'

function localDateStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
import { LeapCard } from './LeapCard'
import { GuidanceCard } from './GuidanceCard'
import { GoalUpdateCard } from './GoalUpdateCard'
import { CATEGORY_ICON, CATEGORY_BG, CATEGORY_FG } from './Icons'
import { SayIt } from './SayIt'
import { voiceEnabled } from '../voice/parseClient'

interface SimpleModalProps {
  emoji: string
  title: string
  onClose: () => void
  onSave: (t: string, notes: string, dur?: string) => Promise<void>
  hasDuration?: boolean
  durationLabel?: string
  hasNotes?: boolean
}

function SimpleModal({ emoji, title, onClose, onSave, hasDuration, durationLabel, hasNotes = true }: SimpleModalProps) {
  const n = new Date()
  const [date,   setDate]   = useState(localDateStr())
  const [time,   setTime]   = useState(`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`)
  const [notes,  setNotes]  = useState('')
  const [dur,    setDur]    = useState('')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await onSave(date + 'T' + time, notes, dur)
    } catch (e: any) {
      console.error('Save failed:', e)
      setError('Save failed — check your connection')
      setSaving(false)
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(46,28,18,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(8px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: 'var(--r) var(--r) 0 0', width: '100%', maxWidth: 430, margin: '0 auto', padding: '8px 20px 48px', boxShadow: '0 -8px 40px rgba(100,60,20,0.18)' }}>
        <div style={{ width: 36, height: 4, background: 'var(--handle)', borderRadius: 2, margin: '12px auto 20px' }} />
        <div className="serif" style={{ fontSize: 20, textAlign: 'center', color: 'var(--text)', marginBottom: 20 }}>{title}</div>
        {hasDuration && (
          <div className="fg">
            <label className="flbl">Duration (minutes)</label>
            <input className="finput" type="number" inputMode="numeric" placeholder={durationLabel ? "e.g. 5" : "e.g. 10"} value={dur} onChange={e => setDur(e.target.value)} />
          </div>
        )}
        <div className="fg">
          <label className="flbl">Date &amp; time</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input className="finput" type="date" style={{ flex: 1 }} value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="finput" type="time" style={{ flex: 1 }} value={time} onChange={e => setTime(e.target.value)} />
            <button
              onClick={() => { const now = new Date(); setDate(localDateStr()); setTime(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`) }}
              style={{ padding: '0 14px', background: 'var(--cream2)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-med)', fontSize: 13, fontWeight: 700 }}
            >Now</button>
          </div>
        </div>
        {hasNotes && (
          <div className="fg">
            <label className="flbl">Notes (optional)</label>
            <input className="finput" type="text" placeholder="Any observations…" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        )}
        {error && <div style={{ color: 'var(--red)', fontSize: 13, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>{error}</div>}
        <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ marginTop: 6 }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button className="btn-secondary" onClick={onClose} style={{ marginTop: 8 }} disabled={saving}>Cancel</button>
      </div>
    </div>
  )
}

function TummyTimeModal({ onClose, onSave }: { onClose: () => void; onSave: (t: string, notes: string, dur: string) => Promise<void> }) {
  const n = new Date()
  const [date,    setDate]    = React.useState(localDateStr())
  const [time,    setTime]    = React.useState(`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`)
  const [manualDur, setManualDur] = React.useState('')
  const [running, setRunning] = React.useState(false)
  const [elapsed, setElapsed] = React.useState(0)
  const [startMs, setStartMs] = React.useState<number | null>(null)
  const [saving,  setSaving]  = React.useState(false)
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  React.useEffect(() => {
    if (running && startMs !== null) {
      intervalRef.current = setInterval(() => setElapsed(Date.now() - startMs), 500)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, startMs])

  function startTimer() { setRunning(true); setStartMs(Date.now() - elapsed) }
  function pauseTimer() { setRunning(false) }
  function resetTimer() { setRunning(false); setElapsed(0); setStartMs(null) }

  async function handleSave() {
    const mins = elapsed > 0 ? String(Math.max(1, Math.round(elapsed / 60000))) : manualDur.trim()
    if (!mins || parseInt(mins) <= 0) { alert('Enter or time a duration'); return }
    setSaving(true)
    try { await onSave(date + 'T' + time, '', mins) } catch (e: any) { alert('Save failed'); setSaving(false) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(46,28,18,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(8px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: 'var(--r) var(--r) 0 0', width: '100%', maxWidth: 430, margin: '0 auto', padding: '8px 20px 48px', boxShadow: '0 -8px 40px rgba(100,60,20,0.18)' }}>
        <div style={{ width: 36, height: 4, background: 'var(--handle)', borderRadius: 2, margin: '12px auto 20px' }} />
        <div className="serif" style={{ fontSize: 20, textAlign: 'center', color: 'var(--text)', marginBottom: 20 }}>Tummy time</div>

        {/* Timer */}
        <div style={{ background: 'linear-gradient(135deg,var(--feed-bg),#c8e8ff)', borderRadius: 'var(--r-sm)', padding: 16, marginBottom: 14, textAlign: 'center' }}>
          <div className="serif" style={{ fontSize: 48, color: 'var(--text)', marginBottom: 12 }}>{fmtMs(elapsed)}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!running
              ? <button onClick={startTimer} style={{ flex: 2, padding: 12, background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 14px rgba(62,184,118,0.3)' }}>▶ Start</button>
              : <button onClick={pauseTimer} style={{ flex: 2, padding: 12, background: 'var(--red)',   color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 14px rgba(224,90,69,0.3)' }}>⏸ Pause</button>
            }
            <button onClick={resetTimer} style={{ flex: 1, padding: 12, background: 'var(--cream2)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 14, fontWeight: 700, color: 'var(--text-med)', cursor: 'pointer' }}>Reset</button>
          </div>
        </div>

        {/* Manual entry */}
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6, textAlign: 'center' }}>Or enter manually</div>
        <div className="fg">
          <input className="finput" type="number" inputMode="numeric" placeholder="Duration in minutes" value={manualDur} onChange={e => setManualDur(e.target.value)} disabled={elapsed > 0} />
        </div>

        {/* Date & time */}
        <div className="fg">
          <label className="flbl">Date &amp; time</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input className="finput" type="date" style={{ flex: 1 }} value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="finput" type="time" style={{ flex: 1 }} value={time} onChange={e => setTime(e.target.value)} />
            <button onClick={() => { const now = new Date(); setDate(localDateStr()); setTime(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`) }}
              style={{ padding: '0 14px', background: 'var(--cream2)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-med)', fontSize: 13, fontWeight: 700 }}>Now</button>
          </div>
        </div>

        <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : `Save${elapsed > 0 ? ` (${Math.max(1, Math.round(elapsed/60000))} min)` : ''}`}</button>
        <button className="btn-secondary" onClick={onClose} style={{ marginTop: 8 }}>Cancel</button>
      </div>
    </div>
  )
}

export function LogView() {
  const { entries, saveEntry, updateEntry } = useApp()
  const [modal,     setModal]     = useState<string | null>(null)
  const [editEntry, setEditEntry] = useState<Entry | null>(null)

  const close = () => { setModal(null); setEditEntry(null) }

  async function saveSimple(type: string, time: string, notes: string, dur?: string): Promise<void> {
    await saveEntry({
      type: type as any,
      notes: notes || null,
      ...(dur ? { duration: parseInt(dur) } : {}),
      _t: inputToDate(time),
    } as any)
    close()
  }

  async function saveFeed(components: FeedComponent[], time: string, notes: string) {
    const totalDur = components.filter(c => c.duration).reduce((s, c) => s + (c.duration || 0), 0)
    const totalVol = components.filter(c => c.volume).reduce((s, c)  => s + (c.volume  || 0), 0)
    if (editEntry) {
      await updateEntry(editEntry.id, {
        feedType:   components[0].feedType,
        components,
        duration:   totalDur || null,
        volume:     totalVol || null,
        notes:      notes || null,
        timestamp:  inputToDate(time) as any,
      })
    } else {
      await saveEntry({
        type:       'feed',
        feedType:   components[0].feedType,
        components,
        duration:   totalDur || null,
        volume:     totalVol || null,
        notes:      notes || null,
        _t:         inputToDate(time),
      } as any)
    }
    close()
  }

  async function saveSolids(foods: string[], firstFoods: string[], time: string, notes: string) {
    await saveEntry({
      type: 'solids',
      foods,
      ...(firstFoods.length ? { firstFoods } : {}),
      notes: notes || null,
      _t: inputToDate(time),
    })
    close()
  }

  const actions: { key: string; name: string; sub: string; action: () => void }[] = [
    { key: 'feed',      name: 'Feed',        sub: 'Live timer',      action: () => setModal('feed') },
    { key: 'solids',    name: 'Solids',      sub: 'Foods eaten',     action: () => setModal('solids') },
    { key: 'wee',       name: 'Wee',         sub: 'Wet nappy',       action: () => setModal('wee') },
    { key: 'poo',       name: 'Poo',         sub: 'Bowel movement',  action: () => setModal('poo') },
    { key: 'massage',   name: 'Massage',     sub: 'Log duration',    action: () => setModal('massage') },
    { key: 'tummyTime', name: 'Tummy time',  sub: 'Log minutes',     action: () => setModal('tummyTime') },
    { key: 'vitaminD',  name: 'Vitamin D',   sub: 'Daily drop',      action: () => setModal('vitaminD') },
  ]

  return (
    <div style={{ padding: '18px 16px 72px' }}>
      <GoalUpdateCard />
      <LeapCard />
      <GuidanceCard />
      <div className="sec">Log activity</div>
      {voiceEnabled && <SayIt />}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 26 }}>
        {actions.map(a => {
          const Icon = CATEGORY_ICON[a.key]
          return (
            <button key={a.key} onClick={a.action} style={{
              background: 'var(--white)', border: 'none', borderRadius: 'var(--r)',
              boxShadow: 'var(--shadow)', padding: '16px 14px',
              cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12,
              minHeight: 96,
            }}>
              <div style={{ width: 42, height: 42, borderRadius: 13, background: CATEGORY_BG[a.key], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon color={CATEGORY_FG[a.key]} size={21} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{a.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginTop: 1 }}>{a.sub}</div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="sec">Recent</div>
      <EntryList entries={entries.slice(0, 10)} onEditFeed={e => { setEditEntry(e); setModal('feed') }} />

      {modal === 'feed' && (
        <FeedModal
          onSave={saveFeed}
          onClose={close}
          isEdit={!!editEntry}
          initial={editEntry ? {
            components: editEntry.components || (editEntry.feedType ? [{ feedType: editEntry.feedType, duration: editEntry.duration, volume: editEntry.volume }] : []),
            time:  fmtTime(editEntry.timestamp),
            notes: editEntry.notes || '',
          } : undefined}
        />
      )}
      {modal === 'solids'   && <SolidsModal onClose={close} onSave={saveSolids} />}
      {modal === 'wee'      && <SimpleModal emoji="" title="Log wee"        onClose={close} onSave={(t,n)   => saveSimple('wee',      t, n)}    />}
      {modal === 'poo'      && <SimpleModal emoji="" title="Log poo"        onClose={close} onSave={(t,n)   => saveSimple('poo',      t, n)}    />}
      {modal === 'massage'   && <SimpleModal emoji="" title="Log massage"    onClose={close} onSave={(t,n,d) => saveSimple('massage',   t, n, d)} hasDuration />}
      {modal === 'tummyTime' && <TummyTimeModal onClose={close} onSave={async (t,n,d) => { await saveSimple('tummyTime', t, n, d); }} />}
      {modal === 'vitaminD' && <SimpleModal emoji="" title="Vitamin D" onClose={close} onSave={(t,n)   => saveSimple('vitaminD', t, n)}    hasNotes={false} />}
    </div>
  )
}
