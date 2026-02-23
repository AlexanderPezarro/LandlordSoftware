import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import styles from './Toast.module.scss';

export interface ToastProps {
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
  open: boolean;
  onClose: () => void;
  autoHideDuration?: number;
}

const severityIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

export function Toast({
  message,
  severity,
  open,
  onClose,
  autoHideDuration = 5000,
}: ToastProps) {
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(onClose, autoHideDuration);
    return () => clearTimeout(timer);
  }, [open, onClose, autoHideDuration]);

  if (!open) return null;

  const Icon = severityIcons[severity];

  const toast = (
    <div
      className={`${styles.toast} ${styles[severity]}`}
      role="alert"
      aria-live="assertive"
    >
      <Icon className={styles.icon} size={20} />
      <span className={styles.message}>{message}</span>
      <button
        type="button"
        className={styles.close}
        onClick={onClose}
        aria-label="Close notification"
      >
        <X size={18} />
      </button>
    </div>
  );

  return createPortal(toast, document.body);
}
