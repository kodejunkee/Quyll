import { useState, useRef, useEffect } from 'react';
import { DraggableModal } from '@/components/DraggableModal/DraggableModal';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Dialog } from '@/components/Dialog';
import type { Outline } from '@/types/database';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useProjectDb } from '@/hooks/useProjectDb';

interface OutlineStickyNoteProps {
  outline: Outline;
  onClose: () => void;
  onEdit: () => void;
  initialX?: number;
  initialY?: number;
}

export function OutlineStickyNote({ outline, onClose, onEdit, initialX, initialY }: OutlineStickyNoteProps) {
  const { db } = useProjectDb();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [content, setContent] = useState(outline.description || '');
  const menuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!db || content === outline.description) return;
      await useWorkspaceStore.getState().updateOutline(db, outline.id, { description: content });
    }, 1000);
    return () => clearTimeout(timer);
  }, [content, db, outline.id, outline.description]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const confirmDelete = async () => {
    if (!db) return;
    await useWorkspaceStore.getState().softDeleteOutline(db, outline.id);
    setIsDeleting(false);
    onClose();
  };

  const menuButton = (
    <div style={{ position: 'relative' }}>
      <button 
        type="button"
        className="draggable-modal__btn"
        onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
      >
        <MoreVertical size={16} />
      </button>
      
      {menuOpen && (
        <div ref={menuRef} style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          minWidth: '120px',
          zIndex: 999999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}>
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'transparent', border: 'none', color: 'var(--color-text)', cursor: 'pointer', textAlign: 'left', borderRadius: '4px' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Pencil size={14} /> Edit Title
          </button>
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setIsDeleting(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', textAlign: 'left', borderRadius: '4px' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <DraggableModal
        title={<span>{outline.title || 'Untitled Outline'}</span>}
        headerLeftActions={menuButton}
        onClose={onClose}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        isCollapsed={isCollapsed}
        initialX={initialX}
        initialY={initialY}
        width="320px"
        height="280px"
        modalStyle={{ overflow: 'visible' }}
        contentStyle={{ padding: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}
      >
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your outline notes here..."
          style={{
            flex: 1,
            width: '100%',
            resize: 'none',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text)',
            padding: '16px',
            fontFamily: 'inherit',
            fontSize: 'var(--font-size-sm)',
            lineHeight: 1.5,
            outline: 'none'
          }}
        />
      </DraggableModal>

      <Dialog
        open={isDeleting}
        onClose={() => setIsDeleting(false)}
        title="Delete Outline"
        description={`Are you sure you want to delete "${outline.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
      />
    </>
  );
}
