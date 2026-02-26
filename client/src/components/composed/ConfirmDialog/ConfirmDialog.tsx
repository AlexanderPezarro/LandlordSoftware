import { AlertTriangle } from 'lucide-react';
import { Dialog } from '../../primitives/Dialog';
import { Button } from '../../primitives/Button';
import styles from './ConfirmDialog.module.scss';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  severity?: 'warning' | 'danger';
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  severity = 'warning',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const iconClass =
    severity === 'danger' ? styles.iconDanger : styles.iconWarning;

  const confirmClass =
    severity === 'danger' ? styles.confirmDanger : undefined;

  return (
    <Dialog open={open} onClose={onCancel} size="small">
      <Dialog.Title>
        <span className={styles.titleRow}>
          <AlertTriangle className={`${styles.icon} ${iconClass}`} size={20} />
          {title}
        </span>
      </Dialog.Title>

      <Dialog.Content>
        <p className={styles.message}>{message}</p>
      </Dialog.Content>

      <Dialog.Actions>
        <Button variant="text" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button
          variant="primary"
          className={confirmClass}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
}
