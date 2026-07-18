import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { NotificationToast } from './NotificationToast';

export type NotificationVariant = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  message: string;
  variant: NotificationVariant;
  duration: number;
}

interface NotificationContextValue {
  notify: (message: string, variant?: NotificationVariant, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

/** Access the notification system. Must be used within a NotificationProvider. */
export function useNotification(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return ctx;
}

interface NotificationProviderProps {
  children: ReactNode;
}

const MAX_VISIBLE = 5;
const DEFAULT_DURATION = 4000;

/**
 * Provides a lightweight, non-intrusive notification system.
 * Renders toast-style notifications stacked in the bottom-right corner.
 */
export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, variant: NotificationVariant = 'info', duration: number = DEFAULT_DURATION) => {
      counterRef.current += 1;
      const id = `notif-${counterRef.current}-${Date.now()}`;
      const notification: Notification = { id, message, variant, duration };

      setNotifications((prev) => {
        // Keep only the most recent notifications up to MAX_VISIBLE
        const next = [...prev, notification];
        return next.length > MAX_VISIBLE ? next.slice(-MAX_VISIBLE) : next;
      });
    },
    [],
  );

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div className="notification-container" role="status" aria-live="polite">
        {notifications.map((n) => (
          <NotificationToast key={n.id} notification={n} onDismiss={dismiss} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}
