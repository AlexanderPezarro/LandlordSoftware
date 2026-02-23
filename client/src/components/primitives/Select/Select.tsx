import styles from './Select.module.scss';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  name?: string;
}

export function Select({
  label,
  placeholder,
  options,
  value = '',
  onChange,
  error = false,
  helperText,
  disabled = false,
  fullWidth = false,
  size = 'medium',
  name,
}: SelectProps) {
  const wrapperClassNames = [
    styles.wrapper,
    fullWidth && styles.fullWidth,
  ]
    .filter(Boolean)
    .join(' ');

  const selectClassNames = [
    styles.select,
    styles[size],
    error && styles.error,
    disabled && styles.disabled,
    !value && placeholder && styles.placeholder,
  ]
    .filter(Boolean)
    .join(' ');

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange?.(e.target.value);
  };

  return (
    <div className={wrapperClassNames}>
      {label && (
        <label className={`${styles.label} ${error ? styles.labelError : ''}`}>
          {label}
        </label>
      )}
      <div className={styles.selectContainer}>
        <select
          className={selectClassNames}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          name={name}
          aria-invalid={error || undefined}
          aria-describedby={helperText ? `${name}-helper-text` : undefined}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className={`${styles.arrow} ${disabled ? styles.arrowDisabled : ''}`} aria-hidden="true">
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      {helperText && (
        <span
          id={name ? `${name}-helper-text` : undefined}
          className={`${styles.helperText} ${error ? styles.helperTextError : ''}`}
        >
          {helperText}
        </span>
      )}
    </div>
  );
}
