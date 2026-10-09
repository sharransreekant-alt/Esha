import React, { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { View } from '../types'
import { timeSince } from '../utils/helpers'
import { toDate } from '../utils/helpers'
import { foodsTried } from '../utils/solids'
import { auth, ensureSignedIn } from '../firebase'
import { useToast } from './Toast'
import { voiceEnabled } from '../voice/parseClient'

// Siri shortcuts only exist on iPhone and iPad (iPads can report themselves as a Mac with touch)
const isApplePhone = /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)

export function MoreView() {
  const { setView, growth, journal, handovers, hasUnreadHandover, appointments, entries, account, family, solidsOn } = useApp()
  const { showToast } = useToast()

  // This install's sign-in identity, shown so it can be added to the database allow-list
  const [deviceId, setDeviceId] = useState('')
  useEffect(() => {
    ensureSignedIn().then(() => setDeviceId(auth.currentUser?.uid || '')).catch(() => {})
  }, [])
  const foodCount = foodsTried(entries).length

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
    ...(solidsOn ? [{ id: 'foods' as View, icon: '🥣', name: 'Foods tried', sub: foodCount ? `${foodCount} food${foodCount === 1 ? '' : 's'}` : 'None yet' }] : []),
    { id: 'notes', icon: '📝', name: 'Notes', sub: `${entries.filter((e: any) => e.type === 'note').length} notes` },
    { id: 'goals', icon: '🎯', name: 'Goals', sub: 'Goals & feed timing' },
    { id: 'growth',   icon: '📏', name: 'Growth',   sub: daysAgo === null ? 'Not started yet' : daysAgo === 0 ? 'Logged today' : `Last: ${daysAgo}d ago` },
    { id: 'insights', icon: '📊', name: 'Insights', sub: 'Feeding patterns' },
    { id: 'journal',  icon: '📖', name: 'Journal',  sub: `${journal.length} entr${journal.length === 1 ? 'y' : 'ies'}` },
    { id: 'handover', icon: '🤝', name: 'Handover', sub: unread ? '📬 Unread note!' : latest ? `Last: ${timeSince(latest.timestamp)}` : 'None yet' },
    { id: 'account', icon: '👤', name: 'Account', sub: account.signedIn ? `✓ ${account.name || account.email || 'Signed in'}` : 'Not signed in yet' },
    { id: 'family', icon: '🏡', name: 'Family', sub: family.usingFamily ? 'Set up' : family.id ? 'Copy and check' : 'Not set up yet' },
    ...(voiceEnabled && isApplePhone ? [{ id: 'shortcut' as View, icon: '🎙️', name: 'Siri shortcut', sub: 'Log without opening the app' }] : []),
  ]

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

      {deviceId && (
        <div
          onClick={() => { navigator.clipboard?.writeText(deviceId).then(() => showToast('Device ID copied')).catch(() => {}) }}
          style={{ marginTop: 22, textAlign: 'center', fontSize: 11, color: 'var(--muted)', fontWeight: 600, cursor: 'pointer', wordBreak: 'break-all' }}
        >
          This device's ID (tap to copy)<br />{deviceId}
        </div>
      )}
    </div>
  )
}
