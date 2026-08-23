import { useState, useRef, useEffect } from 'react';
import { StickyNote, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Dialog } from '@/components/Dialog';
import type { Outline } from '@/types/database';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useProjectDb } from '@/hooks/useProjectDb';
import '../../locations/components/LocationCard.css';

interface OutlineCardProps {
  outline: Outline;
  onClick: (outline: Outline) => void;
  onEdit?: (outline: Outline) => void;
}

export function OutlineCard({ outline, onClick, onEdit }: OutlineCardProps) {
  const { db } = useProjectDb();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
  };

  return (
    <>
      <div 
        className="location-card" 
        role="button" 
        tabIndex={0} 
        onClick={() => onClick(outline)} 
        onKeyDown={e => e.key === 'Enter' && onClick(outline)}
        style={{ position: 'relative' }}
      >
        <div className="location-card__icon" style={{ color: 'var(--color-icon-outline)' }}>
          <StickyNote size={22} />
        </div>
        <div className="location-card__info" style={{ paddingRight: '24px' }}>
          <h3 className="location-card__name">{outline.title || 'Untitled'}</h3>
          <span className="location-card__type">{outline.category || 'Note'}</span>
          {outline.description && (
            <p className="location-card__desc">
              {outline.description.slice(0, 100)}{outline.description.length > 100 ? '...' : ''}
            </p>
          )}
        </div>

        <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <MoreVertical size={16} />
          </button>
          
          {menuOpen && (
            <div ref={menuRef} style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '4px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              minWidth: '120px',
              zIndex: 10,
              boxShadow: 'var(--shadow-lg)'
            }}>
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit?.(outline); }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'transparent', border: 'none', color: 'var(--color-text)', cursor: 'pointer', textAlign: 'left', borderRadius: '4px' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Pencil size={14} /> Edit
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
      </div>

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
