import { type ReactNode, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/Button';
import './Modal.css';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  footer?: ReactNode;
}

function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
}: ModalProps) {
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

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  const handleCancel = useCallback(
    (e: React.SyntheticEvent<HTMLDialogElement>) => {
      e.preventDefault();
      onClose();
    },
    [onClose],
  );

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className={`modal modal--${size}`}
      onClick={handleBackdropClick}
      onCancel={handleCancel}
    >
      <div className="modal__content">
        <header className="modal__header">
          <div className="modal__header-text">
            <h2 className="modal__title">{title}</h2>
            {description && (
              <p className="modal__description">{description}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            icon={<X />}
            onClick={onClose}
            aria-label="Close dialog"
          />
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </dialog>
  );
}

export { Modal };
export type { ModalProps };
