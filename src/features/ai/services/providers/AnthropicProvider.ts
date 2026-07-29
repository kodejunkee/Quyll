import type { IAIProvider, ChatMessage } from '../../types/provider';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-3-5-sonnet-20240620';

export class AnthropicProvider implements IAIProvider {
  readonly id = 'anthropic';
  readonly name = 'Anthropic (Claude)';

  async chat(apiKey: string, messages: ChatMessage[], systemPrompt?: string): Promise<string> {
    // Anthropic's API requires a specific format.
    // 'system' prompt is a separate parameter at the top level, not in the messages array.
    const anthropicMessages = messages
      .filter(m => m.role !== 'system') // Filter out any accidentally included system messages
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));

    const payload: any = {
      model: DEFAULT_MODEL,
      max_tokens: 4096,
      messages: anthropicMessages,
    };

    if (systemPrompt) {
      payload.system = systemPrompt;
    }

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true', // Required for client-side fetch
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || '';
  }

  async generateText(apiKey: string, prompt: string, systemPrompt?: string): Promise<string> {
    return this.chat(apiKey, [{ role: 'user', content: prompt }], systemPrompt);
  }
}
