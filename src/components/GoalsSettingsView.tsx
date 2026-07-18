import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { ESHA_BORN } from '../types'
import { getMilestoneForAge } from '../utils/milestones'
import { GoalSet } from '../utils/milestones'

const FIELD_CONFIG: { key: keyof GoalSet; label: string; emoji: string; unit: string }[] = [
  { key: 'feedsPerDay',    label: 'Feeds per day',     emoji: '🍼', unit: '' },
  { key: 'weesPerDay',     label: 'Wees per day',      emoji: '💧', unit: '' },
  { key: 'poosPerDay',     label: 'Poos per day',      emoji: '💩', unit: '' },
  { key: 'massagesPerDay', label: 'Massages per day',  emoji: '🤲', unit: '' },
  { key: 'vitaminDPerDay', label: 'Vitamin D per day', emoji: '☀️', unit: '' },
  { key: 'tummyTimeMins',  label: 'Tummy time',         emoji: '🏋️', unit: 'mins/day' },
]

export function GoalsSettingsView() {
  const { activeGoals, acceptGoalUpdate, setView, feedCycleHours, setFeedCycleHours } = useApp()
  const weekAge = (Date.now() - ESHA_BORN.getTime()) / (7 * 24 * 60 * 60 * 1000)
  const suggested = getMilestoneForAge(weekAge).goals

  const [cycleDraft, setCycleDraft] = useState(feedCycleHours)
  const [cycleSaving, setCycleSaving] = useState(false)
  const [cycleSaved, setCycleSaved] = useState(false)

  const [draft, setDraft] = useState<GoalSet>({ ...activeGoals })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const hasChanges = FIELD_CONFIG.some(f => draft[f.key] !== activeGoals[f.key])

  function updateField(key: keyof GoalSet, value: string) {
    const n = parseInt(value)
    setDraft(d => ({ ...d, [key]: isNaN(n) ? 0 : n }))
    setSaved(false)
  }

  function resetFieldToSuggested(key: keyof GoalSet) {
    setDraft(d => ({ ...d, [key]: suggested[key] }))
    setSaved(false)
  }

  function resetAllToSuggested() {
    setDraft({ ...suggested })
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    await acceptGoalUpdate(draft)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleSaveCycle() {
    setCycleSaving(true)
    await setFeedCycleHours(cycleDraft)
    setCycleSaving(false)
    setCycleSaved(true)
    setTimeout(() => setCycleSaved(false), 2500)
  }

  return (
    <div style={{ padding: '18px 16px 72px' }}>
      <div onClick={() => setView('more')} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, cursor: 'pointer' }}>
        <span style={{ fontSize: 18, color: 'var(--muted)' }}>←</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted)' }}>Back</span>
      </div>

      <div className="sec" style={{ marginBottom: 6 }}>Feed Timing</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 10, lineHeight: 1.5 }}>
        How often Esha typically feeds — controls the "Next in" pill and the pump reminder.
      </div>
      <div style={{ background: 'var(--white)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow)', padding: '13px 14px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            className="finput"
            type="number"
            inputMode="numeric"
            min={1}
            max={12}
            value={cycleDraft}
            onChange={e => { setCycleDraft(parseFloat(e.target.value) || 0); setCycleSaved(false) }}
            style={{ flex: 1, padding: '9px 12px', fontSize: 15 }}
          />
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, flexShrink: 0 }}>hours between feeds</span>
        </div>
        <button
          className="btn-primary"
          onClick={handleSaveCycle}
          disabled={cycleDraft === feedCycleHours || cycleSaving}
          style={{ marginTop: 12 }}
        >
          {cycleSaving ? 'Saving…' : cycleSaved ? '✓ Saved' : cycleDraft === feedCycleHours ? 'No Changes' : 'Save'}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div className="sec" style={{ marginBottom: 0 }}>Daily Goals</div>
        <button
          onClick={resetAllToSuggested}
          style={{ fontSize: 11, fontWeight: 800, padding: '5px 11px', borderRadius: 12, background: 'var(--coral-s)', border: '1px solid rgba(240,117,96,0.2)', color: 'var(--coral-d)', cursor: 'pointer' }}
        >
          ✨ Use all suggested
        </button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 18, lineHeight: 1.5 }}>
        Esha's age-based suggestion is shown for each goal. Set your own number if you'd rather track something different.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {FIELD_CONFIG.map(f => {
          const isCustom = draft[f.key] !== suggested[f.key]
          return (
            <div key={f.key} style={{ background: 'var(--white)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow)', padding: '13px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{f.emoji}</span>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>{f.label}</span>
                </div>
                {isCustom && (
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 8, background: 'var(--blue-s)', color: 'var(--blue)', border: '1px solid rgba(74,159,212,0.25)' }}>
                    Custom
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  className="finput"
                  type="number"
                  inputMode="numeric"
                  value={draft[f.key]}
                  onChange={e => updateField(f.key, e.target.value)}
                  style={{ flex: 1, padding: '9px 12px', fontSize: 15 }}
                />
                {f.unit && <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, flexShrink: 0 }}>{f.unit}</span>}
                {isCustom && (
                  <button
                    onClick={() => resetFieldToSuggested(f.key)}
                    title={`Reset to suggested (${suggested[f.key]})`}
                    style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, padding: '8px 10px', borderRadius: 8, background: 'var(--cream2)', border: '1px solid var(--border)', color: 'var(--text-med)', cursor: 'pointer' }}
                  >
                    ↺ {suggested[f.key]}
                  </button>
                )}
              </div>
              {!isCustom && (
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginTop: 6 }}>
                  Age-suggested for {getMilestoneForAge(weekAge).label}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button
        className="btn-primary"
        onClick={handleSave}
        disabled={!hasChanges || saving}
        style={{ marginTop: 20 }}
      >
        {saving ? 'Saving…' : saved ? '✓ Saved' : hasChanges ? 'Save Changes' : 'No Changes'}
      </button>

      <div className="info-box" style={{ marginTop: 16 }}>
        💡 These goals apply to both parents' apps. Changes take effect immediately for both phones.
      </div>
    </div>
  )
}
