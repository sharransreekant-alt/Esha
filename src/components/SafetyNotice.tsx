import React from 'react'

// Shown when a logged sentence mentions something a parent may want advice on.
// Sits above toasts and only closes on an explicit tap of the button.
export function SafetyNotice({ reason, onClose, title = 'Your log is saved' }: { reason: string; onClose: () => void; title?: string }) {
  return (
    <div role="alertdialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(46,28,18,0.55)', zIndex: 400, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(8px)' }}>
      <div style={{ background: 'var(--white)', borderRadius: 'var(--r) var(--r) 0 0', width: '100%', maxWidth: 430, margin: '0 auto', padding: '24px 20px 40px', boxShadow: '0 -8px 40px rgba(100,60,20,0.18)' }}>
        <div className="serif" style={{ fontSize: 21, color: 'var(--text)', marginBottom: 10 }}>{title}</div>
        <div style={{ fontSize: 14, color: 'var(--text-med)', fontWeight: 600, lineHeight: 1.55, marginBottom: 16 }}>
          {reason}. This app records what you log and can't give medical advice. If you're worried about your baby, these services can help:
        </div>
        <a href="tel:1800022222" className="btn-secondary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginBottom: 8 }}>
          Healthdirect nurse line, 24/7 · 1800 022 222
        </a>
        <div style={{ fontSize: 13, color: 'var(--text-med)', fontWeight: 600, lineHeight: 1.55, margin: '10px 2px 16px' }}>
          You can also see your GP. In an emergency call <a href="tel:000" style={{ color: 'var(--red)', fontWeight: 800 }}>000</a>.
        </div>
        <button className="btn-primary" onClick={onClose}>OK, close</button>
      </div>
    </div>
  )
}
