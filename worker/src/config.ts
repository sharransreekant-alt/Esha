import type { ModelCall } from './parseLog'
import { anthropicCall } from './providers/anthropic'
import { openaiCall } from './providers/openai'

// Provider, model names and limits live here only.
export const PROVIDER: 'openai' | 'anthropic' = 'openai'
export const PARSE_MODELS = { openai: 'gpt-5.4-mini', anthropic: 'claude-haiku-4-5' }
export const PARSE_MODEL = PARSE_MODELS[PROVIDER]
export const PARSE_MAX_TOKENS = 2000

export const RATE_PER_MINUTE = 10
export const RATE_PER_DAY = 200

export interface Env {
  OPENAI_API_KEY?: string
  ANTHROPIC_API_KEY?: string
  FIREBASE_PROJECT_ID: string
  ALLOWED_ORIGINS: string // comma separated
  RATE: KVNamespace
}

// With no key passed, each SDK reads its own environment variable (used by the eval script).
export function modelCall(keys: { OPENAI_API_KEY?: string; ANTHROPIC_API_KEY?: string } = {}): ModelCall {
  return PROVIDER === 'openai'
    ? openaiCall(keys.OPENAI_API_KEY, PARSE_MODEL, PARSE_MAX_TOKENS)
    : anthropicCall(keys.ANTHROPIC_API_KEY, PARSE_MODEL, PARSE_MAX_TOKENS)
}
