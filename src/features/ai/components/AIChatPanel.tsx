import { useState, useRef, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import ReactMarkdown from 'react-markdown';
import Draggable from 'react-draggable';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Check,
  Send,
  Bot,
  User,
  Minus,
  Settings2,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  PowerOff
} from 'lucide-react';

import { useAiStore, ChatMessage, ChatSession } from '@/store/aiStore';
import { ModelSelectorDropdown } from './ModelSelectorDropdown';
import { QuyllIcon } from '@/components/QuyllIcon';
import './AIChatPanel.css';

// Individual Message Component with copy and markdown support
function ChatMessageBubble({
  msg,
  onRetry
}: {
  msg: ChatMessage;
  onRetry?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const isAi = msg.role === 'ai';

  const handleCopy = () => {
    if (!msg.text) return;
    navigator.clipboard.writeText(msg.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`ai-message-row ${isAi ? 'ai-message-row--ai' : 'ai-message-row--user'}`}>
      <div className="ai-message-avatar">
        {isAi ? <Bot size={16} /> : <User size={16} />}
      </div>

      <div className="ai-message-content-wrapper">
        <div className="ai-message-bubble">
          {isAi ? (
            msg.text ? (
              <div className="ai-markdown-body">
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            ) : (
              <div className="ai-typing-indicator">
                <span className="ai-typing-dot" />
                <span className="ai-typing-dot" />
                <span className="ai-typing-dot" />
              </div>
            )
          ) : (
            <div className="ai-user-text">{msg.text}</div>
          )}
        </div>

        {/* Action bar for messages */}
        {msg.text && (
          <div className="ai-message-actions">
            <button
              className="ai-action-btn"
              onClick={handleCopy}
              title="Copy text"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            {isAi && onRetry && (
              <button
                className="ai-action-btn"
                onClick={onRetry}
                title="Regenerate response"
              >
                <RefreshCw size={12} />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function AIChatPanel() {
  const {
    isPanelOpen, setPanelOpen, isAiStarting, isAiActive, stopEngine,
    chats, activeChatId, activeChatMessages, isGeneratingByChat,
    createChat, setActiveChat, deleteChat, updateChatTitle,
    sendChatMessage, retryLastMessage, clearActiveChatHistory, loadChats
  } = useAiStore();

  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [panelPosition, setPanelPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const editInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const bubbleNodeRef = useRef<HTMLDivElement>(null);
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isCurrentChatGenerating = activeChatId ? !!isGeneratingByChat[activeChatId] : false;
  const isAnyGenerating = Object.values(isGeneratingByChat).some(Boolean);

  const resetPosition = () => {
    setPanelPosition({ x: 0, y: 0 });
  };

  const startEditing = (chat: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
    setTimeout(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }, 50);
  };

  const saveEditing = (chatId: string) => {
    if (editingTitle.trim()) {
      updateChatTitle(chatId, editingTitle.trim());
    }
    setEditingChatId(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, chatId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEditing(chatId);
    } else if (e.key === 'Escape') {
      setEditingChatId(null);
    }
  };

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

  // Auto-scroll to bottom smoothly
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [activeChatMessages, scrollToBottom]);

  const handleSend = async () => {
    if (!input.trim() || isCurrentChatGenerating) return;

    const userMsg = input.trim();
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    let targetChatId: string | null | undefined = activeChatId;
    if (!targetChatId) {
      targetChatId = await createChat();
    }

    if (targetChatId) {
      await sendChatMessage(targetChatId, userMsg);
    }
  };

  const handleRetry = async () => {
    if (!activeChatId || activeChatMessages.length < 2 || isCurrentChatGenerating) return;
    await retryLastMessage(activeChatId);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
  };

  return (
    <>
      {/* Draggable Chat Window (Kept mounted to maintain dragged position and state) */}
      <Draggable
        nodeRef={nodeRef}
        handle=".ai-chat-header"
        position={panelPosition}
        onDrag={(_e, data) => {
          setPanelPosition({ x: data.x, y: Math.max(0, data.y) });
        }}
        onStop={(_e, data) => {
          setPanelPosition({ x: data.x, y: Math.max(0, data.y) });
        }}
        bounds={{
          top: 0,
          left: -(window.innerWidth - 320),
          right: 20,
          bottom: window.innerHeight - 180
        }}
        cancel="button, input, textarea, a, .model-selector-trigger, .ai-settings-dropdown, .ai-message-bubble, .ai-chat-sidebar, .ai-chat-item"
      >
        <div
          ref={nodeRef}
          className={`ai-chat-panel ${isPanelOpen ? 'ai-chat-panel--open' : 'ai-chat-panel--hidden'}`}
          data-tauri-drag-region="false"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >

          {/* Animated Sidebar */}
          <aside className={`ai-chat-sidebar ${sidebarOpen ? 'ai-chat-sidebar--open' : 'ai-chat-sidebar--closed'}`}>
            <div className="ai-chat-sidebar__inner">
              <div className="ai-chat-sidebar__header">
                <div className="ai-chat-sidebar__title">
                  <MessageSquare size={15} className="text-emerald-400" />
                  <span>Conversations</span>
                </div>
                <div className="ai-chat-sidebar__actions">
                  <button
                    className="ai-icon-btn"
                    onClick={() => createChat()}
                    title="Start New Chat"
                  >
                    <Plus size={15} />
                  </button>
                  <button
                    className="ai-icon-btn"
                    onClick={() => setSidebarOpen(false)}
                    title="Collapse Sidebar"
                  >
                    <PanelLeftClose size={15} />
                  </button>
                </div>
              </div>

              <div className="ai-chat-sidebar__list">
                {chats.map(chat => {
                  const isActive = chat.id === activeChatId;
                  const isEditing = chat.id === editingChatId;

                  return (
                    <div
                      key={chat.id}
                      className={`ai-chat-item ${isActive ? 'ai-chat-item--active' : ''}`}
                      onClick={() => !isEditing && setActiveChat(chat.id)}
                    >
                      <MessageSquare size={13} className="ai-chat-item__icon" />

                      {isEditing ? (
                        <input
                          ref={editInputRef}
                          className="ai-chat-item__edit-input"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={() => saveEditing(chat.id)}
                          onKeyDown={(e) => handleEditKeyDown(e, chat.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="ai-chat-item__title" title={chat.title || 'Untitled Session'}>
                          {chat.title || 'Untitled Session'}
                        </span>
                      )}

                      <div className="ai-chat-item__actions">
                        {!isEditing && (
                          <button
                            className="ai-chat-item__action-btn"
                            onClick={(e) => startEditing(chat, e)}
                            title="Rename Conversation"
                          >
                            <Pencil size={12} />
                          </button>
                        )}
                        <button
                          className="ai-chat-item__action-btn ai-chat-item__action-btn--delete"
                          onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                          title="Delete Conversation"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {chats.length === 0 && (
                  <div className="ai-chat-sidebar__empty">
                    No previous sessions
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Main Chat View */}
          <main className="ai-chat-main">
            {/* Header Bar */}
            <header className="ai-chat-header">
              <div className="ai-chat-header__left">
                {!sidebarOpen && (
                  <button
                    className="ai-icon-btn"
                    onClick={() => setSidebarOpen(true)}
                    title="Expand Sidebar"
                  >
                    <PanelLeftOpen size={16} />
                  </button>
                )}

                <div className="ai-chat-brand">
                  <QuyllIcon size={20} className="ai-brand-feather" />
                  <span className="ai-brand-name">Quyll Assistant</span>
                </div>
              </div>

              <div className="ai-chat-header__controls">
                {isAiStarting ? (
                  <div className="ai-status-pill ai-status-pill--starting">
                    <span className="ai-status-pulse" />
                    <span>Booting Engine...</span>
                  </div>
                ) : isAiActive ? (
                  <div className="ai-status-pill ai-status-pill--ready">
                    <span className="ai-status-dot" />
                    <span>Ready</span>
                  </div>
                ) : null}

                <ModelSelectorDropdown />

                <button
                  className="ai-icon-btn"
                  onClick={() => setPanelOpen(false)}
                  title="Minimize Panel"
                >
                  <Minus size={15} />
                </button>

                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button className="ai-icon-btn" title="Settings & Actions">
                      <Settings2 size={15} />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="ai-settings-dropdown"
                      align="end"
                      sideOffset={6}
                    >
                      <DropdownMenu.Item
                        className="ai-dropdown-item"
                        onClick={clearActiveChatHistory}
                      >
                        <Trash2 size={14} />
                        <span>Clear Conversation</span>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="ai-dropdown-item"
                        onClick={resetPosition}
                      >
                        <RotateCcw size={14} />
                        <span>Reset Window Position</span>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="ai-dropdown-item ai-dropdown-item--danger"
                        onClick={() => { stopEngine(); setPanelOpen(false); }}
                      >
                        <PowerOff size={14} />
                        <span>Stop Engine & Free RAM</span>
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
            </header>

            {/* Messages Scroll Area */}
            <div className="ai-chat-messages">
              {activeChatMessages.length === 0 && (
                <div className="ai-chat-empty-state">
                  <div className="ai-empty-icon-wrap">
                    <QuyllIcon size={32} />
                  </div>
                  <h3>Your Creative Sounding Board</h3>
                  <p>Refine dialogue, explore phrasing variations, adjust scene tone, or test world logic. Everything runs 100% privately on your machine.</p>
                  <div className="ai-prompt-suggestions">
                    <button
                      className="ai-suggestion-chip"
                      onClick={() => {
                        setInput("Help me rephrase this passage for stronger sensory detail and impact: ");
                        textareaRef.current?.focus();
                      }}
                    >
                      ✍️ Rephrase a passage for stronger impact
                    </button>
                    <button
                      className="ai-suggestion-chip"
                      onClick={() => {
                        setInput("Suggest ways to heighten the mood and tension in this scene excerpt: ");
                        textareaRef.current?.focus();
                      }}
                    >
                      🎭 Enhance the atmospheric mood of a scene
                    </button>
                  </div>
                </div>
              )}

              {activeChatMessages.map((msg, index) => {
                const isLastAi = msg.role === 'ai' && index === activeChatMessages.length - 1;
                return (
                  <ChatMessageBubble
                    key={msg.id}
                    msg={msg}
                    onRetry={isLastAi && !isCurrentChatGenerating ? handleRetry : undefined}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Floating Input Area */}
            <div className="ai-chat-input-container">
              <div className="ai-chat-input-card">
                <textarea
                  ref={textareaRef}
                  className="ai-chat-textarea"
                  value={input}
                  onChange={handleTextareaChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask anything... (Shift+Enter for newline)"
                  rows={1}
                  disabled={isCurrentChatGenerating}
                />

                <div className="ai-chat-input-footer">
                  <div className="ai-input-tip">
                    <span>Enter</span> to send, <span>Shift + Enter</span> for line break
                  </div>

                  <button
                    className={`ai-send-btn ${input.trim() && !isCurrentChatGenerating ? 'ai-send-btn--active' : ''}`}
                    onClick={handleSend}
                    disabled={!input.trim() || isCurrentChatGenerating}
                    title="Send Message"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </Draggable>

      {/* Floating Draggable Quick-Access Circular Bubble */}
      {!isPanelOpen && (
        <Draggable
          nodeRef={bubbleNodeRef}
          onStart={(_e, data) => {
            dragStartPosRef.current = { x: data.x, y: data.y };
          }}
          onStop={(_e, data) => {
            const dx = data.x - dragStartPosRef.current.x;
            const dy = data.y - dragStartPosRef.current.y;
            const dist = Math.hypot(dx, dy);
            // If moved less than 5px, it was a click -> open panel!
            if (dist < 5) {
              setPanelOpen(true);
            }
          }}
        >
          <div ref={bubbleNodeRef} className="ai-floating-bubble-container">
            <div
              role="button"
              tabIndex={0}
              className={`ai-floating-bubble ${isAnyGenerating ? 'ai-floating-bubble--generating' : ''}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setPanelOpen(true);
                }
              }}
              title="Open Quyll Assistant (Click to Expand, Drag to Move)"
            >
              <div className="ai-floating-bubble__icon">
                <QuyllIcon size={20} className="ai-floating-feather" />
              </div>

              {isAnyGenerating ? (
                <span className="ai-floating-pulse" />
              ) : isAiActive ? (
                <span className="ai-floating-status-dot" />
              ) : null}
            </div>
          </div>
        </Draggable>
      )}
    </>
  );
}

