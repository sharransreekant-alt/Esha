import React, { createContext, useContext, useState, useCallback } from 'react'

interface ToastAction { label: string; onAction: () => void }
interface ToastCtx { showToast: (msg: string, action?: ToastAction) => void }
const Ctx = createContext<ToastCtx>({ showToast: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg]       = useState('')
  const [action, setAction] = useState<ToastAction | null>(null)
  const [visible, setVisible] = useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout>>()

  const showToast = useCallback((m: string, a?: ToastAction) => {
    setMsg(m); setAction(a || null); setVisible(true)
    clearTimeout(timer.current)
    // Longer when there is something to tap
    timer.current = setTimeout(() => setVisible(false), a ? 8000 : 2600)
  }, [])

  function runAction() {
    clearTimeout(timer.current)
    setVisible(false)
    action?.onAction()
  }

  return (
    <Ctx.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: 28, left: '50%',
        transform: `translateX(-50%) translateY(${visible ? 0 : 14}px)`,
        background: 'var(--text)', color: 'var(--cream)',
        padding: action ? '8px 8px 8px 20px' : '11px 22px', borderRadius: 24,
        fontFamily: 'Nunito, sans-serif', fontSize: 14, fontWeight: 700,
        zIndex: 300, opacity: visible ? 1 : 0, pointerEvents: visible && action ? 'auto' : 'none',
        transition: 'opacity 0.22s, transform 0.22s',
        boxShadow: '0 6px 28px rgba(46,28,18,0.3)',
        display: 'flex', alignItems: 'center', gap: 12, maxWidth: 'calc(100vw - 32px)',
      }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg}</span>
        {action && (
          <button onClick={runAction} style={{
            flexShrink: 0, border: 'none', borderRadius: 18, padding: '9px 16px',
            background: 'var(--cream)', color: 'var(--text)', fontSize: 14, fontWeight: 800, cursor: 'pointer',
          }}>
            {action.label}
          </button>
        )}
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
