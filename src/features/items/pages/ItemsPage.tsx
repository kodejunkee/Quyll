import { useState } from 'react';
import { Sword, Plus, ArrowUpDown } from 'lucide-react';
import { Button, EmptyState, Modal, SearchBar } from '@/components';
import { useItems } from '../hooks/useItems';
import { ItemCard } from '../components/ItemCard';
import { ItemForm } from '../components/ItemForm';
import { useSearch, useSort } from '@/hooks';
import type { ItemFormData } from '../types/item';
import type { Item } from '@/types/database';
import '../../locations/pages/LocationsPage.css';
export default function ItemsPage() {
  const { items, loading, create } = useItems(); const [createOpen, setCreateOpen] = useState(false);
  const { query, setQuery, filterItems } = useSearch();
  const { sortKey, sortDirection, setSortKey, toggleDirection, sortItems } = useSort<'name' | 'created_at'>('name');
  const filtered = filterItems(items, i => `${i.name} ${i.type}`);
  const sorted = sortItems(filtered, (i: Item, k) => k === 'name' ? i.name : i.created_at);
  async function handleCreate(d: ItemFormData) { await create(d); setCreateOpen(false); }
  return (<div className="entity-list-page"><header className="entity-list-page__header"><div><h1 className="entity-list-page__title">Items</h1><p className="entity-list-page__count">{items.length} item{items.length !== 1 ? 's' : ''}</p></div><div className="entity-list-page__actions"><Button variant="ghost" size="sm" onClick={() => { setSortKey(sortKey === 'name' ? 'created_at' : 'name'); toggleDirection(); }}><ArrowUpDown size={14} />{sortKey === 'name' ? 'Name' : 'Date'} {sortDirection === 'asc' ? '↑' : '↓'}</Button><Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} />New Item</Button></div></header><div className="entity-list-page__search"><SearchBar value={query} onChange={setQuery} placeholder="Search items..." /></div>{loading ? <div className="entity-list-page__loading">Loading...</div> : sorted.length === 0 ? (query ? <EmptyState icon={Sword} title="No matches" description={`No items matching "${query}"`} /> : <EmptyState icon={Sword} title="No items yet" description="Catalog the weapons, artifacts, and objects of your world." actionLabel="Create Item" onAction={() => setCreateOpen(true)} />) : <div className="entity-list-page__grid">{sorted.map(i => <ItemCard key={i.id} item={i} />)}</div>}<Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Item" size="lg"><ItemForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} submitLabel="Create" /></Modal></div>);
}
