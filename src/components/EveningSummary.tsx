import React from 'react'
import { useApp } from '../context/AppContext'
import { todayOnly, feedVolume } from '../utils/helpers'

interface Props { onClose: () => void }

export function EveningSummary({ onClose }: Props) {
  const { entries, activeGoals } = useApp()
  const td = todayOnly(entries)

  const counts = {
    feed:     td.filter(e => e.type === 'feed').length,
    wee:      td.filter(e => e.type === 'wee').length,
    poo:      td.filter(e => e.type === 'poo').length,
    massage:  td.filter(e => e.type === 'massage').length,
    vitaminD: td.filter(e => e.type === 'vitaminD').length,
  }
  const totalMl = td.reduce((s, e) => s + feedVolume(e), 0)
  const allMet  = Object.keys(counts).every(k => { const g = (activeGoals as any)[k === 'feed' ? 'feedsPerDay' : k === 'wee' ? 'weesPerDay' : k === 'poo' ? 'poosPerDay' : k === 'massage' ? 'massagesPerDay' : 'vitaminDPerDay']; return g === -1 || counts[k as keyof typeof counts] >= g })

  const goalKeyMap: Record<string, keyof typeof activeGoals> = { feed: 'feedsPerDay', wee: 'weesPerDay', poo: 'poosPerDay', massage: 'massagesPerDay', vitaminD: 'vitaminDPerDay' }
  const items = [
    { key: 'feed',     emoji: '🍼', label: 'Feeds',     bg: 'var(--feed-bg)', extra: totalMl ? ` · ${totalMl} ml` : '' },
    { key: 'wee',      emoji: '💧', label: 'Wees',      bg: 'var(--wee-bg)',  extra: '' },
    { key: 'poo',      emoji: '💩', label: 'Poos',      bg: 'var(--poo-bg)',  extra: '' },
    { key: 'massage',  emoji: '🤲', label: 'Massages',  bg: 'var(--mas-bg)',  extra: '' },
    { key: 'vitaminD', emoji: '☀️', label: 'Vitamin D', bg: 'var(--vit-bg)',  extra: '' },
  ]

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(46,28,18,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(8px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: 'var(--r) var(--r) 0 0', width: '100%', maxWidth: 430, margin: '0 auto', padding: '8px 20px 48px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 -8px 40px rgba(100,60,20,0.18)' }}>
        <div style={{ width: 36, height: 4, background: 'var(--handle)', borderRadius: 2, margin: '12px auto 20px' }} />
        <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 20, fontWeight: 700, textAlign: 'center', marginBottom: 6 }}>
          {allMet ? '🎉 Amazing day!' : '🌙 Evening Check-in'}
        </div>
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
          {allMet ? "All goals hit — you're both crushing it." : "Here's what still needs attention."}
        </p>

        {items.map(({ key, emoji, label, bg, extra }) => {
          const goal = activeGoals[goalKeyMap[key]] ?? 0
          const count = counts[key as keyof typeof counts]
          const met = count >= goal, part = !met && count > 0
          const bc = met ? 'var(--green-s)' : part ? 'var(--amber-s)' : 'var(--red-s)'
          const fc = met ? 'var(--green)'   : part ? 'var(--amber)'        : 'var(--red)'
          const sub = met ? 'Goal reached!' : count === 0 ? `Get ${goal} done today` : `${goal - count} more needed`

          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, fontWeight: 600 }}>{sub}</div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, padding: '5px 11px', borderRadius: 10, background: bc, color: fc, whiteSpace: 'nowrap' }}>
                {met ? `✓ Done${extra}` : `${count}/${goal}${extra}`}
              </div>
            </div>
          )
        })}

        <button className="btn-primary" onClick={onClose} style={{ marginTop: 20 }}>Got it 👍</button>
      </div>
    </div>
  )
}
