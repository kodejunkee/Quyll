import { useState } from 'react';
import { GitBranch, Plus } from 'lucide-react';
import { Button, EmptyState, Modal, SearchBar } from '@/components';
import { usePlotPoints } from '../hooks/usePlotPoints';
import { PlotPointCard } from '../components/PlotPointCard';
import { PlotPointForm } from '../components/PlotPointForm';
import { PlotFlowchart } from '../components/PlotFlowchart';
import { useSearch } from '@/hooks';
import type { PlotPointFormData } from '../types/plotPoint';
import './PlotPlannerPage.css';

export default function PlotPlannerPage() {
  const { items, loading, create } = usePlotPoints();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'flowchart'>('flowchart');
  const { query, setQuery, filterItems } = useSearch();

  const filtered = filterItems(items, p => `${p.title} ${p.arc} ${p.description}`);
  const sorted = [...filtered].sort((a, b) => a.order_index - b.order_index);

  async function handleCreate(d: PlotPointFormData) {
    // Auto-set order_index to end of list if not specified
    if (d.order_index === 0 && items.length > 0) {
      d.order_index = Math.max(...items.map(p => p.order_index)) + 1;
    }
    await create(d);
    setCreateOpen(false);
  }

  return (
    <div className="plot-page">
      <header className="plot-page__header">
        <div>
          <h1 className="plot-page__title">Plot Planner</h1>
          <p className="plot-page__count">{items.length} plot point{items.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus size={16} />New Plot Point
        </Button>
      </header>

      <div className="plot-page__search">
        <SearchBar value={query} onChange={setQuery} placeholder="Search plot points..." />
        <div className="plot-page__view-toggle">
          <Button 
            variant={viewMode === 'list' ? 'primary' : 'secondary'} 
            onClick={() => setViewMode('list')}
          >
            List
          </Button>
          <Button 
            variant={viewMode === 'flowchart' ? 'primary' : 'secondary'} 
            onClick={() => setViewMode('flowchart')}
          >
            Flowchart
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="plot-page__loading">Loading...</div>
      ) : sorted.length === 0 ? (
        query ? (
          <EmptyState icon={GitBranch} title="No matches" description={`No plot points matching "${query}"`} />
        ) : (
          <EmptyState icon={GitBranch} title="No plot points yet" description="Plan your story beats and track their progress." actionLabel="Create Plot Point" onAction={() => setCreateOpen(true)} />
        )
      ) : (
        viewMode === 'flowchart' ? (
          <PlotFlowchart items={sorted} />
        ) : (
          <div className="plot-page__list">
            {sorted.map(p => (
              <PlotPointCard key={p.id} plotPoint={p} />
            ))}
          </div>
        )
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Plot Point" size="md">
        <PlotPointForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} submitLabel="Create" />
      </Modal>
    </div>
  );
}
