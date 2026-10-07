import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { ParsedLogSchema } from '../../../shared/parsedLog'
import type { ModelCall } from '../parseLog'

export function openaiCall(apiKey: string | undefined, model: string, maxTokens: number): ModelCall {
  const client = new OpenAI(apiKey ? { apiKey } : {})
  return async (system, user) => {
    const completion = await client.chat.completions.parse({
      model,
      max_completion_tokens: maxTokens,
      reasoning_effort: 'low',
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: user },
      ],
      response_format: zodResponseFormat(ParsedLogSchema, 'parsed_log'),
    })
    const choice = completion.choices[0]
    return {
      log:     choice?.finish_reason === 'stop' ? choice.message.parsed : null,
      refused: !!choice?.message.refusal,
      inputTokens:  completion.usage?.prompt_tokens ?? 0,
      outputTokens: completion.usage?.completion_tokens ?? 0,
    }
  }
}
