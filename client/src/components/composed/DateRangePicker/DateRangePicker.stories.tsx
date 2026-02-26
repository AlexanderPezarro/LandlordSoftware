import { useState } from 'react';
import DateRangePicker from './DateRangePicker';
import type { DateRangePickerProps } from './DateRangePicker';

export default {
  title: 'Composed/DateRangePicker',
  component: DateRangePicker,
};

const Template = (args: Partial<DateRangePickerProps>) => {
  const [startDate, setStartDate] = useState<Date | null>(
    args.startDate ?? null
  );
  const [endDate, setEndDate] = useState<Date | null>(args.endDate ?? null);

  return (
    <DateRangePicker
      startDate={startDate}
      endDate={endDate}
      onStartChange={setStartDate}
      onEndChange={setEndDate}
      label={args.label}
    />
  );
};

export const Empty = () => <Template />;

export const Populated = () => (
  <Template
    startDate={new Date(2026, 0, 1)}
    endDate={new Date(2026, 1, 28)}
    label="Lease Period"
  />
);

export const InvalidRange = () => (
  <Template
    startDate={new Date(2026, 5, 15)}
    endDate={new Date(2026, 2, 1)}
    label="Invalid Range Example"
  />
);
