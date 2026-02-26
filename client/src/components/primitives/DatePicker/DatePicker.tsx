import React, { useId } from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import styles from './DatePicker.module.scss';

export interface DatePickerProps {
  label?: string;
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  showTimeSelect?: boolean;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  dateFormat?: string;
  placeholderText?: string;
  minDate?: Date;
  maxDate?: Date;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  onChange,
  showTimeSelect = false,
  error = false,
  helperText,
  disabled = false,
  dateFormat,
  placeholderText,
  minDate,
  maxDate,
}) => {
  const id = useId();
  const inputId = `datepicker-${id}`;

  const resolvedFormat =
    dateFormat ?? (showTimeSelect ? 'MM/dd/yyyy h:mm aa' : 'MM/dd/yyyy');

  const wrapperClassName = [
    styles.wrapper,
    error ? styles.error : '',
    disabled ? styles.disabled : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClassName}>
      {label && (
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
      )}
      <ReactDatePicker
        id={inputId}
        selected={value}
        onChange={(date: Date | null) => onChange?.(date)}
        showTimeSelect={showTimeSelect}
        dateFormat={resolvedFormat}
        placeholderText={placeholderText}
        disabled={disabled}
        minDate={minDate}
        maxDate={maxDate}
        className={styles.input}
        calendarClassName={styles.calendar}
        wrapperClassName={styles.inputWrapper}
        autoComplete="off"
      />
      {helperText && <span className={styles.helperText}>{helperText}</span>}
    </div>
  );
};
