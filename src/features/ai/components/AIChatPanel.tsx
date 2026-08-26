import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { PaperPlaneIcon, MinusIcon } from '@radix-ui/react-icons';
import { listen } from '@tauri-apps/api/event';
import './AIChatPanel.css';

import { useAiStore } from '@/store/aiStore';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { GearIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import Draggable from 'react-draggable';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

export function AIChatPanel() {
  const { isPanelOpen, setPanelOpen, isAiStarting, isAiActive, stopEngine } = useAiStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const unlistenToken = listen<string>('ai-token', (event) => {
      setMessages((prev) => {
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
    });

    return () => {
      unlistenToken.then(f => f());
      unlistenFinish.then(f => f());
    };
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userMsg }]);
    
    // Add empty AI message placeholder
    setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', text: '' }]);
    setIsTyping(true);
    
    try {
      await invoke('generate_text_stream', { prompt: userMsg, systemPrompt: null });
    } catch (e) {
      console.error(e);
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.role === 'ai') {
          return [
            ...prev.slice(0, -1),
            { ...lastMsg, text: "Error: Could not connect to local AI engine." }
          ];
        }
        return prev;
      });
      setIsTyping(false);
    }
  };

  const nodeRef = useRef<HTMLDivElement>(null);

  if (!isPanelOpen) return null;

  return (
    <Draggable nodeRef={nodeRef} handle=".ai-chat-panel__header">
      <div ref={nodeRef} className="ai-chat-panel">
        <div className="ai-chat-panel__header" style={{ cursor: 'grab' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  <DropdownMenu.Item className="global-dropdown-item" onClick={() => setMessages([])} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  Clear History
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
          {messages.length === 0 && (
            <div className="ai-chat-panel__empty">
              <p>How can I help you build your world today?</p>
            </div>
          )}
          {messages.map(msg => (
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
    </Draggable>
  );
}
