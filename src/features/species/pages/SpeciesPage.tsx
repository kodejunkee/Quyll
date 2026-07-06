import { useState } from 'react';
import { Bug, Plus, ArrowUpDown } from 'lucide-react';
import { Button, EmptyState, Modal, SearchBar } from '@/components';
import { useSpecies } from '../hooks/useSpecies';
import { SpeciesCard } from '../components/SpeciesCard';
import { SpeciesForm } from '../components/SpeciesForm';
import { useSearch, useSort } from '@/hooks';
import type { SpeciesFormData } from '../types/species';
import type { Species } from '@/types/database';
import '../../locations/pages/LocationsPage.css';
export default function SpeciesPage() {
  const { items, loading, create } = useSpecies(); const [createOpen, setCreateOpen] = useState(false);
  const { query, setQuery, filterItems } = useSearch();
  const { sortKey, sortDirection, setSortKey, toggleDirection, sortItems } = useSort<'name' | 'created_at'>('name');
  const filtered = filterItems(items, s => `${s.name} ${s.habitat}`);
  const sorted = sortItems(filtered, (s: Species, k) => k === 'name' ? s.name : s.created_at);
  async function handleCreate(d: SpeciesFormData) { await create(d); setCreateOpen(false); }
  return (<div className="entity-list-page"><header className="entity-list-page__header"><div><h1 className="entity-list-page__title">Species</h1><p className="entity-list-page__count">{items.length} species</p></div><div className="entity-list-page__actions"><Button variant="ghost" size="sm" onClick={() => { setSortKey(sortKey === 'name' ? 'created_at' : 'name'); toggleDirection(); }}><ArrowUpDown size={14} />{sortKey === 'name' ? 'Name' : 'Date'} {sortDirection === 'asc' ? '↑' : '↓'}</Button><Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} />New Species</Button></div></header><div className="entity-list-page__search"><SearchBar value={query} onChange={setQuery} placeholder="Search species..." /></div>{loading ? <div className="entity-list-page__loading">Loading...</div> : sorted.length === 0 ? (query ? <EmptyState icon={Bug} title="No matches" description={`No species matching "${query}"`} /> : <EmptyState icon={Bug} title="No species yet" description="Catalog the races and creatures of your world." actionLabel="Create Species" onAction={() => setCreateOpen(true)} />) : <div className="entity-list-page__grid">{sorted.map(s => <SpeciesCard key={s.id} species={s} />)}</div>}<Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Species" size="lg"><SpeciesForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} submitLabel="Create" /></Modal></div>);
}
