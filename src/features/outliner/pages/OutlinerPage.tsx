import { useState, useMemo } from 'react';
import { PlusIcon, CaretSortIcon } from '@radix-ui/react-icons';
import { StickyNote } from 'lucide-react';
import { Button, EmptyState, Modal, SearchBar } from '@/components';
import { useOutlines } from '../hooks/useOutlines';
import { OutlineCard } from '../components/OutlineCard';
import { OutlineForm } from '../components/OutlineForm';
import { OutlineStickyNote } from '../components/OutlineStickyNote';
import { useSearch, useSort } from '@/hooks';
import type { Outline } from '@/types/database';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useProjectDb } from '@/hooks/useProjectDb';
import '../../locations/pages/LocationsPage.css';

export function OutlinerPage() {
  const { db } = useProjectDb();
  const { items, isLoading, create } = useOutlines(); 
  const [createOpen, setCreateOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [openNotesIds, setOpenNotesIds] = useState<string[]>([]);
  
  const { query, setQuery, filterItems } = useSearch();
  const { sortKey, sortDirection, setSortKey, toggleDirection, sortItems } = useSort<'title' | 'created_at'>('title');
  
  const filtered = filterItems(items, l => l.title + ' ' + l.category + ' ' + l.description);
  const sorted = sortItems(filtered, (l: Outline, k) => k === 'title' ? l.title : l.created_at);
  
  const openNotes = useMemo(() => {
    return openNotesIds.map(id => items.find(i => i.id === id)).filter(Boolean) as Outline[];
  }, [openNotesIds, items]);

  async function handleCreate(d: any) { 
    await create(d); 
    setCreateOpen(false); 
  }

  async function handleUpdate(d: any) {
    if (editingNoteId && db) {
      await useWorkspaceStore.getState().updateOutline(db, editingNoteId, d);
      setEditingNoteId(null);
    }
  }
  
  return (
    <div className="entity-list-page">
      <header className="entity-list-page__header">
        <div>
          <h1 className="entity-list-page__title">Outliner</h1>
          <p className="entity-list-page__count">{items.length} outline{items.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="entity-list-page__actions">
          <Button variant="ghost" size="sm" onClick={() => { setSortKey(sortKey === 'title' ? 'created_at' : 'title'); toggleDirection(); }}>
            <CaretSortIcon width={14} height={14} />{sortKey === 'title' ? 'Title' : 'Date'} {sortDirection === 'asc' ? ' ' : ' '}
          </Button>
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <PlusIcon width={16} height={16} />New Outline
          </Button>
        </div>
      </header>
      
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <div className="entity-list-page__search" style={{ marginBottom: 0, maxWidth: "400px" }}>
          <SearchBar value={query} onChange={setQuery} placeholder="Search outlines..." />
        </div>
      </div>
      
      {isLoading ? <div className="entity-list-page__loading">Loading...</div> : 
        sorted.length === 0 ? (
          query ? <EmptyState icon={StickyNote} title="No matches" description={`No outline matching "${query}"`} /> : 
          <EmptyState icon={StickyNote} title="No outlines yet" description="Create notes and outlines for your story." actionLabel="Create Outline" onAction={() => setCreateOpen(true)} />
        ) : (
          <div className="entity-list-page__grid">
            {sorted.map(l => (
              <OutlineCard 
                key={l.id} 
                outline={l} 
                onClick={() => {
                  if (!openNotesIds.includes(l.id)) setOpenNotesIds([...openNotesIds, l.id]);
                }}
                onEdit={() => setEditingNoteId(l.id)}
              />
            ))}
          </div>
        )
      }
      
      {openNotes.map((note, idx) => (
        <OutlineStickyNote 
          key={note.id} 
          outline={note} 
          initialX={100 + (idx * 30)}
          initialY={100 + (idx * 30)}
          onClose={() => setOpenNotesIds(prev => prev.filter(id => id !== note.id))}
          onEdit={() => setEditingNoteId(note.id)}
        />
      ))}
      
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Outline" size="lg">
        <OutlineForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} submitLabel="Create" />
      </Modal>

      <Modal open={!!editingNoteId} onClose={() => setEditingNoteId(null)} title="Edit Outline" size="lg">
        {editingNoteId && (
          <OutlineForm 
            initialData={items.find(i => i.id === editingNoteId)}
            onSubmit={handleUpdate} 
            onCancel={() => setEditingNoteId(null)} 
            submitLabel="Save Changes" 
          />
        )}
      </Modal>
    </div>
  );
}
