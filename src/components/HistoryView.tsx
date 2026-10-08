import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { EntryList } from './EntryList'
import { Entry } from '../types'
import { toDate, fmtDateLabel, feedVolume } from '../utils/helpers'

interface DayGroup { label: string; items: Entry[] }

export function HistoryView() {
  const { entries, activeGoals } = useApp()
  const [openDay, setOpenDay]   = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Record<string, string>>({})

  if (!entries.length) return (
    <div style={{ padding: '18px 16px 72px' }}>
      <div className="empty"><div className="empty-em">📋</div><p>No entries yet.</p></div>
    </div>
  )

  const groups: Record<string, DayGroup> = {}
  entries.forEach(e => {
    const k = toDate(e.timestamp).toDateString()
    if (!groups[k]) groups[k] = { label: fmtDateLabel(e.timestamp), items: [] }
    groups[k].items.push(e)
  })

  const CATS = [
    { key: 'feed', label: '🍼 Feeds' }, { key: 'solids', label: '🥣 Solids' }, { key: 'wee', label: '💧 Wees' },
    { key: 'poo', label: '💩 Poos' }, { key: 'massage', label: '🤲 Massage' },
    { key: 'vitaminD', label: '☀️ Vit D' }, { key: 'note', label: '📝 Notes' },
  ]

  return (
    <div style={{ padding: '18px 16px 72px' }}>
      {Object.entries(groups).map(([k, g]) => {
        const counts = {
          feed: g.items.filter(e => e.type === 'feed').length,
          wee:  g.items.filter(e => e.type === 'wee').length,
          poo:  g.items.filter(e => e.type === 'poo').length,
          massage:  g.items.filter(e => e.type === 'massage').length,
          vitaminD: g.items.filter(e => e.type === 'vitaminD').length,
        }
        const totalMl = g.items.reduce((s, e) => s + feedVolume(e), 0)
        const isOpen  = openDay === k
        const tab     = activeTab[k] || 'feed'

        const pills = [
          { key: 'feed',     emoji: '🍼', label: `${counts.feed} feeds${totalMl ? ` (${totalMl}ml)` : ''}` },
          { key: 'wee',      emoji: '💧', label: `${counts.wee} wees` },
          { key: 'poo',      emoji: '💩', label: `${counts.poo} poos` },
          { key: 'massage',  emoji: '🤲', label: `${counts.massage} massage` },
          { key: 'vitaminD', emoji: '☀️', label: `Vit D ${counts.vitaminD ? '✓' : '✗'}` },
        ]

        const pillStyle = (met: boolean, part: boolean): React.CSSProperties => ({
          fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 10,
          border: '1px solid transparent',
          background: met ? 'var(--green-s)' : part ? 'var(--amber-s)' : 'var(--red-s)',
          color:      met ? 'var(--green)'   : part ? '#b07800'        : 'var(--red)',
          borderColor: met ? 'rgba(62,184,118,0.25)' : part ? 'rgba(245,166,35,0.25)' : 'rgba(224,90,69,0.2)',
        })

        return (
          <div key={k} style={{ background: 'var(--white)', borderRadius: 'var(--r)', boxShadow: 'var(--shadow)', marginBottom: 11, overflow: 'hidden' }}>
            {/* Header */}
            <div onClick={() => setOpenDay(isOpen ? null : k)} style={{ padding: '14px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 14, fontWeight: 700, marginBottom: 9 }}>{g.label}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {pills.map(p => {
                    const c = counts[p.key as keyof typeof counts]
                    const goalMap: Record<string,string> = { feed: 'feedsPerDay', wee: 'weesPerDay', poo: 'poosPerDay', massage: 'massagesPerDay', vitaminD: 'vitaminDPerDay' }; const goal = (activeGoals as any)[goalMap[p.key]] ?? 0
                    const met = c >= goal, part = !met && c > 0
                    return <span key={p.key} style={pillStyle(met, part)}>{p.emoji} {p.label}</span>
                  })}
                </div>
              </div>
              <div style={{ fontSize: 20, color: 'var(--muted)', marginLeft: 10, transition: 'transform 0.25s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>⌄</div>
            </div>

            {/* Body */}
            {isOpen && (
              <div style={{ borderTop: '1px solid var(--border)' }}>
                {/* Tabs */}
                <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--border)', background: 'var(--cream)', WebkitOverflowScrolling: 'touch' as any }}>
                  {CATS.map(c => (
                    <button key={c.key} onClick={() => setActiveTab(t => ({ ...t, [k]: c.key }))}
                      style={{ flexShrink: 0, padding: '9px 14px', fontSize: 12, fontWeight: 800, color: tab === c.key ? 'var(--coral)' : 'var(--muted)', background: 'none', border: 'none', borderBottom: `2.5px solid ${tab === c.key ? 'var(--coral)' : 'transparent'}`, whiteSpace: 'nowrap', cursor: 'pointer' }}>
                      {c.label}
                    </button>
                  ))}
                </div>
                <div style={{ padding: '12px 13px' }}>
                  <EntryList entries={g.items.filter(e => e.type === tab)} />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
