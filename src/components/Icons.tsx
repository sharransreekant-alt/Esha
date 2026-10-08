import React from 'react'

interface IconProps { color?: string; size?: number }

export function FeedIcon({ color = 'currentColor', size = 21 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="4" height="3" rx="1" />
      <path d="M7.5 7h7l1 2v9.5a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2V9z" />
      <line x1="6.7" y1="13" x2="15.3" y2="13" />
    </svg>
  )
}

export function WeeIcon({ color = 'currentColor', size = 21 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3s6.5 7.5 6.5 12A6.5 6.5 0 0 1 5.5 15C5.5 10.5 12 3 12 3z" />
    </svg>
  )
}

export function PooIcon({ color = 'currentColor', size = 21 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round">
      <circle cx="12" cy="17.2" r="4.6" />
      <circle cx="12" cy="10.8" r="3.4" />
      <circle cx="12" cy="6" r="2.1" />
    </svg>
  )
}

export function MassageIcon({ color = 'currentColor', size = 21 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.5}>
      <circle cx="12" cy="12" r="2.8" />
      <circle cx="12" cy="12" r="6" opacity="0.55" />
      <circle cx="12" cy="12" r="9.5" opacity="0.28" />
    </svg>
  )
}

export function TummyTimeIcon({ color = 'currentColor', size = 21 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round">
      <circle cx="12" cy="8.6" r="3.3" />
      <line x1="6" y1="16.5" x2="18" y2="16.5" />
      <line x1="8.3" y1="13" x2="15.7" y2="13" />
    </svg>
  )
}

export function VitaminDIcon({ color = 'currentColor', size = 21 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2.5" x2="12" y2="5.2" />
      <line x1="12" y1="18.8" x2="12" y2="21.5" />
      <line x1="2.5" y1="12" x2="5.2" y2="12" />
      <line x1="18.8" y1="12" x2="21.5" y2="12" />
      <line x1="5.1" y1="5.1" x2="7" y2="7" />
      <line x1="17" y1="17" x2="18.9" y2="18.9" />
      <line x1="5.1" y1="18.9" x2="7" y2="17" />
      <line x1="17" y1="7" x2="18.9" y2="5.1" />
    </svg>
  )
}

export function NoteIcon({ color = 'currentColor', size = 21 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M15 3v4h4" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="13" y2="16" />
    </svg>
  )
}

export function PlusIcon({ color = 'currentColor', size = 17 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round">
      <line x1="12" y1="4" x2="12" y2="20" />
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  )
}

export function LeapSparkIcon({ color = 'currentColor', size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round">
      <line x1="12" y1="4" x2="12" y2="20" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="6.3" y1="6.3" x2="17.7" y2="17.7" />
      <line x1="17.7" y1="6.3" x2="6.3" y2="17.7" />
    </svg>
  )
}

export function SolidsIcon({ color = 'currentColor', size = 21 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0z" />
      <line x1="9" y1="20.5" x2="15" y2="20.5" />
      <path d="M13 8.5l5.5-5" />
    </svg>
  )
}

export const CATEGORY_ICON: Record<string, (p: IconProps) => JSX.Element> = {
  feed:      FeedIcon,
  solids:    SolidsIcon,
  wee:       WeeIcon,
  poo:       PooIcon,
  massage:   MassageIcon,
  tummyTime: TummyTimeIcon,
  vitaminD:  VitaminDIcon,
  note:      NoteIcon,
}

export const CATEGORY_BG: Record<string, string> = {
  feed:      'var(--feed-bg)',
  solids:    'var(--solids-bg)',
  wee:       'var(--wee-bg)',
  poo:       'var(--poo-bg)',
  massage:   'var(--mas-bg)',
  tummyTime: 'var(--tummy-bg)',
  vitaminD:  'var(--vit-bg)',
  note:      'var(--note-bg)',
}

export const CATEGORY_FG: Record<string, string> = {
  feed:      'var(--feed-fg)',
  solids:    'var(--solids-fg)',
  wee:       'var(--wee-fg)',
  poo:       'var(--poo-fg)',
  massage:   'var(--mas-fg)',
  tummyTime: 'var(--tummy-fg)',
  vitaminD:  'var(--vit-fg)',
  note:      'var(--note-fg)',
}
