import { validateParsedLog, type ParsedLog, type ParseRequest } from '../../shared/parsedLog'
import { SYSTEM_PROMPT, buildUserMessage } from './prompt'

// One structured-output request to whichever provider is configured.
export type ModelCall = (system: string, user: string) => Promise<{
  log: ParsedLog | null
  refused: boolean
  inputTokens: number
  outputTokens: number
}>

export interface ParseUsage { inputTokens: number; outputTokens: number; attempts: number }
export type ParseResult =
  | { ok: true;  log: ParsedLog; usage: ParseUsage }
  | { ok: false; reason: 'invalid_output' | 'refused'; usage: ParseUsage }

// One call, one retry if the output fails validation. API errors propagate to the caller.
export async function parseLog(call: ModelCall, req: ParseRequest): Promise<ParseResult> {
  const usage: ParseUsage = { inputTokens: 0, outputTokens: 0, attempts: 0 }

  for (let attempt = 0; attempt < 2; attempt++) {
    usage.attempts++
    const response = await call(SYSTEM_PROMPT, buildUserMessage(req))
    usage.inputTokens  += response.inputTokens
    usage.outputTokens += response.outputTokens

    if (response.refused) return { ok: false, reason: 'refused', usage }
    if (response.log && validateParsedLog(response.log) === null) return { ok: true, log: response.log, usage }
  }
  return { ok: false, reason: 'invalid_output', usage }
}
