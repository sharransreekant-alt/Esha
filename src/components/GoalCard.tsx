import React from 'react'

interface Props {
  categoryKey: string
  icon: React.ReactNode
  label: string
  count: number
  goal:  number
  color: string
  track: string
  extra?: string
}

const CIRC = 2 * Math.PI * 19 // r=19

export function GoalCard({ icon, label, count, goal, color, track, extra }: Props) {
  const done   = count >= goal
  const pct    = Math.min(1, goal > 0 ? count / goal : 0)
  const offset = CIRC - pct * CIRC
  const rem    = goal - count

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      background: 'var(--white)', borderRadius: 'var(--r)',
      padding: '13px 15px', boxShadow: 'var(--shadow)',
    }}>
      {/* Ring */}
      <div style={{ position: 'relative', width: 46, height: 46, flexShrink: 0 }}>
        <svg viewBox="0 0 46 46" width={46} height={46} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
          <circle cx="23" cy="23" r="19" fill="none" stroke={track} strokeWidth="4.5" />
          <circle
            cx="23" cy="23" r="19" fill="none" stroke={color} strokeWidth="4.5"
            strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(.34,1.56,.64,1)' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)' }}>{label}</span>
          <span className="serif" style={{ fontSize: 16, color }}>{count} / {goal}</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>
          {done ? 'Goal reached' : rem === goal ? 'Not started yet' : `${rem} more to go`}
          {extra ? ` · ${extra}` : ''}
        </div>
      </div>
    </div>
  )
}
