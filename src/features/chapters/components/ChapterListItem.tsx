import { MoreVertical, Pencil, Copy, Trash2 } from 'lucide-react';
import type { Chapter } from '@/types/database';
import { formatNumber } from '../utils/writingStats';
import './ChapterListItem.css';

interface ChapterListItemProps {
  chapter: Chapter;
  active: boolean;
  showMenu: boolean;
  onSelect: () => void;
  onToggleMenu: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function ChapterListItem({
  chapter,
  active,
  showMenu,
  onSelect,
  onToggleMenu,
  onRename,
  onDuplicate,
  onDelete,
}: ChapterListItemProps) {
  return (
    <div className={`chapter-list-item ${active ? 'chapter-list-item--active' : ''}`}>
      <button
        className="chapter-list-item__content"
        onClick={onSelect}
        type="button"
      >
        <span className="chapter-list-item__number">{chapter.chapter_number}</span>
        <div className="chapter-list-item__text">
          <span className="chapter-list-item__title">{chapter.title}</span>
          <span className="chapter-list-item__words">
            {formatNumber(chapter.word_count)} words
          </span>
        </div>
      </button>

      <div className="chapter-list-item__actions">
        <button
          className="chapter-list-item__menu-btn"
          onClick={(e) => { e.stopPropagation(); onToggleMenu(); }}
          aria-label="Chapter actions"
          type="button"
        >
          <MoreVertical size={14} />
        </button>

        {showMenu && (
          <div className="chapter-list-item__menu">
            <button className="chapter-list-item__menu-item" onClick={onRename} type="button">
              <Pencil size={14} />
              Rename
            </button>
            <button className="chapter-list-item__menu-item" onClick={onDuplicate} type="button">
              <Copy size={14} />
              Duplicate
            </button>
            <button className="chapter-list-item__menu-item chapter-list-item__menu-item--danger" onClick={onDelete} type="button">
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
