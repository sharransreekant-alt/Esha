import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { joinFamily } from '../family/migrate'

// Code entry for a parent joining a family the other parent created.
export function JoinFamily() {
  const { account, who } = useApp()
  const [code,  setCode]  = useState('')
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState('')

  async function handleJoin() {
    setBusy(true); setError('')
    try {
      const problem = await joinFamily(code, account.uid, who)
      if (problem === 'not_found') setError("That code isn't recognised. Check it with the other parent")
      if (problem === 'expired')   setError('That code has expired. Ask the other parent for a new one')
    } catch {
      setError("Couldn't join. Check your connection and try again")
    }
    setBusy(false)
  }

  return (
    <>
      <div className="fg">
        <label className="flbl">Invite code</label>
        <input
          className="finput" type="text" autoCapitalize="characters" autoCorrect="off" spellCheck={false}
          placeholder="8 letters and numbers" value={code}
          onChange={e => { setCode(e.target.value); setError('') }}
          onKeyDown={e => { if (e.key === 'Enter' && code.trim()) handleJoin() }}
          style={{ letterSpacing: '2px', fontWeight: 800 }}
        />
      </div>
      <button className="btn-primary" onClick={handleJoin} disabled={busy || !code.trim()}>{busy ? 'Joining…' : 'Join family'}</button>
      {error && <div style={{ color: 'var(--red)', fontSize: 13, fontWeight: 700, marginTop: 10, textAlign: 'center' }}>{error}</div>}
    </>
  )
}

// Shown in place of the app when this phone's log has moved into a family folder that
// this account hasn't joined yet.
export function JoinGate({ children }: { children: React.ReactNode }) {
  const { account, babyName } = useApp()
  return (
    <div style={{ minHeight: '100vh', padding: '48px 20px 40px', background: 'linear-gradient(160deg, var(--hdr-from) 0%, var(--cream) 60%)' }}>
      <div className="serif" style={{ fontSize: 26, color: 'var(--text)', marginBottom: 8 }}>{babyName}'s log has moved</div>
      <div style={{ fontSize: 14, color: 'var(--text-med)', fontWeight: 600, lineHeight: 1.55, marginBottom: 22 }}>
        It now lives in a private family folder. To keep using it on this phone, {account.signedIn ? 'enter the invite code from the other parent. They can find it under More → Family.' : 'sign in first, then enter the invite code from the other parent.'}
      </div>
      {account.signedIn ? <JoinFamily /> : children}
    </div>
  )
}
