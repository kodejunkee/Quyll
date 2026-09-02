import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
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
  messagesCache: Record<string, ChatMessage[]>;
  isGeneratingByChat: Record<string, boolean>;

  setPanelOpen: (isOpen: boolean) => void;
  togglePanel: () => void;
  setActiveModel: (modelName: string) => void;
  startEngine: () => Promise<void>;
  stopEngine: () => Promise<void>;
  
  loadChats: () => Promise<void>;
  createChat: () => Promise<string | undefined>;
  setActiveChat: (id: string) => Promise<void>;
  deleteChat: (id: string) => Promise<void>;
  updateChatTitle: (id: string, title: string) => Promise<void>;
  sendChatMessage: (chatId: string, text: string) => Promise<void>;
  retryLastMessage: (chatId: string) => Promise<void>;
  clearActiveChatHistory: () => Promise<void>;
  
  installedModels: string[];
  fetchInstalledModels: () => Promise<void>;
}

export const useAiStore = create<AiState>((set, get) => ({
  isAiActive: false,
  isAiStarting: false,
  isPanelOpen: false,
  activeModel: '',
  error: null,

  chats: [],
  activeChatId: null,
  activeChatMessages: [],
  messagesCache: {},
  isGeneratingByChat: {},
  
  installedModels: [],
  fetchInstalledModels: async () => {
    try {
      const { readDir, BaseDirectory, mkdir } = await import('@tauri-apps/plugin-fs');
      try {
        await mkdir('models', { baseDir: BaseDirectory.AppData, recursive: true });
      } catch (e) {
        // Exists
      }
      const entries = await readDir('models', { baseDir: BaseDirectory.AppData });
      const models = entries.filter(e => e.isFile && e.name.endsWith('.gguf')).map(e => e.name);
      
      const currentActive = get().activeModel;
      let nextActive: string = currentActive;
      if (!currentActive || !models.includes(currentActive)) {
        nextActive = models[0] ?? '';
      }
      
      set({ installedModels: models, activeModel: nextActive });
    } catch (e) {
      console.error('Failed to fetch installed models:', e);
      set({ installedModels: [], activeModel: '' });
    }
  },

  setPanelOpen: (isOpen: boolean) => set({ isPanelOpen: isOpen }),
  
  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
  
  setActiveModel: (modelName: string) => set({ activeModel: modelName }),

  startEngine: async () => {
    let { isAiStarting, isAiActive, activeModel, fetchInstalledModels } = get();
    if (isAiStarting || isAiActive) return;

    if (!activeModel) {
      await fetchInstalledModels();
      activeModel = get().activeModel;
    }

    if (!activeModel) {
      set({ error: 'No language model installed. Please download one in Settings > Language Models.' });
      return;
    }

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
      const rows = await db.select<{ id: string; title: string; updated_at: number }[]>('SELECT id, title, updated_at FROM ai_chats ORDER BY updated_at DESC');
      const result: ChatSession[] = rows.map(r => ({
        id: r.id,
        title: r.title,
        updatedAt: r.updated_at
      }));
      set({ chats: result });
      
      const currentActiveId = get().activeChatId;
      if (!currentActiveId && result.length > 0 && result[0]) {
        await get().setActiveChat(result[0].id);
      } else if (currentActiveId && !result.find(c => c.id === currentActiveId)) {
        if (result.length > 0 && result[0]) {
          await get().setActiveChat(result[0].id);
        } else {
          set({ activeChatId: null, activeChatMessages: [] });
        }
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
      updatedAt: Date.now()
    }; 
    
    try {
      const db = await getDb();
      await db.execute('INSERT INTO ai_chats (id, title, updated_at) VALUES ($1, $2, $3)', [id, 'New Chat', Date.now()]);
      
      set((state) => ({
        chats: [newChat, ...state.chats],
        activeChatId: id,
        activeChatMessages: [],
        messagesCache: { ...state.messagesCache, [id]: [] }
      }));

      return id;
    } catch (err) {
      console.error("Failed to create chat:", err);
      return undefined;
    }
  },

  setActiveChat: async (id: string) => {
    const state = get();
    set({ activeChatId: id });

    // If cached in memory, use it immediately
    if (state.messagesCache[id]) {
      set({ activeChatMessages: state.messagesCache[id] });
      return;
    }

    try {
      const db = await getDb();
      const rows = await db.select<{ id: string; role: string; text: string }[]>(
        'SELECT id, role, text FROM ai_messages WHERE chat_id = $1 ORDER BY id ASC', 
        [id]
      );
      const messages: ChatMessage[] = rows.map(r => ({
        id: r.id,
        role: r.role as any,
        text: r.text
      }));

      set((s) => ({
        activeChatMessages: s.activeChatId === id ? messages : s.activeChatMessages,
        messagesCache: { ...s.messagesCache, [id]: messages }
      }));
    } catch (err) {
      console.error("Failed to load messages for chat:", err);
    }
  },

  deleteChat: async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM ai_chats WHERE id = $1', [id]);
      
      const state = get();
      const newChats = state.chats.filter(c => c.id !== id);
      const newCache = { ...state.messagesCache };
      delete newCache[id];
      const newGenerating = { ...state.isGeneratingByChat };
      delete newGenerating[id];
      
      const nextActiveId = state.activeChatId === id ? (newChats[0]?.id || null) : state.activeChatId;

      set({
        chats: newChats,
        messagesCache: newCache,
        isGeneratingByChat: newGenerating,
        activeChatId: nextActiveId
      });
      
      if (nextActiveId) {
        get().setActiveChat(nextActiveId);
      } else {
        set({ activeChatMessages: [] });
      }
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  },

  updateChatTitle: async (id: string, title: string) => {
    try {
      const db = await getDb();
      await db.execute('UPDATE ai_chats SET title = $1, updated_at = $2 WHERE id = $3', [title, Date.now(), id]);
      set((state) => ({
        chats: state.chats.map(c => c.id === id ? { ...c, title, updatedAt: Date.now() } : c)
      }));
    } catch (err) {
      console.error("Failed to update chat title:", err);
    }
  },

  sendChatMessage: async (chatId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const state = get();
    if (!state.isAiActive && !state.isAiStarting) {
      await state.startEngine();
      await new Promise(resolve => setTimeout(resolve, 2500));
    }

    const currentMessages = state.messagesCache[chatId] || state.activeChatMessages || [];
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: trimmed };
    const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'ai', text: '' };
    const newMessages = [...currentMessages, userMsg, aiMsg];

    const updatedCache = { ...state.messagesCache, [chatId]: newMessages };
    const updatedGenerating = { ...state.isGeneratingByChat, [chatId]: true };

    // Check if title needs auto-updating
    const currentChat = state.chats.find(c => c.id === chatId);
    let updatedChats = state.chats;
    let newTitle: string | undefined;

    if (!currentChat || currentChat.title === 'New Chat' || currentChat.title === 'Untitled Session' || !currentChat.title.trim()) {
      newTitle = trimmed.length > 32 ? trimmed.slice(0, 32).trim() + '...' : trimmed;
      updatedChats = state.chats.map(c => c.id === chatId ? { ...c, title: newTitle!, updatedAt: Date.now() } : c);
    }

    set({
      messagesCache: updatedCache,
      isGeneratingByChat: updatedGenerating,
      activeChatMessages: state.activeChatId === chatId ? newMessages : state.activeChatMessages,
      chats: updatedChats
    });

    // Save user message to database immediately
    try {
      const db = await getDb();
      if (newTitle) {
        await db.execute('UPDATE ai_chats SET title = $1, updated_at = $2 WHERE id = $3', [newTitle, Date.now(), chatId]);
      } else {
        await db.execute('UPDATE ai_chats SET updated_at = $1 WHERE id = $2', [Date.now(), chatId]);
      }
      await db.execute(
        'INSERT INTO ai_messages (id, chat_id, role, text) VALUES ($1, $2, $3, $4)',
        [userMsg.id, chatId, userMsg.role, userMsg.text]
      );
    } catch (dbErr) {
      console.error('Failed to persist user message:', dbErr);
    }

    // Set up channel listeners for this specific chat
    let unlistenToken: UnlistenFn | undefined;
    let unlistenFinish: UnlistenFn | undefined;

    const cleanup = () => {
      if (unlistenToken) unlistenToken();
      if (unlistenFinish) unlistenFinish();
    };

    unlistenToken = await listen<string>(`ai-token-chat-${chatId}`, (event) => {
      const s = get();
      const chatMsgs = s.messagesCache[chatId] || [];
      const lastMsg = chatMsgs[chatMsgs.length - 1];
      if (!lastMsg || lastMsg.role !== 'ai') return;

      const updatedChatMsgs = [
        ...chatMsgs.slice(0, -1),
        { ...lastMsg, text: lastMsg.text + event.payload }
      ];

      const newCache = { ...s.messagesCache, [chatId]: updatedChatMsgs };
      set({
        messagesCache: newCache,
        activeChatMessages: s.activeChatId === chatId ? updatedChatMsgs : s.activeChatMessages
      });
    });

    unlistenFinish = await listen(`ai-finished-chat-${chatId}`, async () => {
      cleanup();
      const s = get();
      const finalMsgs = s.messagesCache[chatId] || [];
      const newGenerating = { ...s.isGeneratingByChat, [chatId]: false };
      set({ isGeneratingByChat: newGenerating });

      // Persist complete message history for this chat
      try {
        const db = await getDb();
        await db.execute('DELETE FROM ai_messages WHERE chat_id = $1', [chatId]);
        for (const msg of finalMsgs) {
          if (msg.text.trim()) {
            await db.execute(
              'INSERT INTO ai_messages (id, chat_id, role, text) VALUES ($1, $2, $3, $4)',
              [msg.id, chatId, msg.role, msg.text]
            );
          }
        }
        await db.execute('UPDATE ai_chats SET updated_at = $1 WHERE id = $2', [Date.now(), chatId]);
      } catch (err) {
        console.error('Failed to persist finished chat messages:', err);
      }
    });

    // Prepare payload for backend
    const messagesPayload = newMessages.slice(0, -1).map(msg => ({
      role: msg.role === 'ai' ? 'assistant' : msg.role,
      content: msg.text
    }));

    try {
      await invoke('generate_text_stream', {
        messages: messagesPayload,
        systemPrompt: "You are an expert creative writing assistant and worldbuilding co-pilot for Quyll. Provide structured, evocative, and concise help.",
        channelId: `chat-${chatId}`
      });
    } catch (err: any) {
      cleanup();
      console.error(err);
      const s = get();
      const chatMsgs = s.messagesCache[chatId] || [];
      const lastMsg = chatMsgs[chatMsgs.length - 1];
      const errorText = "⚠️ **Could not connect to the local engine.**\nPlease make sure a model is downloaded and set active in **Settings > Language Models**.";
      
      let updatedChatMsgs = chatMsgs;
      if (lastMsg && lastMsg.role === 'ai') {
        updatedChatMsgs = [
          ...chatMsgs.slice(0, -1),
          { ...lastMsg, text: errorText }
        ];
      }

      const newCache = { ...s.messagesCache, [chatId]: updatedChatMsgs };
      const newGenerating = { ...s.isGeneratingByChat, [chatId]: false };
      set({
        messagesCache: newCache,
        isGeneratingByChat: newGenerating,
        activeChatMessages: s.activeChatId === chatId ? updatedChatMsgs : s.activeChatMessages
      });
    }
  },

  retryLastMessage: async (chatId: string) => {
    const state = get();
    const chatMsgs = state.messagesCache[chatId] || state.activeChatMessages || [];
    if (chatMsgs.length < 2) return;

    // Find the last user message
    let lastUserIndex = -1;
    for (let i = chatMsgs.length - 1; i >= 0; i--) {
      if (chatMsgs[i]?.role === 'user') {
        lastUserIndex = i;
        break;
      }
    }

    if (lastUserIndex === -1) return;
    const userText = chatMsgs[lastUserIndex]?.text || '';
    const sliced = chatMsgs.slice(0, lastUserIndex);
    
    // Update cache without the last exchange
    set({
      messagesCache: { ...state.messagesCache, [chatId]: sliced },
      activeChatMessages: state.activeChatId === chatId ? sliced : state.activeChatMessages
    });

    await get().sendChatMessage(chatId, userText);
  },

  clearActiveChatHistory: async () => {
    const state = get();
    if (!state.activeChatId) return;
    const chatId = state.activeChatId;
    
    set({ 
      activeChatMessages: [],
      messagesCache: { ...state.messagesCache, [chatId]: [] }
    });
    
    try {
      const db = await getDb();
      await db.execute('DELETE FROM ai_messages WHERE chat_id = $1', [chatId]);
      await db.execute('UPDATE ai_chats SET updated_at = $1 WHERE id = $2', [Date.now(), chatId]);
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  }
}));
