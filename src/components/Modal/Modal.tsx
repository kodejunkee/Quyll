import { type ReactNode, useEffect, useRef, useCallback, useState } from 'react';
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
  draggable?: boolean;
}

function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  draggable = false,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
    if (!open) {
      setPosition({ x: 0, y: 0 });
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

  const handleHeaderMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!draggable) return;
      if ((e.target as HTMLElement).closest('button')) return;

      isDraggingRef.current = true;
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isDraggingRef.current) return;
        setPosition({
          x: moveEvent.clientX - dragStartRef.current.x,
          y: moveEvent.clientY - dragStartRef.current.y,
        });
      };

      const handleMouseUp = () => {
        isDraggingRef.current = false;
        setIsDragging(false);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [draggable, position],
  );

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className={`modal modal--${size} ${draggable ? 'modal--draggable' : ''}`}
      onClick={handleBackdropClick}
      onCancel={handleCancel}
      style={draggable ? { transform: `translate(${position.x}px, ${position.y}px)` } : undefined}
    >
      <div className="modal__content">
        <header
          className="modal__header"
          onMouseDown={handleHeaderMouseDown}
          style={draggable ? { cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' } : undefined}
          title={draggable ? 'Click and drag to move modal' : undefined}
        >
          <div className="modal__header-text">
            <h2 className="modal__title">{title}</h2>
            {description && (
              <p className="modal__description">{description}</p>
            )}
          </div>
          <Button
            variant="ghost"
            onClick={onClose}
            aria-label="Close dialog"
            className="modal__close-btn"
            style={{ width: '40px', height: '40px', padding: 0, borderRadius: '50%' }}
            icon={<X size={25} />}
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
