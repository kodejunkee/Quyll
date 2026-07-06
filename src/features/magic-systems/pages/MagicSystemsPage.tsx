import { useState } from 'react';
import { Wand2, Plus, ArrowUpDown } from 'lucide-react';
import { Button, EmptyState, Modal, SearchBar } from '@/components';
import { useMagicSystems } from '../hooks/useMagicSystems';
import { MagicSystemCard } from '../components/MagicSystemCard';
import { MagicSystemForm } from '../components/MagicSystemForm';
import { useSearch, useSort } from '@/hooks';
import type { MagicSystemFormData } from '../types/magicSystem';
import type { MagicSystem } from '@/types/database';
import '../../locations/pages/LocationsPage.css';
export default function MagicSystemsPage() {
  const { items, loading, create } = useMagicSystems(); const [createOpen, setCreateOpen] = useState(false);
  const { query, setQuery, filterItems } = useSearch();
  const { sortKey, sortDirection, setSortKey, toggleDirection, sortItems } = useSort<'name' | 'created_at'>('name');
  const filtered = filterItems(items, m => m.name);
  const sorted = sortItems(filtered, (m: MagicSystem, k) => k === 'name' ? m.name : m.created_at);
  async function handleCreate(d: MagicSystemFormData) { await create(d); setCreateOpen(false); }
  return (<div className="entity-list-page"><header className="entity-list-page__header"><div><h1 className="entity-list-page__title">Magic Systems</h1><p className="entity-list-page__count">{items.length} system{items.length !== 1 ? 's' : ''}</p></div><div className="entity-list-page__actions"><Button variant="ghost" size="sm" onClick={() => { setSortKey(sortKey === 'name' ? 'created_at' : 'name'); toggleDirection(); }}><ArrowUpDown size={14} />{sortKey === 'name' ? 'Name' : 'Date'} {sortDirection === 'asc' ? '↑' : '↓'}</Button><Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} />New Magic System</Button></div></header><div className="entity-list-page__search"><SearchBar value={query} onChange={setQuery} placeholder="Search magic systems..." /></div>{loading ? <div className="entity-list-page__loading">Loading...</div> : sorted.length === 0 ? (query ? <EmptyState icon={Wand2} title="No matches" description={`No magic systems matching "${query}"`} /> : <EmptyState icon={Wand2} title="No magic systems yet" description="Define how magic works in your world." actionLabel="Create Magic System" onAction={() => setCreateOpen(true)} />) : <div className="entity-list-page__grid">{sorted.map(m => <MagicSystemCard key={m.id} magicSystem={m} />)}</div>}<Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Magic System" size="lg"><MagicSystemForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} submitLabel="Create" /></Modal></div>);
}
