import { useState, useEffect } from 'react';
import { Modal, Button, Checkbox, Dropdown, type DropdownOption } from '@/components';
import { useExport } from '../hooks/useExport';
import { useProjectDb } from '@/hooks/useProjectDb';
import { select } from '@/database/databaseService';
import type { Chapter } from '@/types/database';
import { FileText, FileType, Printer, FileOutput, Loader2 } from 'lucide-react';
import type { ExportFormat, ExportScope } from '@/services/exportService';
import './ExportDialog.css';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormatConfig {
  id: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const FORMATS: FormatConfig[] = [
  {
    id: 'markdown',
    label: 'Markdown (.md)',
    description: 'Clean formatted text for editors and publishing',
    icon: <FileText size={20} />,
  },
  {
    id: 'text',
    label: 'Plain Text (.txt)',
    description: 'Simple unformatted text suitable anywhere',
    icon: <FileType size={20} />,
  },
  {
    id: 'pdf',
    label: 'PDF Document (.pdf)',
    description: 'Formatted document ready for print or sharing',
    icon: <Printer size={20} />,
  },
  {
    id: 'docx',
    label: 'Word Document (.docx)',
    description: 'Compatible with Microsoft Word and LibreOffice',
    icon: <FileOutput size={20} />,
  },
];

const SCOPE_OPTIONS: DropdownOption[] = [
  { value: 'project', label: 'Entire Project Manuscript' },
  { value: 'chapter', label: 'Single Chapter' },
  { value: 'selected-chapters', label: 'Selected Chapters' },
  { value: 'characters', label: 'Characters' },
  { value: 'lore', label: 'Lore Entries' },
  { value: 'timeline', label: 'Timeline Events' },
  { value: 'locations', label: 'Locations' },
  { value: 'organizations', label: 'Organizations' },
  { value: 'species', label: 'Species' },
  { value: 'items', label: 'Items' },
  { value: 'magic-systems', label: 'Magic Systems' },
  { value: 'plot-points', label: 'Plot Points' },
];

export function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const { db, projectId } = useProjectDb();
  const {
    format,
    setFormat,
    scope,
    setScope,
    selectedChapterId,
    setSelectedChapterId,
    selectedChapterIds,
    setSelectedChapterIds,
    isExporting,
    runExport,
    reset,
  } = useExport();

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoadingChapters, setIsLoadingChapters] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      reset();
      return;
    }

    if (!db || !projectId) return;

    let cancelled = false;
    async function fetchChapters() {
      try {
        setIsLoadingChapters(true);
        const rows = await select<Chapter>(
          db!,
          'SELECT id, title, chapter_number FROM chapters WHERE project_id = $1 AND deleted_at IS NULL ORDER BY chapter_number ASC',
          [projectId!],
        );
        if (!cancelled) {
          setChapters(rows);
          const firstRow = rows[0];
          if (firstRow && !selectedChapterId) {
            setSelectedChapterId(firstRow.id);
          }
        }
      } catch (error) {
        console.error('[ExportDialog] Failed to fetch chapters:', error);
      } finally {
        if (!cancelled) {
          setIsLoadingChapters(false);
        }
      }
    }

    void fetchChapters();

    return () => {
      cancelled = true;
    };
  }, [isOpen, db, projectId, reset]); // Only trigger on open or db/projectId changes

  const handleToggleChapter = (chapterId: string) => {
    setSelectedChapterIds(
      selectedChapterIds.includes(chapterId)
        ? selectedChapterIds.filter((id) => id !== chapterId)
        : [...selectedChapterIds, chapterId],
    );
  };

  const handleSelectAll = () => {
    if (selectedChapterIds.length === chapters.length) {
      setSelectedChapterIds([]);
    } else {
      setSelectedChapterIds(chapters.map((c) => c.id));
    }
  };

  const chapterDropdownOptions: DropdownOption[] = chapters.map((c) => ({
    value: c.id,
    label: `Chapter ${c.chapter_number}: ${c.title}`,
  }));

  const handleExport = async () => {
    await runExport();
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Export Project"
      description="Choose format and content scope for export"
      size="md"
    >
      <div className="export-dialog">
        {/* Format Section */}
        <div className="export-dialog__section">
          <span className="export-dialog__section-label">Export Format</span>
          <div className="export-dialog__options">
            {FORMATS.map((fmt) => {
              const isSelected = format === fmt.id;
              return (
                <button
                  key={fmt.id}
                  type="button"
                  className={`export-dialog__option ${
                    isSelected ? 'export-dialog__option--selected' : ''
                  }`}
                  onClick={() => setFormat(fmt.id)}
                >
                  <span className="export-dialog__option-icon">{fmt.icon}</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                      {fmt.label}
                    </span>
                    <span
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        color: isSelected
                          ? 'var(--color-accent)'
                          : 'var(--color-text-secondary)',
                      }}
                    >
                      {fmt.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scope Section */}
        <div className="export-dialog__section">
          <span className="export-dialog__section-label">Content Scope</span>
          <Dropdown
            options={SCOPE_OPTIONS}
            value={scope}
            onChange={(val) => setScope(val as ExportScope)}
            placeholder="Select content scope..."
          />
        </div>

        {/* Conditional Chapter Dropdown */}
        {scope === 'chapter' && (
          <div className="export-dialog__section">
            <span className="export-dialog__section-label">Select Chapter</span>
            {isLoadingChapters ? (
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                Loading chapters...
              </span>
            ) : (
              <Dropdown
                options={chapterDropdownOptions}
                value={selectedChapterId}
                onChange={(val) => setSelectedChapterId(val)}
                placeholder="Select chapter to export..."
                disabled={chapters.length === 0}
              />
            )}
          </div>
        )}

        {/* Conditional Checkbox List for Selected Chapters */}
        {scope === 'selected-chapters' && (
          <div className="export-dialog__section">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span className="export-dialog__section-label">Select Chapters</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                disabled={chapters.length === 0}
                style={{ padding: '0 var(--space-2)' }}
              >
                {selectedChapterIds.length === chapters.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            {isLoadingChapters ? (
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                Loading chapters...
              </span>
            ) : chapters.length === 0 ? (
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                No chapters found in this project.
              </span>
            ) : (
              <div className="export-dialog__chapters">
                {chapters.map((ch) => (
                  <Checkbox
                    key={ch.id}
                    label={`Chapter ${ch.chapter_number}: ${ch.title}`}
                    checked={selectedChapterIds.includes(ch.id)}
                    onChange={() => handleToggleChapter(ch.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions Section */}
        <div className="export-dialog__actions">
          <Button variant="ghost" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleExport}
            loading={isExporting}
            disabled={
              isExporting ||
              (scope === 'chapter' && !selectedChapterId) ||
              (scope === 'selected-chapters' && selectedChapterIds.length === 0)
            }
            icon={isExporting ? <Loader2 className="spinner" size={16} /> : undefined}
          >
            Export
          </Button>
        </div>
      </div>
    </Modal>
  );
}
