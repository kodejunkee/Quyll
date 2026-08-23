import { useLayoutStore } from '@/store/layoutStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { OutlineStickyNote } from './OutlineStickyNote';
import { useState, useRef } from 'react';
import { Modal } from '@/components';
import { OutlineForm } from './OutlineForm';
import { useProjectDb } from '@/hooks/useProjectDb';

export function GlobalOutlineNotes() {
  const { openOutlineNotes, closeOutlineNote } = useLayoutStore();
  const { outlines } = useWorkspaceStore();
  const { db } = useProjectDb();
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  
  // Track stable initial spawn coordinates to prevent them from jumping when the array changes
  const spawnCoords = useRef<Record<string, { x: number, y: number }>>({});

  if (openOutlineNotes.length === 0) return null;

  const handleUpdate = async (d: any) => {
    if (editingNoteId && db) {
      await useWorkspaceStore.getState().updateOutline(db, editingNoteId, d);
      setEditingNoteId(null);
    }
  };

  return (
    <>
      {openOutlineNotes.map((id, idx) => {
        const note = outlines.find(o => o.id === id);
        if (!note) return null;
        
        if (!spawnCoords.current[id]) {
          spawnCoords.current[id] = { x: 100 + (idx * 30), y: 100 + (idx * 30) };
        }
        
        return (
          <OutlineStickyNote
            key={note.id}
            outline={note}
            initialX={spawnCoords.current[id].x}
            initialY={spawnCoords.current[id].y}
            onClose={() => {
              closeOutlineNote(note.id);
              delete spawnCoords.current[note.id];
            }}
            onEdit={() => setEditingNoteId(note.id)}
          />
        );
      })}

      <Modal open={!!editingNoteId} onClose={() => setEditingNoteId(null)} title="Edit Outline" size="lg">
        {editingNoteId && (
          <OutlineForm 
            initialData={outlines.find(i => i.id === editingNoteId)}
            onSubmit={handleUpdate} 
            onCancel={() => setEditingNoteId(null)} 
            submitLabel="Save Changes" 
          />
        )}
      </Modal>
    </>
  );
}
