import React, { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { COLLECTIONS, CollectionKey } from '../family/paths'
import { Counts, MAX_COPY_WRITES, createFamily, countAll, copyAll, total, existingFamilyId } from '../family/migrate'

const LABELS: Record<CollectionKey, string> = {
  entries: 'Log entries', growth: 'Growth records', journal: 'Journal entries',
  handovers: 'Handover notes', appointments: 'Appointments',
}

// Moves the original shared data into this family's own folder, in steps the parent
// controls: create the family, copy, check. Switching over is a later, separate step.
export function FamilyView() {
  const { setView, account, family, who, babyName, babyDob, previewingCopy, setPreviewingCopy } = useApp()
  const [oldCounts, setOldCounts] = useState<Counts | null>(null)
  const [newCounts, setNewCounts] = useState<Counts | null>(null)
  const [busy,      setBusy]      = useState('')
  const [progress,  setProgress]  = useState(0)
  const [error,     setError]     = useState('')
  // Set when the other parent has already created the family from their phone
  const [madeByOther, setMadeByOther] = useState(false)

  async function loadCounts() {
    setError('')
    try {
      if (!family.id) { setMadeByOther(!!(await existingFamilyId())); return }
      const [o, n] = await Promise.all([countAll(null), family.id ? countAll(family.id) : Promise.resolve(null)])
      setOldCounts(o); setNewCounts(n)
    } catch {
      setError("Couldn't count the records. Check your connection and try again")
    }
  }
  useEffect(() => { if (family.loaded && account.signedIn) loadCounts() }, [family.loaded, family.id, account.signedIn])

  async function handleCreate() {
    setBusy('Creating…'); setError('')
    try { await createFamily(account.uid, who, babyName, babyDob) }
    catch { setError("Couldn't create the family. Check your connection and try again") }
    setBusy('')
  }

  async function handleCopy() {
    if (!family.id || !oldCounts) return
    setBusy('Copying…'); setProgress(0); setError('')
    try {
      await copyAll(family.id, done => setProgress(done))
      await loadCounts()
    } catch {
      setError('The copy stopped partway. Nothing in your live data was changed. Tap Copy again to finish it')
      await loadCounts()
    }
    setBusy('')
  }

  const oldTotal = oldCounts ? total(oldCounts) : 0
  const copied   = !!oldCounts && !!newCounts && total(newCounts) > 0
  const matches  = copied && COLLECTIONS.every(k => newCounts![k] >= oldCounts![k])
  const tooBig   = oldTotal > MAX_COPY_WRITES

  const Back = (
    <div onClick={() => setView('more')} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, cursor: 'pointer' }}>
      <span style={{ fontSize: 18, color: 'var(--muted)' }}>←</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted)' }}>Back</span>
    </div>
  )
  const text: React.CSSProperties = { fontSize: 13, color: 'var(--text-med)', fontWeight: 600, lineHeight: 1.55, marginBottom: 16 }

  if (!account.signedIn) return (
    <div style={{ padding: '18px 16px 72px' }}>
      {Back}
      <div className="sec">Family</div>
      <div style={text}>Sign in first, so the family belongs to your account and not just to this phone.</div>
      <button className="btn-primary" onClick={() => setView('account')}>Go to Account</button>
    </div>
  )

  return (
    <div style={{ padding: '18px 16px 72px' }}>
      {Back}
      <div className="sec">Family</div>

      {family.usingFamily ? (
        <div className="info-box">This phone is using {babyName}'s family folder.</div>
      ) : !family.id && madeByOther ? (
        <div className="info-box">
          {babyName}'s family has already been created from the other parent's phone. You'll join it with an invite code in the next step. There's nothing to do here yet.
        </div>
      ) : !family.id ? (
        <>
          <div style={text}>
            Step 1 of 3. This creates a private folder for {babyName}'s family, owned by your account. It doesn't move or change any of your current data.
          </div>
          <button className="btn-primary" onClick={handleCreate} disabled={!!busy || !family.loaded}>{busy || `Create ${babyName}'s family`}</button>
        </>
      ) : (
        <>
          <div style={text}>
            {!copied
              ? 'Step 2 of 3. Copy your records into the family folder. Your current data is only read, never changed, and you keep using the app as normal.'
              : matches
                ? 'Step 3 of 3. Everything has been copied. Have a look through the copy before we switch to it.'
                : 'Some records are not in the copy yet (new ones may have been logged since). Tap Copy again to bring it up to date.'}
          </div>

          {oldCounts && (
            <div style={{ background: 'var(--white)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow)', padding: '6px 14px', marginBottom: 14 }}>
              <div style={{ display: 'flex', padding: '8px 0', fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                <span style={{ flex: 1 }} /><span style={{ width: 70, textAlign: 'right' }}>Current</span><span style={{ width: 70, textAlign: 'right' }}>Copy</span>
              </div>
              {COLLECTIONS.map(k => {
                const ok = !!newCounts && newCounts[k] >= oldCounts[k]
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
            <button className={matches ? 'btn-secondary' : 'btn-primary'} onClick={handleCopy} disabled={!!busy || !oldCounts}>
              {busy ? `${busy} ${progress} of ${oldTotal}` : copied ? 'Copy again' : `Copy ${oldTotal} records`}
            </button>
          )}

          {copied && (
            <button
              className={previewingCopy ? 'btn-secondary' : 'btn-primary'} style={{ marginTop: 10 }} disabled={!!busy}
              onClick={() => { setPreviewingCopy(!previewingCopy); if (!previewingCopy) setView('history') }}
            >
              {previewingCopy ? 'Back to live data' : 'Look through the copy'}
            </button>
          )}

          {copied && (
            <div className="info-box" style={{ marginTop: 16 }}>
              Looking through the copy is read-only and only affects this phone. Switching both phones over is the next step and isn't available yet.
            </div>
          )}
        </>
      )}

      {error && <div style={{ color: 'var(--red)', fontSize: 13, fontWeight: 700, marginTop: 12, textAlign: 'center' }}>{error}</div>}
    </div>
  )
}
