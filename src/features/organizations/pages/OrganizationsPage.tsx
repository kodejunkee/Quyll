import { Building2 } from 'lucide-react';
import { EmptyState } from '@/components';

export default function OrganizationsPage() {
  return (
    <div style={{ padding: 'var(--space-6) var(--space-8)' }}>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text)', marginBottom: 'var(--space-6)' }}>Organizations</h1>
      <EmptyState
        icon={Building2}
        title="No organizations yet"
        description="Create guilds, kingdoms, armies, religions, and any other groups in your world."
        actionLabel="Create Organization"
        onAction={() => {}}
      />
    </div>
  );
}
