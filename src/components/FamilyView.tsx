import React, { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { useToast } from './Toast'
import { JoinFamily } from './JoinFamily'
import { COLLECTIONS, CollectionKey } from '../family/paths'
import {
  Counts, MAX_COPY_WRITES, createFamily, countAll, copyAll, total, existingFamilyId,
  switchToFamily, switchBack, createInvite, listMembers,
} from '../family/migrate'

const LABELS: Record<CollectionKey, string> = {
  entries: 'Log entries', growth: 'Growth records', journal: 'Journal entries',
  handovers: 'Handover notes', appointments: 'Appointments',
}

// A family's private folder: creating it, moving the original shared data into it in
// steps the parent controls, and inviting the other parent.
export function FamilyView() {
  const { setView, account, family, who, babyName, babyDob, previewingCopy, setPreviewingCopy } = useApp()
  const { showToast } = useToast()
  const [oldCounts, setOldCounts] = useState<Counts | null>(null)
  const [newCounts, setNewCounts] = useState<Counts | null>(null)
  const [busy,      setBusy]      = useState('')
  const [progress,  setProgress]  = useState(0)
  const [error,     setError]     = useState('')
  // Set when the other parent has already created the family from their phone
  const [madeByOther, setMadeByOther] = useState(false)
  const [members,   setMembers]   = useState<string[]>([])
  const [invite,    setInvite]    = useState<{ code: string; expiresAt: Date } | null>(null)
  const [cameFromOldLists, setCameFromOldLists] = useState(false)

  async function loadCounts() {
    setError('')
    try {
      if (!family.id) { setMadeByOther(!!(await existingFamilyId())); return }
      if (family.usingFamily) {
        setMembers(await listMembers(family.id))
        // Other families can't read the old lists at all, which is the answer for them
        setCameFromOldLists(await existingFamilyId().then(id => id === family.id).catch(() => false))
        return
      }
      const [o, n] = await Promise.all([countAll(null), countAll(family.id)])
      setOldCounts(o); setNewCounts(n)
    } catch {
      setError("Couldn't load this screen. Check your connection and try again")
    }
  }
  useEffect(() => { if (family.loaded && account.signedIn) loadCounts() }, [family.loaded, family.id, family.usingFamily, account.signedIn])

  async function step(label: string, action: () => Promise<unknown>, failed: string) {
    setBusy(label); setProgress(0); setError('')
    try { await action() } catch { setError(failed) }
    setBusy('')
  }

  const handleCreate = () => step('Creating…',
    () => createFamily(account.uid, who, babyName, babyDob),
    "Couldn't create the family. Check your connection and try again")

  const handleCopy = () => step('Copying…',
    async () => { try { await copyAll(family.id!, setProgress) } finally { await loadCounts() } },
    'The copy stopped partway. Nothing in your live data was changed. Tap Copy again to finish it')

  function handleSwitch() {
    if (!confirm(`Switch to the family folder now?\n\nThis phone will use it straight away. The other parent's phone will ask for an invite code, which you'll get on the next screen. Do this when you're together and not mid-feed.`)) return
    setPreviewingCopy(false)
    step('Switching…',
      () => switchToFamily(family.id!, account.uid, setProgress),
      "The switch didn't complete, so nothing has changed and both phones are still on the current data. Try again")
  }

  function handleSwitchBack() {
    if (!confirm('Go back to the old data on this phone?\n\nAnything logged since switching stays in the family folder and will not show until you switch forward again. Do the same on the other phone.')) return
    step('Switching back…', () => switchBack(account.uid), "Couldn't switch back. Check your connection and try again")
  }

  const handleInvite = () => step('Creating code…',
    async () => setInvite(await createInvite(family.id!, account.uid)),
    "Couldn't create a code. Check your connection and try again")

  const oldTotal = oldCounts ? total(oldCounts) : 0
  const copied   = !!oldCounts && !!newCounts && total(newCounts) > 0
  const matches  = copied && COLLECTIONS.every(k => newCounts![k] === oldCounts![k])
  const tooBig   = oldTotal > MAX_COPY_WRITES

  const Back = (
    <div onClick={() => setView('more')} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, cursor: 'pointer' }}>
      <span style={{ fontSize: 18, color: 'var(--muted)' }}>←</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted)' }}>Back</span>
    </div>
  )
  const text: React.CSSProperties = { fontSize: 13, color: 'var(--text-med)', fontWeight: 600, lineHeight: 1.55, marginBottom: 16 }
  const Err = error && <div style={{ color: 'var(--red)', fontSize: 13, fontWeight: 700, marginTop: 12, textAlign: 'center' }}>{error}</div>

  if (!account.signedIn) return (
    <div style={{ padding: '18px 16px 72px' }}>
      {Back}
      <div className="sec">Family</div>
      <div style={text}>Sign in first, so the family belongs to your account and not just to this phone.</div>
      <button className="btn-primary" onClick={() => setView('account')}>Go to Account</button>
    </div>
  )

  // --- Switched over: members and invites
  if (family.usingFamily) return (
    <div style={{ padding: '18px 16px 72px' }}>
      {Back}
      <div className="sec">{babyName}'s family</div>
      <div style={{ background: 'var(--white)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow)', padding: '14px 15px', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Parents with access</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>{members.length ? members.join(', ') : '…'}</div>
      </div>

      {invite ? (
        <div style={{ background: 'var(--white)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow-md)', padding: '18px 15px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Invite code</div>
          <div
            className="serif" style={{ fontSize: 34, letterSpacing: '4px', color: 'var(--text)', margin: '8px 0', cursor: 'pointer' }}
            onClick={() => { navigator.clipboard?.writeText(invite.code).then(() => showToast('Code copied')).catch(() => {}) }}
          >
            {invite.code}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, lineHeight: 1.5 }}>
            The other parent signs in on their phone, then enters this code. It works once and expires {invite.expiresAt.toLocaleString('en-AU', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}.
          </div>
        </div>
      ) : (
        <button className="btn-primary" onClick={handleInvite} disabled={!!busy}>{busy || 'Invite the other parent'}</button>
      )}
      <button className="btn-secondary" onClick={loadCounts} disabled={!!busy} style={{ marginTop: 10 }}>Refresh who has access</button>

      <div className="info-box" style={{ marginTop: 18 }}>
        Only give the code to someone who should see everything in {babyName}'s log. Anyone who joins can read and add to all of it.
      </div>
      {cameFromOldLists && (
        <button onClick={handleSwitchBack} disabled={!!busy} style={{ display: 'block', margin: '18px auto 0', background: 'none', border: 'none', fontSize: 12, fontWeight: 800, color: 'var(--muted)', cursor: 'pointer' }}>
          Go back to the old data on this phone
        </button>
      )}
      {Err}
    </div>
  )

  // --- No family yet: create one or join with a code
  if (!family.id) return (
    <div style={{ padding: '18px 16px 72px' }}>
      {Back}
      <div className="sec">Family</div>
      {madeByOther ? (
        <div style={text}>{babyName}'s family has already been created from the other parent's phone. Enter the invite code they give you to join it.</div>
      ) : (
        <>
          <div style={text}>
            Step 1 of 3. This creates a private folder for {babyName}'s family, owned by your account. It doesn't move or change any of your current data.
          </div>
          <button className="btn-primary" onClick={handleCreate} disabled={!!busy || !family.loaded}>{busy || `Create ${babyName}'s family`}</button>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '22px 0 10px', textAlign: 'center' }}>Or join one</div>
        </>
      )}
      <JoinFamily />
      {Err}
    </div>
  )

  // --- Family created: copy, check, switch
  return (
    <div style={{ padding: '18px 16px 72px' }}>
      {Back}
      <div className="sec">Family</div>
      <div style={text}>
        {!copied
          ? 'Step 2 of 3. Copy your records into the family folder. Your current data is only read, never changed, and you keep using the app as normal.'
          : matches
            ? 'Step 3 of 3. Everything is copied. When you have looked through it and are happy, switch over.'
            : 'The copy is out of date (records have been added or removed since). Tap Copy again, or just switch: switching brings it up to date first.'}
      </div>

      {oldCounts && (
        <div style={{ background: 'var(--white)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow)', padding: '6px 14px', marginBottom: 14 }}>
          <div style={{ display: 'flex', padding: '8px 0', fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            <span style={{ flex: 1 }} /><span style={{ width: 70, textAlign: 'right' }}>Current</span><span style={{ width: 70, textAlign: 'right' }}>Copy</span>
          </div>
          {COLLECTIONS.map(k => {
            const ok = !!newCounts && newCounts[k] === oldCounts[k]
            return (
              <div key={k} style={{ display: 'flex', padding: '9px 0', borderTop: '1px solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                <span style={{ flex: 1 }}>{LABELS[k]}</span>
                <span style={{ width: 70, textAlign: 'right' }}>{oldCounts[k]}</span>
                <span style={{ width: 70, textAlign: 'right', color: !newCounts ? 'var(--muted)' : ok ? 'var(--green)' : 'var(--red)' }}>{newCounts ? newCounts[k] : '–'}</span>
              </div>
            )
          })}
        </div>
      )}

      {tooBig ? (
        <div className="info-box">
          There are {oldTotal} records, which is more than can be copied in one day on the free database plan. Don't copy yet: this needs doing in two sittings.
        </div>
      ) : (
        <>
          {copied && (
            <button className="btn-primary" onClick={handleSwitch} disabled={!!busy} style={{ marginBottom: 10 }}>
              {busy === 'Switching…' ? `Switching… ${progress} of ${oldTotal}` : 'Switch to the family folder'}
            </button>
          )}
          <button className={copied ? 'btn-secondary' : 'btn-primary'} onClick={handleCopy} disabled={!!busy || !oldCounts}>
            {busy === 'Copying…' ? `Copying… ${progress} of ${oldTotal}` : copied ? 'Copy again' : `Copy ${oldTotal} records`}
          </button>
          {copied && (
            <button
              className="btn-secondary" style={{ marginTop: 10 }} disabled={!!busy}
              onClick={() => { setPreviewingCopy(!previewingCopy); if (!previewingCopy) setView('history') }}
            >
              {previewingCopy ? 'Back to live data' : 'Look through the copy'}
            </button>
          )}
        </>
      )}
      {Err}
    </div>
  )
}
