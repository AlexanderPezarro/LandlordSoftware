import styles from './AppBar.module.scss';

// ---------------------------------------------------------------------------
// Prop interface
// ---------------------------------------------------------------------------

export interface AppBarProps {
  children: React.ReactNode;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AppBar({ children, className }: AppBarProps) {
  const classNames = [styles.appbar, className].filter(Boolean).join(' ');

  return (
    <header className={classNames}>
      {children}
    </header>
  );
}
