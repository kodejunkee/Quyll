import { useState } from 'react';
import { PlusIcon, CaretSortIcon } from '@radix-ui/react-icons';
import { StickyNote } from 'lucide-react';
import { Button, EmptyState, Modal, SearchBar } from '@/components';
import { useOutlines } from '../hooks/useOutlines';
import { OutlineCard } from '../components/OutlineCard';
import { OutlineForm } from '../components/OutlineForm';
import { useSearch, useSort } from '@/hooks';
import type { Outline } from '@/types/database';
import '../../locations/pages/LocationsPage.css';

export function OutlinerPage() {
  const { items, isLoading, create } = useOutlines(); 
  const [createOpen, setCreateOpen] = useState(false);
  const { query, setQuery, filterItems } = useSearch();
  const { sortKey, sortDirection, setSortKey, toggleDirection, sortItems } = useSort<'title' | 'created_at'>('title');
  
  const filtered = filterItems(items, l => l.title + ' ' + l.category + ' ' + l.description);
  const sorted = sortItems(filtered, (l: Outline, k) => k === 'title' ? l.title : l.created_at);
  
  async function handleCreate(d: any) { 
    await create(d); 
    setCreateOpen(false); 
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
            <CaretSortIcon width={14} height={14} />{sortKey === 'title' ? 'Title' : 'Date'} {sortDirection === 'asc' ? '↑' : '↓'}
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
            {sorted.map(l => <OutlineCard key={l.id} outline={l} />)}
          </div>
        )
      }
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Outline" size="lg">
        <OutlineForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} submitLabel="Create" />
      </Modal>
    </div>
  );
}
