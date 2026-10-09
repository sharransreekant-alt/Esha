import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { AccountView } from './AccountView'
import { JoinFamily } from './JoinFamily'
import { createNewFamily } from '../family/migrate'
import { signOutAccount } from '../firebase'

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// First run: sign in, say who you are, then start a log for your baby or join one.
export function Onboarding() {
  const { account, setWho } = useApp()
  const [mode,     setMode]     = useState<'new' | 'join'>('new')
  const [name,     setName]     = useState((account.name || '').split(' ')[0])
  const [babyName, setBabyName] = useState('')
  const [dob,      setDob]      = useState('')
  const [busy,     setBusy]     = useState(false)
  const [error,    setError]    = useState('')

  // Pick up the name from the account once sign-in completes
  React.useEffect(() => { if (!name && account.name) setName(account.name.split(' ')[0]) }, [account.name])

  const born = dob ? new Date(`${dob}T12:00:00`) : null
  const dobOk = !!born && !isNaN(born.getTime()) && born.getTime() <= Date.now() && born.getFullYear() >= new Date().getFullYear() - 5
  const canCreate = !!name.trim() && !!babyName.trim() && dobOk

  async function handleCreate() {
    setBusy(true); setError('')
    try {
      await createNewFamily(account.uid, name.trim(), babyName.trim(), born!)
      setWho(name.trim())
    } catch {
      setError("Couldn't set that up. Check your connection and try again")
    }
    setBusy(false)
  }

  const tabOn:  React.CSSProperties = { background: 'var(--white)', color: 'var(--text)', boxShadow: '0 2px 8px rgba(60,42,24,0.1)' }
  const tabOff: React.CSSProperties = { background: 'transparent', color: 'var(--muted)', boxShadow: 'none' }

  return (
    <div style={{ minHeight: '100vh', padding: '48px 20px 40px', background: 'linear-gradient(160deg, var(--hdr-from) 0%, var(--cream) 60%)' }}>
      <div style={{ fontSize: 52, marginBottom: 10 }}>🍼</div>
      <div className="serif" style={{ fontSize: 28, color: 'var(--text)', marginBottom: 8 }}>Welcome</div>
      <div style={{ fontSize: 14, color: 'var(--text-med)', fontWeight: 600, lineHeight: 1.55, marginBottom: 22 }}>
        A shared log for your baby's feeds, nappies, solids and more, kept in step between both parents' phones.
      </div>

      {!account.signedIn ? (
        <AccountView embedded intro="Sign in to get started. Your account is how you get back to your log on any phone." />
      ) : (
        <>
          <div className="fg">
            <label className="flbl">Your name</label>
            <input className="finput" type="text" autoComplete="given-name" placeholder="Shown next to what you log" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div style={{ display: 'flex', background: 'var(--cream2)', borderRadius: 14, padding: 4, margin: '6px 0 18px' }}>
            <button onClick={() => setMode('new')}  style={{ flex: 1, padding: '10px 0', borderRadius: 11, border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer', ...(mode === 'new'  ? tabOn : tabOff) }}>Start a new log</button>
            <button onClick={() => setMode('join')} style={{ flex: 1, padding: '10px 0', borderRadius: 11, border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer', ...(mode === 'join' ? tabOn : tabOff) }}>I have an invite code</button>
          </div>

          {mode === 'new' ? (
            <>
              <div className="fg">
                <label className="flbl">Baby's name</label>
                <input className="finput" type="text" value={babyName} onChange={e => setBabyName(e.target.value)} />
              </div>
              <div className="fg">
                <label className="flbl">Date of birth</label>
                <input className="finput" type="date" max={today()} value={dob} onChange={e => setDob(e.target.value)} />
              </div>
              {dob && !dobOk && <div style={{ color: 'var(--red)', fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Check the date of birth</div>}
              <button className="btn-primary" onClick={handleCreate} disabled={busy || !canCreate}>{busy ? 'Setting up…' : 'Start logging'}</button>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, lineHeight: 1.5, marginTop: 12 }}>
                The date of birth is used to show your baby's age and age-based suggestions. You can invite the other parent once you're in.
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13, color: 'var(--text-med)', fontWeight: 600, lineHeight: 1.55, marginBottom: 14 }}>
                The other parent can create a code in the app under More → Family.
              </div>
              <JoinFamily name={name} onJoined={() => setWho(name.trim())} />
            </>
          )}

          {error && <div style={{ color: 'var(--red)', fontSize: 13, fontWeight: 700, marginTop: 12, textAlign: 'center' }}>{error}</div>}

          <button onClick={() => signOutAccount()} style={{ display: 'block', margin: '26px auto 0', background: 'none', border: 'none', fontSize: 12, fontWeight: 800, color: 'var(--muted)', cursor: 'pointer' }}>
            Signed in as {account.email || account.name || 'you'} · Sign out
          </button>
        </>
      )}

      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, lineHeight: 1.5, marginTop: 30, textAlign: 'center' }}>
        This app is for keeping records and general information. It isn't medical advice and doesn't replace your nurse or GP. In an emergency call 000. For 24-hour health advice call Healthdirect on 1800 022 222.
      </div>
    </div>
  )
}
