import { MapPin } from 'lucide-react';
import { EmptyState } from '@/components';

export default function LocationsPage() {
  return (
    <div style={{ padding: 'var(--space-6) var(--space-8)' }}>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text)', marginBottom: 'var(--space-6)' }}>Locations</h1>
      <EmptyState
        icon={MapPin}
        title="No locations yet"
        description="Map out the places in your world. From cities to dungeons, track every setting."
        actionLabel="Create Location"
        onAction={() => {}}
      />
    </div>
  );
}
