import { useState, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import './HoverCard.css';

interface HoverCardProps {
  trigger: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delayMs?: number;
}

export function HoverCard({
  trigger,
  children,
  side = 'bottom',
  delayMs = 200,
}: HoverCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIsVisible(true), delayMs);
  }, [delayMs]);

  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIsVisible(false), 100);
  }, []);

  return (
    <div
      className="hover-card"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <div className="hover-card__trigger">{trigger}</div>
      {isVisible && (
        <div className={`hover-card__content hover-card__content--${side}`} role="tooltip">
          {children}
        </div>
      )}
    </div>
  );
}
