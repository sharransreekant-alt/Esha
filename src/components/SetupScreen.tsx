import React, { useState } from 'react'
import { useApp } from '../context/AppContext'

export function SetupScreen() {
  const { setWho } = useApp()
  const [name, setName] = useState('')

  function handleGo() {
    if (!name.trim()) { alert('Enter your name'); return }
    setWho(name.trim())
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', padding: '40px 24px',
      background: 'linear-gradient(160deg, var(--hdr-from) 0%, var(--cream) 60%)',
    }}>
      <div style={{ fontSize: 60, marginBottom: 16 }}>🍼</div>
      <h1 style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 28, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>
        Esha's Tracker
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: 24, fontSize: 15, fontWeight: 600, lineHeight: 1.6 }}>
        Who are you? This shows next to each entry so you both know who logged what.
      </p>
      <div className="fg">
        <label className="flbl">Your Name</label>
        <input
          className="finput"
          type="text"
          placeholder="Mum or Dad"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleGo() }}
          autoFocus
        />
      </div>
      <button className="btn-primary" onClick={handleGo}>Let's go →</button>
    </div>
  )
}
