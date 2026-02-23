import styles from './Spinner.module.scss';

export interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
  label?: string;
  className?: string;
}

export function Spinner({ size = 'medium', label, className }: SpinnerProps) {
  const classNames = [styles.spinner, styles[size], className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames} role="status">
      <div className={styles.circle} />
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
}
