import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { fmtTime, fmtDate, toDate } from '../utils/helpers'

export function GrowthView() {
  const { growth, saveGrowth, removeGrowth, setView } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [weight, setWeight] = useState('')
  const [length, setLength] = useState('')
  const [head,   setHead]   = useState('')
  const [notes,  setNotes]  = useState('')

  async function handleSave() {
    if (!weight && !length && !head) { alert('Enter at least one measurement'); return }
    await saveGrowth({
      weight: weight ? parseInt(weight) : null,
      length: length ? parseFloat(length) : null,
      head:   head   ? parseFloat(head)   : null,
      notes:  notes  || null,
    })
    setShowModal(false); setWeight(''); setLength(''); setHead(''); setNotes('')
  }

  // Weight chart data (last 6)
  const weightData = growth.filter(m => m.weight).slice(0, 6).reverse()
  const latest     = growth[0]
  const prev       = growth[1]
  const wDelta     = latest?.weight && prev?.weight ? latest.weight - prev.weight : null

  return (
    <div style={{ padding: '18px 16px 72px' }}>
      {/* Back */}
      <div onClick={() => setView('more')} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, cursor: 'pointer' }}>
        <span style={{ fontSize: 18, color: 'var(--muted)' }}>←</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted)' }}>Back</span>
      </div>

      <div className="sec">Growth Tracking</div>

      {/* Weight chart */}
      {weightData.length >= 2 && (
        <div style={{ background: 'var(--white)', borderRadius: 'var(--r)', boxShadow: 'var(--shadow)', padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>📈 Weight trend</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
            {(() => {
              const maxW = Math.max(...weightData.map(m => m.weight!))
              const minW = Math.min(...weightData.map(m => m.weight!)) - 100
              return weightData.map((m, i) => {
                const pct = Math.round(((m.weight! - minW) / (maxW - minW)) * 100)
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text)' }}>
                      {m.weight! >= 1000 ? `${(m.weight! / 1000).toFixed(2)}kg` : `${m.weight}g`}
                    </div>
                    <div style={{ width: '100%', height: `${Math.max(pct, 5)}%`, borderRadius: '6px 6px 0 0', background: 'linear-gradient(90deg,#7bc4f0,#4a9fd4)' }} />
                    <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--muted)' }}>{fmtDate(m.timestamp)}</div>
                  </div>
                )
              })
            })()}
          </div>
        </div>
      )}

      {/* Latest stats */}
      {latest && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          {latest.weight && (
            <div style={{ background: 'var(--cream2)', borderRadius: 'var(--r-xs)', padding: 10, textAlign: 'center' }}>
              <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 16, fontWeight: 700 }}>
                {latest.weight >= 1000 ? `${(latest.weight / 1000).toFixed(2)}` : latest.weight}
                <span style={{ fontSize: 11 }}>{latest.weight >= 1000 ? 'kg' : 'g'}</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, marginTop: 2 }}>Weight</div>
              {wDelta !== null && (
                <div style={{ fontSize: 10, fontWeight: 800, marginTop: 2, color: wDelta >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {wDelta >= 0 ? '+' : ''}{wDelta}g
                </div>
              )}
            </div>
          )}
          {latest.length && (
            <div style={{ background: 'var(--cream2)', borderRadius: 'var(--r-xs)', padding: 10, textAlign: 'center' }}>
              <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 16, fontWeight: 700 }}>{latest.length}<span style={{ fontSize: 11 }}>cm</span></div>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, marginTop: 2 }}>Length</div>
            </div>
          )}
          {latest.head && (
            <div style={{ background: 'var(--cream2)', borderRadius: 'var(--r-xs)', padding: 10, textAlign: 'center' }}>
              <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 16, fontWeight: 700 }}>{latest.head}<span style={{ fontSize: 11 }}>cm</span></div>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, marginTop: 2 }}>Head circ.</div>
            </div>
          )}
        </div>
      )}

      <button className="btn-primary" onClick={() => setShowModal(true)} style={{ marginBottom: 14 }}>+ Log Measurement</button>

      <div className="info-box">💡 WHO recommends weekly weight checks for newborns. Your paediatrician tracks percentiles — focus on the upward trend here.</div>

      {/* History */}
      <div className="sec" style={{ marginTop: 8 }}>History</div>
      {growth.length === 0
        ? <div className="empty"><div className="empty-em">📏</div><p>No measurements yet</p></div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {growth.slice(0, 8).map(m => {
              const parts = [
                m.weight ? (m.weight >= 1000 ? `${(m.weight/1000).toFixed(2)}kg` : `${m.weight}g`) : null,
                m.length ? `${m.length}cm length` : null,
                m.head   ? `${m.head}cm head`     : null,
              ].filter(Boolean).join(' · ')
              return (
                <div key={m.id} style={{ background: 'var(--white)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow)', padding: '12px 13px', display: 'flex', alignItems: 'center', gap: 11 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--mas-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📏</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>Measurement</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, fontWeight: 600 }}>{parts}{m.notes ? ` · ${m.notes}` : ''}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                    <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 12, fontWeight: 700, color: 'var(--text-med)' }}>{fmtTime(m.timestamp)}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', background: 'var(--cream2)', border: '1px solid var(--border)', padding: '2px 7px', borderRadius: 7 }}>{m.loggedBy}</div>
                    <button className="del-btn" onClick={() => { if (confirm('Delete?')) removeGrowth(m.id) }}>Delete</button>
                  </div>
                </div>
              )
            })}
          </div>
      }

      {/* Add modal */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(46,28,18,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(8px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: 'var(--r) var(--r) 0 0', width: '100%', maxWidth: 430, margin: '0 auto', padding: '8px 20px 48px', boxShadow: '0 -8px 40px rgba(100,60,20,0.18)' }}>
            <div style={{ width: 36, height: 4, background: 'var(--handle)', borderRadius: 2, margin: '12px auto 20px' }} />
            <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 20, fontWeight: 700, textAlign: 'center', marginBottom: 20 }}>📏 Log Measurement</div>
            <div className="info-box">All fields optional — log what you have.</div>
            <div className="fg"><label className="flbl">Weight (grams)</label><input className="finput" type="number" inputMode="numeric" placeholder="e.g. 3600" value={weight} onChange={e => setWeight(e.target.value)} /></div>
            <div className="fg"><label className="flbl">Length (cm)</label><input className="finput" type="number" inputMode="decimal" placeholder="e.g. 52.5" value={length} onChange={e => setLength(e.target.value)} /></div>
            <div className="fg"><label className="flbl">Head circumference (cm)</label><input className="finput" type="number" inputMode="decimal" placeholder="e.g. 34" value={head} onChange={e => setHead(e.target.value)} /></div>
            <div className="fg"><label className="flbl">Notes (optional)</label><input className="finput" type="text" placeholder="e.g. weighed at clinic" value={notes} onChange={e => setNotes(e.target.value)} /></div>
            <button className="btn-primary" onClick={handleSave}>Save Measurement</button>
            <button className="btn-secondary" onClick={() => setShowModal(false)} style={{ marginTop: 8 }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
