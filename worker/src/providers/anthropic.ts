import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { ParsedLogSchema } from '../../../shared/parsedLog'
import type { ModelCall } from '../parseLog'

export function anthropicCall(apiKey: string | undefined, model: string, maxTokens: number): ModelCall {
  const client = new Anthropic(apiKey ? { apiKey } : {})
  return async (system, user) => {
    const response = await client.messages.parse({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
      output_config: { format: zodOutputFormat(ParsedLogSchema) },
    })
    return {
      log:     response.stop_reason === 'end_turn' ? response.parsed_output : null,
      refused: response.stop_reason === 'refusal',
      inputTokens:  response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    }
  }
}
