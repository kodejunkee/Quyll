import { useEffect, useRef, useState } from 'react';
import { CheckCircle, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import type { Notification, NotificationVariant } from './NotificationProvider';
import './NotificationToast.css';

interface NotificationToastProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

const VARIANT_ICONS: Record<NotificationVariant, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

export function NotificationToast({ notification, onDismiss }: NotificationToastProps) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setExiting(true);
    }, notification.duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [notification.duration]);

  const handleAnimationEnd = () => {
    if (exiting) {
      onDismiss(notification.id);
    }
  };

  const handleDismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setExiting(true);
  };

  const Icon = VARIANT_ICONS[notification.variant];

  return (
    <div
      className={`notification-toast notification-toast--${notification.variant} ${exiting ? 'notification-toast--exit' : ''}`}
      onAnimationEnd={handleAnimationEnd}
      role="alert"
    >
      <div className="notification-toast__icon">
        <Icon size={18} />
      </div>
      <span className="notification-toast__message">{notification.message}</span>
      <button
        className="notification-toast__dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
      <div
        className="notification-toast__progress"
        style={{ animationDuration: `${notification.duration}ms` }}
      />
    </div>
  );
}
