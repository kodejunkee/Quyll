import { Sparkles } from 'lucide-react';
import { EmptyState } from '@/components';

export default function MagicSystemsPage() {
  return (
    <div style={{ padding: 'var(--space-6) var(--space-8)' }}>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text)', marginBottom: 'var(--space-6)' }}>Magic Systems</h1>
      <EmptyState
        icon={Sparkles}
        title="No magic systems yet"
        description="Define the rules, limitations, and energy sources of magic in your world."
        actionLabel="Create Magic System"
        onAction={() => {}}
      />
    </div>
  );
}
