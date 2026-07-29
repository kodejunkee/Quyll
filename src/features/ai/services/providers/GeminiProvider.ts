import type { IAIProvider, ChatMessage } from '../../types/provider';

const DEFAULT_MODEL = 'gemini-1.5-pro';

export class GeminiProvider implements IAIProvider {
  readonly id = 'gemini';
  readonly name = 'Google Gemini';

  async chat(apiKey: string, messages: ChatMessage[], systemPrompt?: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${apiKey}`;

    // Gemini requires a specific format: { contents: [{ role: 'user' | 'model', parts: [{ text: '...' }] }] }
    // Note: Gemini uses 'user' and 'model' for roles.
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

    const payload: any = {
      contents,
    };

    if (systemPrompt) {
      payload.systemInstruction = {
        parts: [{ text: systemPrompt }]
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async generateText(apiKey: string, prompt: string, systemPrompt?: string): Promise<string> {
    return this.chat(apiKey, [{ role: 'user', content: prompt }], systemPrompt);
  }
}
