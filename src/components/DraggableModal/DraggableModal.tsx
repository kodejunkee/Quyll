import { useEffect, useRef, useState } from 'react';
import { X, Minus } from 'lucide-react';
import './DraggableModal.css';

interface DraggableModalProps {
  title: React.ReactNode;
  onClose: () => void;
  onMinimize?: (x: number, y: number) => void;
  children: React.ReactNode;
  initialX?: number;
  initialY?: number;
  width?: string;
  maxHeight?: string;
}

export function DraggableModal({
  title,
  onClose,
  onMinimize,
  children,
  initialX,
  initialY,
  width,
  maxHeight,
}: DraggableModalProps) {
  const [position, setPosition] = useState({ 
    x: initialX ?? Math.max(20, window.innerWidth / 2 - (width ? parseInt(width, 10) / 2 : 200)), 
    y: initialY ?? Math.max(20, window.innerHeight / 2 - 340) 
  });

  // Update position if opened from a new location (e.g. clicking a different bubble)
  useEffect(() => {
    if (initialX !== undefined && initialY !== undefined) {
      setPosition({ x: initialX, y: initialY });
    }
  }, [initialX, initialY]);

  const dragRef = useRef<{ startX: number; startY: number; initPosX: number; initPosY: number } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag on left click
    if (e.button !== 0) return;
    
    // Prevent dragging if clicking a button
    if ((e.target as HTMLElement).closest('.draggable-modal__btn')) return;

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initPosX: position.x,
      initPosY: position.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const { startX, startY, initPosX, initPosY } = dragRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    setPosition({ x: initPosX + dx, y: initPosY + dy });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const target = e.currentTarget as HTMLElement;
    target.releasePointerCapture(e.pointerId);
    dragRef.current = null;
  };

  // Removed click-outside-to-minimize to allow typing in editor while modal is open

  return (
    <div 
      className="draggable-modal" 
      ref={modalRef}
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        width: width || undefined,
        maxHeight: maxHeight || undefined,
      }}
    >
      <div 
        className="draggable-modal__header"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="draggable-modal__title">{title}</div>
        <div className="draggable-modal__actions">
          {onMinimize && (
            <button 
              className="draggable-modal__btn" 
              onClick={(e) => { e.stopPropagation(); onMinimize(position.x, position.y); }}
              title="Minimize to Bubble"
            >
              <Minus size={14}/>
            </button>
          )}
          <button 
            className="draggable-modal__btn" 
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            title="Close completely"
          >
            <X size={14}/>
          </button>
        </div>
      </div>
      <div className="draggable-modal__content">
        {children}
      </div>
    </div>
  );
}
