// Prints what the parser returns for one sentence. Spends one model call per run.
//   cd worker && OPENAI_API_KEY=... npx tsx scripts/try.ts "wee and a poo" 2026-10-07T23:40
import { parseLog } from '../src/parseLog'
import { modelCall } from '../src/config'

const [utterance, nowLocal = '2026-10-07T03:12', lastBottle = 'formula'] = process.argv.slice(2)
const result = await parseLog(modelCall(), {
  utterance, nowLocal, timeZone: 'Australia/Sydney', ageBand: '6-9m', timerState: null,
  lastBottleType: lastBottle === 'none' ? null : (lastBottle as 'formula' | 'expressed'),
  recentEvents: [{ type: 'wee', at: '2026-10-07T19:05', by: 'Sam', components: null }],
})
if (!result.ok) { console.log('FAILED', result.reason); process.exit(1) }
for (const e of result.log.events) {
  console.log(e.confidence.toFixed(2), e.type.padEnd(9), e.at, e.components ? JSON.stringify(e.components.map(c => `${c.feedType} ${c.minutes ?? c.ml}`)) : '', e.foods ? `${JSON.stringify(e.foods)}${e.firstTime ? ' first-time' : ''}` : '', e.note ? `note=${JSON.stringify(e.note)}` : '', `"${e.rawSpan}"`)
}
for (const n of result.log.needsConfirm) console.log('  ASK:', n.question)
if (result.log.redFlag) console.log('  RED FLAG:', result.log.redFlag.reason)
