import React, { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { nowInput } from '../../utils/helpers'
import { quickFoods, splitFoods, showFood } from '../../utils/solids'

function localDateStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

interface Props {
  onSave:  (foods: string[], firstFoods: string[], time: string, notes: string) => Promise<void>
  onClose: () => void
  // Set when editing an existing entry
  initial?: { id: string; foods: string[]; firstFoods: string[]; date: string; time: string; notes: string }
}

export function SolidsModal({ onSave, onClose, initial }: Props) {
  const { entries } = useApp()
  // Foods logged in any other entry; the one being edited doesn't count as "logged before"
  const known = useMemo(() => quickFoods(entries.filter(e => e.id !== initial?.id)), [entries, initial?.id])
  const [foods,    setFoods]    = useState<string[]>(initial?.foods || [])
  // The parent's own choice per food; without one, a never-logged food counts as a first time
  const [firstChoice, setFirstChoice] = useState<Record<string, boolean>>(
    () => Object.fromEntries((initial?.foods || []).map(f => [f, initial!.firstFoods.includes(f)])))
  const [draft,    setDraft]    = useState('')
  const [date,     setDate]     = useState(initial?.date || localDateStr())
  const [time,     setTime]     = useState(initial?.time || nowInput())
  const [notes,    setNotes]    = useState(initial?.notes || '')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  const isNew   = (f: string) => !known.includes(f)
  const isFirst = (f: string) => firstChoice[f] ?? isNew(f)

  function toggle(f: string) {
    setFoods(fs => fs.includes(f) ? fs.filter(x => x !== f) : [...fs, f])
  }
  function addDraft(): string[] {
    const added = splitFoods(draft).filter(f => !foods.includes(f))
    const next = [...foods, ...added]
    setFoods(next); setDraft('')
    return next
  }

  async function handleSave() {
    // Anything still in the text box counts, so typing then Save is enough
    const all = draft.trim() ? addDraft() : foods
    if (!all.length) { setError('Add at least one food'); return }
    setSaving(true); setError('')
    try {
      await onSave(all, all.filter(isFirst), date + 'T' + time, notes)
    } catch (e: any) {
      console.error('Save failed:', e)
      setError('Save failed — check your connection')
      setSaving(false)
    }
  }

  const unpicked = known.filter(f => !foods.includes(f)).slice(0, 18)

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
        <div className="serif" style={{ fontSize: 21, textAlign: 'center', color: 'var(--text)', marginBottom: 18 }}>{initial ? 'Edit solids' : 'Log solids'}</div>

        {/* Chosen foods */}
        {foods.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            {foods.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--cream2)', borderRadius: 12, padding: '10px 13px', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{showFood(f)}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {(isNew(f) || f in firstChoice) && (
                    <button
                      onClick={() => setFirstChoice(c => ({ ...c, [f]: !isFirst(f) }))}
                      className={`pill${isFirst(f) ? ' on' : ''}`}
                      style={{ padding: '4px 10px', fontSize: 11 }}
                    >
                      First time
                    </button>
                  )}
                  <button onClick={() => toggle(f)} className="del-btn">✕</button>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Foods logged before */}
        {unpicked.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
            {unpicked.map(f => (
              <button key={f} onClick={() => toggle(f)} className="pill">{showFood(f)}</button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          <input
            className="finput" type="text" autoCapitalize="none" enterKeyHint="done"
            placeholder={known.length ? 'Another food…' : 'e.g. oats, pear'}
            style={{ flex: 1 }} value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDraft() } }}
          />
          <button onClick={addDraft} style={{ flexShrink: 0, padding: '0 16px', background: 'var(--cream2)', border: '1.5px solid var(--border)', borderRadius: 12, fontSize: 13, fontWeight: 800, color: 'var(--text-med)', cursor: 'pointer' }}>Add</button>
        </div>

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
          <input className="finput" type="text" placeholder="Anything you want to remember" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        {error && <div style={{ color: 'var(--red)', fontSize: 13, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>{error}</div>}
        <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ marginBottom: 8 }}>
          {saving ? 'Saving…' : initial ? 'Update' : 'Save'}
        </button>
        <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
      </div>
    </div>
  )
}
