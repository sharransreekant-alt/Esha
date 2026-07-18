import React, { useRef } from 'react'
import { useApp } from '../context/AppContext'
import { eshaAge, timeSince, timeUntil, toDate } from '../utils/helpers'

export function Header() {
  const { who, setWho, entries, reminderActive, nextFeedIn, dismissReminder, theme, toggleTheme } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)

  const lastFeedEntry = entries.find(e => e.type === 'feed')
  const lf    = lastFeedEntry ? toDate(lastFeedEntry.timestamp) : null
  const nfIn  = nextFeedIn()
  const showReminder = reminderActive()
  const photo = localStorage.getItem('eshaPhoto')

  function handlePhotoClick() {
    if (photo) openLightbox(photo)
    else fileRef.current?.click()
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 200; canvas.height = 200
        const ctx = canvas.getContext('2d')!
        const size = Math.min(img.width, img.height)
        const ox = (img.width - size) / 2, oy = (img.height - size) / 2
        ctx.drawImage(img, ox, oy, size, size, 0, 0, 200, 200)
        try {
          localStorage.setItem('eshaPhoto', canvas.toDataURL('image/jpeg', 0.82))
          window.location.reload()
        } catch { alert('Photo too large') }
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  function openLightbox(src: string) {
    const lb = document.createElement('div')
    lb.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(26,22,32,0.94);display:flex;flex-direction:column;align-items:center;justify-content:center;backdrop-filter:blur(14px)'
    lb.innerHTML = `
      <img src="${src}" style="width:min(80vw,80vh);height:min(80vw,80vh);border-radius:50%;object-fit:cover;box-shadow:0 8px 60px rgba(0,0,0,0.6);border:4px solid rgba(255,255,255,0.15)">
      <div style="font-family:'Instrument Serif',serif;font-style:italic;font-size:26px;color:#F2ECE4;margin-top:24px">Esha</div>
      <div style="font-size:13px;color:rgba(242,236,228,0.55);font-weight:700;margin-top:5px">${eshaAge()}</div>
      <div style="display:flex;gap:11px;margin-top:28px">
        <button id="lb-change" style="font-family:Manrope,sans-serif;font-size:14px;font-weight:800;padding:12px 22px;border-radius:999px;cursor:pointer;border:none;background:#C1613F;color:#fff">Change photo</button>
        <button id="lb-close"  style="font-family:Manrope,sans-serif;font-size:14px;font-weight:800;padding:12px 22px;border-radius:999px;cursor:pointer;background:rgba(255,255,255,0.13);color:rgba(255,255,255,0.85);border:1px solid rgba(255,255,255,0.2)">Close</button>
      </div>`
    document.body.appendChild(lb)
    lb.querySelector('#lb-close')!.addEventListener('click', () => lb.remove())
    lb.querySelector('#lb-change')!.addEventListener('click', () => { lb.remove(); fileRef.current?.click() })
    lb.addEventListener('click', e => { if (e.target === lb) lb.remove() })
  }

  return (
    <>
      <header style={{
        background: 'linear-gradient(160deg, var(--hdr-from) 0%, var(--hdr-to) 60%)',
        padding: '48px 20px 18px',
        position: 'sticky', top: 0, zIndex: 20,
      }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 16 }}>
          {/* Photo */}
          <div onClick={handlePhotoClick} style={{
            width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
            background: 'var(--white)', boxShadow: '0 3px 10px rgba(40,28,18,0.15)',
            cursor: 'pointer', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
          }}>
            {photo ? <img src={photo} alt="Esha" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👶'}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />

          {/* Name + age */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="serif" style={{ fontSize: 25, color: 'var(--text)', lineHeight: 1.1 }}>Esha</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--coral-d)', marginTop: 2 }}>{eshaAge()}</div>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            style={{
              width: 34, height: 34, borderRadius: 10, border: 'none',
              background: 'rgba(36,28,22,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to night mode'}
          >
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="var(--text-med)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="var(--text-med)" strokeWidth="1.75" strokeLinecap="round">
                <circle cx="12" cy="12" r="4.5" />
                <line x1="12" y1="2.5" x2="12" y2="5" />
                <line x1="12" y1="19" x2="12" y2="21.5" />
                <line x1="2.5" y1="12" x2="5" y2="12" />
                <line x1="19" y1="12" x2="21.5" y2="12" />
                <line x1="5.1" y1="5.1" x2="6.9" y2="6.9" />
                <line x1="17.1" y1="17.1" x2="18.9" y2="18.9" />
                <line x1="5.1" y1="18.9" x2="6.9" y2="17.1" />
                <line x1="17.1" y1="6.9" x2="18.9" y2="5.1" />
              </svg>
            )}
          </button>
        </div>

        {/* Timing pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {lf && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 11.5, fontWeight: 700, padding: '6px 12px', borderRadius: 999,
              background: 'var(--hdr-pill-bg)', color: 'var(--hdr-pill-fg)',
              border: '1px solid rgba(36,28,22,0.06)',
            }}>
              Last feed {timeSince(lf)}
            </div>
          )}
          {nfIn !== null && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 11.5, fontWeight: 700, padding: '6px 12px', borderRadius: 999,
              background: 'var(--hdr-pill-blue-bg)', color: 'var(--hdr-pill-blue-fg)',
              border: '1px solid rgba(76,122,147,0.15)',
            }}>
              Next in {timeUntil(nfIn)}
            </div>
          )}
          <div
            onClick={() => { const n = prompt('Your name:', who); if (n?.trim()) setWho(n.trim()) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 11.5, fontWeight: 700, padding: '6px 12px', borderRadius: 999,
              background: 'var(--hdr-pill-bg)', color: 'var(--hdr-pill-fg)',
              border: '1px solid rgba(36,28,22,0.06)', cursor: 'pointer',
            }}
          >
            {who || 'Set your name'}
          </div>
        </div>
      </header>

      {/* Feed reminder banner */}
      {showReminder && (
        <div style={{
          background: 'var(--reminder-bg)',
          borderBottom: '1px solid var(--border)',
          padding: '11px 20px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>⏰</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--coral-d)' }}>Time to pump — feed due in 30 mins</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginTop: 1 }}>
              Last feed {lf ? timeSince(lf) : ''} · Next in {nfIn !== null ? timeUntil(nfIn) : 'soon'}
            </div>
          </div>
          <button
            onClick={dismissReminder}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 18, cursor: 'pointer', flexShrink: 0, padding: '0 4px' }}
          >✕</button>
        </div>
      )}
    </>
  )
}
