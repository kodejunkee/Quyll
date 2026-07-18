import { useState, useEffect } from 'react';
import { Modal, Card, Dropdown, Button } from '@/components';
import { Type, Download, Upload, FileStack } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { ExportDialog } from './ExportDialog';
import { ImportDialog } from './ImportDialog';
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

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'editor' | 'export-import';

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
              className={`project-settings-modal__tab ${activeTab === 'editor' ? 'project-settings-modal__tab--active' : ''}`}
              onClick={() => setActiveTab('editor')}
            >
              <Type size={16} />
              <span>Typography</span>
            </button>
            <button
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
                <h3 className="project-settings-modal__section-title">Typography</h3>
                <Card className="project-settings-modal__card">
                  <div className="project-settings-modal__setting">
                    <div className="project-settings-modal__setting-info">
                      <span className="project-settings-modal__setting-label">Project Font</span>
                      <span className="project-settings-modal__setting-desc">Choose the font for the entire project interface</span>
                    </div>
                    <div style={{ width: 200 }}>
                      <Dropdown
                        options={FONT_OPTIONS}
                        value={settings?.editor_font ?? 'Inter'}
                        onChange={(val) => void updateSettings({ editor_font: val })}
                      />
                    </div>
                  </div>
                </Card>
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
