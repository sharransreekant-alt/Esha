import React, { useState, useEffect, useRef } from 'react'
import { FeedComponent, FeedType, FEED_LABELS } from '../../types'
import { fmtMs, nowInput } from '../../utils/helpers'

function localDateStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

interface Props {
  onSave:  (components: FeedComponent[], time: string, notes: string) => void
  onClose: () => void
  initial?: { components: FeedComponent[]; date?: string; time: string; notes: string }
  isEdit?: boolean
}

export function FeedModal({ onSave, onClose, initial, isEdit }: Props) {
  const [mode, setMode]               = useState<'breast' | 'bottle'>('breast')
  const [components, setComponents]   = useState<FeedComponent[]>(initial?.components || [])
  const [activeSide, setActiveSide]   = useState<FeedType | null>(null)
  const [running, setRunning]         = useState(false)
  const [elapsed, setElapsed]         = useState(0)
  const [startMs, setStartMs]         = useState<number | null>(null)
  const [volType, setVolType]         = useState<FeedType>('expressed')
  const [volume, setVolume]           = useState(90)
  const [manualSide, setManualSide]   = useState<FeedType | null>(null)
  const [manualDur, setManualDur]     = useState('')
  const [date, setDate]               = useState(initial?.date ? initial.date.slice(0,10) : localDateStr())
  const [time, setTime]               = useState(initial?.time ? initial.time.slice(0,5) : nowInput())
  const [notes, setNotes]             = useState(initial?.notes || '')

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (running && startMs !== null) {
      intervalRef.current = setInterval(() => setElapsed(Date.now() - startMs), 500)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, startMs])

  function startTimer(side: FeedType) {
    setActiveSide(side); setElapsed(0); setRunning(true); setStartMs(Date.now())
  }
  function pauseTimer()  { setRunning(false) }
  function resumeTimer() { setRunning(true); setStartMs(Date.now() - elapsed) }
  function stopTimer() {
    setRunning(false)
    const mins = Math.max(1, Math.round(elapsed / 60000))
    setComponents(c => [...c, { feedType: activeSide!, duration: mins }])
    setActiveSide(null); setElapsed(0); setStartMs(null)
  }
  function addVolume() {
    if (!volume || volume <= 0) return
    setComponents(c => [...c, { feedType: volType, volume }])
    setVolume(90)
  }
  function addManual() {
    if (!manualSide) return
    const d = parseInt(manualDur)
    if (!d || d <= 0) return
    setComponents(c => [...c, { feedType: manualSide, duration: d }])
    setManualSide(null); setManualDur('')
  }
  function removeComponent(i: number) {
    setComponents(c => c.filter((_, idx) => idx !== i))
  }
  function handleSave() {
    let comps = [...components]
    if (activeSide && elapsed > 0) {
      const mins = Math.max(1, Math.round(elapsed / 60000))
      comps = [...comps, { feedType: activeSide, duration: mins }]
    }
    if (!comps.length) { alert('Add at least one feed component'); return }
    onSave(comps, date + 'T' + time, notes)
  }

  const modeActive: React.CSSProperties = { background: 'var(--white)', color: 'var(--text)', boxShadow: '0 2px 8px rgba(60,42,24,0.1)' }
  const modeIdle:   React.CSSProperties = { background: 'transparent', color: 'var(--muted)', boxShadow: 'none' }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(26,22,18,0.4)', zIndex: 100, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(8px)' }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--white)', borderRadius: '26px 26px 0 0',
        width: '100%', maxWidth: 430, margin: '0 auto',
        padding: '10px 20px 34px', maxHeight: '90vh', overflowY: 'auto',
        WebkitOverflowScrolling: 'touch' as any,
        boxShadow: '0 -20px 50px rgba(40,28,18,0.22)',
      }}>
        <div style={{ width: 38, height: 4, background: 'var(--handle)', borderRadius: 2, margin: '10px auto 18px' }} />
        <div className="serif" style={{ fontSize: 21, textAlign: 'center', color: 'var(--text)', marginBottom: 18 }}>
          {isEdit ? 'Edit feed' : 'Log a feed'}
        </div>

        {/* Segmented Breastfeed / Bottle toggle */}
        <div style={{ display: 'flex', background: 'var(--cream2)', borderRadius: 14, padding: 4, marginBottom: 18 }}>
          <button onClick={() => setMode('breast')} style={{ flex: 1, padding: '10px 0', borderRadius: 11, border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer', ...(mode === 'breast' ? modeActive : modeIdle) }}>
            Breastfeed
          </button>
          <button onClick={() => setMode('bottle')} style={{ flex: 1, padding: '10px 0', borderRadius: 11, border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer', ...(mode === 'bottle' ? modeActive : modeIdle) }}>
            Bottle
          </button>
        </div>

        {/* Logged components */}
        {components.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {components.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--cream2)', borderRadius: 12, padding: '10px 13px', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-med)' }}>{FEED_LABELS[c.feedType]}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{c.duration ? `${c.duration} min` : c.volume ? `${c.volume} ml` : ''}</span>
                  <button onClick={() => removeComponent(i)} className="del-btn">✕</button>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Breastfeed mode */}
        {mode === 'breast' && (
          <>
            {activeSide ? (
              <div style={{ background: 'var(--feed-bg)', borderRadius: 20, padding: 22, marginBottom: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.9px', textTransform: 'uppercase', color: 'var(--feed-fg)', marginBottom: 10 }}>
                  {FEED_LABELS[activeSide]} · timing
                </div>
                <div className="serif" style={{ fontSize: 52, color: 'var(--text)', marginBottom: 16 }}>{fmtMs(elapsed)}</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {!running
                    ? <button onClick={resumeTimer} style={{ flex: 2, padding: '13px 0', background: 'var(--coral)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>Resume</button>
                    : <button onClick={pauseTimer}  style={{ flex: 2, padding: '13px 0', background: 'var(--coral)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>Pause</button>
                  }
                  <button onClick={stopTimer} style={{ flex: 1, padding: '13px 0', background: 'var(--white)', color: 'var(--feed-fg)', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>Done</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textAlign: 'center', marginBottom: 14 }}>Tap a side to start the timer</div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                  {(['leftBreast', 'rightBreast'] as FeedType[]).map(side => (
                    <button key={side} onClick={() => startTimer(side)} style={{ flex: 1, padding: '26px 0', background: 'var(--cream2)', border: '1.5px solid var(--border)', borderRadius: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <span className="serif" style={{ fontSize: 22, color: 'var(--text)' }}>{side === 'leftBreast' ? 'Left' : 'Right'}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>Start timer</span>
                    </button>
                  ))}
                </div>

                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8, textAlign: 'center' }}>Or log manually</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  {(['leftBreast', 'rightBreast'] as FeedType[]).map(side => (
                    <button key={side} onClick={() => setManualSide(side)} className={`pill${manualSide === side ? ' on' : ''}`} style={{ flex: 1, textAlign: 'center' }}>
                      {side === 'leftBreast' ? 'Left' : 'Right'}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                  <input className="finput" type="number" placeholder="Duration in mins" inputMode="numeric" style={{ flex: 1 }} value={manualDur} onChange={e => setManualDur(e.target.value)} />
                  <button onClick={addManual} style={{ flexShrink: 0, padding: '0 16px', background: 'var(--cream2)', border: '1.5px solid var(--border)', borderRadius: 12, fontSize: 13, fontWeight: 800, color: 'var(--text-med)', cursor: 'pointer' }}>Add</button>
                </div>
              </>
            )}
          </>
        )}

        {/* Bottle mode */}
        {mode === 'bottle' && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 10 }}>Expressed milk or formula</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button onClick={() => setVolType('expressed')} className={`pill${volType === 'expressed' ? ' on' : ''}`} style={{ flex: 1, textAlign: 'center' }}>Expressed</button>
              <button onClick={() => setVolType('formula')}   className={`pill${volType === 'formula'   ? ' on' : ''}`} style={{ flex: 1, textAlign: 'center' }}>Formula</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--cream2)', borderRadius: 16, padding: '10px 14px', marginBottom: 10 }}>
              <button onClick={() => setVolume(v => Math.max(10, v - 10))} style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: 'var(--white)', fontSize: 18, fontWeight: 800, color: 'var(--text)', cursor: 'pointer' }}>–</button>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span className="serif" style={{ fontSize: 28, color: 'var(--text)' }}>{volume} ml</span>
              </div>
              <button onClick={() => setVolume(v => v + 10)} style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: 'var(--white)', fontSize: 18, fontWeight: 800, color: 'var(--text)', cursor: 'pointer' }}>+</button>
            </div>
            <button onClick={addVolume} style={{ width: '100%', padding: '11px 0', background: 'var(--cream2)', border: '1.5px solid var(--border)', borderRadius: 12, fontSize: 13, fontWeight: 800, color: 'var(--text-med)', cursor: 'pointer', marginBottom: 4 }}>
              Add {volume}ml {volType === 'expressed' ? 'expressed' : 'formula'}
            </button>
          </>
        )}

        {/* Date & time */}
        <div className="fg" style={{ marginTop: 18 }}>
          <label className="flbl">Date &amp; time</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="finput" type="date" style={{ flex: 1.3 }} value={date} onChange={e => setDate(e.target.value)} />
            <input className="finput" type="time" style={{ flex: 1 }} value={time} onChange={e => setTime(e.target.value)} />
            <button onClick={() => { setDate(localDateStr()); setTime(nowInput()) }}
              style={{ padding: '0 15px', background: 'var(--cream2)', border: '1.5px solid var(--border)', borderRadius: 12, color: 'var(--text-med)', fontSize: 13, fontWeight: 700 }}>Now</button>
          </div>
        </div>

        <div className="fg">
          <label className="flbl">Notes (optional)</label>
          <input className="finput" type="text" placeholder="Good latch, fussy, etc." value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <button className="btn-primary" onClick={handleSave} style={{ marginBottom: 8 }}>
          {isEdit ? 'Update feed' : components.length ? `Save feed (${components.length} component${components.length > 1 ? 's' : ''})` : 'Save feed'}
        </button>
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
      </div>
    </div>
  )
}
