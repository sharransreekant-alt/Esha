import React, { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { fmtDate } from '../utils/helpers'
import { foodsTried, showFood } from '../utils/solids'

// A plain record of what has been logged. No guidance: that lives with the linked source.
export function FoodsView() {
  const { entries, setView } = useApp()
  const [sort, setSort] = useState<'recent' | 'az'>('recent')

  const foods = useMemo(() => {
    const list = foodsTried(entries)
    return sort === 'az'
      ? list.sort((a, b) => a.name.localeCompare(b.name))
      : list.sort((a, b) => b.first.getTime() - a.first.getTime())
  }, [entries, sort])

  return (
    <div style={{ padding: '18px 16px 72px' }}>
      <div onClick={() => setView('more')} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, cursor: 'pointer' }}>
        <span style={{ fontSize: 18, color: 'var(--muted)' }}>←</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted)' }}>Back</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="sec" style={{ marginBottom: 0 }}>Foods tried · {foods.length}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setSort('recent')} className={`pill${sort === 'recent' ? ' on' : ''}`}>Newest</button>
          <button onClick={() => setSort('az')}     className={`pill${sort === 'az' ? ' on' : ''}`}>A–Z</button>
        </div>
      </div>

      {!foods.length
        ? <div className="empty"><div className="empty-em">🥣</div><p>No solids logged yet</p></div>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {foods.map(f => (
              <div key={f.name} style={{ background: 'var(--white)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow)', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{showFood(f.name)}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>First logged {fmtDate(f.first)}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-med)', flexShrink: 0 }}>{f.count}×</div>
              </div>
            ))}
          </div>
        )}

      <div className="info-box" style={{ marginTop: 18 }}>
        This list only records what you've logged. For guidance on introducing foods, see the National Allergy Council's{' '}
        <a href="https://preventallergies.org.au" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--coral)', fontWeight: 800 }}>Nip allergies in the Bub</a>
        {' '}or talk to your child health nurse or GP.
      </div>
    </div>
  )
}
