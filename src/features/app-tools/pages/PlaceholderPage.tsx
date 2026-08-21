import { Coffee } from 'lucide-react';
import { GearIcon, DownloadIcon, TrashIcon, ReloadIcon, InfoCircledIcon } from '@radix-ui/react-icons';

interface PlaceholderProps {
  title: string;
  icon: 'settings' | 'download' | 'trash' | 'updates' | 'about' | 'support';
}

const iconMap = {
  settings: GearIcon,
  download: DownloadIcon,
  trash: TrashIcon,
  updates: ReloadIcon,
  about: InfoCircledIcon,
  support: Coffee,
};

export function PlaceholderPage({ title, icon }: PlaceholderProps) {
  const Icon = iconMap[icon];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      height: '100%',
      color: '#64748B',
      gap: '16px',
      padding: 'var(--space-6) var(--space-8)',
      boxSizing: 'border-box'
    }}>
      <Icon size={48} style={{ opacity: 0.5 }} />
      <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#E2E8F0' }}>{title}</h2>
      <p style={{ fontSize: '14px' }}>This page is coming soon.</p>
    </div>
  );
}
