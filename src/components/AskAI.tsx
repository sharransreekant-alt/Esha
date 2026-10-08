import React, { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { buildFacts } from '../ai/facts'
import { ageBand } from '../utils/ageBand'
import { callWorker, voiceEnabled, ParseError } from '../voice/parseClient'
import { SafetyNotice } from './SafetyNotice'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// Questions the assistant can answer from the log. It does not judge what is normal.
const SUGGESTED = [
  'Summarise today so far',
  'When was the last feed, and how much?',
  "What's the average gap between feeds this week?",
  'How many wet and dirty nappies today?',
  'What solids were logged this week?',
  'What should I have ready for a GP appointment?',
]

const ERRORS: Record<ParseError['kind'], string> = {
  unparsed: "Couldn't answer that one. Try asking another way",
  network:  'Network error — check your connection',
  rate:     'Too many questions in a row. Try again in a minute',
  daily:    "Today's limit is reached. Try again tomorrow",
  sign_in:  "Couldn't sign in. Close and reopen the app",
}

export function AskAI() {
  const { entries, babyDob, feedCycleHours } = useApp()
  const [open,     setOpen]     = useState(false)
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('esha_ai_chat')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [redFlag,  setRedFlag]  = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [messages, loading, open])

  function remember(next: Message[]): Message[] {
    const trimmed = next.slice(-10)
    try { localStorage.setItem('esha_ai_chat', JSON.stringify(trimmed)) } catch {}
    return trimmed
  }

  async function send(text: string) {
    if (!text.trim() || loading) return

    const userMsg: Message = { role: 'user', content: text.trim().slice(0, 2000) }
    const history = [...messages, userMsg].slice(-10)
    setMessages(remember(history))
    setInput('')
    setLoading(true)
    setError('')

    try {
      // The server holds the model key and the assistant's instructions. It is sent
      // counts, times and amounts from the log and the age band; never the name or birth date.
      const data = await callWorker('/ask', {
        messages: history,
        facts:    buildFacts(entries, feedCycleHours),
        ageBand:  ageBand(babyDob),
      })
      if (typeof data?.reply !== 'string') throw new ParseError('unparsed')
      setMessages(m => remember([...m, { role: 'assistant', content: data.reply }]))
      if (data.redFlag?.reason) setRedFlag(data.redFlag.reason)
    } catch (e) {
      setError(ERRORS[e instanceof ParseError ? e.kind : 'network'])
    }
    setLoading(false)
  }

  if (!voiceEnabled) return null

  return (
    <>
      {/* Floating button — always visible */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', bottom: 88, right: 16, zIndex: 50,
          width: 54, height: 54, borderRadius: '50%', border: 'none',
          background: 'var(--plum)',
          cursor: 'pointer',
          boxShadow: '0 4px 18px rgba(180,100,60,0.22)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        title="Ask about the log"
      >
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Chat bubble */}
          <path d="M4 6C4 4.895 4.895 4 6 4H22C23.105 4 24 4.895 24 6V17C24 18.105 23.105 19 22 19H15L10 24V19H6C4.895 19 4 18.105 4 17V6Z"
            fill="var(--coral)" opacity="0.9"/>
          {/* Sparkle dots */}
          <circle cx="10" cy="12" r="1.5" fill="white"/>
          <circle cx="14" cy="12" r="1.5" fill="white"/>
          <circle cx="18" cy="12" r="1.5" fill="white"/>
        </svg>
      </button>

      {/* Full-screen chat overlay */}
      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'var(--cream)',
          display: 'flex', flexDirection: 'column',
          maxWidth: 430, margin: '0 auto',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, var(--hdr-from), var(--hdr-to))',
            padding: '52px 16px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: '0 2px 12px rgba(180,100,60,0.10)',
            flexShrink: 0,
          }}>
            <button onClick={() => setOpen(false)} style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.5)', borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 800, color: 'var(--text-med)', cursor: 'pointer' }}>
              ← Close
            </button>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 16, fontWeight: 700 }}>
              Ask about the log
            </div>
            <button onClick={() => { setMessages([]); try { localStorage.removeItem('esha_ai_chat') } catch {} }}
              style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.5)', borderRadius: 20, padding: '6px 12px', fontSize: 12, fontWeight: 800, color: 'var(--text-med)', cursor: 'pointer' }}
              title="Clear chat history">
              Clear
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.length === 0 && (
              <div>
                <div style={{ background: 'var(--white)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow)', padding: 14, marginBottom: 16 }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>👋</div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Ask me about the log</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, lineHeight: 1.5 }}>
                    I can add up today's feeds, nappies and solids, work out gaps and averages, and help you get ready for appointments. I can't tell you whether something is normal — your nurse or GP can.
                  </div>
                </div>
                <div className="sec">Try asking…</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {SUGGESTED.map((q, i) => (
                    <button key={i} onClick={() => send(q)} style={{
                      background: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)',
                      boxShadow: 'var(--shadow)', padding: '11px 14px',
                      textAlign: 'left', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text)',
                    }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%',
                  background: m.role === 'user' ? 'var(--coral)' : 'var(--white)',
                  color: m.role === 'user' ? '#fff' : 'var(--text)',
                  borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  padding: '11px 14px', fontSize: 14, fontWeight: 600, lineHeight: 1.5,
                  boxShadow: m.role === 'assistant' ? 'var(--shadow)' : '0 2px 8px rgba(240,117,96,0.3)',
                  whiteSpace: 'pre-wrap',
                }}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: 'var(--white)', borderRadius: '18px 18px 18px 4px', padding: '11px 16px', boxShadow: 'var(--shadow)', display: 'flex', gap: 5, alignItems: 'center' }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--muted)', animation: `bounce 1.2s ${i*0.2}s infinite ease-in-out` }} />
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div style={{ background: 'var(--red-s)', border: '1px solid rgba(224,90,69,0.2)', borderRadius: 'var(--r-sm)', padding: '10px 14px', fontSize: 13, color: 'var(--red)', fontWeight: 700 }}>
                {error}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          {(
            <div style={{ padding: '10px 16px 36px', background: 'var(--white)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  ref={inputRef}
                  className="finput"
                  type="text"
                  placeholder="Ask about the log…"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send(input) } }}
                  style={{ flex: 1, borderRadius: 24, padding: '12px 16px' }}
                />
                <button
                  onClick={() => send(input)}
                  disabled={!input.trim() || loading}
                  style={{
                    width: 44, height: 44, borderRadius: '50%', border: 'none', flexShrink: 0,
                    background: input.trim() && !loading ? 'var(--coral)' : 'var(--cream2)',
                    color: input.trim() && !loading ? '#fff' : 'var(--muted)',
                    fontSize: 20, cursor: 'pointer',
                    boxShadow: input.trim() ? '0 2px 8px rgba(240,117,96,0.3)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >↑</button>
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textAlign: 'center', marginTop: 6 }}>
                General information only, not medical advice. Healthdirect 1800 022 222 · Emergency 000
              </div>
            </div>
          )}
        </div>
      )}

      {redFlag && <SafetyNotice title="Where to get help" reason={redFlag} onClose={() => setRedFlag(null)} />}

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </>
  )
}
