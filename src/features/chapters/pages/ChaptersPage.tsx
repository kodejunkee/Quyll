import { BookOpen } from 'lucide-react';
import { EmptyState } from '@/components';

export default function ChaptersPage() {
  return (
    <div style={{ padding: 'var(--space-6) var(--space-8)' }}>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text)', marginBottom: 'var(--space-6)' }}>Chapters</h1>
      <EmptyState
        icon={BookOpen}
        title="No chapters yet"
        description="Chapters are the heart of your manuscript. Create your first chapter to start writing."
        actionLabel="Create Chapter"
        onAction={() => {}}
      />
    </div>
  );
}
