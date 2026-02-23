import { X } from 'lucide-react';
import styles from './Chip.module.scss';

export interface ChipProps {
  label: string;
  color?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  size?: 'small' | 'medium';
  onDelete?: () => void;
  className?: string;
}

export function Chip({
  label,
  color = 'default',
  size = 'medium',
  onDelete,
  className,
}: ChipProps) {
  const classNames = [
    styles.chip,
    styles[color],
    styles[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classNames}>
      <span className={styles.label}>{label}</span>
      {onDelete && (
        <button
          type="button"
          className={styles.deleteButton}
          onClick={onDelete}
          aria-label={`Remove ${label}`}
        >
          <X size={size === 'small' ? 14 : 16} />
        </button>
      )}
    </span>
  );
}
