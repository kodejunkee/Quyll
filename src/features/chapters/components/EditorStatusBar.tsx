import { Cloud, CloudOff, Wand2 } from 'lucide-react';
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
  onGrammarCheck?: () => void;
}

export function EditorStatusBar({
  wordCount,
  characterCount,
  readingTime,
  saveStatus,
  onGrammarCheck,
}: EditorStatusBarProps) {
  return (
    <div className="editor-status-bar">
      <div className="editor-status-bar__stats">
        <span className="editor-status-bar__stat">
          <span className="editor-status-bar__label">Words: </span>
          <strong className="editor-status-bar__value">{formatNumber(wordCount)}</strong>
        </span>
        <span className="editor-status-bar__stat">
          <span className="editor-status-bar__label">Chars: </span>
          <strong className="editor-status-bar__value">{formatNumber(characterCount)}</strong>
        </span>
        <span className="editor-status-bar__stat">
          <span className="editor-status-bar__label">Read: </span>
          <strong className="editor-status-bar__value">{formatReadingTime(readingTime)}</strong>
        </span>
        <span className="editor-status-bar__cloud" title={`Save status: ${saveStatus}`}>
          {saveStatus === 'unsaved' ? (
            <CloudOff size={14} className="editor-status-bar__cloud-icon editor-status-bar__cloud-icon--unsaved" />
          ) : (
            <Cloud 
              size={14} 
              className={`editor-status-bar__cloud-icon ${saveStatus === 'saving' ? 'editor-status-bar__cloud-icon--saving' : ''}`} 
            />
          )}
        </span>
      </div>
      {onGrammarCheck && (
        <button
          type="button"
          className="editor-status-bar__grammar-btn"
          onClick={onGrammarCheck}
          title="Check grammar and writing style"
        >
          <Wand2 size={13} className="editor-status-bar__grammar-icon" />
          <span>Grammar Check</span>
        </button>
      )}
    </div>
  );
}
