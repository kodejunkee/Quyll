import { useState } from 'react';
import { ScrollText, Plus, ArrowUpDown } from 'lucide-react';
import { Button, EmptyState, Modal, SearchBar } from '@/components';
import { useLore } from '../hooks/useLore';
import { LoreCard } from '../components/LoreCard';
import { LoreForm } from '../components/LoreForm';
import { useSearch, useSort } from '@/hooks';
import type { LoreFormData } from '../types/lore';
import type { LoreEntry } from '@/types/database';
import '../../locations/pages/LocationsPage.css';
export default function LorePage() {
  const { items, loading, create } = useLore(); const [createOpen, setCreateOpen] = useState(false);
  const { query, setQuery, filterItems } = useSearch();
  const { sortKey, sortDirection, setSortKey, toggleDirection, sortItems } = useSort<'title' | 'created_at'>('title');
  const filtered = filterItems(items, l => `${l.title} ${l.category} ${l.content}`);
  const sorted = sortItems(filtered, (l: LoreEntry, k) => k === 'title' ? l.title : l.created_at);
  async function handleCreate(d: LoreFormData) { await create(d); setCreateOpen(false); }
  return (<div className="entity-list-page"><header className="entity-list-page__header"><div><h1 className="entity-list-page__title">Lore</h1><p className="entity-list-page__count">{items.length} entr{items.length !== 1 ? 'ies' : 'y'}</p></div><div className="entity-list-page__actions"><Button variant="ghost" size="sm" onClick={() => { setSortKey(sortKey === 'title' ? 'created_at' : 'title'); toggleDirection(); }}><ArrowUpDown size={14} />{sortKey === 'title' ? 'Title' : 'Date'} {sortDirection === 'asc' ? '↑' : '↓'}</Button><Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} />New Lore Entry</Button></div></header><div className="entity-list-page__search"><SearchBar value={query} onChange={setQuery} placeholder="Search lore..." /></div>{loading ? <div className="entity-list-page__loading">Loading...</div> : sorted.length === 0 ? (query ? <EmptyState icon={ScrollText} title="No matches" description={`No lore matching "${query}"`} /> : <EmptyState icon={ScrollText} title="No lore yet" description="Document the myths, histories, and legends of your world." actionLabel="Create Lore Entry" onAction={() => setCreateOpen(true)} />) : <div className="entity-list-page__grid">{sorted.map(l => <LoreCard key={l.id} lore={l} />)}</div>}<Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Lore Entry" size="lg"><LoreForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} submitLabel="Create" /></Modal></div>);
}
