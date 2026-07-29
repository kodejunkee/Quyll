import type { IAIProvider, ChatMessage } from '../../types/provider';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o';

export class OpenAiProvider implements IAIProvider {
  readonly id = 'openai';
  readonly name = 'OpenAI';

  async chat(apiKey: string, messages: ChatMessage[], systemPrompt?: string): Promise<string> {
    const payloadMessages = [...messages];
    
    if (systemPrompt) {
      payloadMessages.unshift({ role: 'system', content: systemPrompt });
    }

    const response = await fetch(OPENAI_API_URL, {
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
      throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async generateText(apiKey: string, prompt: string, systemPrompt?: string): Promise<string> {
    return this.chat(apiKey, [{ role: 'user', content: prompt }], systemPrompt);
  }
}
