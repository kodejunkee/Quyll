import { GitBranch } from 'lucide-react';
import { EmptyState } from '@/components';

export default function PlotPlannerPage() {
  return (
    <div style={{ padding: 'var(--space-6) var(--space-8)' }}>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text)', marginBottom: 'var(--space-6)' }}>Plot Planner</h1>
      <EmptyState
        icon={GitBranch}
        title="No plot points yet"
        description="Plan your story arcs, track plot points, and organize your narrative structure."
        actionLabel="Create Plot Point"
        onAction={() => {}}
      />
    </div>
  );
}
