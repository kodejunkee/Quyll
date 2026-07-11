import { formatNumber, formatReadingTime } from '../utils/writingStats';
import './EditorStatusBar.css';

export type SaveStatus = 'saved' | 'saving' | 'unsaved';

interface EditorStatusBarProps {
  wordCount: number;
  characterCount: number;
  paragraphCount: number;
  readingTime: number;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
}

function formatLastSaved(timestamp: string | null): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins === 1) return '1 min ago';
  if (diffMins < 60) return `${diffMins} min ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;

  return date.toLocaleDateString();
}

function SaveIndicator({ status, lastSavedAt }: { status: SaveStatus; lastSavedAt: string | null }) {
  const statusConfig = {
    saved: { label: 'Saved', className: 'editor-status-bar__save--saved' },
    saving: { label: 'Saving...', className: 'editor-status-bar__save--saving' },
    unsaved: { label: 'Unsaved', className: 'editor-status-bar__save--unsaved' },
  };

  const config = statusConfig[status];
  const timeStr = status === 'saved' ? formatLastSaved(lastSavedAt) : '';

  return (
    <span className={`editor-status-bar__save ${config.className}`}>
      <span className="editor-status-bar__save-dot" />
      {config.label}
      {timeStr && <span className="editor-status-bar__save-time"> · {timeStr}</span>}
    </span>
  );
}

export function EditorStatusBar({
  wordCount,
  characterCount,
  paragraphCount,
  readingTime,
  saveStatus,
  lastSavedAt,
}: EditorStatusBarProps) {
  return (
    <div className="editor-status-bar">
      <div className="editor-status-bar__stats">
        <span className="editor-status-bar__stat">
          Words: <strong>{formatNumber(wordCount)}</strong>
        </span>
        <span className="editor-status-bar__divider">|</span>
        <span className="editor-status-bar__stat">
          Characters: <strong>{formatNumber(characterCount)}</strong>
        </span>
        <span className="editor-status-bar__divider">|</span>
        <span className="editor-status-bar__stat">
          Paragraphs: <strong>{formatNumber(paragraphCount)}</strong>
        </span>
        <span className="editor-status-bar__divider">|</span>
        <span className="editor-status-bar__stat">
          Reading Time: <strong>{formatReadingTime(readingTime)}</strong>
        </span>
      </div>
      <SaveIndicator status={saveStatus} lastSavedAt={lastSavedAt} />
    </div>
  );
}
