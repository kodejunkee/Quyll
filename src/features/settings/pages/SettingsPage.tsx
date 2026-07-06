import { useThemeStore } from '@/store/themeStore';
import { Card, Button } from '@/components';
import { Sun, Moon, Sparkles } from 'lucide-react';
import './SettingsPage.css';

export default function SettingsPage() {
  const { theme, toggleTheme } = useThemeStore();

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
            <Button variant="secondary" disabled>Inter</Button>
          </div>
          <div className="settings-page__setting">
            <div className="settings-page__setting-info">
              <span className="settings-page__setting-label">Font Size</span>
              <span className="settings-page__setting-desc">Adjust the editor font size</span>
            </div>
            <Button variant="secondary" disabled>16px</Button>
          </div>
          <div className="settings-page__setting">
            <div className="settings-page__setting-info">
              <span className="settings-page__setting-label">Autosave Interval</span>
              <span className="settings-page__setting-desc">How often your work is saved automatically</span>
            </div>
            <Button variant="secondary" disabled>30 seconds</Button>
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
