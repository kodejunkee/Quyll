import { useState } from 'react';
import { useThemeStore } from '@/store/themeStore';
import { Modal, Dropdown } from '@/components';
import { Palette, Type, Sparkles, Bell, Cloud, Info } from 'lucide-react';
import './GlobalSettingsModal.css';

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter (Default)' },
  { value: 'Arial', label: 'Arial' },
  { value: '"Courier New", Courier, monospace', label: 'Courier New' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: '"Times New Roman", Times, serif', label: 'Times New Roman' },
  { value: '"Trebuchet MS", Helvetica, sans-serif', label: 'Trebuchet MS' },
  { value: 'Verdana, Geneva, sans-serif', label: 'Verdana' },
  { value: '"Comic Sans MS", cursive, sans-serif', label: 'Comic Sans MS' },
];

const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'oceans-blue', label: 'Oceans Blue' },
  { value: 'midnight-violet', label: 'Midnight Violet' },
];

const ACCENT_OPTIONS = [
  { value: 'blue', label: 'Blue (Default)' },
  { value: 'pink', label: 'Carnation Pink' },
  { value: 'green', label: 'Dark Green' },
  { value: 'grey', label: 'Grey' },
  { value: 'white', label: 'White / Black' },
  { value: 'fire', label: 'Fire' },
  { value: 'apple', label: 'Apple' },
  { value: 'yellow', label: 'Yellow' },
];

  type GlobalTab = 'appearance' | 'defaults' | 'ai_providers' | 'updates' | 'about';

  interface GlobalSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
  }

  export function GlobalSettingsModal({ isOpen, onClose }: GlobalSettingsModalProps) {
    const { theme, setTheme, accent, setAccent, defaultFont, setDefaultFont } = useThemeStore();
    const [activeTab, setActiveTab] = useState<GlobalTab>('appearance');

    const tabs: { id: GlobalTab; label: string; icon: React.ReactNode }[] = [
      { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
      { id: 'defaults', label: 'Editor Defaults', icon: <Type size={16} /> },
      { id: 'updates', label: 'Updates', icon: <Bell size={16} /> },
      { id: 'about', label: 'About', icon: <Info size={16} /> },
    ];

    return (
      <Modal
        open={isOpen}
        onClose={onClose}
        title="Global Settings"
        description="Configure application preferences across all projects."
        size="lg"
        draggable={true}
      >
        <div className="global-settings-modal">
          <div className="global-settings-modal__tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`global-settings-modal__tab ${activeTab === tab.id ? 'global-settings-modal__tab--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="global-settings-modal__body">
            {activeTab === 'appearance' && (
              <div className="global-settings-modal__section">
                <div className="global-settings-modal__row">
                  <div className="global-settings-modal__info">
                    <span className="global-settings-modal__label">Theme</span>
                    <span className="global-settings-modal__desc">
                      Select your preferred workspace visual style
                    </span>
                  </div>
                  <div style={{ width: 220 }}>
                    <Dropdown
                      options={THEME_OPTIONS}
                      value={theme}
                      onChange={(val) => setTheme(val as any)}
                    />
                  </div>
                </div>

                <div className="global-settings-modal__row">
                  <div className="global-settings-modal__info">
                    <span className="global-settings-modal__label">Accent Color</span>
                    <span className="global-settings-modal__desc">
                      Customize interactive highlights, buttons, and badges across the application
                    </span>
                  </div>
                  <div style={{ width: 220 }}>
                    <Dropdown
                      options={ACCENT_OPTIONS}
                      value={accent}
                      onChange={(val) => setAccent(val as any)}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'defaults' && (
              <div className="global-settings-modal__section">
                <div className="global-settings-modal__row">
                  <div className="global-settings-modal__info">
                    <span className="global-settings-modal__label">Default Editor Font</span>
                    <span className="global-settings-modal__desc">
                      Choose the default font family for newly created writing projects
                    </span>
                  </div>
                  <div style={{ width: 220 }}>
                    <Dropdown
                      options={FONT_OPTIONS}
                      value={defaultFont}
                      onChange={(val) => setDefaultFont(val as string)}
                    />
                  </div>
                </div>
              </div>
            )}


            {activeTab === 'updates' && (
              <div className="global-settings-modal__section">
                <div className="global-settings-modal__ai-card" style={{ marginBottom: '16px' }}>
                  <Sparkles size={24} className="global-settings-modal__ai-icon" />
                  <div>
                    <h4 className="global-settings-modal__ai-title">AI Features Coming Soon</h4>
                    <p className="global-settings-modal__ai-desc">
                      Global AI assistant configuration, API endpoints, and creative writing co-pilot preferences will be managed here once AI capabilities are activated.
                    </p>
                  </div>
                </div>
                
                <div className="global-settings-modal__ai-card">
                  <Cloud size={24} className="global-settings-modal__ai-icon" />
                  <div>
                    <h4 className="global-settings-modal__ai-title">Cloud Sync (Coming Soon)</h4>
                    <p className="global-settings-modal__ai-desc">
                      Cloud sync, automated backups, and seamless multi-device support will be introduced to keep your projects safely backed up and synchronized across your devices.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="global-settings-modal__section">
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--color-text)' }}>Quyll</h3>
                  <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>Version 0.2.0-beta</p>
                  
                  <div style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'left', lineHeight: '1.6', color: 'var(--color-text-secondary)' }}>
                    <p style={{ marginBottom: '16px' }}>
                      Quyll is a modern, next-generation writing environment tailored for authors, world-builders, and creative minds.
                    </p>
                    <p style={{ marginBottom: '16px' }}>
                      Built with a deep focus on design aesthetics, speed, and seamless organization, Quyll aims to bridge the gap between creative outlining and actual manuscript drafting.
                    </p>
                    <p>
                      © 2026 Quyll. All rights reserved.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>
    );
  }
