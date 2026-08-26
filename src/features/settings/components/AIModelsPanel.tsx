import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { CheckIcon, DownloadIcon } from '@radix-ui/react-icons';
import './GlobalSettingsModal.css';

const AI_MODELS = [
  {
    id: 'gemma-e4b',
    name: 'Gemma 4 E4B (Good)',
    description: 'Fast, lightweight model for basic writing tasks. Requires 4-6GB RAM.',
    size: '~2.0 GB',
    url: 'https://huggingface.co/google/gemma-4-e4b-it/resolve/main/gemma-4-e4b.gguf'
  },
  {
    id: 'gemma-12b',
    name: 'Gemma 4 12B (Better)',
    description: 'Best balance for long documents and complex grammar. Requires 8-12GB RAM.',
    size: '~6.0 GB',
    url: 'https://huggingface.co/google/gemma-4-12b-it/resolve/main/gemma-4-12b.gguf'
  },
  {
    id: 'gemma-26b',
    name: 'Gemma 4 26B (Best)',
    description: 'Pro tier for agents and huge context. Requires 16-24GB RAM.',
    size: '~15.0 GB',
    url: 'https://huggingface.co/google/gemma-4-26b-it/resolve/main/gemma-4-26b.gguf'
  }
];

export function AIModelsPanel() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<string | null>(null); // MOCK: would read from settings

  const handleDownload = async (id: string, url: string) => {
    setDownloading(id);
    try {
      // In a real app we'd handle progress streams here
      await invoke('download_model', { url, filename: `${id}.gguf` });
      setActiveModel(id);
      alert('Model downloaded successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to download model: ' + err);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="global-settings-modal__section">
      <div className="global-settings-modal__header">
        <h3>AI Models & DLCs</h3>
        <p>Download offline AI models to power your writing assistant. All processing happens entirely on your machine.</p>
      </div>

      <div className="global-settings-modal__setting-block" style={{ flexDirection: 'column', gap: '1rem', padding: 0 }}>
        {AI_MODELS.map((model) => (
          <div key={model.id} style={{
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '1rem', 
            border: '1px solid var(--color-border)', 
            borderRadius: '8px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ color: 'var(--color-text)' }}>{model.name}</strong>
                {activeModel === model.id && (
                  <span style={{ fontSize: '0.75rem', background: 'var(--color-primary)', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>Active</span>
                )}
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{model.description}</p>
              <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Size: {model.size}
              </div>
            </div>
            
            <button 
              className="components-button components-button--primary"
              disabled={downloading === model.id || activeModel === model.id}
              onClick={() => handleDownload(model.id, model.url)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', cursor: 'pointer' }}
            >
              {activeModel === model.id ? (
                <><CheckIcon /> Installed</>
              ) : downloading === model.id ? (
                <span>Downloading...</span>
              ) : (
                <><DownloadIcon /> Download</>
              )}
            </button>
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,150,0,0.1)', borderRadius: '8px', border: '1px solid rgba(255,150,0,0.3)' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#ff9800' }}>Premium Features</h4>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
          AI Grammar Check, AI Chat, and AI Language Building require a Pro Subscription. You can still use the native Harper.js grammar engine for free.
        </p>
      </div>
    </div>
  );
}
