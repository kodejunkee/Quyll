import { useState } from 'react';
import { GlobeIcon, PlusIcon, CaretSortIcon, GridIcon } from '@radix-ui/react-icons';
import { Share2 } from 'lucide-react';
import { Button, EmptyState, Modal, SearchBar } from '@/components';
import { useWorldSystems } from '../hooks/useWorldSystems';
import { WorldSystemCard } from '../components/WorldSystemCard';
import { WorldSystemForm } from '../components/WorldSystemForm';
import { EntityFlowchart } from '@/features/knowledge-graph/components/EntityFlowchart';
import { useSearch, useSort } from '@/hooks';
import type { WorldSystemFormData } from '../types/worldSystem';
import type { WorldSystem } from '@/types/database';
import '../../locations/pages/LocationsPage.css';

export default function WorldSystemsPage() {
  const { items, loading, create } = useWorldSystems(); const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'details' | 'flowchart'>('details');
  const { query, setQuery, filterItems } = useSearch();
  const { sortKey, sortDirection, setSortKey, toggleDirection, sortItems } = useSort<'name' | 'created_at'>('name');
  const filtered = filterItems(items, m => m.name);
  const sorted = sortItems(filtered, (m: WorldSystem, k) => k === 'name' ? m.name : m.created_at);
  async function handleCreate(d: WorldSystemFormData) { await create(d); setCreateOpen(false); }
  return (<div className="entity-list-page"><header className="entity-list-page__header"><div><h1 className="entity-list-page__title">World Systems</h1><p className="entity-list-page__count">{items.length} system{items.length !== 1 ? 's' : ''}</p></div><div className="entity-list-page__actions">
          {viewMode === 'details' && (
            <Button variant="ghost" size="sm" onClick={() => { setSortKey(sortKey === 'name' ? 'created_at' : 'name'); toggleDirection(); }}><CaretSortIcon width={14} height={14} />{sortKey === 'name' ? 'Name' : 'Date'} {sortDirection === 'asc' ? '↑' : '↓'}</Button>
          )}
  <Button variant="primary" onClick={() => setCreateOpen(true)}><PlusIcon width={16} height={16} />New World System</Button></div></header>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <div className="entity-list-page__search" style={{ marginBottom: 0, flex: 1, maxWidth: "400px" }}><SearchBar value={query} onChange={setQuery} placeholder="Search world systems..." /></div>
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '6px' }}>
            <Button variant={viewMode === 'details' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('details')}><GridIcon width={14} height={14} /> Details</Button>
            <Button variant={viewMode === 'flowchart' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('flowchart')}><Share2 size={14} /> Flowchart</Button>
          </div>
      </div>{loading ? <div className="entity-list-page__loading">Loading...</div> : viewMode === 'flowchart' ? (
        <div style={{ height: 'calc(100vh - 260px)', marginTop: '16px' }}><EntityFlowchart entityType="world_system" searchQuery={query} /></div>
      ) : sorted.length === 0 ? (query ? <EmptyState icon={GlobeIcon} title="No matches" description={`No world systems matching "${query}"`} /> : <EmptyState icon={GlobeIcon} title="No world systems yet" description="Establish the core rules, magic structures, power systems, or natural laws that govern your world." actionLabel="Create World System" onAction={() => setCreateOpen(true)} />) : <div className="entity-list-page__grid">{sorted.map(m => <WorldSystemCard key={m.id} worldSystem={m} />)}</div>}<Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create World System" size="lg"><WorldSystemForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} submitLabel="Create" /></Modal></div>);
}
