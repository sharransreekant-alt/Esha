import type { z } from 'zod'
import { ParsedLogSchema, validateParsedLog, type ParsedLog, type ParseRequest } from '../../shared/parsedLog'
import { SYSTEM_PROMPT, buildUserMessage } from './prompt'

export interface ChatMessage { role: 'user' | 'assistant'; content: string }

// One structured-output request to whichever provider is configured.
export type Structured = <T>(schema: z.ZodType<T>, name: string, system: string, messages: ChatMessage[]) => Promise<{
  value: T | null
  refused: boolean
  inputTokens: number
  outputTokens: number
}>

export interface ParseUsage { inputTokens: number; outputTokens: number; attempts: number }
export type ParseResult =
  | { ok: true;  log: ParsedLog; usage: ParseUsage }
  | { ok: false; reason: 'invalid_output' | 'refused'; usage: ParseUsage }

// One call, one retry if the output fails validation. API errors propagate to the caller.
export async function parseLog(call: Structured, req: ParseRequest): Promise<ParseResult> {
  const usage: ParseUsage = { inputTokens: 0, outputTokens: 0, attempts: 0 }

  for (let attempt = 0; attempt < 2; attempt++) {
    usage.attempts++
    const response = await call(ParsedLogSchema, 'parsed_log', SYSTEM_PROMPT, [{ role: 'user', content: buildUserMessage(req) }])
    usage.inputTokens  += response.inputTokens
    usage.outputTokens += response.outputTokens

    if (response.refused) return { ok: false, reason: 'refused', usage }
    if (response.value && validateParsedLog(response.value) === null) return { ok: true, log: response.value, usage }
  }
  return { ok: false, reason: 'invalid_output', usage }
}
