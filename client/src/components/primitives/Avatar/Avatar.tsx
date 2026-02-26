import { useState } from 'react';
import styles from './Avatar.module.scss';

// ---------------------------------------------------------------------------
// Prop interface
// ---------------------------------------------------------------------------

export interface AvatarProps {
  /** Used to derive initials and a deterministic background color. */
  name?: string;
  /** Image URL. Falls back to initials on load error. */
  src?: string;
  /** Rendered diameter: small = 32 px, medium = 40 px, large = 56 px. */
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PALETTE = [
  '#1976d2', // blue
  '#388e3c', // green
  '#d32f2f', // red
  '#7b1fa2', // purple
  '#f57c00', // orange
  '#0097a7', // teal
  '#c2185b', // pink
  '#455a64', // blue-grey
  '#5d4037', // brown
  '#512da8', // deep-purple
];

/** Return the first letter of the first two words. */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Deterministic index into PALETTE based on a simple string hash. */
function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Avatar({ name, src, size = 'medium', className }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  const showImage = Boolean(src) && !imgError;
  const initials = name ? getInitials(name) : '';
  const bgColor = name ? colorFromName(name) : PALETTE[0];

  const classNames = [styles.avatar, styles[size], className]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classNames}
      style={showImage ? undefined : { backgroundColor: bgColor }}
      role="img"
      aria-label={name ?? 'avatar'}
    >
      {showImage ? (
        <img
          className={styles.image}
          src={src}
          alt={name ?? 'avatar'}
          onError={() => setImgError(true)}
        />
      ) : (
        <span className={styles.initials}>{initials}</span>
      )}
    </div>
  );
}
