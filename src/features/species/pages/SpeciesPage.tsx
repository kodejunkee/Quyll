import { Dna } from 'lucide-react';
import { EmptyState } from '@/components';

export default function SpeciesPage() {
  return (
    <div style={{ padding: 'var(--space-6) var(--space-8)' }}>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text)', marginBottom: 'var(--space-6)' }}>Species</h1>
      <EmptyState
        icon={Dna}
        title="No species yet"
        description="Define the races and species that inhabit your world. Track their traits, cultures, and abilities."
        actionLabel="Create Species"
        onAction={() => {}}
      />
    </div>
  );
}
