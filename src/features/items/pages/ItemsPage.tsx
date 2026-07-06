import { Package } from 'lucide-react';
import { EmptyState } from '@/components';

export default function ItemsPage() {
  return (
    <div style={{ padding: 'var(--space-6) var(--space-8)' }}>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text)', marginBottom: 'var(--space-6)' }}>Items</h1>
      <EmptyState
        icon={Package}
        title="No items yet"
        description="Track important artifacts, weapons, and objects in your story."
        actionLabel="Create Item"
        onAction={() => {}}
      />
    </div>
  );
}
