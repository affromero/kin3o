import Anthropic from '@anthropic-ai/sdk';
import type { GenerationResult } from './registry.js';

export async function generateWithAnthropic(
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<GenerationResult> {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  const start = Date.now();
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model,
    max_tokens: 16384,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  return {
    content: text,
    provider: 'anthropic',
    model,
    durationMs: Date.now() - start,
  };
}
