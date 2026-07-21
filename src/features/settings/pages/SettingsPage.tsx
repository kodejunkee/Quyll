import { useState } from 'react';
import { Card, Dropdown, Button } from '@/components';
import {
  Loader2,
  Type,
  HardDrive,
  FileStack,
  Download,
  Upload,
} from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
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

type SettingsTab = 'editor' | 'backup' | 'export-import';

export default function SettingsPage() {
  const { settings, loading, updateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<SettingsTab>('editor');
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  if (loading) {
    return (
      <div className="settings-page">
        <header className="settings-page__header">
          <h1 className="settings-page__title">Project Settings</h1>
        </header>
        <div className="settings-page__loading">
          <Loader2 className="spinner" size={32} />
        </div>
      </div>
    );
  }

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'editor', label: 'Editor', icon: <Type size={16} className="settings-page__tab-icon" /> },
    { id: 'backup', label: 'Backup & Recovery', icon: <HardDrive size={16} className="settings-page__tab-icon" /> },
    { id: 'export-import', label: 'Export & Import', icon: <FileStack size={16} className="settings-page__tab-icon" /> },
  ];

  return (
    <div className="settings-page">
      <header className="settings-page__header">
        <h1 className="settings-page__title">Project Settings</h1>
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
        {activeTab === 'editor' && (
          <Card title="Editor" className="settings-page__card">
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
