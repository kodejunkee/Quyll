import type { IAIProvider, ChatMessage } from '../../types/provider';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

export class GroqProvider implements IAIProvider {
  readonly id = 'groq';
  readonly name = 'Groq';

  async chat(apiKey: string, messages: ChatMessage[], systemPrompt?: string): Promise<string> {
    const payloadMessages = [...messages];
    
    if (systemPrompt) {
      payloadMessages.unshift({ role: 'system', content: systemPrompt });
    }

    const response = await fetch(GROQ_API_URL, {
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
      throw new Error(`Groq API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async generateText(apiKey: string, prompt: string, systemPrompt?: string): Promise<string> {
    return this.chat(apiKey, [{ role: 'user', content: prompt }], systemPrompt);
  }
}
