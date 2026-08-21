import { useState } from 'react';
import { PlusIcon, CaretSortIcon, GridIcon } from '@radix-ui/react-icons';
import { Building2, Share2 } from 'lucide-react';
import { Button, EmptyState, Modal, SearchBar } from '@/components';
import { useOrganizations } from '../hooks/useOrganizations';
import { OrganizationCard } from '../components/OrganizationCard';
import { OrganizationForm } from '../components/OrganizationForm';
import { EntityFlowchart } from '@/features/knowledge-graph/components/EntityFlowchart';
import { useSearch, useSort } from '@/hooks';
import type { OrganizationFormData } from '../types/organization';
import type { Organization } from '@/types/database';
import '../../../features/locations/pages/LocationsPage.css';

export default function OrganizationsPage() {
  const { items, loading, create } = useOrganizations();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'details' | 'flowchart'>('details');
  const { query, setQuery, filterItems } = useSearch();
  const { sortKey, sortDirection, setSortKey, toggleDirection, sortItems } = useSort<'name' | 'created_at'>('name');
  const filtered = filterItems(items, o => `${o.name} ${o.type} ${o.leader}`);
  const sorted = sortItems(filtered, (o: Organization, key) => key === 'name' ? o.name : o.created_at);
  async function handleCreate(data: OrganizationFormData) { await create(data); setCreateOpen(false); }
  return (
    <div className="entity-list-page">
      <header className="entity-list-page__header">
        <div><h1 className="entity-list-page__title">Organizations</h1><p className="entity-list-page__count">{items.length} organization{items.length !== 1 ? 's' : ''}</p></div>
        <div className="entity-list-page__actions">
          {viewMode === 'details' && (
            <Button variant="ghost" size="sm" onClick={() => { setSortKey(sortKey === 'name' ? 'created_at' : 'name'); toggleDirection(); }}><CaretSortIcon width={14} height={14} />{sortKey === 'name' ? 'Name' : 'Date'} {sortDirection === 'asc' ? '↑' : '↓'}</Button>
          )}
          <Button variant="primary" onClick={() => setCreateOpen(true)}><PlusIcon width={16} height={16} />New Organization</Button>
        </div>
      </header>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <div className="entity-list-page__search" style={{ marginBottom: 0, flex: 1, maxWidth: "400px" }}><SearchBar value={query} onChange={setQuery} placeholder="Search organizations..." /></div>
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '6px' }}>
            <Button variant={viewMode === 'details' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('details')}><GridIcon width={14} height={14} /> Details</Button>
            <Button variant={viewMode === 'flowchart' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('flowchart')}><Share2 size={14} /> Flowchart</Button>
          </div>
      </div>
      {loading ? <div className="entity-list-page__loading">Loading...</div> : viewMode === 'flowchart' ? (
        <div style={{ height: 'calc(100vh - 260px)', marginTop: '16px' }}><EntityFlowchart entityType="organization" searchQuery={query} /></div>
      ) : sorted.length === 0 ? (
        query ? <EmptyState icon={Building2} title="No matches" description={`No organizations matching "${query}"`} /> :
        <EmptyState icon={Building2} title="No organizations yet" description="Define the factions, guilds, and powers in your world." actionLabel="Create Organization" onAction={() => setCreateOpen(true)} />
      ) : <div className="entity-list-page__grid">{sorted.map(o => <OrganizationCard key={o.id} organization={o} />)}</div>}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Organization" size="lg"><OrganizationForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} submitLabel="Create" /></Modal>
    </div>
  );
}
