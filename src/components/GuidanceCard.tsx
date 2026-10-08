import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { getMilestoneForAge } from '../utils/milestones'

export function GuidanceCard() {
  const [expanded, setExpanded] = useState(false)
  const { babyDob } = useApp()
  const weekAge  = (Date.now() - babyDob.getTime()) / (7 * 24 * 60 * 60 * 1000)
  const milestone = getMilestoneForAge(weekAge)

  return (
    <>
      <div
        onClick={() => setExpanded(true)}
        style={{
          background: 'var(--tip-bg)',
          borderRadius: 'var(--r-sm)',
          border: '1px solid var(--tip-border)',
          padding: '13px 14px',
          marginBottom: 16,
          cursor: 'pointer',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 16 }}>📖</span>
            <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--coral-d)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              {milestone.label} guide
            </span>
          </div>
          <span style={{ fontSize: 14, color: 'var(--muted)' }}>›</span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 5, lineHeight: 1.4 }}>
          {milestone.feedFreq}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>
          {milestone.feedVolume} · Tap for full guidance
        </div>
      </div>

      {expanded && (
        <div onClick={() => setExpanded(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(46,28,18,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(8px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: 'var(--r) var(--r) 0 0', width: '100%', maxWidth: 430, margin: '0 auto', padding: '8px 20px 48px', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 -8px 40px rgba(100,60,20,0.18)' }}>
            <div style={{ width: 36, height: 4, background: 'var(--handle)', borderRadius: 2, margin: '12px auto 20px' }} />
            <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 18, fontWeight: 700, textAlign: 'center', marginBottom: 4 }}>
              📖 {milestone.label}
            </div>
            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', fontWeight: 600, marginBottom: 20 }}>
              Care & development guide
            </div>

            {/* Feeding */}
            <div style={{ background: 'var(--feed-bg)', borderRadius: 'var(--r-sm)', padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--feed-fg)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>🍼 Feeding</div>
              <Row label="Frequency"  value={milestone.feedFreq} />
              <Row label="Per feed"   value={milestone.feedVolume} />
              <Row label="Daily total" value={milestone.totalDailyMl} />
            </div>

            {/* Poos */}
            <div style={{ background: 'var(--poo-bg)', borderRadius: 'var(--r-sm)', padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--poo-fg)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>💩 Poos</div>
              <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, lineHeight: 1.5 }}>{milestone.poosNote}</div>
            </div>

            {/* Growth */}
            <div style={{ background: 'var(--cream2)', borderRadius: 'var(--r-sm)', padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>📈 Growth</div>
              <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, lineHeight: 1.5 }}>{milestone.growthNote}</div>
            </div>

            {/* What to expect */}
            <div style={{ marginBottom: 12 }}>
              <div className="sec" style={{ marginBottom: 8 }}>What to expect</div>
              {milestone.whatToExpect.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>👀</span>
                  <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>

            {/* Parent tips */}
            <div style={{ marginBottom: 20 }}>
              <div className="sec" style={{ marginBottom: 8 }}>Tips for you</div>
              {milestone.parentTips.map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>💛</span>
                  <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, lineHeight: 1.5 }}>{tip}</span>
                </div>
              ))}
            </div>

            <button className="btn-secondary" onClick={() => setExpanded(false)}>Close</button>
          </div>
        </div>
      )}
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 12 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', textAlign: 'right' }}>{value}</span>
    </div>
  )
}
