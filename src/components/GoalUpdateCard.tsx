import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { GoalSet } from '../utils/milestones'
import { ESHA_BORN } from '../types'
import { getPendingGoalUpdate } from '../utils/milestones'

const FIELD_LABELS: Record<string, string> = {
  feedsPerDay:    'Feeds per day',
  solidsPerDay:   'Solids meals per day',
  weesPerDay:     'Wees per day',
  poosPerDay:     'Poos per day',
  massagesPerDay: 'Massages per day',
  vitaminDPerDay: 'Vitamin D',
  tummyTimeMins:  'Tummy time (mins/day)',
}

const FIELD_EMOJI: Record<string, string> = {
  feedsPerDay:    '🍼',
  solidsPerDay:   '🥣',
  weesPerDay:     '💧',
  poosPerDay:     '💩',
  massagesPerDay: '🤲',
  vitaminDPerDay: '☀️',
  tummyTimeMins:  '🏋️',
}

export function GoalUpdateCard() {
  const { activeGoals, acceptGoalUpdate } = useApp()
  const [accepting, setAccepting] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || !activeGoals) return null

  const weekAge  = (Date.now() - ESHA_BORN.getTime()) / (7 * 24 * 60 * 60 * 1000)
  const pending  = getPendingGoalUpdate(activeGoals, weekAge)

  if (!pending) return null

  async function handleAccept() {
    if (!pending) return
    setAccepting(true)
    const newGoals = { ...activeGoals! }
    pending.changes.forEach(c => {
      (newGoals as any)[c.field] = c.to
    })
    await acceptGoalUpdate(newGoals)
    setAccepting(false)
  }

  return (
    <div style={{
      background: 'var(--update-bg)',
      borderRadius: 'var(--r-sm)',
      border: '1.5px solid rgba(74,159,212,0.3)',
      padding: '14px 15px',
      marginBottom: 16,
      boxShadow: 'var(--shadow)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 16 }}>🎯</span>
            <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Goals update for {pending.milestone.label}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, lineHeight: 1.4 }}>
            Esha is growing — some goals should change to match her development.
          </div>
        </div>
        <button onClick={() => setDismissed(true)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 16, cursor: 'pointer', padding: '0 4px', flexShrink: 0 }}>✕</button>
      </div>

      {/* Changes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {pending.changes.map((c, i) => (
          <div key={i} style={{ background: 'var(--cream2)', borderRadius: 'var(--r-xs)', padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>{FIELD_EMOJI[c.field] || '📊'}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{FIELD_LABELS[c.field] || c.field}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)', textDecoration: 'line-through' }}>
                  {c.from === -1 ? 'Variable' : c.from}
                </span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>→</span>
                <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--blue)' }}>
                  {c.to === -1 ? 'Variable' : c.to}
                </span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, lineHeight: 1.4 }}>{c.reason}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleAccept}
          disabled={accepting}
          style={{
            flex: 2, padding: '11px 0',
            background: 'linear-gradient(135deg, #5ab4f0, var(--blue))',
            color: '#fff', border: 'none', borderRadius: 'var(--r-sm)',
            fontSize: 13, fontWeight: 800, cursor: 'pointer',
            boxShadow: '0 3px 10px rgba(74,159,212,0.3)',
          }}
        >
          {accepting ? 'Updating…' : '✓ Update goals'}
        </button>
        <button
          onClick={() => setDismissed(true)}
          style={{
            flex: 1, padding: '11px 0',
            background: 'var(--cream2)', color: 'var(--muted)',
            border: '1.5px solid var(--border)', borderRadius: 'var(--r-sm)',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Not yet
        </button>
      </div>
    </div>
  )
}
