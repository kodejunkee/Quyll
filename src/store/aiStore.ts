import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { getDb } from '@/lib/db';

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai' | 'system';
  text: string;
}

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
}

interface AiState {
  isAiActive: boolean;
  isAiStarting: boolean;
  isPanelOpen: boolean;
  activeModel: string;
  error: string | null;

  chats: ChatSession[];
  activeChatId: string | null;
  activeChatMessages: ChatMessage[];

  setPanelOpen: (isOpen: boolean) => void;
  togglePanel: () => void;
  setActiveModel: (modelName: string) => void;
  startEngine: () => Promise<void>;
  stopEngine: () => Promise<void>;
  
  loadChats: () => Promise<void>;
  createChat: () => Promise<void>;
  setActiveChat: (id: string) => Promise<void>;
  deleteChat: (id: string) => Promise<void>;
  updateActiveChatMessages: (messages: ChatMessage[]) => Promise<void>;
  clearActiveChatHistory: () => Promise<void>;
}

export const useAiStore = create<AiState>((set, get) => ({
  isAiActive: false,
  isAiStarting: false,
  isPanelOpen: false,
  activeModel: 'gemma-e4b.gguf',
  error: null,

  chats: [],
  activeChatId: null,
  activeChatMessages: [],

  setPanelOpen: (isOpen: boolean) => set({ isPanelOpen: isOpen }),
  
  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
  
  setActiveModel: (modelName: string) => set({ activeModel: modelName }),

  startEngine: async () => {
    const { isAiStarting, isAiActive, activeModel } = get();
    if (isAiStarting || isAiActive) return;

    set({ isAiStarting: true, error: null });
    try {
      await invoke('start_ai_engine', { modelName: activeModel });
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
  },

  loadChats: async () => {
    try {
      const db = await getDb();
      const result = await db.select<ChatSession[]>('SELECT * FROM ai_chats ORDER BY updated_at DESC');
      set({ chats: result });
      
      const currentActiveId = get().activeChatId;
      if (currentActiveId && !result.find(c => c.id === currentActiveId)) {
        set({ activeChatId: null, activeChatMessages: [] });
      }
    } catch (err) {
      console.error("Failed to load chats:", err);
    }
  },

  createChat: async () => {
    const id = Date.now().toString();
    const newChat: ChatSession = {
      id,
      title: 'New Chat',
      updated_at: Date.now() // Use snake_case for DB but we interface as camelCase? Wait, let's map it.
    } as any; 
    
    try {
      const db = await getDb();
      await db.execute('INSERT INTO ai_chats (id, title, updated_at) VALUES ($1, $2, $3)', [id, 'New Chat', Date.now()]);
      
      set((state) => ({
        chats: [{ id, title: 'New Chat', updatedAt: Date.now() }, ...state.chats],
        activeChatId: id,
        activeChatMessages: []
      }));
    } catch (err) {
      console.error("Failed to create chat:", err);
    }
  },

  setActiveChat: async (id: string) => {
    set({ activeChatId: id });
    try {
      const db = await getDb();
      const messages = await db.select<ChatMessage[]>('SELECT * FROM ai_messages WHERE chat_id = $1 ORDER BY id ASC', [id]);
      set({ activeChatMessages: messages });
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  },

  deleteChat: async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM ai_chats WHERE id = $1', [id]);
      // Cascade will delete ai_messages
      
      const state = get();
      const newChats = state.chats.filter(c => c.id !== id);
      
      set({
        chats: newChats,
        activeChatId: state.activeChatId === id ? (newChats[0]?.id || null) : state.activeChatId
      });
      
      if (state.activeChatId === id) {
        if (newChats.length > 0) {
          get().setActiveChat(newChats[0]!.id);
        } else {
          set({ activeChatMessages: [] });
        }
      }
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  },

  updateActiveChatMessages: async (messages: ChatMessage[]) => {
    const state = get();
    if (!state.activeChatId) return;
    const chatId = state.activeChatId;
    
    // Optimistic UI update
    set({ activeChatMessages: messages });
    
    try {
      const db = await getDb();
      
      // We will sync by clearing and re-inserting, or just inserting new ones.
      // Since messages array includes all history, clearing and inserting is easiest for now.
      await db.execute('DELETE FROM ai_messages WHERE chat_id = $1', [chatId]);
      
      for (const msg of messages) {
        await db.execute(
          'INSERT INTO ai_messages (id, chat_id, role, text) VALUES ($1, $2, $3, $4)', 
          [msg.id, chatId, msg.role, msg.text]
        );
      }
      
      let newTitle = undefined;
      const firstMsg = messages[0];
      if (messages.length === 1 && firstMsg && firstMsg.role === 'user') {
        newTitle = firstMsg.text.slice(0, 30) + (firstMsg.text.length > 30 ? '...' : '');
        await db.execute('UPDATE ai_chats SET title = $1, updated_at = $2 WHERE id = $3', [newTitle, Date.now(), chatId]);
      } else {
        await db.execute('UPDATE ai_chats SET updated_at = $1 WHERE id = $2', [Date.now(), chatId]);
      }
      
      // Update local chats array
      set((s) => ({
        chats: s.chats.map(chat => 
          chat.id === chatId 
            ? { ...chat, updatedAt: Date.now(), title: newTitle || chat.title }
            : chat
        )
      }));
      
    } catch (err) {
      console.error("Failed to sync messages:", err);
    }
  },

  clearActiveChatHistory: async () => {
    const state = get();
    if (!state.activeChatId) return;
    const chatId = state.activeChatId;
    
    set({ activeChatMessages: [] });
    
    try {
      const db = await getDb();
      await db.execute('DELETE FROM ai_messages WHERE chat_id = $1', [chatId]);
      await db.execute('UPDATE ai_chats SET updated_at = $1 WHERE id = $2', [Date.now(), chatId]);
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  }
}));
