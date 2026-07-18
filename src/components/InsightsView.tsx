import React from 'react'
import { useApp } from '../context/AppContext'
import { toDate, feedVolume } from '../utils/helpers'

function computeInsights(entries: ReturnType<typeof useApp>['entries']) {
  const feeds = entries.filter(e => e.type === 'feed')
  if (!feeds.length) return null

  const byDay: Record<string, typeof feeds> = {}
  feeds.forEach(e => {
    const k = toDate(e.timestamp).toDateString()
    if (!byDay[k]) byDay[k] = []
    byDay[k].push(e)
  })
  const days = Object.keys(byDay)
  if (days.length < 3) return { notEnough: true, days: days.length }

  const recent7  = days.slice(0, 7)
  const avgFeeds = Math.round((recent7.reduce((s, k) => s + byDay[k].length, 0) / recent7.length) * 10) / 10
  const avgMl    = Math.round(recent7.reduce((s, k) => s + byDay[k].reduce((s2, e) => s2 + feedVolume(e), 0), 0) / recent7.length)

  const sorted = [...feeds].sort((a, b) => toDate(a.timestamp).getTime() - toDate(b.timestamp).getTime())
  const gaps: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    const gap = (toDate(sorted[i].timestamp).getTime() - toDate(sorted[i-1].timestamp).getTime()) / 60000
    if (gap > 0 && gap < 360) gaps.push(gap)
  }
  const avgGap     = gaps.length ? Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length) : null
  const longestGap = gaps.length ? Math.round(Math.max(...gaps)) : null

  const blocks: Record<string, number> = {}
  feeds.forEach(e => {
    const h = toDate(e.timestamp).getHours()
    const b = Math.floor(h / 3) * 3
    const k = `${String(b).padStart(2,'0')}:00–${String(b+3).padStart(2,'0')}:00`
    blocks[k] = (blocks[k] || 0) + 1
  })
  const bestBlock = Object.entries(blocks).sort((a, b) => b[1] - a[1])[0]?.[0] || null

  return { avgFeeds, avgGap, longestGap, avgMl, bestBlock, totalDays: days.length, notEnough: false }
}

function fmtMin(m: number) {
  if (m >= 60) { const h = Math.floor(m/60), r = m%60; return r ? `${h}h ${r}m` : `${h}h` }
  return `${m}m`
}

export function InsightsView() {
  const { entries, setView } = useApp()
  const ins = computeInsights(entries)

  const card = (label: string, icon: string, value: string, sub: string) => (
    <div style={{ background: 'var(--white)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow)', padding: '14px 15px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</div>
        <div style={{ fontSize: 24 }}>{icon}</div>
      </div>
      <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>{sub}</div>
    </div>
  )

  return (
    <div style={{ padding: '18px 16px 72px' }}>
      <div onClick={() => setView('more')} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, cursor: 'pointer' }}>
        <span style={{ fontSize: 18, color: 'var(--muted)' }}>←</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted)' }}>Back</span>
      </div>

      <div className="sec">Feeding Insights</div>

      {!ins && (
        <div style={{ background: 'var(--cream2)', borderRadius: 'var(--r-sm)', padding: 20, textAlign: 'center', color: 'var(--muted)' }}>
          <p style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>No feed data yet.<br />Start logging feeds and insights will appear here.</p>
        </div>
      )}

      {ins && 'notEnough' in ins && ins.notEnough && (
        <div style={{ background: 'var(--cream2)', borderRadius: 'var(--r-sm)', padding: 20, textAlign: 'center', color: 'var(--muted)' }}>
          <p style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>
            Keep going! You need at least 3 days of data.<br />
            <strong style={{ color: 'var(--text)' }}>{ins.days} day{ins.days !== 1 ? 's' : ''} so far.</strong>
          </p>
        </div>
      )}

      {ins && !ins.notEnough && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
            {card('Avg feeds / day',      '🍼', String(ins.avgFeeds!), `Goal: 8 per day · last 7 days`)}
            {ins.avgGap     !== null && card('Avg gap between feeds', '⏱', fmtMin(ins.avgGap!),     'Target: 3 hours')}
            {ins.longestGap !== null && card('Longest feed gap',      '😴', fmtMin(ins.longestGap!), 'Best indicator of longer sleep stretches')}
            {ins.avgMl      !== null && ins.avgMl! > 0 && card('Avg ml / day', '🍶', `${ins.avgMl}ml`, 'Expressed + formula · last 7 days')}
            {ins.bestBlock               && card('Busiest feed window', '📊', ins.bestBlock!, 'Most feeds happen in this 3-hour window')}
          </div>
          <div className="info-box">Based on {ins.totalDays} days of data. Insights get more accurate as data builds up.</div>
        </>
      )}
    </div>
  )
}
