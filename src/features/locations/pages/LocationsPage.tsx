import { useState } from 'react';
import { MapPin, Plus, ArrowUpDown } from 'lucide-react';
import { Button, EmptyState, Modal, SearchBar } from '@/components';
import { useLocations } from '../hooks/useLocations';
import { LocationCard } from '../components/LocationCard';
import { LocationForm } from '../components/LocationForm';
import { useSearch, useSort } from '@/hooks';
import type { LocationFormData } from '../types/location';
import type { Location } from '@/types/database';
import './LocationsPage.css';

export default function LocationsPage() {
  const { items, loading, create } = useLocations();
  const [createOpen, setCreateOpen] = useState(false);
  const { query, setQuery, filterItems } = useSearch();
  const { sortKey, sortDirection, setSortKey, toggleDirection, sortItems } = useSort<'name' | 'created_at'>('name');

  const filtered = filterItems(items, (l) => `${l.name} ${l.type}`);
  const sorted = sortItems(filtered, (l: Location, key) => key === 'name' ? l.name : l.created_at);

  async function handleCreate(data: LocationFormData) { await create(data); setCreateOpen(false); }

  return (
    <div className="entity-list-page">
      <header className="entity-list-page__header">
        <div><h1 className="entity-list-page__title">Locations</h1><p className="entity-list-page__count">{items.length} location{items.length !== 1 ? 's' : ''}</p></div>
        <div className="entity-list-page__actions">
          <Button variant="ghost" size="sm" onClick={() => { setSortKey(sortKey === 'name' ? 'created_at' : 'name'); toggleDirection(); }}><ArrowUpDown size={14} />{sortKey === 'name' ? 'Name' : 'Date'} {sortDirection === 'asc' ? '↑' : '↓'}</Button>
          <Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} />New Location</Button>
        </div>
      </header>
      <div className="entity-list-page__search"><SearchBar value={query} onChange={setQuery} placeholder="Search locations..." /></div>
      {loading ? <div className="entity-list-page__loading">Loading...</div> : sorted.length === 0 ? (
        query ? <EmptyState icon={MapPin} title="No matches" description={`No locations matching "${query}"`} /> :
        <EmptyState icon={MapPin} title="No locations yet" description="Map out the world your story takes place in." actionLabel="Create Location" onAction={() => setCreateOpen(true)} />
      ) : (
        <div className="entity-list-page__grid">{sorted.map(l => <LocationCard key={l.id} location={l} />)}</div>
      )}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Location" size="lg">
        <LocationForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} submitLabel="Create" />
      </Modal>
    </div>
  );
}
