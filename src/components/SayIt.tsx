import React, { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { useToast } from './Toast'
import { SafetyNotice } from './SafetyNotice'
import { ageBand } from '../utils/ageBand'
import { requestParse, ParseError } from '../voice/parseClient'
import { planSaves, PlannedItem } from '../voice/applyParsedLog'

const ERRORS: Record<ParseError['kind'], string> = {
  unparsed: "Couldn't catch that, try again",
  network:  "Couldn't reach the server, nothing was saved",
  rate:     'Too many in a row, try again in a minute',
  daily:    "Today's voice limit is reached. Use the buttons below",
  sign_in:  "Couldn't sign in, nothing was saved",
}

// Browser speech recognition, where the browser has it. Elsewhere the field still
// works with typing or the phone keyboard's own microphone key.
const Recognition: any = typeof window !== 'undefined'
  ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  : null

export function SayIt() {
  const { entries, saveEntry, removeEntry, babyDob } = useApp()
  const { showToast } = useToast()
  const [text,    setText]    = useState('')
  const [busy,    setBusy]    = useState(false)
  const [error,   setError]   = useState('')
  const [pending, setPending] = useState<PlannedItem[]>([])
  const [skipped, setSkipped] = useState<string[]>([])
  const [redFlag, setRedFlag] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const recRef   = useRef<any>(null)
  const heardRef = useRef('')
  const inputRef = useRef<HTMLInputElement>(null)
  // Undo toast waits until the safety sheet is closed so it is never hidden behind it
  const afterNotice = useRef<(() => void) | null>(null)

  useEffect(() => () => { recRef.current?.abort() }, [])

  function toggleMic() {
    if (listening) { recRef.current?.stop(); return }
    if (!Recognition) {
      inputRef.current?.focus()
      setError("This browser can't listen directly. Tap the microphone on your keyboard, or type")
      return
    }
    const rec = new Recognition()
    rec.lang = 'en-AU'
    rec.interimResults = true
    rec.continuous = false
    heardRef.current = ''
    rec.onresult = (ev: any) => {
      const heard = Array.from(ev.results as ArrayLike<any>).map(r => r[0].transcript).join(' ').trim()
      heardRef.current = heard
      setText(heard)
    }
    rec.onerror = (ev: any) => {
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') setError('Microphone is blocked. Allow it for this site, or type instead')
      else if (ev.error !== 'no-speech' && ev.error !== 'aborted') setError("Couldn't hear that, try again or type")
    }
    // Speaking then pausing is the whole interaction: log as soon as listening ends
    rec.onend = () => {
      setListening(false)
      recRef.current = null
      if (heardRef.current) submit(heardRef.current)
    }
    recRef.current = rec
    setError(''); setText('')
    setListening(true)
    try { rec.start() } catch { setListening(false); recRef.current = null }
  }

  async function submit(spoken?: string) {
    const utterance = (spoken ?? text).trim()
    if (!utterance || busy) return
    setBusy(true); setError(''); setPending([]); setSkipped([])

    const now = new Date()
    let plan
    try {
      const log = await requestParse(utterance, entries, ageBand(babyDob, now), now)
      plan = planSaves(log, now, `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`)
    } catch (e) {
      // Nothing saved; the words stay in the field
      setError(ERRORS[e instanceof ParseError ? e.kind : 'unparsed'])
      setBusy(false)
      return
    }

    const ids: string[] = []
    try {
      for (const item of plan.save) ids.push(await saveEntry(item.payload))
    } catch {
      await Promise.all(ids.map(id => removeEntry(id).catch(() => {})))
      setError('Save failed, nothing was saved. Check your connection')
      setBusy(false)
      return
    }

    setText('')
    setPending(plan.confirm)
    setSkipped(plan.unsupported)
    setRedFlag(plan.redFlag)
    setBusy(false)

    if (ids.length) {
      const names = plan.save.map(i => i.label.split(' · ')[0].toLowerCase()).join(', ')
      const toast = () => showToast(`Saved ${names}`, { label: 'Undo', onAction: () => { ids.forEach(id => removeEntry(id)) } })
      if (plan.redFlag) afterNotice.current = toast
      else toast()
    } else if (!plan.confirm.length && !plan.unsupported.length && !plan.redFlag) {
      setText(utterance)
      setError(ERRORS.unparsed)
    }
  }

  async function addPending(item: PlannedItem) {
    try {
      const id = await saveEntry(item.payload)
      setPending(p => p.filter(x => x !== item))
      showToast(`Saved ${item.label.split(' · ')[0].toLowerCase()}`, { label: 'Undo', onAction: () => { removeEntry(id) } })
    } catch {
      setError('Save failed. Check your connection')
    }
  }

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          ref={inputRef}
          className="finput"
          type="text"
          enterKeyHint="send"
          autoCapitalize="sentences"
          placeholder={listening ? 'Listening…' : '“60ml formula, wee and a poo”'}
          value={text}
          disabled={busy}
          readOnly={listening}
          onChange={e => { setText(e.target.value); if (error) setError('') }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
          style={{ flex: 1 }}
        />
        <button
          onClick={() => (!listening && text.trim() ? submit() : toggleMic())}
          disabled={busy}
          className="btn-primary"
          style={{ width: 'auto', padding: '0 18px', margin: 0, flexShrink: 0, ...(listening ? { background: 'var(--red)' } : {}) }}
        >
          {busy ? '…' : listening ? 'Stop' : text.trim() ? 'Log' : '🎤 Say it'}
        </button>
      </div>

      {error && <div style={{ color: 'var(--red)', fontSize: 13, fontWeight: 700, marginTop: 8 }}>{error}</div>}

      {pending.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--white)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow)', padding: '10px 12px', marginTop: 8 }}>
          <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{item.question}</div>
          <button onClick={() => addPending(item)} className="pill on" style={{ flexShrink: 0 }}>Add</button>
          <button onClick={() => setPending(p => p.filter(x => x !== item))} className="pill" style={{ flexShrink: 0 }}>Skip</button>
        </div>
      ))}

      {skipped.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginTop: 8 }}>
          Timers by voice aren't available yet, so nothing was done for “{skipped.join('”, “')}”.
        </div>
      )}

      {redFlag && <SafetyNotice reason={redFlag} onClose={() => { setRedFlag(null); afterNotice.current?.(); afterNotice.current = null }} />}
    </div>
  )
}
