import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { PaperPlaneIcon, MinusIcon, PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { listen } from '@tauri-apps/api/event';
import './AIChatPanel.css';

import { useAiStore, ChatMessage } from '@/store/aiStore';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { GearIcon, ViewHorizontalIcon } from '@radix-ui/react-icons';
import Draggable from 'react-draggable';

export function AIChatPanel() {
  const { 
    isPanelOpen, setPanelOpen, isAiStarting, isAiActive, stopEngine,
    chats, activeChatId, activeChatMessages, createChat, setActiveChat, deleteChat, 
    updateActiveChatMessages, clearActiveChatHistory, loadChats
  } = useAiStore();
  
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);

  const activeChat = chats.find(c => c.id === activeChatId);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);

  // Sync activeChatMessages into localMessages whenever it changes
  useEffect(() => {
    if (activeChatId && !isTyping) {
      setLocalMessages(activeChatMessages);
    }
  }, [activeChatId, activeChatMessages]);

  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    loadChats().then(() => setHasLoaded(true));
  }, [loadChats]);

  // Make sure we have an active chat when panel opens
  useEffect(() => {
    if (hasLoaded && isPanelOpen && !activeChatId && chats.length === 0) {
      createChat();
    }
  }, [hasLoaded, isPanelOpen, activeChatId, chats.length, createChat]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages]);

  useEffect(() => {
    const unlistenToken = listen<string>('ai-token', (event) => {
      setLocalMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.role === 'ai') {
          return [
            ...prev.slice(0, -1),
            { ...lastMsg, text: lastMsg.text + event.payload }
          ];
        }
        return prev;
      });
    });

    const unlistenFinish = listen('ai-finished', () => {
      setIsTyping(false);
      // We must use a setState callback to get the absolute latest localMessages to persist
      setLocalMessages(latest => {
        updateActiveChatMessages(latest);
        return latest;
      });
    });

    return () => {
      unlistenToken.then(f => f());
      unlistenFinish.then(f => f());
    };
  }, [updateActiveChatMessages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setInput('');
    
    const newMessages: ChatMessage[] = [
      ...localMessages, 
      { id: Date.now().toString(), role: 'user', text: userMsg },
      { id: (Date.now() + 1).toString(), role: 'ai', text: '' }
    ];
    
    setLocalMessages(newMessages);
    setIsTyping(true);
    
    // We send all messages EXCEPT the empty AI placeholder we just added
    const messagesToSend = newMessages.slice(0, -1);
    
    try {
      await invoke('generate_text_stream', { 
        messages: messagesToSend, 
        systemPrompt: null 
      });
    } catch (e) {
      console.error(e);
      setLocalMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (!lastMsg) return prev;
        
        const errorMessages: ChatMessage[] = [
          ...prev.slice(0, -1),
          { ...lastMsg, text: "Error: Could not connect to local AI engine." }
        ];
        updateActiveChatMessages(errorMessages);
        return errorMessages;
      });
      setIsTyping(false);
    }
  };

  const handleClearHistory = () => {
    clearActiveChatHistory();
  };

  const handleSwitchChat = (id: string) => {
    if (isTyping) return;
    setActiveChat(id);
  };

  if (!isPanelOpen) return null;

  return (
    <Draggable nodeRef={nodeRef} handle=".ai-chat-panel__header">
      <div ref={nodeRef} className="ai-chat-panel">
        
        {sidebarOpen && (
          <div className="ai-chat-panel__sidebar">
            <div className="ai-chat-panel__sidebar-header">
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Chat History</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button 
                  className="components-button components-button--ghost" 
                  onClick={() => createChat()}
                  style={{ padding: '4px' }}
                  title="New Chat"
                >
                  <PlusIcon />
                </button>
                <button 
                  className="components-button components-button--ghost" 
                  onClick={() => setSidebarOpen(false)}
                  style={{ padding: '4px' }}
                  title="Collapse Sidebar"
                >
                  <ViewHorizontalIcon />
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {chats.map(chat => (
                <div 
                  key={chat.id} 
                  className={`ai-chat-panel__chat-item ${chat.id === activeChatId ? 'ai-chat-panel__chat-item--active' : ''}`}
                  onClick={() => handleSwitchChat(chat.id)}
                >
                  <span className="ai-chat-panel__chat-title">
                    {chat.title}
                  </span>
                  <button 
                    className="ai-chat-panel__chat-delete"
                    onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                    title="Delete Chat"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
              {chats.length === 0 && (
                <div style={{ padding: '16px', textAlign: 'center', opacity: 0.5, fontSize: '0.85rem' }}>
                  No previous chats
                </div>
              )}
            </div>
          </div>
        )}

        <div className="ai-chat-panel__main">
          <div className="ai-chat-panel__header" style={{ cursor: 'grab' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {!sidebarOpen && (
                <button 
                  className="components-button components-button--ghost" 
                  onClick={() => setSidebarOpen(true)}
                  style={{ padding: '4px' }}
                  title="Expand Sidebar"
                >
                  <ViewHorizontalIcon />
                </button>
              )}
              <span style={{ fontWeight: 600 }}>AI Assistant</span>
              <span style={{ fontSize: '0.65rem', background: '#ff9800', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>PRO</span>
              {isAiStarting && <span style={{ fontSize: '0.75rem', opacity: 0.7, marginLeft: '8px' }}>Starting Engine...</span>}
            </div>
            
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="components-button components-button--ghost" style={{ padding: '4px' }}>
                    <GearIcon />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content className="global-dropdown-content" align="end" sideOffset={5} style={{ zIndex: 10000, backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                    <DropdownMenu.Item className="global-dropdown-item" onClick={handleClearHistory} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.9rem' }}>
                      Clear Current History
                    </DropdownMenu.Item>
                    <DropdownMenu.Item className="global-dropdown-item" onClick={() => { stopEngine(); setPanelOpen(false); }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--color-error, #ef4444)' }}>
                      Shut Down Engine
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
              
              <button className="components-button components-button--ghost" onClick={() => setPanelOpen(false)} style={{ padding: '4px' }}>
                <MinusIcon />
              </button>
            </div>
          </div>
          
          <div className="ai-chat-panel__messages">
            {localMessages.length === 0 && (
              <div className="ai-chat-panel__empty">
                <p>How can I help you build your world today?</p>
              </div>
            )}
            {localMessages.map(msg => (
              <div key={msg.id} className={`ai-chat-panel__message ai-chat-panel__message--${msg.role}`}>
                {msg.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="ai-chat-panel__input-area">
            <textarea 
              className="components-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask something..."
              rows={2}
              disabled={isTyping || isAiStarting || !isAiActive}
            />
            <button 
              className="components-button components-button--primary"
              onClick={handleSend}
              disabled={!input.trim() || isTyping || isAiStarting || !isAiActive}
            >
              <PaperPlaneIcon />
            </button>
          </div>
        </div>
      </div>
    </Draggable>
  );
}
