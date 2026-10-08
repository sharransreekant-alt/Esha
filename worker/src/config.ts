import type { Structured } from './parseLog'
import { anthropicStructured } from './providers/anthropic'
import { openaiStructured } from './providers/openai'

// Provider, model names and limits live here only.
export const PROVIDER: 'openai' | 'anthropic' = 'openai'

// parse: turning a spoken sentence into entries. ask: the in-app assistant and appointment questions.
const MODELS = {
  openai:    { parse: 'gpt-5.4-mini',     ask: 'gpt-5.4-mini' },
  anthropic: { parse: 'claude-haiku-4-5', ask: 'claude-haiku-4-5' },
}
export const PARSE_MODEL = MODELS[PROVIDER].parse
export const PARSE_MAX_TOKENS = 2000
export const ASK_MAX_TOKENS = 1200
// OpenAI only. 'none' is about half a second faster but gets am/pm wrong more often
// (see tests/results/2026-10-08-22-40), so 'low' stays.
export const PARSE_EFFORT: 'none' | 'low' | 'medium' = 'low'

export const RATE_PER_MINUTE = 10
export const RATE_PER_DAY = 200

export interface Env {
  OPENAI_API_KEY?: string
  ANTHROPIC_API_KEY?: string
  FIREBASE_PROJECT_ID: string
  FIREBASE_API_KEY: string   // the public web key, used to refresh a parent's sign-in
  ALLOWED_ORIGINS: string // comma separated
  RATE: KVNamespace
}

// With no key passed, each SDK reads its own environment variable (used by the eval script).
export function modelCall(keys: { OPENAI_API_KEY?: string; ANTHROPIC_API_KEY?: string } = {}, kind: 'parse' | 'ask' = 'parse'): Structured {
  const model = MODELS[PROVIDER][kind]
  const maxTokens = kind === 'parse' ? PARSE_MAX_TOKENS : ASK_MAX_TOKENS
  return PROVIDER === 'openai'
    ? openaiStructured(keys.OPENAI_API_KEY, model, maxTokens, PARSE_EFFORT)
    : anthropicStructured(keys.ANTHROPIC_API_KEY, model, maxTokens)
}
