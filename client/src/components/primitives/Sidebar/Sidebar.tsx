import { useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Badge } from '../Badge';
import styles from './Sidebar.module.scss';

export interface SidebarItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
}

export interface SidebarProps {
  items: SidebarItem[];
  open: boolean;
  onClose: () => void;
  header?: React.ReactNode;
}

export function Sidebar({ items, open, onClose, header }: SidebarProps) {
  const location = useLocation();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    },
    [open, onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scrolling when mobile overlay is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const navContent = (
    <>
      {header && <div className={styles.header}>{header}</div>}
      <nav className={styles.nav} aria-label="Main navigation">
        <ul className={styles.list}>
          {items.map((item) => {
            const isActive = location.pathname === item.path;
            const hasBadge = item.badge != null && item.badge > 0;

            return (
              <li key={item.path} className={styles.listItem}>
                <Link
                  to={item.path}
                  className={[styles.link, isActive ? styles.active : '']
                    .filter(Boolean)
                    .join(' ')}
                  onClick={onClose}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className={styles.icon}>
                    {hasBadge ? (
                      <Badge count={item.badge!}>{item.icon}</Badge>
                    ) : (
                      item.icon
                    )}
                  </span>
                  <span className={styles.label}>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );

  return (
    <>
      {/* Desktop permanent sidebar */}
      <aside className={styles.desktop} aria-label="Sidebar navigation">
        {navContent}
      </aside>

      {/* Mobile overlay sidebar */}
      {open && (
        <div className={styles.overlay} onClick={onClose} aria-hidden="true" />
      )}
      <aside
        className={[styles.mobile, open ? styles.mobileOpen : '']
          .filter(Boolean)
          .join(' ')}
        aria-label="Sidebar navigation"
        aria-hidden={!open}
      >
        {navContent}
      </aside>
    </>
  );
}
