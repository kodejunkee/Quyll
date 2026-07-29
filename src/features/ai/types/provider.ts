export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface IAIProvider {
  /** The internal id for the provider (e.g. 'groq', 'openai') */
  readonly id: string;
  
  /** The human-readable name of the provider */
  readonly name: string;

  /** 
   * Sends a chat prompt and returns the full response string.
   * @param apiKey The API key for this provider.
   * @param messages The conversation history.
   * @param systemPrompt Optional system prompt (if supported by provider).
   */
  chat(apiKey: string, messages: ChatMessage[], systemPrompt?: string): Promise<string>;

  /**
   * Generates a single text response from a single prompt.
   */
  generateText(apiKey: string, prompt: string, systemPrompt?: string): Promise<string>;
}
