import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import type { Structured } from '../parseLog'

export function anthropicStructured(apiKey: string | undefined, model: string, maxTokens: number): Structured {
  const client = new Anthropic(apiKey ? { apiKey } : {})
  return async (schema, _name, system, messages) => {
    const response = await client.messages.parse({
      model,
      max_tokens: maxTokens,
      system,
      messages,
      output_config: { format: zodOutputFormat(schema as any) },
    })
    return {
      value:   response.stop_reason === 'end_turn' ? (response.parsed_output as any) ?? null : null,
      refused: response.stop_reason === 'refusal',
      inputTokens:  response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    }
  }
}
