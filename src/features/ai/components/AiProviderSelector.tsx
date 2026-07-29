import { useState, useEffect } from 'react';
import { Key } from 'lucide-react';
import { aiProviderManager } from '@/features/ai/services/AiProviderManager';
import './AiProviderSelector.css';

const AI_PROVIDERS = [
  { id: 'groq', label: 'Groq (Recommended)', placeholder: 'gsk_...' },
  { id: 'openai', label: 'OpenAI', placeholder: 'sk-...' },
  { id: 'anthropic', label: 'Anthropic', placeholder: 'sk-ant-...' },
  { id: 'gemini', label: 'Google Gemini', placeholder: 'AIza...' },
  { id: 'grok', label: 'xAI Grok', placeholder: 'xai-...' },
];

export function AiProviderSelector() {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [activeProvider, setActiveProvider] = useState<string>(aiProviderManager.getActiveProviderId());

  useEffect(() => {
    aiProviderManager.initStore().then(async () => {
      const loaded: Record<string, string> = {};
      for (const p of AI_PROVIDERS) {
        loaded[p.id] = (await aiProviderManager.getApiKey(p.id)) || '';
      }
      setApiKeys(loaded);
    }).catch(err => {
      console.error('Failed to load API keys:', err);
    });
  }, []);

  const handleKeyChange = (providerId: string, value: string) => {
    setApiKeys(prev => ({ ...prev, [providerId]: value }));
    aiProviderManager.saveApiKey(providerId, value).catch(err => {
      console.error(`Failed to save ${providerId} key:`, err);
    });
  };

  const handleProviderChange = (providerId: string) => {
    setActiveProvider(providerId);
    aiProviderManager.setActiveProvider(providerId);
  };

  const currentProvider = AI_PROVIDERS.find(p => p.id === activeProvider);

  return (
    <div className="ai-provider-selector">
      <Key size={14} className="ai-provider-selector__icon" />
      <select 
        className="ai-provider-selector__select"
        value={activeProvider}
        onChange={e => handleProviderChange(e.target.value)}
      >
        {AI_PROVIDERS.map(p => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </select>
      <input
        type="password"
        className="ai-provider-selector__input"
        placeholder={currentProvider?.placeholder || 'API Key...'}
        value={apiKeys[activeProvider] || ''}
        onChange={e => handleKeyChange(activeProvider, e.target.value)}
      />
    </div>
  );
}
