import type { Meta, StoryObj } from '@storybook/react-vite';
import { TextField } from './TextField';

const meta = {
  title: 'Primitives/TextField',
  component: TextField,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Basic text field with no props. */
export const Default: Story = {
  args: {},
};

/** Text field with a floating label. */
export const WithLabel: Story = {
  args: {
    label: 'Email',
  },
};

/** Text field with helper text below. */
export const WithHelperText: Story = {
  args: {
    label: 'Password',
    type: 'password',
    helperText: 'Must be at least 8 characters',
  },
};

/** Text field in an error state with red label, border, and helper text. */
export const ErrorState: Story = {
  args: {
    label: 'Email',
    error: true,
    helperText: 'Invalid email address',
    defaultValue: 'not-an-email',
  },
};

/** Text field with start and end adornments. */
export const WithAdornments: Story = {
  args: {
    label: 'Amount',
    startAdornment: <span>$</span>,
    endAdornment: <span>USD</span>,
  },
};

/** Multiline text field that renders a textarea element. */
export const Multiline: Story = {
  args: {
    label: 'Description',
    multiline: true,
    rows: 4,
  },
};

/** Disabled text field with reduced opacity and not-allowed cursor. */
export const Disabled: Story = {
  args: {
    label: 'Disabled field',
    disabled: true,
    defaultValue: 'Cannot edit',
  },
};

/** Small-sized text field with reduced padding and font size. */
export const SmallSize: Story = {
  args: {
    label: 'Small',
    size: 'small',
  },
};
