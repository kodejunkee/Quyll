import { useState } from 'react';
import { Users, Plus, ArrowUpDown, LayoutGrid, Share2 } from 'lucide-react';
import { Button, EmptyState, Modal, SearchBar } from '@/components';
import { useCharacters } from '../hooks/useCharacters';
import { CharacterCard } from '../components/CharacterCard';
import { CharacterForm, CharacterFormTabs, type CharacterTab } from '../components/CharacterForm';
import { EntityFlowchart } from '@/features/knowledge-graph/components/EntityFlowchart';
import { useSearch, useSort } from '@/hooks';
import type { CharacterFormData } from '../types/character';
import type { Character } from '@/types/database';
import './CharactersPage.css';

export default function CharactersPage() {
  const { items, loading, create } = useCharacters();
  const [createOpen, setCreateOpen] = useState(false);
  const [createTab, setCreateTab] = useState<CharacterTab>('identity');
  const [viewMode, setViewMode] = useState<'details' | 'flowchart'>('details');
  const { query, setQuery, filterItems } = useSearch();
  const { sortKey, sortDirection, setSortKey, toggleDirection, sortItems } = useSort<'name' | 'created_at'>('name');

  const filtered = filterItems(items, (c) => `${c.name} ${c.aliases} ${c.occupation}`);
  const sorted = sortItems(filtered, (c: Character, key) => {
    if (key === 'name') return c.name;
    return c.created_at;
  });

  async function handleCreate(data: CharacterFormData) {
    await create(data);
    setCreateOpen(false);
  }

  return (
    <div className="characters-page">
      <header className="characters-page__header">
        <div>
          <h1 className="characters-page__title">Characters</h1>
          <p className="characters-page__count">{items.length} character{items.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="characters-page__actions">
          {viewMode === 'details' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSortKey(sortKey === 'name' ? 'created_at' : 'name'); toggleDirection(); }}
            >
              <ArrowUpDown size={14} />
              {sortKey === 'name' ? 'Name' : 'Date'} {sortDirection === 'asc' ? '↑' : '↓'}
            </Button>
          )}
          <Button variant="primary" onClick={() => { setCreateTab('identity'); setCreateOpen(true); }}>
            <Plus size={16} />
            New Character
          </Button>
        </div>
      </header>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <div className="characters-page__search" style={{ marginBottom: 0, flex: 1, maxWidth: "400px" }}>
        <SearchBar value={query} onChange={setQuery} placeholder="Search characters..." />
      </div>
        <div className="app-segmented-control" >
            <Button
              variant={viewMode === 'details' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('details')}
            >
              <LayoutGrid size={14} /> Details
            </Button>
            <Button
              variant={viewMode === 'flowchart' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('flowchart')}
            >
              <Share2 size={14} /> Flowchart
            </Button>
          </div>
      </div>

      {loading ? (
        <div className="characters-page__loading">Loading...</div>
      ) : viewMode === 'flowchart' ? (
        <div style={{ height: 'calc(100vh - 260px)', marginTop: '16px' }}>
          <EntityFlowchart entityType="character" searchQuery={query} />
        </div>
      ) : sorted.length === 0 ? (
        query ? (
          <EmptyState icon={Users} title="No matches" description={`No characters matching "${query}"`} />
        ) : (
          <EmptyState
            icon={Users}
            title="No characters yet"
            description="Build your cast of characters. Track their traits, relationships, and story arcs."
            actionLabel="Create Character"
            onAction={() => { setCreateTab('identity'); setCreateOpen(true); }}
          />
        )
      ) : (
        <div className="characters-page__grid">
          {sorted.map((character) => (
            <CharacterCard key={character.id} character={character} />
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Character"
        description="Add the essential details now. You can enrich this character as your story develops."
        size="lg"
        subHeader={<CharacterFormTabs activeTab={createTab} onTabChange={setCreateTab} />}
      >
        <CharacterForm activeTab={createTab} onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} submitLabel="Create" />
      </Modal>
    </div>
  );
}
