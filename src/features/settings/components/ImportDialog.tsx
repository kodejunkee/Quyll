import { Modal, Button, Checkbox } from '@/components';
import { useImport } from '../hooks/useImport';
import { Upload, FileText, Loader2 } from 'lucide-react';
import './ImportDialog.css';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportDialog({ isOpen, onClose }: ImportDialogProps) {
  const {
    preview,
    isLoading,
    isImporting,
    selectedIndices,
    pickFile,
    toggleChapter,
    runImport,
    reset,
  } = useImport();

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleRunImport = async () => {
    const success = await runImport();
    if (success) {
      onClose();
    }
  };

  return (
    <Modal open={isOpen} onClose={handleClose} title="Import Document">
      <div className="import-dialog">
        {!preview ? (
          <div className="import-dialog__upload-area" onClick={pickFile}>
            {isLoading ? (
              <Loader2 size={36} className="import-dialog__spinner" />
            ) : (
              <>
                <Upload size={36} className="import-dialog__upload-icon" />
                <p className="import-dialog__upload-text">Click to browse and select a document</p>
                <p className="import-dialog__upload-hint">Supports Markdown (.md), Plain Text (.txt), and Word (.docx)</p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="import-dialog__file-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <FileText size={18} style={{ color: 'var(--color-accent)' }} />
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{preview.fileName}</span>
                <span style={{ fontSize: 'var(--font-size-xs)', padding: '2px 6px', background: 'var(--color-surface-3)', borderRadius: 'var(--radius-sm)', textTransform: 'uppercase' }}>
                  {preview.format}
                </span>
              </div>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                {preview.chapters.length} {preview.chapters.length === 1 ? 'chapter' : 'chapters'} found
              </span>
            </div>

            <div className="import-dialog__chapters-header">
              Select Chapters to Import ({selectedIndices.size} selected)
            </div>

            <div className="import-dialog__chapters-list">
              {preview.chapters.map((ch, idx) => (
                <div key={idx} className="import-dialog__chapter-item">
                  <Checkbox
                    id={`import-chapter-${idx}`}
                    label=""
                    checked={selectedIndices.has(idx)}
                    onChange={() => toggleChapter(idx)}
                  />
                  <div className="import-dialog__chapter-meta">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="import-dialog__chapter-title">{ch.title}</span>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                        {ch.wordCount} words
                      </span>
                    </div>
                    <span className="import-dialog__chapter-preview">
                      {ch.content.replace(/<[^>]+>/g, '').slice(0, 80) + '...'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="import-dialog__actions">
              <Button variant="secondary" onClick={() => pickFile()} disabled={isImporting}>
                Pick Different File
              </Button>
              <Button variant="secondary" onClick={handleClose} disabled={isImporting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleRunImport}
                disabled={selectedIndices.size === 0 || isImporting}
                loading={isImporting}
              >
                {isImporting ? 'Importing...' : `Import ${selectedIndices.size} Chapters`}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
