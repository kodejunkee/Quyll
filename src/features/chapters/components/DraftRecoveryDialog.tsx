import { Dialog } from '@/components';

interface DraftRecoveryDialogProps {
  open: boolean;
  onRestore: () => void;
  onDiscard: () => void;
}

export function DraftRecoveryDialog({ open, onRestore, onDiscard }: DraftRecoveryDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onDiscard}
      title="Unsaved Draft Found"
      description="A previously unsaved draft was found for this chapter. Would you like to restore it, or discard it and use the last saved version?"
      confirmLabel="Restore Draft"
      onConfirm={onRestore}
    />
  );
}
