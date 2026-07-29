import { load } from '@tauri-apps/plugin-store';
import type { IAIProvider, ChatMessage } from '../types/provider';
import { GroqProvider } from './providers/GroqProvider';
import { OpenAiProvider } from './providers/OpenAiProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { GrokProvider } from './providers/GrokProvider';

// The store filename on disk
const STORE_FILENAME = 'quyll-credentials.json';

class AiProviderManager {
  private providers: Map<string, IAIProvider> = new Map();
  private store: Awaited<ReturnType<typeof load>> | null = null;
  private activeProviderId: string = 'groq';

  constructor() {
    this.registerProvider(new GroqProvider());
    this.registerProvider(new OpenAiProvider());
    this.registerProvider(new AnthropicProvider());
    this.registerProvider(new GeminiProvider());
    this.registerProvider(new GrokProvider());
  }

  setActiveProvider(id: string) {
    if (this.providers.has(id)) {
      this.activeProviderId = id;
    }
  }

  getActiveProviderId(): string {
    return this.activeProviderId;
  }

  /**
   * Initializes the secure store for API credentials.
   */
  async initStore() {
    if (!this.store) {
      this.store = await load(STORE_FILENAME, { autoSave: true });
    }
  }

  private registerProvider(provider: IAIProvider) {
    this.providers.set(provider.id, provider);
  }

  getProvider(id: string): IAIProvider | undefined {
    return this.providers.get(id);
  }

  getAllProviders(): IAIProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Saves an API key for a specific provider.
   */
  async saveApiKey(providerId: string, apiKey: string): Promise<void> {
    await this.initStore();
    if (this.store) {
      await this.store.set(`apikey_${providerId}`, apiKey);
    }
  }

  /**
   * Retrieves an API key for a specific provider.
   */
  async getApiKey(providerId: string): Promise<string | null> {
    await this.initStore();
    if (this.store) {
      return (await this.store.get<string>(`apikey_${providerId}`)) || null;
    }
    return null;
  }

  /**
   * Generates text using the specified provider (or default if none provided).
   */
  async generateText(prompt: string, systemPrompt?: string, providerId?: string): Promise<string> {
    const id = providerId || this.activeProviderId;
    const provider = this.getProvider(id);
    if (!provider) throw new Error(`AI Provider ${id} not found.`);

    const apiKey = await this.getApiKey(id);
    if (!apiKey) throw new Error(`API key for ${provider.name} is missing. Please configure it in Settings.`);

    return provider.generateText(apiKey, prompt, systemPrompt);
  }

  /**
   * Conducts a chat using the specified provider.
   */
  async chat(messages: ChatMessage[], systemPrompt?: string, providerId?: string): Promise<string> {
    const id = providerId || this.activeProviderId;
    const provider = this.getProvider(id);
    if (!provider) throw new Error(`AI Provider ${id} not found.`);

    const apiKey = await this.getApiKey(id);
    if (!apiKey) throw new Error(`API key for ${provider.name} is missing. Please configure it in Settings.`);

    return provider.chat(apiKey, messages, systemPrompt);
  }
}

export const aiProviderManager = new AiProviderManager();
