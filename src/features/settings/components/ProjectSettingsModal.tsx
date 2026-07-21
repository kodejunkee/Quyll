import { useState, useEffect } from 'react';
import { Modal, Card, Dropdown, Button } from '@/components';
import { Type, Download, Upload, FileStack, HardDrive } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { ExportDialog } from './ExportDialog';
import { ImportDialog } from './ImportDialog';
import { BackupPanel } from './BackupPanel';
import './ProjectSettingsModal.css';

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

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'editor' | 'backup' | 'export-import';

export function ProjectSettingsModal({ isOpen, onClose }: ProjectSettingsModalProps) {
  const { settings, updateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<Tab>('editor');
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Apply project font globally to the entire interface
  useEffect(() => {
    if (settings?.editor_font) {
      const fontToApply = settings.editor_font === 'Inter' 
        ? "'Inter', system-ui, -apple-system, sans-serif" 
        : settings.editor_font;
        
      document.documentElement.style.setProperty('--font-family', fontToApply);
      document.documentElement.style.setProperty('--editor-font-family', fontToApply);
    }
  }, [settings?.editor_font]);

  return (
    <>
      <Modal
        open={isOpen}
        onClose={onClose}
        title="Project Settings"
        size="lg"
      >
        <div className="project-settings-modal">
          <div className="project-settings-modal__sidebar">
            <button
              type="button"
              className={`project-settings-modal__tab ${activeTab === 'editor' ? 'project-settings-modal__tab--active' : ''}`}
              onClick={() => setActiveTab('editor')}
            >
              <Type size={16} />
              <span>Editor & Typography</span>
            </button>
            <button
              type="button"
              className={`project-settings-modal__tab ${activeTab === 'backup' ? 'project-settings-modal__tab--active' : ''}`}
              onClick={() => setActiveTab('backup')}
            >
              <HardDrive size={16} />
              <span>Backup & Recovery</span>
            </button>
            <button
              type="button"
              className={`project-settings-modal__tab ${activeTab === 'export-import' ? 'project-settings-modal__tab--active' : ''}`}
              onClick={() => setActiveTab('export-import')}
            >
              <FileStack size={16} />
              <span>Export & Import</span>
            </button>
          </div>

          <div className="project-settings-modal__content">
            {activeTab === 'editor' && (
              <div className="project-settings-modal__section">
                <h3 className="project-settings-modal__section-title">Editor & Typography</h3>
                <Card className="project-settings-modal__card">
                  <div className="project-settings-modal__setting">
                    <div className="project-settings-modal__setting-info">
                      <span className="project-settings-modal__setting-label">Project Font</span>
                      <span className="project-settings-modal__setting-desc">Choose the font family for the active writing project</span>
                    </div>
                    <div style={{ width: 200 }}>
                      <Dropdown
                        options={FONT_OPTIONS}
                        value={settings?.editor_font ?? 'Inter'}
                        onChange={(val) => void updateSettings({ editor_font: val })}
                      />
                    </div>
                  </div>
                  <div className="project-settings-modal__setting">
                    <div className="project-settings-modal__setting-info">
                      <span className="project-settings-modal__setting-label">Font Size</span>
                      <span className="project-settings-modal__setting-desc">Adjust the editor text size</span>
                    </div>
                    <div style={{ width: 200 }}>
                      <Dropdown
                        options={FONT_SIZE_OPTIONS}
                        value={String(settings?.editor_font_size ?? 16)}
                        onChange={(val) => void updateSettings({ editor_font_size: parseInt(val, 10) })}
                      />
                    </div>
                  </div>
                  <div className="project-settings-modal__setting">
                    <div className="project-settings-modal__setting-info">
                      <span className="project-settings-modal__setting-label">Autosave Interval</span>
                      <span className="project-settings-modal__setting-desc">How often your writing is automatically saved</span>
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
              </div>
            )}

            {activeTab === 'backup' && (
              <div className="project-settings-modal__section">
                <BackupPanel />
              </div>
            )}

            {activeTab === 'export-import' && (
              <div className="project-settings-modal__section">
                <h3 className="project-settings-modal__section-title">Data Management</h3>
                <Card className="project-settings-modal__card">
                  <div className="project-settings-modal__setting">
                    <div className="project-settings-modal__setting-info">
                      <span className="project-settings-modal__setting-label">Export Project</span>
                      <span className="project-settings-modal__setting-desc">
                        Export your entire project, single chapters, or worldbuilding codex to Markdown, Text, PDF, or Word documents.
                      </span>
                    </div>
                    <Button variant="primary" onClick={() => setExportOpen(true)}>
                      <Download size={16} />
                      Export Project
                    </Button>
                  </div>
                  <div className="project-settings-modal__setting">
                    <div className="project-settings-modal__setting-info">
                      <span className="project-settings-modal__setting-label">Import Document</span>
                      <span className="project-settings-modal__setting-desc">
                        Import external documents (.md, .txt, or .docx) and automatically split them into chapters inside this project.
                      </span>
                    </div>
                    <Button variant="secondary" onClick={() => setImportOpen(true)}>
                      <Upload size={16} />
                      Import Document
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ExportDialog isOpen={exportOpen} onClose={() => setExportOpen(false)} />
      <ImportDialog isOpen={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
}
