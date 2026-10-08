// Where a family's records live. LEGACY is the original shared layout; familyPaths is
// the per-family layout every family will use.
export interface DataPaths {
  entries: string; growth: string; journal: string; handovers: string; appointments: string
  settings: string   // document holding goals, feed timing and the baby profile
}

export const LEGACY: DataPaths = {
  entries: 'esha_entries', growth: 'esha_growth', journal: 'esha_journal',
  handovers: 'esha_handover', appointments: 'esha_appointments',
  settings: 'esha_settings/config',
}

export function familyPaths(familyId: string): DataPaths {
  const root = `families/${familyId}`
  return {
    entries: `${root}/entries`, growth: `${root}/growth`, journal: `${root}/journal`,
    handovers: `${root}/handovers`, appointments: `${root}/appointments`,
    settings: root,
  }
}

export const COLLECTIONS = ['entries', 'growth', 'journal', 'handovers', 'appointments'] as const
export type CollectionKey = typeof COLLECTIONS[number]
