import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { joinFamily } from '../family/migrate'

// Code entry for a parent joining a family the other parent created.
export function JoinFamily({ name, onJoined }: { name?: string; onJoined?: () => void }) {
  const { account, who } = useApp()
  const [code,  setCode]  = useState('')
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState('')

  async function handleJoin() {
    setBusy(true); setError('')
    try {
      const problem = await joinFamily(code, account.uid, (name ?? who).trim() || 'Parent')
      if (!problem) onJoined?.()
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
      <button className="btn-primary" onClick={handleJoin} disabled={busy || !code.trim() || (name !== undefined && !name.trim())}>{busy ? 'Joining…' : 'Join family'}</button>
      {error && <div style={{ color: 'var(--red)', fontSize: 13, fontWeight: 700, marginTop: 10, textAlign: 'center' }}>{error}</div>}
    </>
  )
}
