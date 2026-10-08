import React from 'react'
import { useApp } from '../context/AppContext'
import { GoalCard } from './GoalCard'
import { EntryList } from './EntryList'
import { LeapCard } from './LeapCard'
import { GuidanceCard } from './GuidanceCard'
import { GoalUpdateCard } from './GoalUpdateCard'
import { todayOnly, feedVolume } from '../utils/helpers'
import { CATEGORY_ICON, CATEGORY_FG, CATEGORY_BG } from './Icons'

export function TodayView() {
  const { entries, activeGoals } = useApp()
  const td = todayOnly(entries)

  const counts = {
    feed:      td.filter(e => e.type === 'feed').length,
    solids:    td.filter(e => e.type === 'solids').length,
    wee:       td.filter(e => e.type === 'wee').length,
    poo:       td.filter(e => e.type === 'poo').length,
    massage:   td.filter(e => e.type === 'massage').length,
    vitaminD:  td.filter(e => e.type === 'vitaminD').length,
    tummyTime: td.filter(e => e.type === 'tummyTime').reduce((s, e) => s + (Number(e.duration) || 0), 0),
  }
  const totalMl = td.reduce((s, e) => s + feedVolume(e), 0)

  const goalsConfig = [
    { key: 'feed',      goalKey: 'feedsPerDay',    label: 'Feeds',      extra: totalMl ? `${totalMl} ml total` : '' },
    { key: 'solids',    goalKey: 'solidsPerDay',   label: 'Solids',     extra: '' },
    { key: 'wee',       goalKey: 'weesPerDay',     label: 'Wees',       extra: '' },
    { key: 'poo',       goalKey: 'poosPerDay',     label: 'Poos',       extra: '' },
    { key: 'massage',   goalKey: 'massagesPerDay', label: 'Massages',   extra: '' },
    { key: 'tummyTime', goalKey: 'tummyTimeMins',  label: 'Tummy time', extra: '' },
    { key: 'vitaminD',  goalKey: 'vitaminDPerDay', label: 'Vitamin D',  extra: '' },
  ]

  const today = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div style={{ padding: '22px 20px 72px' }}>
      <div className="serif" style={{ fontSize: 27, color: 'var(--text)', marginBottom: 3 }}>Today</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 22 }}>{today}</div>

      <GoalUpdateCard />
      <LeapCard />
      <GuidanceCard />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 26 }}>
        {goalsConfig.map(g => {
          const goalVal  = activeGoals[g.goalKey as keyof typeof activeGoals]
          const countVal = counts[g.key as keyof typeof counts]
          const Icon = CATEGORY_ICON[g.key]
          const fg = CATEGORY_FG[g.key]
          const bg = CATEGORY_BG[g.key]

          // A solids goal of 0 means solids aren't being tracked yet
          if (g.key === 'solids' && !goalVal) return null

          if (goalVal === -1) return (
            <div key={g.key} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--white)', borderRadius: 'var(--r)', padding: '13px 15px', boxShadow: 'var(--shadow)' }}>
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon color={fg} size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800 }}>{g.label}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>Today: {countVal} · Variable at this age — see guidance</div>
              </div>
            </div>
          )

          return (
            <GoalCard
              key={g.key}
              categoryKey={g.key}
              icon={<Icon color={fg} size={18} />}
              label={g.label}
              count={countVal}
              goal={goalVal}
              color={fg}
              track={bg}
              extra={g.extra}
            />
          )
        })}
      </div>

      <div className="sec">Today's log · {td.length} entries</div>
      <EntryList entries={td} />
    </div>
  )
}
