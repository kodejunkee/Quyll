import { useState } from 'react';
import { Bug, Plus, ArrowUpDown, LayoutGrid, Share2 } from 'lucide-react';
import { Button, EmptyState, Modal, SearchBar } from '@/components';
import { useSpecies } from '../hooks/useSpecies';
import { SpeciesCard } from '../components/SpeciesCard';
import { SpeciesForm } from '../components/SpeciesForm';
import { EntityFlowchart } from '@/features/knowledge-graph/components/EntityFlowchart';
import { useSearch, useSort } from '@/hooks';
import type { SpeciesFormData } from '../types/species';
import type { Species } from '@/types/database';
import '../../locations/pages/LocationsPage.css';
export default function SpeciesPage() {
  const { items, loading, create } = useSpecies(); const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'details' | 'flowchart'>('details');
  const { query, setQuery, filterItems } = useSearch();
  const { sortKey, sortDirection, setSortKey, toggleDirection, sortItems } = useSort<'name' | 'created_at'>('name');
  const filtered = filterItems(items, s => `${s.name} ${s.habitat}`);
  const sorted = sortItems(filtered, (s: Species, k) => k === 'name' ? s.name : s.created_at);
  async function handleCreate(d: SpeciesFormData) { await create(d); setCreateOpen(false); }
  return (<div className="entity-list-page"><header className="entity-list-page__header"><div><h1 className="entity-list-page__title">Species</h1><p className="entity-list-page__count">{items.length} species</p></div><div className="entity-list-page__actions">
          {viewMode === 'details' && (
            <Button variant="ghost" size="sm" onClick={() => { setSortKey(sortKey === 'name' ? 'created_at' : 'name'); toggleDirection(); }}><ArrowUpDown size={14} />{sortKey === 'name' ? 'Name' : 'Date'} {sortDirection === 'asc' ? '↑' : '↓'}</Button>
          )}
  <Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} />New Species</Button></div></header>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <div className="entity-list-page__search" style={{ marginBottom: 0, flex: 1, maxWidth: "400px" }}><SearchBar value={query} onChange={setQuery} placeholder="Search species..." /></div>
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '6px' }}>
            <Button variant={viewMode === 'details' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('details')}><LayoutGrid size={14} /> Details</Button>
            <Button variant={viewMode === 'flowchart' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('flowchart')}><Share2 size={14} /> Flowchart</Button>
          </div>
      </div>{loading ? <div className="entity-list-page__loading">Loading...</div> : viewMode === 'flowchart' ? (
        <div style={{ height: 'calc(100vh - 260px)', marginTop: '16px' }}><EntityFlowchart entityType="species" searchQuery={query} /></div>
      ) : sorted.length === 0 ? (query ? <EmptyState icon={Bug} title="No matches" description={`No species matching "${query}"`} /> : <EmptyState icon={Bug} title="No species yet" description="Catalog the races and creatures of your world." actionLabel="Create Species" onAction={() => setCreateOpen(true)} />) : <div className="entity-list-page__grid">{sorted.map(s => <SpeciesCard key={s.id} species={s} />)}</div>}<Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Species" size="lg"><SpeciesForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} submitLabel="Create" /></Modal></div>);
}
