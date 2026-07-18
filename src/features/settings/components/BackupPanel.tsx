import { useState, useEffect } from 'react';
import { Button, Card, Dialog, Input, Dropdown } from '@/components';
import { useBackup } from '../hooks/useBackup';
import { useSettings } from '../hooks/useSettings';
import { HardDrive, Download, Trash2, Clock, Loader2, RotateCcw } from 'lucide-react';
import './BackupPanel.css';

const SCHEDULED_OPTIONS = [
  { label: 'Off', value: '0' },
  { label: 'Every 15 minutes', value: '15' },
  { label: 'Every 30 minutes', value: '30' },
  { label: 'Every hour', value: '60' },
  { label: 'Every 2 hours', value: '120' },
  { label: 'Every 4 hours', value: '240' },
];

export function BackupPanel() {
  const {
    backups,
    loading,
    isCreating,
    isRestoring,
    createBackup,
    restoreBackup,
    deleteBackup,
    exportBackup,
    refreshBackups,
  } = useBackup();

  const { settings, updateSettings } = useSettings();

  const [label, setLabel] = useState('');
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackupId, setSelectedBackupId] = useState<string>('');

  useEffect(() => {
    void refreshBackups();
  }, [refreshBackups]);

  const handleCreateBackup = () => {
    void createBackup(label);
    setLabel('');
  };

  const handleConfirmRestore = () => {
    if (selectedBackupId) {
      void restoreBackup(selectedBackupId);
    }
    setRestoreDialogOpen(false);
  };

  const currentInterval = String(settings?.backup_interval ?? 0);

  const formatTimestamp = (ts: string): string => {
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return d.toLocaleString();
    } catch {
      return ts;
    }
  };

  return (
    <Card title="Backup & Recovery" className="backup-panel">
      {/* Manual Backup Section */}
      <div className="backup-panel__section">
        <h4 className="backup-panel__section-title">Manual Backup</h4>
        <div className="backup-panel__manual">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Optional label..."
            disabled={isCreating || isRestoring}
          />
          <Button
            variant="primary"
            onClick={handleCreateBackup}
            disabled={isCreating || isRestoring}
            loading={isCreating}
            icon={!isCreating ? <HardDrive size={16} /> : undefined}
          >
            {isCreating ? 'Creating...' : 'Create Backup'}
          </Button>
        </div>
      </div>

      {/* Scheduled Backup Section */}
      <div className="backup-panel__section">
        <h4 className="backup-panel__section-title">Scheduled Backup</h4>
        <div style={{ width: 220 }}>
          <Dropdown
            options={SCHEDULED_OPTIONS}
            value={currentInterval}
            onChange={(val) => {
              void updateSettings({ backup_interval: Number(val) });
            }}
            disabled={isCreating || isRestoring}
          />
        </div>
      </div>

      {/* Backup List Section */}
      <div className="backup-panel__section">
        <h4 className="backup-panel__section-title">Available Backups</h4>
        <div className="backup-panel__list">
          {loading ? (
            <div className="backup-panel__empty">
              <Loader2 className="backup-panel__spinner" size={20} />
              <span>Loading backups...</span>
            </div>
          ) : backups.length === 0 ? (
            <div className="backup-panel__empty">No backups created yet.</div>
          ) : (
            backups.map((backup) => (
              <div key={backup.id} className="backup-panel__item">
                <div className="backup-panel__item-info">
                  <Clock size={16} />
                  <span>{formatTimestamp(backup.timestamp)}</span>
                  {backup.label && (
                    <span className="backup-panel__label">{backup.label}</span>
                  )}
                </div>
                <div className="backup-panel__item-actions">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<RotateCcw size={14} />}
                    onClick={() => {
                      setSelectedBackupId(backup.id);
                      setRestoreDialogOpen(true);
                    }}
                    disabled={isRestoring || isCreating}
                  >
                    Restore
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Download size={14} />}
                    onClick={() => void exportBackup(backup.id)}
                    disabled={isRestoring || isCreating}
                    title="Export backup"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 size={14} />}
                    onClick={() => void deleteBackup(backup.id)}
                    disabled={isRestoring || isCreating}
                    title="Delete backup"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog
        open={restoreDialogOpen}
        onClose={() => setRestoreDialogOpen(false)}
        title="Confirm Restore"
        description="Are you sure you want to restore this backup? A pre-restore safety backup will be created, and then the workspace will reload."
        confirmLabel="Restore"
        variant="danger"
        onConfirm={handleConfirmRestore}
      />
    </Card>
  );
}
