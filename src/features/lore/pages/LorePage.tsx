import { useState } from 'react';
import { PlusIcon, CaretSortIcon, GridIcon } from '@radix-ui/react-icons';
import { ScrollText, Share2 } from 'lucide-react';
import { Button, EmptyState, Modal, SearchBar } from '@/components';
import { useLore } from '../hooks/useLore';
import { LoreCard } from '../components/LoreCard';
import { LoreForm } from '../components/LoreForm';
import { EntityFlowchart } from '@/features/knowledge-graph/components/EntityFlowchart';
import { useSearch, useSort } from '@/hooks';
import type { LoreFormData } from '../types/lore';
import type { LoreEntry } from '@/types/database';
import '../../locations/pages/LocationsPage.css';
export default function LorePage() {
  const { items, isLoading: loading, create } = useLore(); const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'details' | 'flowchart'>('details');
  const { query, setQuery, filterItems } = useSearch();
  const { sortKey, sortDirection, setSortKey, toggleDirection, sortItems } = useSort<'title' | 'created_at'>('title');
  const filtered = filterItems(items, l => `${l.title} ${l.category} ${l.content}`);
  const sorted = sortItems(filtered, (l: LoreEntry, k) => k === 'title' ? l.title : l.created_at);
  async function handleCreate(d: LoreFormData) { await create({ ...d, keyword_enabled: d.keyword_enabled ? 1 : 0 }); setCreateOpen(false); }
  return (<div className="entity-list-page"><header className="entity-list-page__header"><div><h1 className="entity-list-page__title">Lore</h1><p className="entity-list-page__count">{items.length} entr{items.length !== 1 ? 'ies' : 'y'}</p></div><div className="entity-list-page__actions">
          {viewMode === 'details' && (
            <Button variant="ghost" size="sm" onClick={() => { setSortKey(sortKey === 'title' ? 'created_at' : 'title'); toggleDirection(); }}><CaretSortIcon width={14} height={14} />{sortKey === 'title' ? 'Title' : 'Date'} {sortDirection === 'asc' ? '↑' : '↓'}</Button>
          )}
  <Button variant="primary" onClick={() => setCreateOpen(true)}><PlusIcon width={16} height={16} />New Lore Entry</Button></div></header>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <div className="entity-list-page__search" style={{ marginBottom: 0, flex: 1, maxWidth: "400px" }}><SearchBar value={query} onChange={setQuery} placeholder="Search lore..." /></div>
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '6px' }}>
            <Button variant={viewMode === 'details' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('details')}><GridIcon width={14} height={14} /> Details</Button>
            <Button variant={viewMode === 'flowchart' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('flowchart')}><Share2 size={14} /> Flowchart</Button>
          </div>
      </div>{loading ? <div className="entity-list-page__loading">Loading...</div> : viewMode === 'flowchart' ? (
        <div style={{ height: 'calc(100vh - 260px)', marginTop: '16px' }}><EntityFlowchart entityType="lore" searchQuery={query} /></div>
      ) : sorted.length === 0 ? (query ? <EmptyState icon={ScrollText} title="No matches" description={`No lore matching "${query}"`} /> : <EmptyState icon={ScrollText} title="No lore yet" description="Document the myths, histories, and legends of your world." actionLabel="Create Lore Entry" onAction={() => setCreateOpen(true)} />) : <div className="entity-list-page__grid">{sorted.map(l => <LoreCard key={l.id} lore={l} />)}</div>}<Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Lore Entry" size="lg"><LoreForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} submitLabel="Create" /></Modal></div>);
}
