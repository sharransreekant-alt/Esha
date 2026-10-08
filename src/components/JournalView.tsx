import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { fmtTime, fmtDate } from '../utils/helpers'

const MOODS = ['😊', '😴', '🙏', '😟', '🥰']

export function JournalView() {
  const { journal, saveJournal, removeJournal, setView, babyName } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [mood, setMood]   = useState('')
  const [text, setText]   = useState('')

  async function handleSave() {
    if (!text.trim()) { alert('Write something first'); return }
    await saveJournal({ text, mood })
    setShowModal(false); setMood(''); setText('')
  }

  return (
    <div style={{ padding: '18px 16px 72px' }}>
      <div onClick={() => setView('more')} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, cursor: 'pointer' }}>
        <span style={{ fontSize: 18, color: 'var(--muted)' }}>←</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted)' }}>Back</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="sec" style={{ marginBottom: 0 }}>Our Journal</div>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ width: 'auto', padding: '9px 16px', fontSize: 13, margin: 0 }}>+ Write</button>
      </div>

      {journal.length === 0
        ? <div className="empty"><div className="empty-em">📖</div><p>No journal entries yet.<br />Write your first one!</p></div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {journal.map(e => (
              <div key={e.id} style={{ background: 'var(--white)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow)', padding: '14px 15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {e.mood && <span style={{ fontSize: 20 }}>{e.mood}</span>}
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-med)' }}>{e.loggedBy}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{fmtTime(e.timestamp)} · {fmtDate(e.timestamp)}</span>
                </div>
                <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5, fontWeight: 600, marginBottom: 8 }}>{e.text}</div>
                <div style={{ textAlign: 'right' }}>
                  <button className="del-btn" onClick={() => { if (confirm('Delete?')) removeJournal(e.id) }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
      }

      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(46,28,18,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(8px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: 'var(--r) var(--r) 0 0', width: '100%', maxWidth: 430, margin: '0 auto', padding: '8px 20px 48px', boxShadow: '0 -8px 40px rgba(100,60,20,0.18)' }}>
            <div style={{ width: 36, height: 4, background: 'var(--handle)', borderRadius: 2, margin: '12px auto 20px' }} />
            <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 20, fontWeight: 700, textAlign: 'center', marginBottom: 20 }}>📖 Journal Entry</div>
            <div className="fg">
              <label className="flbl">How are you feeling?</label>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                {MOODS.map(m => (
                  <div key={m} onClick={() => setMood(m)} style={{ fontSize: 26, cursor: 'pointer', padding: 6, borderRadius: 12, border: `2px solid ${mood === m ? 'var(--coral)' : 'transparent'}`, background: mood === m ? 'var(--coral-s)' : 'transparent', transition: 'all 0.15s' }}>{m}</div>
                ))}
              </div>
            </div>
            <div className="fg">
              <label className="flbl">What's on your mind?</label>
              <textarea className="finput" placeholder={`Write anything… a moment, a feeling, something ${babyName} did.`} value={text} onChange={e => setText(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={handleSave}>Save Entry</button>
            <button className="btn-secondary" onClick={() => setShowModal(false)} style={{ marginTop: 8 }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
