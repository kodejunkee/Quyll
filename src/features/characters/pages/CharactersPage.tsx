import { Users } from 'lucide-react';
import { EmptyState } from '@/components';

export default function CharactersPage() {
  return (
    <div style={{ padding: 'var(--space-6) var(--space-8)' }}>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text)', marginBottom: 'var(--space-6)' }}>Characters</h1>
      <EmptyState
        icon={Users}
        title="No characters yet"
        description="Build your cast of characters. Track their traits, relationships, and story arcs."
        actionLabel="Create Character"
        onAction={() => {}}
      />
    </div>
  );
}
