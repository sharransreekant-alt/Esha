import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Appointment } from '../types'
import { APPOINTMENT_TEMPLATES } from '../utils/appointments'
import { ESHA_BORN } from '../types'
import { toDate } from '../utils/helpers'

// ── Shared styles ──────────────────────────────────────────────
const CARD: React.CSSProperties = {
  background: 'var(--white)', borderRadius: 'var(--r-sm)',
  boxShadow: 'var(--shadow)', padding: '14px 15px', marginBottom: 10,
}

function TypePill({ appt }: { appt: Appointment }) {
  const upcoming = !appt.completed && new Date(appt.date) >= new Date(new Date().toDateString())
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 10,
      background: appt.completed ? 'var(--green-s)' : upcoming ? 'var(--blue-s)' : 'var(--amber-s)',
      color:      appt.completed ? 'var(--green)'   : upcoming ? 'var(--blue)'   : '#8a6200',
      border: `1px solid ${appt.completed ? 'rgba(62,184,118,0.25)' : upcoming ? 'rgba(74,159,212,0.25)' : 'rgba(245,166,35,0.25)'}`,
    }}>
      {appt.completed ? '✓ Done' : upcoming ? 'Upcoming' : 'Overdue'}
    </span>
  )
}

// ── Add / Edit modal ──────────────────────────────────────────
function AppointmentModal({
  initial, onSave, onClose
}: {
  initial?: Partial<Appointment>
  onSave: (data: Partial<Appointment>) => Promise<void>
  onClose: () => void
}) {
  const { who, aiKey } = useApp()
  const ageWeeks = Math.floor((Date.now() - ESHA_BORN.getTime()) / (7 * 24 * 60 * 60 * 1000))
  const [type,      setType]      = useState(initial?.type      || 'Midwife Visit')
  const [date,      setDate]      = useState(initial?.date      || new Date().toISOString().slice(0, 10))
  const [time,      setTime]      = useState(initial?.time      || '')
  const [location,  setLocation]  = useState(initial?.location  || '')
  const [doctor,    setDoctor]    = useState(initial?.doctor    || '')
  const [questions, setQuestions] = useState<string[]>(initial?.questions || [])
  const [saving,    setSaving]    = useState(false)
  const [loadingAI, setLoadingAI] = useState(false)
  const [newQ,      setNewQ]      = useState('')

  const template = APPOINTMENT_TEMPLATES.find(t => t.type === type)

  async function loadAIQuestions() {
    if (!aiKey) { alert('Add your OpenAI API key via the chat button first'); return }
    setLoadingAI(true)
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 400,
          messages: [{
            role: 'user',
            content: `Generate 6 specific, practical questions for parents to ask at a "${type}" appointment for a baby who is ${ageWeeks} weeks old. 
Return ONLY a JSON array of strings, no other text. Example: ["Question 1?", "Question 2?"]
Focus on what parents most commonly miss or forget to ask at this type of appointment.`
          }]
        }),
      })
      const data = await res.json()
      const text = data.choices[0]?.message?.content || '[]'
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      if (Array.isArray(parsed)) setQuestions(parsed)
    } catch (e) {
      alert('Could not load AI questions')
    }
    setLoadingAI(false)
  }

  async function handleSave() {
    if (!date) { alert('Pick a date'); return }
    setSaving(true)
    try {
      const data: Record<string, any> = { type, icon: template?.icon || '📋', date, questions, completed: initial?.completed || false, loggedBy: who, createdAt: new Date().toISOString() }
      if (time)     data.time     = time
      if (location) data.location = location
      if (doctor)   data.doctor   = doctor
      await onSave(data as any)
      onClose()
    } catch (e: any) {
      console.error('Save error:', e)
      alert('Save failed: ' + (e?.message || 'Unknown error'))
      setSaving(false)
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(46,28,18,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(8px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: 'var(--r) var(--r) 0 0', width: '100%', maxWidth: 430, margin: '0 auto', padding: '8px 20px 48px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 -8px 40px rgba(100,60,20,0.18)' }}>
        <div style={{ width: 36, height: 4, background: 'var(--handle)', borderRadius: 2, margin: '12px auto 20px' }} />
        <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 20, fontWeight: 700, textAlign: 'center', marginBottom: 20 }}>
          {initial?.id ? 'Edit Appointment' : '+ Add Appointment'}
        </div>

        {/* Type */}
        <div className="fg">
          <label className="flbl">Appointment type</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {APPOINTMENT_TEMPLATES.map(t => (
              <button key={t.type} onClick={() => { setType(t.type); setQuestions([]) }}
                className={`pill${type === t.type ? ' on' : ''}`} style={{ fontSize: 12 }}>
                {t.icon} {t.type}
              </button>
            ))}
          </div>
        </div>

        {/* Date & Time */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="fg" style={{ flex: 2 }}>
            <label className="flbl">Date</label>
            <input className="finput" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="fg" style={{ flex: 1 }}>
            <label className="flbl">Time</label>
            <input className="finput" type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
        </div>

        <div className="fg">
          <label className="flbl">Location (optional)</label>
          <input className="finput" type="text" placeholder="Clinic name or address" value={location} onChange={e => setLocation(e.target.value)} />
        </div>
        <div className="fg">
          <label className="flbl">Doctor / midwife name (optional)</label>
          <input className="finput" type="text" placeholder="e.g. Dr Smith" value={doctor} onChange={e => setDoctor(e.target.value)} />
        </div>

        {/* Questions / Agenda */}
        <div className="fg">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <label className="flbl" style={{ margin: 0 }}>Questions to ask</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {template?.questions.length ? (
                <button onClick={() => setQuestions(template.questions)} style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 12, background: 'var(--cream2)', border: '1px solid var(--border)', color: 'var(--text-med)', cursor: 'pointer' }}>
                  Load defaults
                </button>
              ) : null}
              <button onClick={loadAIQuestions} disabled={loadingAI} style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 12, background: 'var(--coral-s)', border: '1px solid rgba(240,117,96,0.2)', color: 'var(--coral-d)', cursor: 'pointer' }}>
                {loadingAI ? 'Loading…' : '✨ AI suggest'}
              </button>
            </div>
          </div>
          {questions.map((q, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7, alignItems: 'flex-start' }}>
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)', fontWeight: 800, flexShrink: 0 }}>{i + 1}.</div>
              <textarea className="finput" value={q} rows={2}
                onChange={e => setQuestions(qs => qs.map((x, j) => j === i ? e.target.value : x))}
                style={{ flex: 1, fontSize: 13, padding: '10px 12px', minHeight: 44, resize: 'none', lineHeight: 1.4 }} />
              <button onClick={() => setQuestions(qs => qs.filter((_, j) => j !== i))}
                style={{ marginTop: 6, background: 'var(--red-s)', border: '1px solid rgba(224,90,69,0.2)', color: 'var(--red)', fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 6, cursor: 'pointer', flexShrink: 0 }}>✕</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <input className="finput" placeholder="Add a question…" value={newQ} onChange={e => setNewQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newQ.trim()) { setQuestions(qs => [...qs, newQ.trim()]); setNewQ('') } }} style={{ flex: 1, fontSize: 13, padding: '10px 12px' }} />
            <button onClick={() => { if (newQ.trim()) { setQuestions(qs => [...qs, newQ.trim()]); setNewQ('') } }} style={{ padding: '0 14px', background: 'var(--cream2)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-med)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Add</button>
          </div>
        </div>

        <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ marginTop: 6 }}>
          {saving ? 'Saving…' : 'Save Appointment'}
        </button>
        <button className="btn-secondary" onClick={onClose} style={{ marginTop: 8 }}>Cancel</button>
      </div>
    </div>
  )
}

// ── Outcome modal ─────────────────────────────────────────────
function OutcomeModal({ appt, onSave, onClose }: { appt: Appointment; onSave: (data: Partial<Appointment>) => Promise<void>; onClose: () => void }) {
  const [outcome,  setOutcome]  = useState(appt.outcome  || '')
  const [weight,   setWeight]   = useState(appt.weight   ? String(appt.weight) : '')
  const [vaccines, setVaccines] = useState(appt.vaccines  || '')
  const [followUp, setFollowUp] = useState(appt.followUp  || '')
  const [saving,   setSaving]   = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await onSave({ completed: true, outcome: outcome || undefined, weight: weight ? parseInt(weight) : undefined, vaccines: vaccines || undefined, followUp: followUp || undefined })
      onClose()
    } catch { setSaving(false) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(46,28,18,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(8px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: 'var(--r) var(--r) 0 0', width: '100%', maxWidth: 430, margin: '0 auto', padding: '8px 20px 48px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 -8px 40px rgba(100,60,20,0.18)' }}>
        <div style={{ width: 36, height: 4, background: 'var(--handle)', borderRadius: 2, margin: '12px auto 20px' }} />
        <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 20, fontWeight: 700, textAlign: 'center', marginBottom: 6 }}>
          {appt.icon} Appointment Outcome
        </div>
        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', fontWeight: 600, marginBottom: 20 }}>{appt.type}</div>

        <div className="fg">
          <label className="flbl">What was discussed / outcome</label>
          <textarea className="finput" placeholder="What did the doctor say? Any concerns raised? Key takeaways…" value={outcome} onChange={e => setOutcome(e.target.value)} style={{ minHeight: 100 }} />
        </div>
        <div className="fg">
          <label className="flbl">Weight measured (grams, optional)</label>
          <input className="finput" type="number" inputMode="numeric" placeholder="e.g. 4200" value={weight} onChange={e => setWeight(e.target.value)} />
        </div>
        <div className="fg">
          <label className="flbl">Vaccinations given (optional)</label>
          <input className="finput" type="text" placeholder="e.g. DTPa, Pneumococcal, Rotavirus" value={vaccines} onChange={e => setVaccines(e.target.value)} />
        </div>
        <div className="fg">
          <label className="flbl">Follow-up / next steps</label>
          <input className="finput" type="text" placeholder="e.g. Return in 2 months, watch for X" value={followUp} onChange={e => setFollowUp(e.target.value)} />
        </div>

        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Outcome ✓'}
        </button>
        <button className="btn-secondary" onClick={onClose} style={{ marginTop: 8 }}>Cancel</button>
      </div>
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────
export function AppointmentsView() {
  const { appointments, saveAppointment, updateAppointment, removeAppointment, setView } = useApp()
  const [showAdd,    setShowAdd]    = useState(false)
  const [editing,    setEditing]    = useState<Appointment | null>(null)
  const [recording,  setRecording]  = useState<Appointment | null>(null)
  const [expanded,   setExpanded]   = useState<string | null>(null)

  const upcoming  = appointments.filter(a => !a.completed).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const completed = appointments.filter(a =>  a.completed).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  function fmtApptDate(dateStr: string, time?: string) {
    const d = new Date(dateStr + 'T12:00:00')
    const label = d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
    return time ? `${label} at ${time}` : label
  }

  function daysUntil(dateStr: string) {
    const d = new Date(dateStr + 'T12:00:00')
    const diff = Math.round((d.getTime() - Date.now()) / 86400000)
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    if (diff < 0)  return `${Math.abs(diff)}d ago`
    return `In ${diff} days`
  }

  function ApptCard({ appt }: { appt: Appointment }) {
    const isOpen = expanded === appt.id
    const isToday = new Date(appt.date + 'T12:00:00').toDateString() === new Date().toDateString()
    return (
      <div style={{ ...CARD, border: isToday ? '1.5px solid var(--coral)' : '1px solid transparent' }}>
        {/* Header row */}
        <div onClick={() => setExpanded(isOpen ? null : appt.id)} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, cursor: 'pointer' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: appt.completed ? 'var(--green-s)' : 'var(--blue-s)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
            {appt.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 3 }}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>{appt.type}</span>
              <TypePill appt={appt} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{fmtApptDate(appt.date, appt.time)}</div>
            {appt.doctor && <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginTop: 1 }}>{appt.doctor}</div>}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: isToday ? 'var(--coral)' : 'var(--text-med)' }}>{daysUntil(appt.date)}</div>
            <div style={{ fontSize: 18, color: 'var(--muted)', marginTop: 4 }}>{isOpen ? '⌃' : '⌄'}</div>
          </div>
        </div>

        {/* Expanded content */}
        {isOpen && (
          <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            {/* Questions */}
            {appt.questions.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div className="sec" style={{ marginBottom: 8 }}>Questions to ask</div>
                {appt.questions.map((q, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--coral)', fontWeight: 800, flexShrink: 0, marginTop: 1 }}>{i+1}.</span>
                    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, lineHeight: 1.4 }}>{q}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Outcome */}
            {appt.completed && (appt.outcome || appt.vaccines || appt.weight || appt.followUp) && (
              <div style={{ background: 'var(--green-s)', borderRadius: 'var(--r-xs)', padding: 12, marginBottom: 12 }}>
                <div className="sec" style={{ color: 'var(--green)', marginBottom: 8 }}>Outcome</div>
                {appt.weight && <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>⚖️ Weight: {appt.weight >= 1000 ? `${(appt.weight/1000).toFixed(2)}kg` : `${appt.weight}g`}</div>}
                {appt.vaccines && <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>💉 Vaccines: {appt.vaccines}</div>}
                {appt.outcome && <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, lineHeight: 1.5, marginBottom: 4 }}>{appt.outcome}</div>}
                {appt.followUp && <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-med)' }}>→ {appt.followUp}</div>}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {!appt.completed && (
                <button onClick={() => setRecording(appt)} style={{ flex: 1, padding: '10px 12px', background: 'var(--green-s)', border: '1px solid rgba(62,184,118,0.25)', borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 800, color: 'var(--green)', cursor: 'pointer' }}>
                  ✓ Record outcome
                </button>
              )}
              <button onClick={() => setEditing(appt)} style={{ flex: 1, padding: '10px 12px', background: 'var(--blue-s)', border: '1px solid rgba(74,159,212,0.25)', borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 800, color: 'var(--blue)', cursor: 'pointer' }}>
                Edit
              </button>
              <button onClick={() => { if (confirm('Delete this appointment?')) removeAppointment(appt.id) }} className="del-btn" style={{ padding: '10px 12px', fontSize: 13 }}>
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: '18px 16px 72px' }}>
      <div onClick={() => setView('more')} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, cursor: 'pointer' }}>
        <span style={{ fontSize: 18, color: 'var(--muted)' }}>←</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted)' }}>Back</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="sec" style={{ marginBottom: 0 }}>Appointments</div>
        <button className="btn-primary" onClick={() => setShowAdd(true)} style={{ width: 'auto', padding: '9px 16px', fontSize: 13, margin: 0 }}>+ Add</button>
      </div>

      {upcoming.length === 0 && completed.length === 0 && (
        <div className="empty">
          <div className="empty-em">📋</div>
          <p>No appointments yet.<br />Add your first one above.</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <>
          <div className="sec">Upcoming</div>
          {upcoming.map(a => <ApptCard key={a.id} appt={a} />)}
        </>
      )}

      {completed.length > 0 && (
        <>
          <div className="sec" style={{ marginTop: 16 }}>Past appointments</div>
          {completed.map(a => <ApptCard key={a.id} appt={a} />)}
        </>
      )}

      {showAdd && (
        <AppointmentModal
          onSave={async data => { await saveAppointment(data); setShowAdd(false) }}
          onClose={() => setShowAdd(false)}
        />
      )}
      {editing && (
        <AppointmentModal
          initial={editing}
          onSave={async data => { await updateAppointment(editing.id, data); setEditing(null) }}
          onClose={() => setEditing(null)}
        />
      )}
      {recording && (
        <OutcomeModal
          appt={recording}
          onSave={async data => { await updateAppointment(recording.id, data); setRecording(null) }}
          onClose={() => setRecording(null)}
        />
      )}
    </div>
  )
}
