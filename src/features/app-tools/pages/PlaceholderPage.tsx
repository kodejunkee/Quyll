import React from 'react';
import { Settings, Download, Trash2, RefreshCw, Info, HelpCircle } from 'lucide-react';

interface PlaceholderProps {
  title: string;
  icon: 'settings' | 'download' | 'trash' | 'updates' | 'about' | 'support';
}

const iconMap = {
  settings: Settings,
  download: Download,
  trash: Trash2,
  updates: RefreshCw,
  about: Info,
  support: HelpCircle,
};

export function PlaceholderPage({ title, icon }: PlaceholderProps) {
  const Icon = iconMap[icon];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: '#64748B',
      gap: '16px'
    }}>
      <Icon size={48} style={{ opacity: 0.5 }} />
      <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#E2E8F0' }}>{title}</h2>
      <p style={{ fontSize: '14px' }}>This page is coming soon.</p>
    </div>
  );
}
