// The worker runs in UTC, so local wall-clock times need the family's timezone.

function parts(d: Date, timeZone: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const p of new Intl.DateTimeFormat('en-CA', {
    timeZone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(d)) {
    if (p.type !== 'literal') out[p.type] = Number(p.value)
  }
  return out
}

const pad = (n: number) => String(n).padStart(2, '0')

// "2026-10-07T23:26" as seen on a clock in that timezone.
export function localTimeIn(d: Date, timeZone: string): string {
  const p = parts(d, timeZone)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`
}

// The instant at which a clock in that timezone shows the given local time.
export function zonedToDate(local: string, timeZone: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local)
  if (!m) return null
  const [y, mo, d, h, mi] = m.slice(1).map(Number)
  const wanted = Date.UTC(y, mo - 1, d, h, mi)
  // Start from the same numbers read as UTC, then correct by the zone's offset. Twice, so
  // times near a daylight-saving change land on the right side of it.
  let guess = wanted
  for (let i = 0; i < 2; i++) {
    const p = parts(new Date(guess), timeZone)
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute)
    guess += wanted - shown
  }
  const out = new Date(guess)
  return isNaN(out.getTime()) ? null : out
}

// "11:30 pm"
export function spokenTime(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-AU', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true }).format(d).toLowerCase()
}

export function isTimeZone(tz: string): boolean {
  try { new Intl.DateTimeFormat('en-AU', { timeZone: tz }); return true } catch { return false }
}
