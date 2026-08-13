import { useState } from 'react';
import { Card, Dropdown, Button } from '@/components';
import {
  Loader2,
  Type,
  HardDrive,
  FileStack,
  Download,
  Upload,
  Palette,
  User,
} from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { useThemeStore } from '@/store/themeStore';
import { useOptionalProjectDb } from '@/hooks/useProjectDb';
import { BackupPanel } from '../components/BackupPanel';
import { ExportDialog } from '../components/ExportDialog';
import { ImportDialog } from '../components/ImportDialog';
import './SettingsPage.css';

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

type SettingsTab = 'profile' | 'appearance' | 'editor' | 'backup' | 'export-import';

export default function SettingsPage() {
  const ctx = useOptionalProjectDb();
  const db = ctx?.db;
  const { settings, loading, updateSettings } = useSettings();
  const { theme, setTheme, accent, setAccent, defaultFont, setDefaultFont, authorName, setAuthorName } = useThemeStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

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

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User size={16} className="settings-page__tab-icon" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={16} className="settings-page__tab-icon" /> },
    { id: 'editor', label: db ? 'Editor' : 'Editor Defaults', icon: <Type size={16} className="settings-page__tab-icon" /> },
    ...(db ? [
      { id: 'backup' as const, label: 'Backup & Recovery', icon: <HardDrive size={16} className="settings-page__tab-icon" /> },
      { id: 'export-import' as const, label: 'Export & Import', icon: <FileStack size={16} className="settings-page__tab-icon" /> },
    ] : []),
  ];

  return (
    <div className="settings-page">
      <header className="settings-page__header">
        <h1 className="settings-page__title">Settings</h1>
        <div className="settings-page__tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`settings-page__tab ${activeTab === tab.id ? 'settings-page__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="settings-page__sections">
        {activeTab === 'profile' && (
          <Card title="Author Profile" className="settings-page__card">
            <div className="settings-page__setting">
              <div className="settings-page__setting-info">
                <span className="settings-page__setting-label">Author Name</span>
                <span className="settings-page__setting-desc">This will be autofilled as the default author when creating new projects.</span>
              </div>
              <div style={{ width: 200 }}>
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
                    background: 'var(--color-bg-elevated)',
                    color: 'var(--color-text)',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                    transition: 'border-color var(--transition-fast)'
                  }}
                />
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'appearance' && (
          <Card title="Appearance" className="settings-page__card">
            <div className="settings-page__setting">
              <div className="settings-page__setting-info">
                <span className="settings-page__setting-label">Theme</span>
                <span className="settings-page__setting-desc">Select your preferred workspace visual style</span>
              </div>
              <div style={{ width: 200 }}>
                <Dropdown
                  options={THEME_OPTIONS}
                  value={theme}
                  onChange={(val) => setTheme(val as any)}
                />
              </div>
            </div>
            <div className="settings-page__setting">
              <div className="settings-page__setting-info">
                <span className="settings-page__setting-label">Accent Color</span>
                <span className="settings-page__setting-desc">Customize interactive highlights across the application</span>
              </div>
              <div style={{ width: 200 }}>
                <Dropdown
                  options={ACCENT_OPTIONS}
                  value={accent}
                  onChange={(val) => setAccent(val as any)}
                />
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'editor' && (
          <Card title={db ? "Editor" : "Editor Defaults"} className="settings-page__card">
            <div className="settings-page__setting">
              <div className="settings-page__setting-info">
                <span className="settings-page__setting-label">Default Editor Font</span>
                <span className="settings-page__setting-desc">Choose the default font family for new projects</span>
              </div>
              <div style={{ width: 200 }}>
                <Dropdown
                  options={FONT_OPTIONS}
                  value={defaultFont}
                  onChange={(val) => setDefaultFont(val as string)}
                />
              </div>
            </div>
            {db && (
              <>
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
              </>
            )}
          </Card>
        )}

        {activeTab === 'backup' && <BackupPanel />}

        {activeTab === 'export-import' && (
          <>
            <Card title="Export & Import Project Data" className="settings-page__card">
              <div className="settings-page__setting">
                <div className="settings-page__setting-info">
                  <span className="settings-page__setting-label">Export Project</span>
                  <span className="settings-page__setting-desc">
                    Export your entire project, single chapters, or worldbuilding codex to Markdown, Text, PDF, or Word documents.
                  </span>
                </div>
                <Button variant="primary" onClick={() => setExportOpen(true)}>
                  <Download size={16} />
                  Export Project
                </Button>
              </div>
              <div className="settings-page__setting">
                <div className="settings-page__setting-info">
                  <span className="settings-page__setting-label">Import Document</span>
                  <span className="settings-page__setting-desc">
                    Import external documents (.md, .txt, or .docx) and automatically split them into chapters inside this project.
                  </span>
                </div>
                <Button variant="secondary" onClick={() => setImportOpen(true)}>
                  <Upload size={16} />
                  Import Document
                </Button>
              </div>
            </Card>

            <ExportDialog isOpen={exportOpen} onClose={() => setExportOpen(false)} />
            <ImportDialog isOpen={importOpen} onClose={() => setImportOpen(false)} />
          </>
        )}
      </div>
    </div>
  );
}
