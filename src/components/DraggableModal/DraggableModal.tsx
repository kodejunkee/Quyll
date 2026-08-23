import { useEffect, useRef, useState } from 'react';
import { Cross2Icon } from '@radix-ui/react-icons';
import { Minus, Square } from 'lucide-react';
import './DraggableModal.css';

interface DraggableModalProps {
  title: React.ReactNode;
  headerLeftActions?: React.ReactNode;
  centerHeader?: React.ReactNode;
  onClose: () => void;
  onMinimize?: (x: number, y: number) => void;
  onToggleCollapse?: () => void;
  isCollapsed?: boolean;
  children: React.ReactNode;
  initialX?: number;
  initialY?: number;
  width?: string;
  height?: string;
  maxHeight?: string;
  closeOnClickOutside?: boolean;
  contentStyle?: React.CSSProperties;
  modalStyle?: React.CSSProperties;
}

export function DraggableModal({
  title,
  headerLeftActions,
  centerHeader,
  onClose,
  onMinimize,
  onToggleCollapse,
  isCollapsed,
  children,
  initialX,
  initialY,
  width,
  height,
  maxHeight,
  closeOnClickOutside = false,
  contentStyle,
  modalStyle,
}: DraggableModalProps) {
  const [position, setPosition] = useState({ 
    x: initialX ?? Math.max(20, window.innerWidth / 2 - (width ? parseInt(width, 10) / 2 : 200)), 
    y: initialY ?? Math.max(20, window.innerHeight / 2 - 340) 
  });

  useEffect(() => {
    if (initialX !== undefined && initialY !== undefined) {
      setPosition({ x: initialX, y: initialY });
    }
  }, [initialX, initialY]);

  const dragRef = useRef<{ startX: number; startY: number; initPosX: number; initPosY: number } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, .draggable-modal__btn, .no-drag')) return;

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
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPosition({
      x: dragRef.current.initPosX + dx,
      y: Math.max(0, dragRef.current.initPosY + dy),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const target = e.currentTarget as HTMLElement;
    target.releasePointerCapture(e.pointerId);
    dragRef.current = null;
  };

  useEffect(() => {
    if (!closeOnClickOutside) return;
    const handleDocClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, [closeOnClickOutside, onClose]);

  return (
    <div 
      ref={modalRef}
      className="draggable-modal"
      style={{
        '--x': `${position.x}px`,
        '--y': `${position.y}px`,
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        width,
        height: isCollapsed ? 'auto' : height,
        maxHeight: isCollapsed ? 'none' : maxHeight,
        ...modalStyle
      } as React.CSSProperties}
    >
      <div 
        className={`draggable-modal__header ${isCollapsed ? 'draggable-modal__header--collapsed' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {headerLeftActions && (
          <div className="draggable-modal__actions" style={{ marginRight: '8px' }}>
            {headerLeftActions}
          </div>
        )}
        <div className="draggable-modal__title" style={{ flex: 1 }}>{title}</div>
        {centerHeader && (
          <div className="draggable-modal__center">
            {centerHeader}
          </div>
        )}
        <div className="draggable-modal__actions">
          {onToggleCollapse && (
            <button 
              className="draggable-modal__btn" 
              onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
              title={isCollapsed ? "Maximize" : "Minimize"}
            >
              {isCollapsed ? <Square size={12}/> : <Minus size={14}/>}
            </button>
          )}
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
            <Cross2Icon width={14} height={14}/>
          </button>
        </div>
      </div>
      {!isCollapsed && (
        <div className="draggable-modal__content" style={contentStyle}>
          {children}
        </div>
      )}
    </div>
  );
}
