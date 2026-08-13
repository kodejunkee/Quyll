import { useState } from 'react';
import { Route as RouteIcon, Plus, ArrowUpDown, LayoutGrid, Share2 } from 'lucide-react';
import { Button, EmptyState, Modal, SearchBar } from '@/components';
import { usePlotPoints } from '../hooks/usePlotPoints';
import { PlotPointCard } from '../components/PlotPointCard';
import { PlotPointForm } from '../components/PlotPointForm';
import { PlotFlowchart } from '../components/PlotFlowchart';
import { PlotDetailPanel } from '../components/PlotDetailPanel';
import { useSearch, useSort } from '@/hooks';
import type { PlotPointFormData } from '../types/plotPoint';
import type { PlotPoint } from '@/types/database';

export default function PlotPlannerPage() {
  const { items, isLoading, create } = usePlotPoints();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'details' | 'flowchart'>('flowchart');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  const { query, setQuery, filterItems } = useSearch();
  const { sortKey, sortDirection, setSortKey, toggleDirection, sortItems } = useSort<'title' | 'created_at'>('title');

  const filtered = filterItems(items, (p) => `${p.title} ${p.description} ${p.status}`);
  const sorted = sortItems(filtered, (p: PlotPoint, key) => {
    if (key === 'title') return p.title;
    return p.created_at;
  });

  async function handleCreate(data: PlotPointFormData) {
    await create({
      title: data.title,
      description: data.description,
      status: 'Idea',
      arc: '',
      notes: data.notes,
      group_id: null,
      position_x: 0,
      position_y: 0,
    });
    setCreateOpen(false);
  }

  return (
    <div className="characters-page">
      <header className="characters-page__header">
        <div>
          <h1 className="characters-page__title">Plot Planner</h1>
          <p className="characters-page__count">{items.length} plot point{items.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="characters-page__actions">
          {viewMode === 'details' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSortKey(sortKey === 'title' ? 'created_at' : 'title'); toggleDirection(); }}
            >
              <ArrowUpDown size={14} />
              {sortKey === 'title' ? 'Title' : 'Date'} {sortDirection === 'asc' ? '↑' : '↓'}
            </Button>
          )}
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            New Plot Point
          </Button>
        </div>
      </header>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <div className="characters-page__search" style={{ marginBottom: 0, flex: 1, maxWidth: "400px" }}>
          <SearchBar value={query} onChange={setQuery} placeholder="Search plot points..." />
        </div>
        <div className="app-segmented-control">
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

      {isLoading ? (
        <div className="characters-page__loading" style={{display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center'}}>Loading...</div>
      ) : viewMode === 'flowchart' ? (
        <div style={{ height: 'calc(100vh - 260px)', marginTop: '16px', position: 'relative', display: 'flex' }}>
          <PlotFlowchart onNodeSelect={setSelectedNodeId} />
          {selectedNodeId && (
            <PlotDetailPanel plotPointId={selectedNodeId} onClose={() => setSelectedNodeId(null)} />
          )}
        </div>
      ) : sorted.length === 0 ? (
        query ? (
          <EmptyState icon={RouteIcon} title="No matches" description={`No plot points matching "${query}"`} />
        ) : (
          <EmptyState
            icon={RouteIcon}
            title="No plot points yet"
            description="Start outlining your story."
            actionLabel="Create Plot Point"
            onAction={() => setCreateOpen(true)}
          />
        )
      ) : (
        <div className="characters-page__grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-md)' }}>
          {sorted.map((point) => (
            <PlotPointCard key={point.id} plotPoint={point} />
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Plot Point"
        description="Add a new beat to your story outline."
      >
        <PlotPointForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} submitLabel="Create" />
      </Modal>

      <style>{`
        /* Plot Flowchart */
        .plot-flowchart__wrapper { flex: 1; width: 100%; height: 100%; position: relative; display: flex; flex-direction: column; }
        .plot-flowchart__wrapper .react-flow { flex: 1; width: 100%; height: 100%; }
        .react-flow__edge-path { stroke: var(--color-accent) !important; stroke-width: 2 !important; }
        .react-flow__edge.selected .react-flow__edge-path { stroke: var(--color-accent-hover) !important; stroke-width: 3 !important; }
        .react-flow__node { will-change: transform; }

        /* Plot Toolbar */
        .plot-toolbar { position: absolute; top: var(--spacing-md); left: var(--spacing-md); right: var(--spacing-md); display: flex; justify-content: space-between; align-items: center; z-index: 10; pointer-events: none; }
        .plot-toolbar__left, .plot-toolbar__right { display: flex; gap: var(--spacing-sm); align-items: center; pointer-events: auto; background: var(--color-bg-surface); padding: var(--spacing-xs); border-radius: var(--radius-md); box-shadow: var(--shadow-sm); border: 1px solid var(--color-border); }
        .plot-toolbar__right { padding: var(--spacing-sm) var(--spacing-md); background: var(--glass-bg); backdrop-filter: blur(4px); }

        /* Plot Detail Panel */
        .plot-detail-panel { width: 350px; background-color: var(--color-bg-surface); border-left: 1px solid var(--color-border); display: flex; flex-direction: column; height: 100%; box-shadow: -4px 0 15px rgba(0, 0, 0, 0.05); animation: slideInRight var(--transition-normal); z-index: 10; }
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .plot-detail-panel__header { padding: var(--spacing-md); border-bottom: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center; }
        .plot-detail-panel__header h2 { font-size: var(--font-size-md); font-weight: 600; margin: 0; }
        .plot-detail-panel__content { padding: var(--spacing-md); flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: var(--spacing-md); }
        .plot-detail-panel__footer { padding: var(--spacing-md); border-top: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center; background-color: var(--color-bg-hover); }
        .plot-detail-panel__new-group { display: flex; gap: var(--spacing-xs); align-items: center; margin-top: var(--spacing-xs); }
        .plot-detail-panel__new-group input[type="text"] { flex: 1; }
        .plot-detail-panel__new-group input[type="color"] { width: 30px; height: 30px; padding: 0; border: none; border-radius: var(--radius-sm); cursor: pointer; }
      `}</style>
    </div>
  );
}
