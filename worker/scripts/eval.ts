// Runs every case in tests/parser-cases.json through the real parser and model,
// and writes per-age-band metrics to tests/results/. This spends API credit.
//   cd worker && OPENAI_API_KEY=... npm run eval   (or ANTHROPIC_API_KEY, per PROVIDER in src/config.ts)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseLog } from '../src/parseLog'
import { PARSE_MODEL, modelCall } from '../src/config'
import type { ParsedEvent, ParsedLog, ParseRequest } from '../../shared/parsedLog'

const THRESHOLD = 0.85
// USD per million tokens for PARSE_MODEL, from the provider's pricing page. Pass as
// PRICE_IN and PRICE_OUT; without them the run reports tokens only.
const PRICE = process.env.PRICE_IN && process.env.PRICE_OUT
  ? { input: Number(process.env.PRICE_IN), output: Number(process.env.PRICE_OUT) }
  : null

interface ExpPart  { feedType: string; minutes?: number; ml?: number }
interface ExpEvent { type: string; at: string | null; components?: ExpPart[]; minutes?: number; foods?: string[]; firstTime?: boolean }
interface Case {
  id: string; band: ParseRequest['ageBand']; now: string; utterance: string
  timerState: ParseRequest['timerState']; recent: ParseRequest['recentEvents']
  expect: { events: ExpEvent[]; commands: string[]; redFlag: boolean; silent: boolean }
}

const here  = path.dirname(fileURLToPath(import.meta.url))
const root  = path.resolve(here, '../..')
const cases: Case[] = JSON.parse(fs.readFileSync(path.join(root, 'tests/parser-cases.json'), 'utf8'))

const minutesBetween = (a: string, b: string) => Math.abs(new Date(a + ':00Z').getTime() - new Date(b + ':00Z').getTime()) / 60000

function quantitiesMatch(exp: ExpEvent, got: ParsedEvent): boolean {
  if (exp.components) {
    const g = got.components || []
    if (g.length !== exp.components.length) return false
    if (!exp.components.every((c, i) => g[i].feedType === c.feedType && (g[i].minutes ?? undefined) === c.minutes && (g[i].ml ?? undefined) === c.ml)) return false
  }
  if (exp.minutes !== undefined && got.minutes !== exp.minutes) return false
  if (exp.foods) {
    const norm = (xs: string[]) => xs.map(x => x.toLowerCase().trim()).sort().join('|')
    if (norm(got.foods || []) !== norm(exp.foods)) return false
  }
  if (exp.firstTime !== undefined && (got.firstTime ?? false) !== exp.firstTime) return false
  return true
}

interface Score {
  cases: number; typesOk: number
  events: number; qtyOk: number
  timed: number; timeOk: number
  silentSaves: number; falseSilent: number
  flagExpected: number; flagHit: number; flagFalse: number
  failed: number
}
const blank = (): Score => ({ cases: 0, typesOk: 0, events: 0, qtyOk: 0, timed: 0, timeOk: 0, silentSaves: 0, falseSilent: 0, flagExpected: 0, flagHit: 0, flagFalse: 0, failed: 0 })

function score(c: Case, log: ParsedLog, s: Score, problems: string[]) {
  const exp = c.expect
  const asked = new Set(log.needsConfirm.map(n => n.eventIndex).filter((i): i is number => i !== null))

  const sameTypes = [...exp.events.map(e => e.type)].sort().join() === [...log.events.map(e => e.type)].sort().join()
    && [...exp.commands].sort().join() === [...log.commands.map(x => x.type)].sort().join()
  if (sameTypes) s.typesOk++
  else problems.push(`${c.id} types: expected [${exp.events.map(e => e.type)}|${exp.commands}] got [${log.events.map(e => e.type)}|${log.commands.map(x => x.type)}]`)

  // Pair each parsed event with the first unused expected event of the same type
  const used = new Set<number>()
  log.events.forEach((got, gi) => {
    const ei = exp.events.findIndex((e, i) => !used.has(i) && e.type === got.type)
    const match = ei >= 0 ? exp.events[ei] : null
    if (ei >= 0) used.add(ei)

    let correct = !!match
    if (match) {
      s.events++
      const qty = quantitiesMatch(match, got)
      if (qty) s.qtyOk++; else { correct = false; problems.push(`${c.id} quantities: "${got.rawSpan}"`) }
      if (match.at) {
        s.timed++
        const ok = minutesBetween(match.at, got.at) <= 2
        if (ok) s.timeOk++; else { correct = false; problems.push(`${c.id} time: expected ${match.at} got ${got.at}`) }
      }
    }
    const silent = got.confidence >= THRESHOLD && !asked.has(gi)
    if (silent) {
      s.silentSaves++
      if (!correct) { s.falseSilent++; problems.push(`${c.id} FALSE SILENT SAVE: ${got.type} "${got.rawSpan}"`) }
    }
  })

  if (exp.redFlag) { s.flagExpected++; if (log.redFlag) s.flagHit++; else problems.push(`${c.id} MISSED RED FLAG: "${c.utterance}"`) }
  else if (log.redFlag) { s.flagFalse++; problems.push(`${c.id} unexpected red flag: ${log.redFlag.reason}`) }
}

const pct = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(0)}% (${a}/${b})` : 'n/a')

async function main() {
  const call = modelCall()
  const byBand: Record<string, Score> = {}
  const total = blank()
  const problems: string[] = []
  let inputTokens = 0, outputTokens = 0, calls = 0

  for (const c of cases) {
    const req: ParseRequest = { utterance: c.utterance, nowLocal: c.now, timeZone: 'Australia/Sydney', ageBand: c.band, timerState: c.timerState, recentEvents: c.recent }
    const result = await parseLog(call, req)
    inputTokens += result.usage.inputTokens; outputTokens += result.usage.outputTokens; calls += result.usage.attempts
    for (const s of [total, (byBand[c.band] ||= blank())]) {
      s.cases++
      if (result.ok) score(c, result.log, s, s === total ? problems : [])
      else s.failed++
    }
    if (!result.ok) problems.push(`${c.id} parse failed: ${result.reason}`)
    process.stdout.write('.')
  }
  console.log()

  const row = (name: string, s: Score) => ({
    band: name, cases: s.cases, failed: s.failed,
    typeAccuracy: pct(s.typesOk, s.cases - s.failed),
    exactQuantities: pct(s.qtyOk, s.events),
    timeWithin2Min: pct(s.timeOk, s.timed),
    falseSilentSaves: `${s.falseSilent} of ${s.silentSaves} silent`,
    redFlagRecall: pct(s.flagHit, s.flagExpected),
    redFlagFalsePositives: s.flagFalse,
  })
  const rows = [...Object.entries(byBand).map(([b, s]) => row(b, s)), row('ALL', total)]
  console.table(rows)
  if (problems.length) console.log(problems.join('\n'))

  const perParse = { input: inputTokens / cases.length, output: outputTokens / cases.length }
  const costPerParse = PRICE ? (perParse.input * PRICE.input + perParse.output * PRICE.output) / 1e6 : null
  const cost = {
    model: PARSE_MODEL, calls,
    avgInputTokens: Math.round(perParse.input), avgOutputTokens: Math.round(perParse.output),
    usdPerParse: costPerParse === null ? null : +costPerParse.toFixed(5),
    usdPerFamilyMonth: costPerParse === null ? null : { newborn_25_per_day: +(costPerParse * 25 * 30).toFixed(2), sevenMonths_12_per_day: +(costPerParse * 12 * 30).toFixed(2) },
  }
  console.log(cost)

  const out = path.join(root, 'tests/results', `${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}-${PARSE_MODEL}.json`)
  fs.writeFileSync(out, JSON.stringify({ model: PARSE_MODEL, threshold: THRESHOLD, rows, cost, problems }, null, 2) + '\n')
  console.log('wrote', path.relative(root, out))

  // Launch gates from the brief
  if (total.flagHit < total.flagExpected || total.falseSilent > 0) process.exitCode = 1
}

main()
