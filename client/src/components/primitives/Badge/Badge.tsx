import styles from './Badge.module.scss';

export interface BadgeProps {
  children: React.ReactNode;
  count: number;
  max?: number;
  color?: 'primary' | 'error';
  className?: string;
}

export function Badge({
  children,
  count,
  max = 99,
  color = 'error',
  className,
}: BadgeProps) {
  const wrapperClassNames = [styles.wrapper, className]
    .filter(Boolean)
    .join(' ');

  const badgeClassNames = [styles.badge, styles[color]]
    .filter(Boolean)
    .join(' ');

  const display = count > max ? `${max}+` : String(count);

  return (
    <div className={wrapperClassNames}>
      {children}
      {count > 0 && <span className={badgeClassNames}>{display}</span>}
    </div>
  );
}
