import React, { useRef } from 'react'
import { useApp } from '../context/AppContext'
import { View } from '../types'
import { timeSince } from '../utils/helpers'
import { toDate } from '../utils/helpers'

export function MoreView() {
  const { setView, growth, journal, handovers, hasUnreadHandover, importEntries, appointments, entries } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)

  const lastGrowthDaysAgo = () => {
    if (!growth.length) return null
    return Math.floor((Date.now() - toDate(growth[0].timestamp).getTime()) / 86400000)
  }
  const daysAgo = lastGrowthDaysAgo()
  const unread  = hasUnreadHandover()
  const latest  = handovers[0]

  const apptCount = appointments.filter(a => !a.completed).length

  const cards: { id: View; icon: string; name: string; sub: string }[] = [
    { id: 'appointments', icon: '🏥', name: 'Appointments', sub: apptCount > 0 ? `${apptCount} upcoming` : 'None scheduled' },
    { id: 'notes', icon: '📝', name: 'Notes', sub: `${entries.filter((e: any) => e.type === 'note').length} notes` },
    { id: 'goals', icon: '🎯', name: 'Goals', sub: 'Goals & feed timing' },
    { id: 'growth',   icon: '📏', name: 'Growth',   sub: daysAgo === null ? 'Not started yet' : daysAgo === 0 ? 'Logged today' : `Last: ${daysAgo}d ago` },
    { id: 'insights', icon: '📊', name: 'Insights', sub: 'Feeding patterns' },
    { id: 'journal',  icon: '📖', name: 'Journal',  sub: `${journal.length} entr${journal.length === 1 ? 'y' : 'ies'}` },
    { id: 'handover', icon: '🤝', name: 'Handover', sub: unread ? '📬 Unread note!' : latest ? `Last: ${timeSince(latest.timestamp)}` : 'None yet' },
  ]

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const data = JSON.parse(text)
    if (!Array.isArray(data)) { alert('Invalid file'); return }
    await importEntries(data)
    alert(`✓ ${data.length} entries imported!`)
  }

  return (
    <div style={{ padding: '18px 16px 72px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
        {cards.map(c => (
          <div key={c.id} onClick={() => setView(c.id)} style={{ background: 'var(--white)', borderRadius: 'var(--r)', boxShadow: 'var(--shadow)', padding: '20px 16px', cursor: 'pointer', textAlign: 'center', transition: 'transform 0.12s' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>{c.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{c.name}</div>
            <div style={{ fontSize: 11, color: c.id === 'handover' && unread ? 'var(--coral)' : 'var(--muted)', fontWeight: 600, marginTop: 3 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="divider" />
      <button className="btn-secondary" onClick={() => fileRef.current?.click()}>
        📥 Import Google Sheet history
      </button>
      <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
    </div>
  )
}
