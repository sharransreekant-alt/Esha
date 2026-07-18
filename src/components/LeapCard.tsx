import React, { useState } from 'react'
import { ESHA_BORN } from '../types'
import { getLeapStatus, Leap } from '../utils/leaps'

function LeapDetail({ leap, phase, onClose }: { leap: Leap; phase: 'fussy' | 'skills'; onClose: () => void }) {
  const [tab, setTab] = useState<'whats-happening' | 'tips' | 'play'>('whats-happening')

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(46,28,18,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(8px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: 'var(--r) var(--r) 0 0', width: '100%', maxWidth: 430, margin: '0 auto', padding: '8px 20px 48px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 -8px 40px rgba(100,60,20,0.18)' }}>
        <div style={{ width: 36, height: 4, background: '#e0d4cc', borderRadius: 2, margin: '12px auto 20px' }} />

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🧠</div>
          <div className="serif" style={{ fontSize: 20, color: 'var(--text)', marginBottom: 4 }}>
            Leap {leap.number} — {leap.name}
          </div>
          <div style={{
            display: 'inline-block', fontSize: 12, fontWeight: 800, padding: '4px 12px', borderRadius: 20,
            background: phase === 'fussy' ? 'var(--amber-s)' : 'var(--green-s)',
            color: phase === 'fussy' ? '#8a6200' : 'var(--green)',
            border: `1px solid ${phase === 'fussy' ? 'rgba(245,166,35,0.3)' : 'rgba(62,184,118,0.3)'}`,
          }}>
            {phase === 'fussy' ? '🌊 Fussy phase — this is normal' : '🌟 Skills phase — watch her grow'}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
          {[
            { id: 'whats-happening' as const, label: "What's happening" },
            { id: 'tips'            as const, label: 'Tips for you' },
            { id: 'play'            as const, label: 'Play ideas' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '9px 4px', fontSize: 11, fontWeight: 800,
              color: tab === t.id ? 'var(--coral)' : 'var(--muted)',
              background: 'none', border: 'none',
              borderBottom: `2.5px solid ${tab === t.id ? 'var(--coral)' : 'transparent'}`,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'whats-happening' && (
          <div>
            <div style={{ background: phase === 'fussy' ? '#fff9f0' : '#f0fff6', borderRadius: 'var(--r-sm)', padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: phase === 'fussy' ? '#8a6200' : 'var(--green)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                {phase === 'fussy' ? 'Why she might seem difficult' : 'What she\'s learning'}
              </div>
              <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600, lineHeight: 1.6 }}>
                {phase === 'fussy' ? leap.fussyDesc : leap.skillsDesc}
              </div>
            </div>
            <div style={{ background: 'var(--cream2)', borderRadius: 'var(--r-sm)', padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Also developing
              </div>
              <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600, lineHeight: 1.6 }}>
                {phase === 'fussy' ? leap.skillsDesc : leap.fussyDesc}
              </div>
            </div>
          </div>
        )}

        {tab === 'tips' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {leap.tips.map((tip, i) => (
              <div key={i} style={{ background: 'var(--cream2)', borderRadius: 'var(--r-sm)', padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>💛</span>
                <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600, lineHeight: 1.5 }}>{tip}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'play' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {leap.playIdeas.map((idea, i) => (
              <div key={i} style={{ background: 'var(--cream2)', borderRadius: 'var(--r-sm)', padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>🎮</span>
                <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600, lineHeight: 1.5 }}>{idea}</span>
              </div>
            ))}
          </div>
        )}

        <button className="btn-secondary" onClick={onClose} style={{ marginTop: 20 }}>Close</button>
      </div>
    </div>
  )
}

export function LeapCard() {
  const [showDetail, setShowDetail] = useState(false)
  const status = getLeapStatus(ESHA_BORN)

  // Between leaps — show a subtle upcoming card
  if (status.phase === 'between' && status.nextLeap) {
    const days = status.daysUntilNext || 0
    if (days > 14) return null // don't show until 2 weeks out
    return (
      <div style={{
        background: 'var(--plum)',
        borderRadius: 'var(--r)', padding: '14px 16px',
        marginBottom: 16, boxShadow: '0 10px 26px rgba(75,53,80,0.28)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--plum-label)', textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: 4 }}>
          Leap {status.nextLeap.number} coming up
        </div>
        <div style={{ fontSize: 12.5, color: 'rgba(251,246,239,0.72)', fontWeight: 500 }}>
          "{status.nextLeap.name}" starts in about {days} day{days !== 1 ? 's' : ''}. A fussy phase may begin — totally normal.
        </div>
      </div>
    )
  }

  if (status.phase === 'complete' || !status.currentLeap) return null

  const leap  = status.currentLeap
  const phase = status.phase as 'fussy' | 'skills'
  const isFussy = phase === 'fussy'

  return (
    <>
      <div
        onClick={() => setShowDetail(true)}
        style={{
          background: 'var(--plum)',
          borderRadius: 'var(--r)',
          padding: '18px 18px 20px', marginBottom: 16, cursor: 'pointer',
          boxShadow: '0 10px 26px rgba(75,53,80,0.28)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.9px', textTransform: 'uppercase', color: 'var(--plum-label)' }}>
            Leap {leap.number} · {phase === 'fussy' ? 'Fussy phase' : 'Skills phase'}
          </span>
          <span style={{ fontSize: 17, color: 'rgba(255,255,255,0.4)' }}>›</span>
        </div>
        <div className="serif" style={{ fontSize: 21, color: 'var(--cream)', marginBottom: 6 }}>
          {leap.name}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(251,246,239,0.72)', fontWeight: 500, lineHeight: 1.5 }}>
          {isFussy
            ? 'More unsettled than usual? This is why — it will pass. Extra cuddles help.'
            : 'Watch for new skills emerging — her brain is working hard.'}
        </div>
      </div>

      {showDetail && (
        <LeapDetail leap={leap} phase={phase} onClose={() => setShowDetail(false)} />
      )}
    </>
  )
}
