import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styles from './Dialog.module.scss';

// ---------------------------------------------------------------------------
// Prop interfaces
// ---------------------------------------------------------------------------

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  size?: 'small' | 'medium' | 'large';
  disableBackdropClose?: boolean;
  children: React.ReactNode;
}

export interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

export interface DialogActionsProps {
  children: React.ReactNode;
  className?: string;
}

// ---------------------------------------------------------------------------
// Focus-trap helpers
// ---------------------------------------------------------------------------

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DialogTitle({ children, className }: DialogTitleProps) {
  const classNames = [styles.title, className].filter(Boolean).join(' ');
  return <h2 className={classNames}>{children}</h2>;
}

function DialogContent({ children, className }: DialogContentProps) {
  const classNames = [styles.content, className].filter(Boolean).join(' ');
  return <div className={classNames}>{children}</div>;
}

function DialogActions({ children, className }: DialogActionsProps) {
  const classNames = [styles.actions, className].filter(Boolean).join(' ');
  return <div className={classNames}>{children}</div>;
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

function DialogRoot({
  open,
  onClose,
  size = 'medium',
  disableBackdropClose = false,
  children,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // ---- Escape key handler ----
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // ---- Focus management: capture previous focus, focus first element ----
  useEffect(() => {
    if (!open) return;

    // Store the element that was focused before the dialog opened
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    // Focus the first focusable element inside the dialog, or the dialog itself
    const timer = requestAnimationFrame(() => {
      if (!dialogRef.current) return;
      const focusable = getFocusableElements(dialogRef.current);
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        dialogRef.current.focus();
      }
    });

    return () => cancelAnimationFrame(timer);
  }, [open]);

  // ---- Restore focus on close ----
  useEffect(() => {
    if (open) return;

    // When the dialog closes, return focus to previously focused element
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  // ---- Focus trap: cycle tab within dialog ----
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = getFocusableElements(dialogRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (event.shiftKey) {
        // Shift+Tab: if on first element, wrap to last
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: if on last element, wrap to first
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [],
  );

  // ---- Backdrop click handler ----
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      // Only close if the click is directly on the backdrop, not on the dialog
      if (event.target === event.currentTarget && !disableBackdropClose) {
        onClose();
      }
    },
    [disableBackdropClose, onClose],
  );

  if (!open) return null;

  const sizeClass = styles[size];
  const dialogClassNames = [styles.dialog, sizeClass]
    .filter(Boolean)
    .join(' ');

  return createPortal(
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div
        ref={dialogRef}
        className={dialogClassNames}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// Compound component assembly
// ---------------------------------------------------------------------------

export const Dialog = Object.assign(DialogRoot, {
  Title: DialogTitle,
  Content: DialogContent,
  Actions: DialogActions,
});
