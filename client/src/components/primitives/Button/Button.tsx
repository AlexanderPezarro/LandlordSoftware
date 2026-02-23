import { forwardRef } from 'react';
import { Spinner } from '../Spinner';
import styles from './Button.module.scss';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'text' | 'icon';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  fullWidth?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'medium',
      loading = false,
      fullWidth = false,
      startIcon,
      endIcon,
      disabled,
      className,
      children,
      ...rest
    },
    ref
  ) {
    const classNames = [
      styles.button,
      styles[variant],
      styles[size],
      fullWidth && styles.fullWidth,
      loading && styles.loading,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const spinnerSize = 'small' as const;

    return (
      <button
        ref={ref}
        className={classNames}
        disabled={disabled || loading}
        {...rest}
      >
        {loading && (
          <span className={styles.spinnerWrapper}>
            <Spinner size={spinnerSize} />
          </span>
        )}
        <span className={styles.content}>
          {startIcon && <span className={styles.startIcon}>{startIcon}</span>}
          {children}
          {endIcon && <span className={styles.endIcon}>{endIcon}</span>}
        </span>
      </button>
    );
  }
);
