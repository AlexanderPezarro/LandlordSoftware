import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { DatePicker, type DatePickerProps } from './DatePicker';

const meta: Meta<DatePickerProps> = {
  title: 'Primitives/DatePicker',
  component: DatePicker,
  argTypes: {
    value: { control: 'date' },
    onChange: { action: 'changed' },
    showTimeSelect: { control: 'boolean' },
    error: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<DatePickerProps>;

// ---------------------------------------------------------------------------
// Controlled wrapper so stories behave like real usage
// ---------------------------------------------------------------------------

const ControlledDatePicker = (props: DatePickerProps) => {
  const [date, setDate] = useState<Date | null>(props.value ?? null);
  return (
    <DatePicker
      {...props}
      value={date}
      onChange={(d) => {
        setDate(d);
        props.onChange?.(d);
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

export const DateOnly: Story = {
  render: (args) => <ControlledDatePicker {...args} />,
  args: {
    label: 'Date',
    placeholderText: 'Select a date',
  },
};

export const DateTime: Story = {
  render: (args) => <ControlledDatePicker {...args} />,
  args: {
    label: 'Date & Time',
    showTimeSelect: true,
    placeholderText: 'Select date and time',
  },
};

export const WithError: Story = {
  render: (args) => <ControlledDatePicker {...args} />,
  args: {
    label: 'Move-in Date',
    error: true,
    helperText: 'This field is required',
    placeholderText: 'MM/DD/YYYY',
  },
};

export const Disabled: Story = {
  render: (args) => <ControlledDatePicker {...args} />,
  args: {
    label: 'Locked Date',
    value: new Date(2025, 0, 15),
    disabled: true,
  },
};

export const WithMinMaxDates: Story = {
  render: (args) => <ControlledDatePicker {...args} />,
  args: {
    label: 'Lease Start',
    placeholderText: 'Pick a date in range',
    minDate: new Date(2025, 0, 1),
    maxDate: new Date(2025, 11, 31),
    helperText: 'Must be within 2025',
  },
};
