import type { AgeBand } from '../../shared/parsedLog'

const DAY = 86400000

// Only the band ever leaves the device, never the date of birth.
export function ageBand(born: Date, now: Date = new Date()): AgeBand {
  const days = Math.floor((now.getTime() - born.getTime()) / DAY)
  if (days < 42) return '0-6w'

  let months = (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth())
  if (now.getDate() < born.getDate()) months--

  if (months < 3)  return '6w-3m'
  if (months < 6)  return '3-6m'
  if (months < 9)  return '6-9m'
  if (months < 12) return '9-12m'
  return '12m+'
}
