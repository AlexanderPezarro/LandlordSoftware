import styles from './ToggleGroup.module.scss';

export interface ToggleOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface ToggleGroupProps {
  options: ToggleOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  size?: 'small' | 'medium';
}

export function ToggleGroup({
  options,
  value,
  onChange,
  disabled = false,
  size = 'medium',
}: ToggleGroupProps) {
  return (
    <div
      className={[styles.group, styles[size]].join(' ')}
      role="group"
    >
      {options.map((option) => {
        const selected = option.value === value;
        const classNames = [
          styles.button,
          selected ? styles.selected : styles.unselected,
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <button
            key={option.value}
            type="button"
            className={classNames}
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
          >
            {option.icon && (
              <span className={styles.icon}>{option.icon}</span>
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
