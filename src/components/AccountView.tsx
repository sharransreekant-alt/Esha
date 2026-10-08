import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useToast } from './Toast'
import { signInWithEmail, signInWithGoogle, resetPassword, signOutAccount, authMessage } from '../firebase'

// Optional for now: the app works without signing in. An account means the log is
// reachable again after a new phone or a reinstall.
export function AccountView() {
  const { setView, account, refreshAccount } = useApp()
  const { showToast } = useToast()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [busy,     setBusy]     = useState(false)
  const [error,    setError]    = useState('')

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true); setError('')
    try { await action(); refreshAccount(); showToast(done); setPassword('') } catch (e) { setError(authMessage(e)) }
    setBusy(false)
  }

  const emailOk = email.trim().includes('@')

  return (
    <div style={{ padding: '18px 16px 72px' }}>
      <div onClick={() => setView('more')} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, cursor: 'pointer' }}>
        <span style={{ fontSize: 18, color: 'var(--muted)' }}>←</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted)' }}>Back</span>
      </div>

      <div className="sec">Account</div>

      {account.signedIn ? (
        <>
          <div style={{ background: 'var(--white)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow)', padding: '14px 15px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Signed in as</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>✓ {account.name || account.email || 'Your account'}</div>
            {account.name && account.email && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginTop: 2, wordBreak: 'break-all' }}>{account.email}</div>}
          </div>
          <div className="info-box">
            Sign in with the same account on another phone, or after reinstalling, to get back to the log.
          </div>
          <button
            className="btn-secondary" disabled={busy} style={{ marginTop: 14 }}
            onClick={() => { if (confirm('Sign out on this phone? You will need to sign in again to see the log.')) run(signOutAccount, 'Signed out') }}
          >
            Sign out
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 13, color: 'var(--text-med)', fontWeight: 600, lineHeight: 1.55, marginBottom: 16 }}>
            Sign in so the log is still there after a new phone or a reinstall. The first time you sign in here, it creates your account and keeps everything this phone can already see.
          </div>

          <button className="btn-primary" disabled={busy} onClick={() => run(signInWithGoogle, 'Signed in')}>
            Continue with Google
          </button>

          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '18px 0 10px', textAlign: 'center' }}>Or use email</div>

          <div className="fg">
            <label className="flbl">Email</label>
            <input className="finput" type="email" autoComplete="email" autoCapitalize="none" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="fg">
            <label className="flbl">Password</label>
            <input className="finput" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && emailOk && password) run(() => signInWithEmail(email.trim(), password), 'Signed in') }} />
          </div>
          <button className="btn-secondary" disabled={busy || !emailOk || !password} onClick={() => run(() => signInWithEmail(email.trim(), password), 'Signed in')}>
            {busy ? 'Signing in…' : 'Sign in or create account'}
          </button>
          <button
            disabled={busy || !emailOk}
            onClick={() => run(() => resetPassword(email.trim()), 'Password reset email sent')}
            style={{ display: 'block', margin: '14px auto 0', background: 'none', border: 'none', fontSize: 12, fontWeight: 800, color: emailOk ? 'var(--coral-d)' : 'var(--muted)', cursor: 'pointer' }}
          >
            Forgot password
          </button>
        </>
      )}

      {error && <div style={{ color: 'var(--red)', fontSize: 13, fontWeight: 700, marginTop: 12, textAlign: 'center' }}>{error}</div>}
    </div>
  )
}
