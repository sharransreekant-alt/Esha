import React from 'react'
import { useApp } from '../context/AppContext'
import { View } from '../types'

const TABS: { id: View; label: string }[] = [
  { id: 'home',    label: 'Home' },
  { id: 'today',   label: 'Today' },
  { id: 'history', label: 'History' },
  { id: 'more',    label: 'More' },
]

const SUB_VIEWS: View[] = ['growth', 'insights', 'journal', 'handover', 'appointments', 'notes', 'goals']

export function Nav() {
  const { view, setView, hasUnreadHandover } = useApp()
  const activeTab = SUB_VIEWS.includes(view) ? 'more' : view
  const unread = hasUnreadHandover()

  return (
    <div style={{ padding: '8px 20px 10px', background: 'var(--cream)', position: 'sticky', top: 0, zIndex: 19 }}>
      <div style={{
        display: 'flex', gap: 4,
        background: 'rgba(36,28,22,0.055)', padding: 5, borderRadius: 999,
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            style={{
              flex: 1, padding: '9px 0',
              fontSize: 12.5, fontWeight: 800,
              color: activeTab === tab.id ? 'var(--cream)' : 'var(--text-med)',
              background: activeTab === tab.id ? 'var(--text)' : 'transparent',
              border: 'none', borderRadius: 999,
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            {tab.label}{tab.id === 'more' && unread ? ' •' : ''}
          </button>
        ))}
      </div>
    </div>
  )
}
