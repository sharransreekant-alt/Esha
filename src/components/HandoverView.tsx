import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { timeSince, fmtTime, fmtDate } from '../utils/helpers'

const STATUSES = ['😴 Sleeping', '😊 Awake & happy', '😢 Fussy', '🍼 Just fed', '🎉 Just settled']

export function HandoverView() {
  const { handovers, saveHandover, removeHandover, markHandoverSeen, setView, entries } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [status, setStatus] = useState('')
  const [notes,  setNotes]  = useState('')

  const lastFeed = entries.find(e => e.type === 'feed')

  async function handleSave() {
    if (!status) { alert('How is she right now?'); return }
    await saveHandover({
      status,
      notes: notes || null,
      lastFeedAgo: lastFeed ? timeSince(lastFeed.timestamp) : null,
    })
    setShowModal(false); setStatus(''); setNotes('')
  }

  // Mark as read when we open this view
  React.useEffect(() => { markHandoverSeen() }, [])

  const latest = handovers[0]
  const previous = handovers.slice(1, 6)

  const HandoverCard = ({ h, isLatest }: { h: typeof latest; isLatest: boolean }) => (
    <div style={{ background: 'var(--white)', borderRadius: 'var(--r)', boxShadow: isLatest ? 'var(--shadow-md)' : 'var(--shadow)', padding: 18, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 28 }}>🤝</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>From {h?.from}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>{timeSince(h?.timestamp)} · {fmtDate(h?.timestamp)}</div>
        </div>
        <button className="del-btn" style={{ alignSelf: 'flex-start' }} onClick={() => { if (h && confirm('Delete?')) removeHandover(h.id) }}>Delete</button>
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--cream2)', borderRadius: 10, padding: '8px 12px', fontSize: 13, fontWeight: 700, color: 'var(--text-med)', marginBottom: h?.notes || h?.lastFeedAgo ? 10 : 0, width: '100%' }}>
        {h?.status}
      </div>
      {h?.lastFeedAgo && <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, marginBottom: 8 }}>🕐 Last feed was {h.lastFeedAgo}</div>}
      {h?.notes && <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5, fontWeight: 600, padding: '10px 12px', background: 'var(--cream2)', borderRadius: 'var(--r-xs)' }}>{h.notes}</div>}
    </div>
  )

  return (
    <div style={{ padding: '18px 16px 72px' }}>
      <div onClick={() => setView('more')} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, cursor: 'pointer' }}>
        <span style={{ fontSize: 18, color: 'var(--muted)' }}>←</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted)' }}>Back</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="sec" style={{ marginBottom: 0 }}>Handover</div>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ width: 'auto', padding: '9px 16px', fontSize: 13, margin: 0 }}>Leave note</button>
      </div>

      {!latest
        ? <div className="empty"><div className="empty-em">🤝</div><p>No handover notes yet</p></div>
        : <HandoverCard h={latest} isLatest />
      }

      {previous.length > 0 && (
        <>
          <div className="sec" style={{ marginTop: 16 }}>Previous Handovers</div>
          {previous.map(h => <HandoverCard key={h.id} h={h} isLatest={false} />)}
        </>
      )}

      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(46,28,18,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(8px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: 'var(--r) var(--r) 0 0', width: '100%', maxWidth: 430, margin: '0 auto', padding: '8px 20px 48px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 -8px 40px rgba(100,60,20,0.18)' }}>
            <div style={{ width: 36, height: 4, background: 'var(--handle)', borderRadius: 2, margin: '12px auto 20px' }} />
            <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 20, fontWeight: 700, textAlign: 'center', marginBottom: 20 }}>🤝 Leave Handover</div>
            <div className="info-box">Leave a note so the other parent knows where things are at when they take over.</div>
            <div className="fg">
              <label className="flbl">How is Esha right now?</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {STATUSES.map(s => (
                  <button key={s} onClick={() => setStatus(s)} className={`pill${status === s ? ' on' : ''}`} style={{ width: '100%', textAlign: 'left' }}>{s}</button>
                ))}
              </div>
            </div>
            <div className="fg">
              <label className="flbl">Anything else to know?</label>
              <textarea className="finput" placeholder="Last feed was at… next due… she likes…" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={handleSave}>Leave Handover</button>
            <button className="btn-secondary" onClick={() => setShowModal(false)} style={{ marginTop: 8 }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
