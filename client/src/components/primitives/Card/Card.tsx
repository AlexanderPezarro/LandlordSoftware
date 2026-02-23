import styles from './Card.module.scss';

// ---------------------------------------------------------------------------
// Prop interfaces
// ---------------------------------------------------------------------------

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export interface CardActionsProps {
  children: React.ReactNode;
  className?: string;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CardHeader({ children, className }: CardHeaderProps) {
  const classNames = [styles.header, className].filter(Boolean).join(' ');
  return <div className={classNames}>{children}</div>;
}

function CardContent({ children, className }: CardContentProps) {
  const classNames = [styles.content, className].filter(Boolean).join(' ');
  return <div className={classNames}>{children}</div>;
}

function CardActions({ children, className }: CardActionsProps) {
  const classNames = [styles.actions, className].filter(Boolean).join(' ');
  return <div className={classNames}>{children}</div>;
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

function CardRoot({ children, className, onClick }: CardProps) {
  const classNames = [styles.card, onClick && styles.clickable, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames} onClick={onClick}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compound component assembly
// ---------------------------------------------------------------------------

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Content: CardContent,
  Actions: CardActions,
});
