import { ScrollText } from 'lucide-react';
import { EmptyState } from '@/components';

export default function LorePage() {
  return (
    <div style={{ padding: 'var(--space-6) var(--space-8)' }}>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text)', marginBottom: 'var(--space-6)' }}>Lore</h1>
      <EmptyState
        icon={ScrollText}
        title="No lore entries yet"
        description="Record the history, myths, legends, and world-building details of your story."
        actionLabel="Create Lore Entry"
        onAction={() => {}}
      />
    </div>
  );
}
