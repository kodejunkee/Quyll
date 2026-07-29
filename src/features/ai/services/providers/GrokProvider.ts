import type { IAIProvider, ChatMessage } from '../../types/provider';

const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
const DEFAULT_MODEL = 'grok-2';

export class GrokProvider implements IAIProvider {
  readonly id = 'grok';
  readonly name = 'xAI Grok';

  async chat(apiKey: string, messages: ChatMessage[], systemPrompt?: string): Promise<string> {
    const payloadMessages = [...messages];
    
    if (systemPrompt) {
      payloadMessages.unshift({ role: 'system', content: systemPrompt });
    }

    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: payloadMessages,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Grok API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async generateText(apiKey: string, prompt: string, systemPrompt?: string): Promise<string> {
    return this.chat(apiKey, [{ role: 'user', content: prompt }], systemPrompt);
  }
}
