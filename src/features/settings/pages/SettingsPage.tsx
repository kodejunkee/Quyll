import { useThemeStore } from '@/store/themeStore';
import { Card, Button, Dropdown } from '@/components';
import { Sun, Moon, Sparkles, Loader2 } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import './SettingsPage.css';

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter (Default)' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Courier New', label: 'Courier New' },
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

export default function SettingsPage() {
  const { theme, toggleTheme } = useThemeStore();
  const { settings, loading, updateSettings } = useSettings();

  if (loading) {
    return (
      <div className="settings-page">
        <header className="settings-page__header">
          <h1 className="settings-page__title">Settings</h1>
        </header>
        <div className="settings-page__loading">
          <Loader2 className="spinner" size={32} />
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <header className="settings-page__header">
        <h1 className="settings-page__title">Settings</h1>
      </header>

      <div className="settings-page__sections">
        <Card title="Appearance" className="settings-page__card">
          <div className="settings-page__setting">
            <div className="settings-page__setting-info">
              <span className="settings-page__setting-label">Theme</span>
              <span className="settings-page__setting-desc">
                Switch between dark and light mode
              </span>
            </div>
            <Button variant="secondary" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </Button>
          </div>
        </Card>

        <Card title="Editor" className="settings-page__card">
          <div className="settings-page__setting">
            <div className="settings-page__setting-info">
              <span className="settings-page__setting-label">Editor Font</span>
              <span className="settings-page__setting-desc">Choose your preferred writing font</span>
            </div>
            <div style={{ width: 200 }}>
              <Dropdown
                options={FONT_OPTIONS}
                value={settings?.editor_font ?? 'Inter'}
                onChange={(val) => void updateSettings({ editor_font: val })}
              />
            </div>
          </div>
          <div className="settings-page__setting">
            <div className="settings-page__setting-info">
              <span className="settings-page__setting-label">Font Size</span>
              <span className="settings-page__setting-desc">Adjust the editor font size</span>
            </div>
            <div style={{ width: 200 }}>
              <Dropdown
                options={FONT_SIZE_OPTIONS}
                value={String(settings?.editor_font_size ?? 16)}
                onChange={(val) => void updateSettings({ editor_font_size: parseInt(val, 10) })}
              />
            </div>
          </div>
          <div className="settings-page__setting">
            <div className="settings-page__setting-info">
              <span className="settings-page__setting-label">Autosave Interval</span>
              <span className="settings-page__setting-desc">How often your work is saved automatically</span>
            </div>
            <div style={{ width: 200 }}>
              <Dropdown
                options={AUTOSAVE_OPTIONS}
                value={String(settings?.autosave_interval ?? 5)}
                onChange={(val) => void updateSettings({ autosave_interval: parseInt(val, 10) })}
              />
            </div>
          </div>
        </Card>

        <Card title="AI Assistant" className="settings-page__card">
          <div className="settings-page__ai-coming-soon">
            <Sparkles size={24} className="settings-page__ai-icon" />
            <div>
              <p className="settings-page__ai-title">AI Features Coming Soon</p>
              <p className="settings-page__ai-desc">
                Configure AI assistants, API keys, and preferences once AI features are available.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
