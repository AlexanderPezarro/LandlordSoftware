import { forwardRef, useId } from 'react';
import styles from './TextField.module.scss';

export interface TextFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Label text displayed above the input */
  label?: string;
  /** Helper text displayed below the input */
  helperText?: string;
  /** Whether the field is in an error state */
  error?: boolean;
  /** Element rendered before the input value */
  startAdornment?: React.ReactNode;
  /** Element rendered after the input value */
  endAdornment?: React.ReactNode;
  /** If true, renders a textarea instead of an input */
  multiline?: boolean;
  /** Number of rows for the textarea (only applies when multiline is true) */
  rows?: number;
  /** If true, the component takes up the full width of its container */
  fullWidth?: boolean;
  /** The size of the component */
  size?: 'small' | 'medium';
}

export const TextField = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  TextFieldProps
>(function TextField(
  {
    label,
    helperText,
    error = false,
    startAdornment,
    endAdornment,
    multiline = false,
    rows = 4,
    fullWidth = false,
    size = 'medium',
    className,
    id: idProp,
    disabled,
    ...rest
  },
  ref
) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const helperId = `${id}-helper`;

  const rootClassNames = [
    styles.root,
    fullWidth ? styles.fullWidth : '',
    error ? styles.error : '',
    disabled ? styles.disabled : '',
    size === 'small' ? styles.small : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const inputWrapperClassNames = [
    styles.inputWrapper,
    startAdornment ? styles.hasStartAdornment : '',
    endAdornment ? styles.hasEndAdornment : '',
  ]
    .filter(Boolean)
    .join(' ');

  const sharedProps = {
    id,
    disabled,
    className: styles.input,
    'aria-describedby': helperText ? helperId : undefined,
    'aria-invalid': error || undefined,
    placeholder: ' ',
    ...rest,
  };

  return (
    <div className={rootClassNames}>
      <div className={inputWrapperClassNames}>
        {startAdornment && (
          <span className={styles.adornment}>{startAdornment}</span>
        )}
        {multiline ? (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            rows={rows}
            {...(sharedProps as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            {...sharedProps}
          />
        )}
        {label && (
          <label htmlFor={id} className={styles.label}>
            {label}
          </label>
        )}
        {endAdornment && (
          <span className={styles.adornment}>{endAdornment}</span>
        )}
      </div>
      {helperText && (
        <p id={helperId} className={styles.helperText}>
          {helperText}
        </p>
      )}
    </div>
  );
});
