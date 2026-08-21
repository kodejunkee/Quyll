import { useState, useEffect, useRef } from 'react';
import { PersonIcon, ArchiveIcon, CheckIcon } from '@radix-ui/react-icons';
import { Modal, Dropdown } from '@/components';
import { Type, Palette } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { useThemeStore, Theme, Accent } from '@/store/themeStore';
import { useOptionalProjectDb } from '@/hooks/useProjectDb';
import { BackupPanel } from './BackupPanel';
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

const FONT_SIZE_OPTIONS = [
  { value: '14', label: '14px (Small)' },
  { value: '16', label: '16px (Medium)' },
  { value: '18', label: '18px (Large)' },
  { value: '20', label: '20px (Extra Large)' },
  { value: '24', label: '24px (Huge)' },
];

const AUTOSAVE_OPTIONS = [
  { value: '1', label: '1 minute' },
  { value: '3', label: '3 minutes' },
  { value: '5', label: '5 minutes' },
  { value: '10', label: '10 minutes' },
  { value: '30', label: '30 minutes' },
];

const THEMES: { id: Theme; label: string; previewClass: string }[] = [
  { id: 'dark', label: 'Dark', previewClass: 'dark' },
  { id: 'light', label: 'Light', previewClass: 'light' },
  { id: 'oceans-blue', label: 'Oceans Blue', previewClass: 'oceans-blue' },
  { id: 'midnight-violet', label: 'Midnight Violet', previewClass: 'midnight-violet' },
];

const ACCENTS: { id: Accent; label: string; bgClass: string }[] = [
  { id: 'blue', label: 'Blue', bgClass: 'accent-bg-blue' },
  { id: 'pink', label: 'Pink', bgClass: 'accent-bg-pink' },
  { id: 'green', label: 'Green', bgClass: 'accent-bg-green' },
  { id: 'grey', label: 'Grey', bgClass: 'accent-bg-grey' },
  { id: 'white', label: 'White', bgClass: 'accent-bg-white' },
  { id: 'fire', label: 'Fire', bgClass: 'accent-bg-fire' },
  { id: 'apple', label: 'Apple', bgClass: 'accent-bg-apple' },
  { id: 'yellow', label: 'Yellow', bgClass: 'accent-bg-yellow' },
];

type SettingsTab = 'profile' | 'appearance' | 'editor' | 'backup';

interface GlobalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSettingsModal({ isOpen, onClose }: GlobalSettingsModalProps) {
  const ctx = useOptionalProjectDb();
  const db = ctx?.db;
  const { settings, updateSettings } = useSettings();
  const { theme, setTheme, accent, setAccent, defaultFont, setDefaultFont, authorName, setAuthorName } = useThemeStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const themesScrollRef = useRef<HTMLDivElement>(null);
  const [activeThemeIndex, setActiveThemeIndex] = useState(0);

  const handleThemeScroll = () => {
    if (!themesScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = themesScrollRef.current;
    
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll <= 0) {
      setActiveThemeIndex(0);
      return;
    }
    
    if (scrollLeft > maxScroll / 2) {
      setActiveThemeIndex(1);
    } else {
      setActiveThemeIndex(0);
    }
  };

  const scrollToPage = (pageIndex: number) => {
    if (!themesScrollRef.current) return;
    const { scrollWidth, clientWidth } = themesScrollRef.current;
    const maxScroll = scrollWidth - clientWidth;
    
    themesScrollRef.current.scrollTo({
      left: pageIndex === 0 ? 0 : maxScroll,
      behavior: 'smooth'
    });
    setActiveThemeIndex(pageIndex);
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Settings"
      size="xl"
    >
      <div className="global-settings-modal">
        {/* Sidebar */}
        <div className="global-settings-modal__sidebar">
          
          <div className="global-settings-modal__nav-group">
            <span className="global-settings-modal__nav-label">Preferences</span>
            <button 
              className={`global-settings-modal__tab ${activeTab === 'appearance' ? 'global-settings-modal__tab--active' : ''}`}
              onClick={() => setActiveTab('appearance')}
            >
              <Palette size={18} />
              Appearance
            </button>
            <button 
              className={`global-settings-modal__tab ${activeTab === 'editor' ? 'global-settings-modal__tab--active' : ''}`}
              onClick={() => setActiveTab('editor')}
            >
              <Type size={18} />
              Editor
            </button>
          </div>

          <div className="global-settings-modal__nav-group">
            <span className="global-settings-modal__nav-label">Data & Sync</span>
            <button 
              className={`global-settings-modal__tab ${activeTab === 'backup' ? 'global-settings-modal__tab--active' : ''}`}
              onClick={() => setActiveTab('backup')}
            >
              <ArchiveIcon width={18} height={18} />
              Backup & Sync
            </button>
          </div>

          <div className="global-settings-modal__nav-group">
            <span className="global-settings-modal__nav-label">Account</span>
            <button 
              className={`global-settings-modal__tab ${activeTab === 'profile' ? 'global-settings-modal__tab--active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <PersonIcon width={18} height={18} />
              Profile
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="global-settings-modal__content">
          {activeTab === 'appearance' && (
            <div className="global-settings-modal__section">
              <div className="global-settings-modal__header">
                <h3>Appearance</h3>
                <p>Customize how Quyll looks and feels.</p>
              </div>

              <div className="global-settings-modal__setting-block">
                <div className="global-settings-modal__setting-info">
                  <strong>Theme</strong>
                  <span>Choose the theme that suits your writing environment.</span>
                </div>
                
                <div className="global-settings-modal__setting-action">
                  <div className="theme-cards" ref={themesScrollRef} onScroll={handleThemeScroll}>
                    {THEMES.map((t) => {
                      const isActive = theme === t.id;
                      return (
                        <div 
                          key={t.id} 
                          className={`theme-card ${isActive ? 'theme-card--active' : ''}`}
                          onClick={() => setTheme(t.id)}
                        >
                          <div className={`theme-card__preview ${t.previewClass}`}>
                            {isActive && (
                              <div className="theme-card__check">
                                <CheckIcon width={10} height={10} />
                              </div>
                            )}
                            <div className="theme-card__line short" />
                            <div className="theme-card__line long" />
                            <div className="theme-card__line long" />
                            <div className="theme-card__line short" />
                          </div>
                          <span>{t.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="theme-pagination">
                    {[0, 1].map((pageIndex) => (
                      <button
                        key={`dot-page-${pageIndex}`}
                        className={`theme-dot ${activeThemeIndex === pageIndex ? 'theme-dot--active' : ''}`}
                        onClick={() => scrollToPage(pageIndex)}
                        aria-label={`Scroll to page ${pageIndex + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="global-settings-modal__setting-block">
                <div className="global-settings-modal__setting-info">
                  <strong>Accent Color</strong>
                  <span>Personalize Quyll with your favorite color.</span>
                </div>
                
                <div className="global-settings-modal__setting-action">
                  <div className="accent-colors">
                    {ACCENTS.map((a) => {
                      const isActive = accent === a.id;
                      return (
                        <div key={a.id} className="accent-color-bubble-wrapper">
                          <div
                            className={`accent-color-bubble ${a.bgClass} ${isActive ? 'accent-color-bubble--active' : ''}`}
                            title={a.label}
                            onClick={() => setAccent(a.id)}
                          >
                            {isActive && <CheckIcon className="accent-color-bubble__check" width={16} height={16} />}
                          </div>
                          {isActive && <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{a.label}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'editor' && (
            <div className="global-settings-modal__section">
              <div className="global-settings-modal__header">
                <h3>Editor Settings</h3>
                <p>Configure your writing experience.</p>
              </div>

              <div className="global-settings-modal__setting-block" style={{ flexDirection: 'column', gap: 0, padding: 0 }}>
                <div className="global-settings-modal__simple-row">
                  <div className="global-settings-modal__simple-info">
                    <span className="global-settings-modal__simple-label">Default Editor Font</span>
                    <span className="global-settings-modal__simple-desc">Choose the default font family for new projects</span>
                  </div>
                  <div style={{ width: 200, flexShrink: 0 }}>
                    <Dropdown
                      options={FONT_OPTIONS}
                      value={defaultFont}
                      onChange={(val) => setDefaultFont(val as string)}
                    />
                  </div>
                </div>

                {db && (
                  <>
                    <div className="global-settings-modal__simple-row">
                      <div className="global-settings-modal__simple-info">
                        <span className="global-settings-modal__simple-label">Font Size</span>
                        <span className="global-settings-modal__simple-desc">Adjust the editor font size in this project</span>
                      </div>
                      <div style={{ width: 200, flexShrink: 0 }}>
                        <Dropdown
                          options={FONT_SIZE_OPTIONS}
                          value={String(settings?.editor_font_size ?? 16)}
                          onChange={(val) => void updateSettings({ editor_font_size: parseInt(val, 10) })}
                        />
                      </div>
                    </div>
                    <div className="global-settings-modal__simple-row">
                      <div className="global-settings-modal__simple-info">
                        <span className="global-settings-modal__simple-label">Autosave Interval</span>
                        <span className="global-settings-modal__simple-desc">How often your work is saved automatically</span>
                      </div>
                      <div style={{ width: 200 }}>
                        <Dropdown
                          options={AUTOSAVE_OPTIONS}
                          value={String(settings?.autosave_interval ?? 5)}
                          onChange={(val) => void updateSettings({ autosave_interval: parseInt(val, 10) })}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="global-settings-modal__section">
              <div className="global-settings-modal__header">
                <h3>Author Profile</h3>
                <p>Set your default author information.</p>
              </div>

              <div className="global-settings-modal__setting-block" style={{ flexDirection: 'column', gap: 0, padding: 0 }}>
                <div className="global-settings-modal__simple-row">
                  <div className="global-settings-modal__simple-info">
                    <span className="global-settings-modal__simple-label">Author Name</span>
                    <span className="global-settings-modal__simple-desc">This will be autofilled as the default author when creating new projects.</span>
                  </div>
                  <div style={{ width: 200, flexShrink: 0 }}>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="Your Pen Name"
                      className="components-input"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        background: 'transparent',
                        color: 'var(--color-text)',
                        fontFamily: 'inherit',
                        fontSize: '0.9rem',
                        transition: 'border-color var(--transition-fast)'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="global-settings-modal__section">
              <div className="global-settings-modal__header">
                <h3>Backup & Sync</h3>
                <p>Manage your project backups.</p>
              </div>
              <BackupPanel />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
