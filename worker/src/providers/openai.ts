import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import type { Structured } from '../parseLog'

export function openaiStructured(apiKey: string | undefined, model: string, maxTokens: number, effort: 'none' | 'low' | 'medium'): Structured {
  const client = new OpenAI(apiKey ? { apiKey } : {})
  return async (schema, name, system, messages) => {
    const completion = await client.chat.completions.parse({
      model,
      max_completion_tokens: maxTokens,
      reasoning_effort: effort,
      messages: [{ role: 'system', content: system }, ...messages],
      response_format: zodResponseFormat(schema as any, name),
    })
    const choice = completion.choices[0]
    return {
      value:   choice?.finish_reason === 'stop' ? (choice.message.parsed as any) ?? null : null,
      refused: !!choice?.message.refusal,
      inputTokens:  completion.usage?.prompt_tokens ?? 0,
      outputTokens: completion.usage?.completion_tokens ?? 0,
    }
  }
}
