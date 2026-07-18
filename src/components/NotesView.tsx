import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { fmtTime, fmtDate, toDate } from '../utils/helpers'

export function NotesView() {
  const { entries, saveEntry, removeEntry, setView } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [text,   setText]   = useState('')
  const [saving, setSaving] = useState(false)

  const notes = entries.filter(e => e.type === 'note').sort(
    (a, b) => toDate(b.timestamp).getTime() - toDate(a.timestamp).getTime()
  )

  async function handleSave() {
    if (!text.trim()) { alert('Write something first'); return }
    setSaving(true)
    try {
      await saveEntry({ type: 'note', notes: text.trim(), _t: new Date() } as any)
      setText('')
      setShowModal(false)
    } catch (e: any) {
      alert('Save failed: ' + (e?.message || 'Unknown error'))
    }
    setSaving(false)
  }

  return (
    <div style={{ padding: '18px 16px 72px' }}>
      <div onClick={() => setView('more')} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, cursor: 'pointer' }}>
        <span style={{ fontSize: 18, color: 'var(--muted)' }}>←</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted)' }}>Back</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="sec" style={{ marginBottom: 0 }}>Notes</div>
        <button className="btn-primary" onClick={() => setShowModal(true)}
          style={{ width: 'auto', padding: '9px 16px', fontSize: 13, margin: 0 }}>
          + Add note
        </button>
      </div>

      {notes.length === 0
        ? <div className="empty"><div className="empty-em">📝</div><p>No notes yet. Add anything worth remembering.</p></div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notes.map(e => (
              <div key={e.id} style={{ background: 'var(--white)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow)', padding: '14px 15px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>
                    {fmtDate(e.timestamp)} · {fmtTime(e.timestamp)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', background: 'var(--cream2)', border: '1px solid var(--border)', padding: '2px 7px', borderRadius: 7 }}>
                      {e.loggedBy || '?'}
                    </span>
                    <button className="del-btn" onClick={() => { if (confirm('Delete this note?')) removeEntry(e.id) }}>Delete</button>
                  </div>
                </div>
                <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600, lineHeight: 1.6 }}>{e.notes}</div>
              </div>
            ))}
          </div>
      }

      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(46,28,18,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(8px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: 'var(--r) var(--r) 0 0', width: '100%', maxWidth: 430, margin: '0 auto', padding: '8px 20px 48px', boxShadow: '0 -8px 40px rgba(100,60,20,0.18)' }}>
            <div style={{ width: 36, height: 4, background: 'var(--handle)', borderRadius: 2, margin: '12px auto 20px' }} />
            <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 20, fontWeight: 700, textAlign: 'center', marginBottom: 20 }}>📝 Add Note</div>
            <div className="fg">
              <label className="flbl">Note</label>
              <textarea className="finput" placeholder="Anything worth remembering…" value={text} onChange={e => setText(e.target.value)} style={{ minHeight: 100 }} />
            </div>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Note'}</button>
            <button className="btn-secondary" onClick={() => setShowModal(false)} style={{ marginTop: 8 }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
