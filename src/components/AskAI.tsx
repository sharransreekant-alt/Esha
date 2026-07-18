import React, { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { Entry } from '../types'
import { eshaAge, toDate, feedVolume, feedDetail } from '../utils/helpers'
import { getLeapStatus, leapContextForAI } from '../utils/leaps'
import { getMilestoneForAge } from '../utils/milestones'
import { ESHA_BORN } from '../types'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTED = [
  "Is Esha feeding enough today?",
  "She's been fussy after feeds — is that normal?",
  "How much expressed milk should she have at her age?",
  "We've only had 2 poos today, should we be worried?",
  "What's a normal feed gap for a newborn?",
  "Tips for settling a fussy baby at night?",
]

function buildContext(entries: Entry[], age: string): string {
  const today      = new Date().toDateString()
  const td         = entries.filter(e => toDate(e.timestamp).toDateString() === today)
  const feeds      = td.filter(e => e.type === 'feed')
  const wees       = td.filter(e => e.type === 'wee')
  const poos       = td.filter(e => e.type === 'poo')
  const massages   = td.filter(e => e.type === 'massage')
  const vitD       = td.filter(e => e.type === 'vitaminD')
  const totalMl    = td.reduce((s, e) => s + feedVolume(e), 0)
  const lastFeedE  = entries.find(e => e.type === 'feed')
  const lastFeedAgo = lastFeedE ? Math.round((Date.now() - toDate(lastFeedE.timestamp).getTime()) / 60000) : null
  const recentFeeds = entries.filter(e => e.type === 'feed').slice(0, 7)
  let avgGapMins: number | null = null
  if (recentFeeds.length >= 2) {
    const gaps: number[] = []
    for (let i = 0; i < recentFeeds.length - 1; i++) {
      const gap = (toDate(recentFeeds[i].timestamp).getTime() - toDate(recentFeeds[i+1].timestamp).getTime()) / 60000
      if (gap > 0 && gap < 360) gaps.push(gap)
    }
    if (gaps.length) avgGapMins = Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length)
  }
  const feedSummary = feeds.map(f => feedDetail(f)).join('; ')
  const leapStatus = getLeapStatus(ESHA_BORN)
  const leapContext = leapContextForAI(leapStatus)
  const milestone = getMilestoneForAge((Date.now() - ESHA_BORN.getTime()) / (7 * 24 * 60 * 60 * 1000))
  const milestoneContext = `Age guidance (${milestone.label}):
- Feed frequency: ${milestone.feedFreq}
- Per feed volume: ${milestone.feedVolume}
- Daily total: ${milestone.totalDailyMl}
- Poo guidance: ${milestone.poosNote}`

  return `ESHA'S DATA:
Age: ${age}
Date: ${new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}

TODAY:
- Feeds: ${feeds.length} today${totalMl > 0 ? ` (${totalMl}ml)` : ''}${feedSummary ? `\n  ${feedSummary}` : ''}
- Wees: ${wees.length} today
- Poos: ${poos.length} today
- Massages: ${massages.length} today
- Vitamin D: ${vitD.length > 0 ? 'Done ✓' : 'Not yet'}
- Last feed: ${lastFeedAgo !== null ? `${lastFeedAgo} mins ago` : 'No feeds today'}

PATTERNS:
- Avg feed gap (last 7): ${avgGapMins !== null ? `${avgGapMins} mins` : 'Not enough data'}

${leapContext}

${milestoneContext}`.trim()
}

export function AskAI() {
  const { entries, aiKey, saveAiKey, activeGoals } = useApp()
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
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [keyDraft, setKeyDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [messages, loading, open])

  async function handleSaveKey() {
    if (!keyDraft.trim()) return
    await saveAiKey(keyDraft.trim())
    setShowKeyInput(false)
    setKeyDraft('')
  }

  async function send(text: string) {
    if (!text.trim() || loading) return
    if (!aiKey) { setShowKeyInput(true); return }

    const userMsg: Message = { role: 'user', content: text }
    setMessages(m => {
      const updated = [...m, userMsg]
      const trimmed = updated.slice(-10)
      try { localStorage.setItem('esha_ai_chat', JSON.stringify(trimmed)) } catch {}
      return trimmed
    })
    setInput('')
    setLoading(true)
    setError('')

    const systemPrompt = `You are a warm, knowledgeable baby care assistant for new parents of a baby named Esha.
You have real-time data about Esha. Use it to give specific, personalised answers.

${buildContext(entries, eshaAge())}

Guidelines:
- Be warm and reassuring — these are sleep-deprived new parents
- Reference Esha's actual data when relevant
- For medical concerns always recommend consulting their paediatrician
- Keep answers concise and practical
- Calibrate advice to Esha's specific age`

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 500,
          messages: [
            { role: 'system', content: systemPrompt },
            ...[...messages, userMsg].slice(-10),
          ],
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        if (res.status === 401) {
          setError('Invalid API key. Tap 🔑 to update it.')
          await saveAiKey('')
          setShowKeyInput(true)
        } else {
          setError(err.error?.message || 'Something went wrong')
        }
        setLoading(false)
        return
      }
      const data = await res.json()
      setMessages(m => {
        const updated: Message[] = [...m, { role: 'assistant' as const, content: data.choices[0]?.message?.content || 'No response' }]
        const trimmed = updated.slice(-10)
        try { localStorage.setItem('esha_ai_chat', JSON.stringify(trimmed)) } catch {}
        return trimmed
      })
    } catch {
      setError('Network error — check your connection')
    }
    setLoading(false)
  }

  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  function handleLongPressStart() {
    longPressTimer.current = setTimeout(() => {
      setShowKeyInput(true)
      setKeyDraft(aiKey)
      setOpen(true)
    }, 800)
  }
  function handleLongPressEnd() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }

  return (
    <>
      {/* Floating button — always visible */}
      <button
        onClick={() => setOpen(true)}
        onContextMenu={e => { e.preventDefault(); setShowKeyInput(true); setKeyDraft(aiKey); setOpen(true); }}
        onTouchStart={handleLongPressStart}
        onTouchEnd={handleLongPressEnd}
        style={{
          position: 'fixed', bottom: 88, right: 16, zIndex: 50,
          width: 54, height: 54, borderRadius: '50%', border: 'none',
          background: 'var(--plum)',
          cursor: 'pointer',
          boxShadow: '0 4px 18px rgba(180,100,60,0.22)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        title="Ask about Esha (hold to update API key)"
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
              🤖 Ask about Esha
            </div>
            <button onClick={() => { setMessages([]); try { localStorage.removeItem('esha_ai_chat') } catch {} }}
              style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.5)', borderRadius: 20, padding: '6px 12px', fontSize: 12, fontWeight: 800, color: 'var(--text-med)', cursor: 'pointer' }}
              title="Clear chat history">
              Clear
            </button>
          </div>

          {/* API key setup banner */}
          {(showKeyInput || !aiKey) && (
            <div style={{ background: 'var(--white)', borderBottom: '1px solid var(--border)', padding: '14px 16px', flexShrink: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>OpenAI API Key</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 10, lineHeight: 1.5 }}>
                Saved to Firebase — both phones share it automatically.<br />
                Get yours at <span style={{ color: 'var(--coral)' }}>platform.openai.com/api-keys</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="finput"
                  type="password"
                  placeholder="sk-..."
                  value={keyDraft}
                  onChange={e => setKeyDraft(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveKey()}
                  style={{ flex: 1, fontSize: 14 }}
                />
                <button onClick={handleSaveKey} className="btn-primary" style={{ width: 'auto', padding: '0 16px', fontSize: 14, margin: 0 }}>Save</button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.length === 0 && aiKey && (
              <div>
                <div style={{ background: 'var(--white)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow)', padding: 14, marginBottom: 16 }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>👋</div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Hi! I know Esha.</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, lineHeight: 1.5 }}>
                    I can see her feeds, wees, poos and patterns from today. Ask me anything.
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
          {aiKey && !showKeyInput && (
            <div style={{ padding: '10px 16px 36px', background: 'var(--white)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  ref={inputRef}
                  className="finput"
                  type="text"
                  placeholder="Ask anything about Esha…"
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
                Not a substitute for medical advice. Always consult your paediatrician.
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </>
  )
}
