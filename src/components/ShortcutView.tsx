import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useToast } from './Toast'
import { auth, ensureSignedIn } from '../firebase'
import { PARSE_URL } from '../voice/parseClient'

function Copyable({ label, value }: { label: string; value: string }) {
  const { showToast } = useToast()
  return (
    <div
      onClick={() => { navigator.clipboard?.writeText(value).then(() => showToast(`${label} copied`)).catch(() => {}) }}
      style={{ background: 'var(--cream2)', borderRadius: 12, padding: '10px 12px', marginTop: 6, cursor: 'pointer' }}
    >
      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label} · tap to copy</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', wordBreak: 'break-all', marginTop: 3 }}>{value}</div>
    </div>
  )
}

const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <div style={{ display: 'flex', gap: 12, background: 'var(--white)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow)', padding: '13px 14px' }}>
    <div className="serif" style={{ fontSize: 20, color: 'var(--coral)', flexShrink: 0, width: 18 }}>{n}</div>
    <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.55 }}>{children}</div>
  </div>
)

// Sets up logging by voice from outside the app (Siri, Action Button, lock screen).
export function ShortcutView() {
  const { setView, who, babyDob } = useApp()
  const [key,   setKey]   = useState('')
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState('')

  async function createKey() {
    setBusy(true); setError('')
    try {
      const idToken = await ensureSignedIn()
      const res = await fetch(`${PARSE_URL}/shortcutKey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          refreshToken: auth.currentUser!.refreshToken,
          who,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Australia/Sydney',
          dob: babyDob.toISOString().slice(0, 10),
        }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setKey((await res.json()).key)
    } catch {
      setError("Couldn't create a key. Check your connection and try again")
    }
    setBusy(false)
  }

  const b = (s: string) => <b style={{ fontWeight: 800 }}>{s}</b>

  return (
    <div style={{ padding: '18px 16px 72px' }}>
      <div onClick={() => setView('more')} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, cursor: 'pointer' }}>
        <span style={{ fontSize: 18, color: 'var(--muted)' }}>←</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted)' }}>Back</span>
      </div>

      <div className="sec">Siri shortcut</div>
      <div style={{ fontSize: 13, color: 'var(--text-med)', fontWeight: 600, lineHeight: 1.55, marginBottom: 16 }}>
        Log without opening the app: say “Hey Siri, log baby”, speak, and Siri reads back what was saved as {who}. Set this up once on each iPhone.
      </div>

      {!key ? (
        <>
          <button className="btn-primary" onClick={createKey} disabled={busy}>{busy ? 'Creating…' : 'Create a key for this phone'}</button>
          {error && <div style={{ color: 'var(--red)', fontSize: 13, fontWeight: 700, marginTop: 8, textAlign: 'center' }}>{error}</div>}
          <div className="info-box" style={{ marginTop: 16 }}>
            The key lets a shortcut add to the log as you. Creating a new one switches off the last one made on this phone.
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="info-box" style={{ margin: 0 }}>
            Your key is shown once. Keep this screen open while you build the shortcut, and don't share the key.
          </div>

          <Step n={1}>Open the {b('Shortcuts')} app, tap {b('+')}, and rename the shortcut to {b('Log baby')}.</Step>
          <Step n={2}>Add the action {b('Dictate Text')}. Set Language to English (Australia) and Stop Listening to {b('After Pause')}.</Step>
          <Step n={3}>
            Add the action {b('Get Contents of URL')} and paste this as the URL. It contains your key, so paste it exactly:
            <Copyable label="URL" value={`${PARSE_URL}/quickLog?key=${key}`} />
            Tap the arrow to show more, then set {b('Method')} to {b('POST')}. Leave {b('Headers')} empty.<br />
            Under {b('Request Body')} choose {b('JSON')} and tap {b('Add new field')} → {b('Text')}. In the {b('Key')} box type {b('text')}. Tap the {b('Text')} value box and choose {b('Dictated Text')} from the variables above the keyboard, so it shows as a blue bubble.
          </Step>
          <Step n={4}>Add the action {b('Speak Text')} and set it to speak {b('Contents of URL')}.</Step>
          <Step n={5}>Tap the play button to test it first. Then say “Hey Siri, log baby”. Siri matches the shortcut's exact name, so if Siri offers a web search instead, rename the shortcut to something Siri hears clearly. To use the side button, go to Settings → Action Button → Shortcut → Log baby.</Step>

          <div className="sec" style={{ marginTop: 12 }}>Optional: an undo shortcut</div>
          <Step n={6}>
            Make a second shortcut named {b('Undo baby log')} with just {b('Get Contents of URL')} (this URL, Method POST, nothing else) and {b('Speak Text')}. It removes whatever the last spoken log added, within an hour.
            <Copyable label="Undo URL" value={`${PARSE_URL}/quickUndo?key=${key}`} />
          </Step>
        </div>
      )}
    </div>
  )
}
