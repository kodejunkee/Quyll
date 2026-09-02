import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { CheckIcon, DownloadIcon, PauseIcon, PlayIcon, Cross2Icon, TrashIcon } from '@radix-ui/react-icons';
import { BaseDirectory, readDir, remove } from '@tauri-apps/plugin-fs';
import './GlobalSettingsModal.css';

const AI_MODELS = [
  {
    id: 'gemma-2-2b',
    name: 'Gemma 2 2B (Good)',
    description: 'Fast, lightweight model for basic writing tasks. Requires 4-6GB RAM.',
    size: '~1.6 GB',
    url: 'https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf'
  },
  {
    id: 'gemma-4-e4b',
    name: 'Gemma 4 E4B (Balanced)',
    description: 'High-efficiency edge model with rich reasoning. Requires 6-8GB RAM.',
    size: '~2.9 GB',
    url: 'https://huggingface.co/bartowski/google_gemma-4-E4B-it-GGUF/resolve/main/google_gemma-4-E4B-it-Q4_K_M.gguf'
  },
  {
    id: 'gemma-2-9b',
    name: 'Gemma 2 9B (Better)',
    description: 'Best balance for long documents and complex grammar. Requires 8-12GB RAM.',
    size: '~5.4 GB',
    url: 'https://huggingface.co/bartowski/gemma-2-9b-it-GGUF/resolve/main/gemma-2-9b-it-Q4_K_M.gguf'
  },
  {
    id: 'gemma-2-27b',
    name: 'Gemma 2 27B (Best)',
    description: 'Pro tier for agents and huge context. Requires 16-24GB RAM.',
    size: '~16.1 GB',
    url: 'https://huggingface.co/bartowski/gemma-2-27b-it-GGUF/resolve/main/gemma-2-27b-it-Q4_K_M.gguf'
  }
];

interface DownloadProgressPayload {
  filename: string;
  downloaded: number;
  total: number;
}

interface DownloadState {
  progress: number;
  downloaded: number;
  total: number;
  paused: boolean;
}

import { useAiStore } from '@/store/aiStore';

export function AIModelsPanel() {
  const [downloads, setDownloads] = useState<Record<string, DownloadState>>({});
  const { activeModel, setActiveModel, stopEngine, startEngine, isAiActive, isAiStarting, installedModels, fetchInstalledModels } = useAiStore();

  useEffect(() => {
    fetchInstalledModels();
  }, []);

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;

    const setup = async () => {
      unlisten = await listen<DownloadProgressPayload>('download-progress', (event) => {
        const payload = event.payload;
        const modelId = payload.filename.replace('.gguf', '');
        
        setDownloads(prev => {
          const current = prev[modelId];
          // Only update if it exists in state and is not paused
          if (!current || current.paused) return prev;

          const prog = payload.total > 0 ? (payload.downloaded / payload.total) * 100 : 0;
          return {
            ...prev,
            [modelId]: {
              progress: prog,
              downloaded: payload.downloaded,
              total: payload.total,
              paused: false
            }
          };
        });
      });
    };

    setup();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleDownload = async (id: string, url: string) => {
    setDownloads(prev => ({
      ...prev,
      [id]: { progress: 0, downloaded: 0, total: 0, paused: false }
    }));

    try {
      await invoke('download_model', { url, filename: `${id}.gguf` });
      
      // If it completes successfully
      setDownloads(prev => {
        const state = prev[id];
        if (state && !state.paused) {
          const newState = { ...prev };
          delete newState[id];
          return newState;
        }
        return prev;
      });
      // Perform side-effects after state update
      handleSetActive(`${id}.gguf`);
      fetchInstalledModels();
    } catch (err: any) {
      alert(`Download Error: ${err}`);
      setDownloads(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
    }
  };

  const handlePause = async (id: string) => {
    setDownloads(prev => {
      const current = prev[id];
      if (!current) return prev;
      return {
        ...prev,
        [id]: { ...current, paused: true }
      };
    });
    try {
      await invoke('pause_download', { filename: `${id}.gguf` });
    } catch (err) {
      console.error("Failed to pause:", err);
    }
  };

  const handleResume = (id: string, url: string) => {
    setDownloads(prev => {
      const current = prev[id];
      if (!current) return prev;
      return {
        ...prev,
        [id]: { ...current, paused: false }
      };
    });
    handleDownload(id, url);
  };

  const handleCancel = async (id: string) => {
    setDownloads(prev => {
      const newState = { ...prev };
      delete newState[id];
      return newState;
    });
    try {
      await invoke('cancel_download', { filename: `${id}.gguf` });
    } catch (err) {
      console.error("Failed to cancel:", err);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Are you sure you want to permanently delete ${filename}?`)) return;
    try {
      // First stop the engine if it's currently running this model so we can delete the file
      if ((isAiActive || isAiStarting) && activeModel === filename) {
        await stopEngine();
      }
      await remove(`models/${filename}`, { baseDir: BaseDirectory.AppData });
      if (activeModel === filename) {
        setActiveModel('');
      }
      fetchInstalledModels();
    } catch (e) {
      alert("Failed to delete model file: " + e);
    }
  };

  const handleSetActive = async (filename: string) => {
    setActiveModel(filename);
    const state = useAiStore.getState();
    if (state.isAiActive || state.isAiStarting) {
      await state.stopEngine();
      // Wait for the old process to fully release the port
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    // Now start it again
    await useAiStore.getState().startEngine();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="global-settings-modal__section">
      <div className="global-settings-modal__header">
        <h3>Language Models</h3>
        <p>Download offline language models to power Quyll Assistant. All processing happens entirely on your machine.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {AI_MODELS.map((model) => {
          const downloadState = downloads[model.id];
          const isDownloading = !!downloadState;
          const modelFilename = `${model.id}.gguf`;
          const isInstalled = installedModels.includes(modelFilename);
          const isActive = activeModel === modelFilename;
          
          return (
            <div key={model.id} style={{
              display: 'flex', 
              flexDirection: 'column',
              padding: '16px', 
              border: isActive ? '1px solid var(--color-primary)' : '1px solid var(--color-border)', 
              borderRadius: '8px',
              position: 'relative',
              overflow: 'hidden',
              backgroundColor: isActive ? 'rgba(255, 150, 0, 0.05)' : 'var(--color-surface)'
            }}>
              {/* Background Progress Bar */}
              {isDownloading && (
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, bottom: 0,
                  width: `${Math.max(5, downloadState.progress)}%`,
                  background: downloadState.paused ? 'rgba(200, 200, 200, 0.05)' : 'rgba(16, 185, 129, 0.1)',
                  transition: 'width 0.3s ease-out, background 0.3s',
                  zIndex: 0
                }} />
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ color: 'var(--color-text)' }}>{model.name}</strong>
                    {isActive && (
                      <span style={{ fontSize: '0.75rem', background: 'var(--color-primary)', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>Active</span>
                    )}
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{model.description}</p>
                  
                  {isDownloading ? (
                    <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: downloadState.paused ? 'var(--color-text-muted)' : 'var(--color-primary)', fontWeight: 500 }}>
                        {downloadState.paused ? 'Paused' : 'Downloading...'}
                      </span>
                      <span>•</span>
                      <span>{downloadState.progress.toFixed(1)}%</span>
                      <span>•</span>
                      <span>{formatBytes(downloadState.downloaded)} / {formatBytes(downloadState.total)}</span>
                    </div>
                  ) : (
                    <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      Size: {model.size}
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {isDownloading ? (
                    <>
                      {downloadState.paused ? (
                        <button 
                          className="components-button components-button--primary"
                          onClick={() => handleResume(model.id, model.url)}
                          title="Resume Download"
                          style={{ padding: '8px', border: '1px solid var(--color-border)', borderRadius: '6px' }}
                        >
                          <PlayIcon />
                        </button>
                      ) : (
                        <button 
                          className="components-button"
                          onClick={() => handlePause(model.id)}
                          title="Pause Download"
                          style={{ padding: '8px', border: '1px solid var(--color-border)', borderRadius: '6px' }}
                        >
                          <PauseIcon />
                        </button>
                      )}
                      
                      <button 
                        className="components-button"
                        onClick={() => handleCancel(model.id)}
                        title="Cancel Download"
                        style={{ padding: '8px', color: 'var(--color-danger, #ef4444)', border: '1px solid var(--color-border)', borderRadius: '6px' }}
                      >
                        <Cross2Icon />
                      </button>
                    </>
                  ) : isInstalled ? (
                    <>
                      {!isActive && (
                        <button 
                          className="components-button components-button--primary"
                          onClick={() => handleSetActive(modelFilename)}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', cursor: 'pointer', border: '1px solid var(--color-border)', borderRadius: '6px', backgroundColor: 'var(--color-surface-hover)' }}
                        >
                          <PlayIcon /> Set Active
                        </button>
                      )}
                      {isActive && (
                        <button 
                          className="components-button"
                          disabled
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', border: '1px solid var(--color-border)', borderRadius: '6px', opacity: 0.5 }}
                        >
                          <CheckIcon /> Active
                        </button>
                      )}
                      <button 
                        className="components-button"
                        onClick={() => handleDelete(modelFilename)}
                        title="Delete Model"
                        style={{ padding: '8px', color: 'var(--color-danger, #ef4444)', border: '1px solid var(--color-border)', borderRadius: '6px' }}
                      >
                        <TrashIcon />
                      </button>
                    </>
                  ) : (
                    <button 
                      className="components-button components-button--primary"
                      onClick={() => handleDownload(model.id, model.url)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', cursor: 'pointer', border: '1px solid var(--color-border)', borderRadius: '6px', backgroundColor: 'var(--color-surface-hover)' }}
                    >
                      <DownloadIcon /> Download
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,150,0,0.1)', borderRadius: '8px', border: '1px solid rgba(255,150,0,0.3)' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#ff9800' }}>Premium Features</h4>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
          Grammar Check, Quyll Assistant, and Language Building require a Pro Subscription. You can still use the native Harper.js grammar engine for free.
        </p>
      </div>
    </div>
  );
}
