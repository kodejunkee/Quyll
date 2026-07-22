import { useState } from 'react';
import { Globe, Plus, ArrowUpDown } from 'lucide-react';
import { Button, EmptyState, Modal, SearchBar } from '@/components';
import { useWorldSystems } from '../hooks/useWorldSystems';
import { WorldSystemCard } from '../components/WorldSystemCard';
import { WorldSystemForm } from '../components/WorldSystemForm';
import { useSearch, useSort } from '@/hooks';
import type { WorldSystemFormData } from '../types/worldSystem';
import type { WorldSystem } from '@/types/database';
import '../../locations/pages/LocationsPage.css';

export default function WorldSystemsPage() {
  const { items, loading, create } = useWorldSystems(); const [createOpen, setCreateOpen] = useState(false);
  const { query, setQuery, filterItems } = useSearch();
  const { sortKey, sortDirection, setSortKey, toggleDirection, sortItems } = useSort<'name' | 'created_at'>('name');
  const filtered = filterItems(items, m => m.name);
  const sorted = sortItems(filtered, (m: WorldSystem, k) => k === 'name' ? m.name : m.created_at);
  async function handleCreate(d: WorldSystemFormData) { await create(d); setCreateOpen(false); }
  return (<div className="entity-list-page"><header className="entity-list-page__header"><div><h1 className="entity-list-page__title">World Systems</h1><p className="entity-list-page__count">{items.length} system{items.length !== 1 ? 's' : ''}</p></div><div className="entity-list-page__actions"><Button variant="ghost" size="sm" onClick={() => { setSortKey(sortKey === 'name' ? 'created_at' : 'name'); toggleDirection(); }}><ArrowUpDown size={14} />{sortKey === 'name' ? 'Name' : 'Date'} {sortDirection === 'asc' ? '↑' : '↓'}</Button><Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} />New World System</Button></div></header><div className="entity-list-page__search"><SearchBar value={query} onChange={setQuery} placeholder="Search world systems..." /></div>{loading ? <div className="entity-list-page__loading">Loading...</div> : sorted.length === 0 ? (query ? <EmptyState icon={Globe} title="No matches" description={`No world systems matching "${query}"`} /> : <EmptyState icon={Globe} title="No world systems yet" description="Establish the core rules, magic structures, power systems, or natural laws that govern your world." actionLabel="Create World System" onAction={() => setCreateOpen(true)} />) : <div className="entity-list-page__grid">{sorted.map(m => <WorldSystemCard key={m.id} worldSystem={m} />)}</div>}<Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create World System" size="lg"><WorldSystemForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} submitLabel="Create" /></Modal></div>);
}
