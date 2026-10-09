import { describe, it, expect } from 'vitest'
import { LEGACY, familyPaths, COLLECTIONS } from '../src/family/paths'

describe('family paths', () => {
  it('keeps the original shared lists where they are', () => {
    expect(LEGACY.entries).toBe('esha_entries')
    expect(LEGACY.handovers).toBe('esha_handover')
    expect(LEGACY.settings).toBe('esha_settings/config')
  })
  it('puts every list inside the family folder', () => {
    const p = familyPaths('abc')
    for (const k of COLLECTIONS) expect(p[k]).toBe(`families/abc/${k}`)
    expect(p.settings).toBe('families/abc')
  })
  it('never lets two families share a path', () => {
    const a = familyPaths('a'), b = familyPaths('b')
    for (const k of COLLECTIONS) expect(a[k]).not.toBe(b[k])
  })
})
