import { useState } from 'react';
import { PlusIcon, CaretSortIcon, GridIcon } from '@radix-ui/react-icons';
import { Sword, Share2 } from 'lucide-react';
import { Button, EmptyState, Modal, SearchBar } from '@/components';
import { useItems } from '../hooks/useItems';
import { ItemCard } from '../components/ItemCard';
import { ItemForm } from '../components/ItemForm';
import { EntityFlowchart } from '@/features/knowledge-graph/components/EntityFlowchart';
import { useSearch, useSort } from '@/hooks';
import type { ItemFormData } from '../types/item';
import type { Item } from '@/types/database';
import '../../locations/pages/LocationsPage.css';
export default function ItemsPage() {
  const { items, loading, create } = useItems(); const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'details' | 'flowchart'>('details');
  const { query, setQuery, filterItems } = useSearch();
  const { sortKey, sortDirection, setSortKey, toggleDirection, sortItems } = useSort<'name' | 'created_at'>('name');
  const filtered = filterItems(items, i => `${i.name} ${i.type}`);
  const sorted = sortItems(filtered, (i: Item, k) => k === 'name' ? i.name : i.created_at);
  async function handleCreate(d: ItemFormData) { await create(d); setCreateOpen(false); }
  return (<div className="entity-list-page"><header className="entity-list-page__header"><div><h1 className="entity-list-page__title">Items</h1><p className="entity-list-page__count">{items.length} item{items.length !== 1 ? 's' : ''}</p></div><div className="entity-list-page__actions">
          {viewMode === 'details' && (
            <Button variant="ghost" size="sm" onClick={() => { setSortKey(sortKey === 'name' ? 'created_at' : 'name'); toggleDirection(); }}><CaretSortIcon width={14} height={14} />{sortKey === 'name' ? 'Name' : 'Date'} {sortDirection === 'asc' ? '↑' : '↓'}</Button>
          )}
  <Button variant="primary" onClick={() => setCreateOpen(true)}><PlusIcon width={16} height={16} />New Item</Button></div></header>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <div className="entity-list-page__search" style={{ marginBottom: 0, flex: 1, maxWidth: "400px" }}><SearchBar value={query} onChange={setQuery} placeholder="Search items..." /></div>
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '6px' }}>
            <Button variant={viewMode === 'details' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('details')}><GridIcon width={14} height={14} /> Details</Button>
            <Button variant={viewMode === 'flowchart' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('flowchart')}><Share2 size={14} /> Flowchart</Button>
          </div>
      </div>{loading ? <div className="entity-list-page__loading">Loading...</div> : viewMode === 'flowchart' ? (
        <div style={{ height: 'calc(100vh - 260px)', marginTop: '16px' }}><EntityFlowchart entityType="item" searchQuery={query} /></div>
      ) : sorted.length === 0 ? (query ? <EmptyState icon={Sword} title="No matches" description={`No items matching "${query}"`} /> : <EmptyState icon={Sword} title="No items yet" description="Catalog the weapons, artifacts, and objects of your world." actionLabel="Create Item" onAction={() => setCreateOpen(true)} />) : <div className="entity-list-page__grid">{sorted.map(i => <ItemCard key={i.id} item={i} />)}</div>}<Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Item" size="lg"><ItemForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} submitLabel="Create" /></Modal></div>);
}
