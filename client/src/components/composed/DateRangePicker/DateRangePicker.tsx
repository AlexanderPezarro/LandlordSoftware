import React, { useMemo } from 'react';
import { DatePicker } from '../../primitives/DatePicker';
import styles from './DateRangePicker.module.scss';

export interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartChange: (date: Date | null) => void;
  onEndChange: (date: Date | null) => void;
  label?: string;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  label = 'Date Range',
}) => {
  const endDateError = useMemo(() => {
    if (!endDate || !startDate) return null;
    if (endDate < startDate) {
      return 'End date must be after start date';
    }
    return null;
  }, [startDate, endDate]);

  return (
    <div className={styles.container}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.pickers}>
        <div className={styles.picker}>
          <DatePicker
            label="From"
            value={startDate}
            onChange={onStartChange}
          />
        </div>
        <div className={styles.picker}>
          <DatePicker
            label="To"
            value={endDate}
            onChange={onEndChange}
            minDate={startDate ?? undefined}
            error={!!endDateError}
            helperText={endDateError ?? undefined}
          />
        </div>
      </div>
    </div>
  );
};

export default DateRangePicker;
