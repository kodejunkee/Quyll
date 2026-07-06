import { useCallback, useEffect, useRef } from 'react';
import { Button } from '../Button';
import './Dialog.css';

type DialogVariant = 'default' | 'danger';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  variant?: DialogVariant;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  variant = 'default',
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handleCancel = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      onClose();
    },
    [onClose],
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) {
        onClose();
      }
    },
    [onClose],
  );

  const handleConfirm = useCallback(() => {
    onConfirm?.();
    onClose();
  }, [onConfirm, onClose]);

  return (
    <dialog
      ref={dialogRef}
      className={`dialog dialog--${variant}`}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      aria-labelledby="dialog-title"
      aria-describedby={description ? 'dialog-description' : undefined}
    >
      <div className="dialog__content" onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog__title" id="dialog-title">
          {title}
        </h2>

        {description && (
          <p className="dialog__description" id="dialog-description">
            {description}
          </p>
        )}

        <div className="dialog__actions">
          <Button variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
