import { Clock } from 'lucide-react';
import { EmptyState } from '@/components';

export default function TimelinePage() {
  return (
    <div style={{ padding: 'var(--space-6) var(--space-8)' }}>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text)', marginBottom: 'var(--space-6)' }}>Timeline</h1>
      <EmptyState
        icon={Clock}
        title="No timeline events yet"
        description="Build a chronological history of important events in your story world."
        actionLabel="Create Event"
        onAction={() => {}}
      />
    </div>
  );
}
