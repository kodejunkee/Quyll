import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

interface AiState {
  isAiActive: boolean;
  isAiStarting: boolean;
  isPanelOpen: boolean;
  activeModel: string;
  error: string | null;

  setPanelOpen: (isOpen: boolean) => void;
  togglePanel: () => void;
  setActiveModel: (modelName: string) => void;
  startEngine: () => Promise<void>;
  stopEngine: () => Promise<void>;
}

export const useAiStore = create<AiState>((set, get) => ({
  isAiActive: false,
  isAiStarting: false,
  isPanelOpen: false,
  activeModel: 'gemma-e4b.gguf',
  error: null,

  setPanelOpen: (isOpen: boolean) => set({ isPanelOpen: isOpen }),
  
  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
  
  setActiveModel: (modelName: string) => set({ activeModel: modelName }),

  startEngine: async () => {
    const { isAiStarting, isAiActive, activeModel } = get();
    if (isAiStarting || isAiActive) return;

    set({ isAiStarting: true, error: null });
    try {
      await invoke('start_ai_engine', { modelName: activeModel });
      // The sidecar spawns instantly, wait a bit before calling it active to let server initialize
      setTimeout(() => {
        set({ isAiActive: true, isAiStarting: false });
      }, 500);
    } catch (err: any) {
      console.error(err);
      set({ error: 'Failed to start AI engine: ' + err, isAiStarting: false });
    }
  },

  stopEngine: async () => {
    set({ isAiActive: false, isAiStarting: false, error: null });
    try {
      await invoke('stop_ai_engine');
    } catch (err: any) {
      console.error(err);
      set({ error: 'Failed to stop AI engine: ' + err });
    }
  }
}));
