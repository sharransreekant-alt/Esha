import React, { useState } from 'react'
import { Entry } from '../types'
import { fmtTime, feedDetail } from '../utils/helpers'
import { solidsDetail } from '../utils/solids'
import { useApp } from '../context/AppContext'
import { CATEGORY_ICON, CATEGORY_BG, CATEGORY_FG } from './Icons'

function entryTitle(e: Entry): string {
  if (e.type === 'feed')      return 'Feed'
  if (e.type === 'solids')    return 'Solids'
  if (e.type === 'wee')       return 'Wee'
  if (e.type === 'poo')       return 'Poo'
  if (e.type === 'massage')   return 'Massage'
  if (e.type === 'tummyTime') return 'Tummy Time'
  if (e.type === 'vitaminD')  return 'Vitamin D'
  if (e.type === 'note')      return 'Note'
  return e.type
}

function entryDetail(e: Entry): string {
  if (e.type === 'feed')     return feedDetail(e)
  if (e.type === 'solids')   return solidsDetail(e)
  if (e.type === 'massage')  return e.duration ? `${e.duration} min` : ''
  if (e.type === 'note')     return e.notes || ''
  return e.notes || ''
}

interface Props {
  entries: Entry[]
  onEdit?: (entry: Entry) => void   // feeds and solids
}

export function EntryList({ entries, onEdit }: Props) {
  const { removeEntry, entries: allEntries } = useApp()
  const [viewingNote, setViewingNote] = useState<Entry | null>(null)

  if (!entries.length) return (
    <div className="empty">
      <div className="empty-em">✨</div>
      <p>Nothing logged yet</p>
    </div>
  )

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {entries.map(e => {
          const Icon = CATEGORY_ICON[e.type] || CATEGORY_ICON.note
          const iconBg = CATEGORY_BG[e.type] || CATEGORY_BG.note
          const iconFg = CATEGORY_FG[e.type] || CATEGORY_FG.note
          const detail = entryDetail(e)
          const isNote = e.type === 'note' && !!e.notes

          return (
            <div
              key={e.id}
              onClick={() => isNote ? setViewingNote(e) : undefined}
              style={{
                background: 'var(--white)', borderRadius: 'var(--r-sm)',
                boxShadow: 'var(--shadow)', padding: '12px 13px',
                display: 'flex', alignItems: 'center', gap: 11,
                cursor: isNote ? 'pointer' : 'default',
              }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon color={iconFg} size={15} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>
                  {entryTitle(e)}
                  {isNote && <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, marginLeft: 6 }}>· tap to read</span>}
                </div>
                {detail && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail}</div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-med)' }}>{fmtTime(e.timestamp)}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', background: 'var(--cream2)', border: '1px solid var(--border)', padding: '2px 7px', borderRadius: 7 }}>{e.loggedBy || '?'}</div>
                {(e.type === 'feed' || e.type === 'solids') && onEdit && (
                  <button className="del-btn" onClick={ev => { ev.stopPropagation(); onEdit(e) }}
                    style={{ background: 'var(--blue-s)', borderColor: 'rgba(74,159,212,0.25)', color: 'var(--blue)', marginBottom: 2 }}>
                    Edit
                  </button>
                )}
                <button className="del-btn" onClick={ev => { ev.stopPropagation(); if (confirm('Delete?')) removeEntry(e.id) }}>
                  Delete
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Note viewer modal */}
      {viewingNote && (
        <div onClick={() => setViewingNote(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(46,28,18,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(8px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: 'var(--r) var(--r) 0 0', width: '100%', maxWidth: 430, margin: '0 auto', padding: '8px 20px 48px', boxShadow: '0 -8px 40px rgba(100,60,20,0.18)' }}>
            <div style={{ width: 36, height: 4, background: 'var(--handle)', borderRadius: 2, margin: '12px auto 20px' }} />
            <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 20, fontWeight: 700, textAlign: 'center', marginBottom: 20 }}>📝 Note</div>
            <div style={{ background: 'var(--cream2)', borderRadius: 'var(--r-sm)', padding: 16, fontSize: 15, color: 'var(--text)', fontWeight: 600, lineHeight: 1.6, marginBottom: 16 }}>
              {viewingNote.notes}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', background: 'var(--cream2)', border: '1px solid var(--border)', padding: '2px 7px', borderRadius: 7 }}>{viewingNote.loggedBy}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>{fmtTime(viewingNote.timestamp)}</span>
            </div>
            <button className="btn-secondary" onClick={() => setViewingNote(null)}>Close</button>
          </div>
        </div>
      )}
    </>
  )
}
