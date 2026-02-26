import type { Meta, StoryObj } from '@storybook/react-vite';
import { Select } from './Select';

const sampleOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
];

const meta: Meta<typeof Select> = {
  title: 'Primitives/Select',
  component: Select,
  argTypes: {
    size: {
      control: 'select',
      options: ['small', 'medium'],
    },
    error: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    fullWidth: {
      control: 'boolean',
    },
    label: {
      control: 'text',
    },
    placeholder: {
      control: 'text',
    },
    helperText: {
      control: 'text',
    },
  },
};

export default meta;

type Story = StoryObj<typeof Select>;

export const Default: Story = {
  args: {
    label: 'Label',
    options: sampleOptions,
  },
};

export const Populated: Story = {
  args: {
    label: 'Favourite option',
    options: sampleOptions,
    value: 'option2',
  },
};

export const Error: Story = {
  args: {
    label: 'Required field',
    options: sampleOptions,
    error: true,
    helperText: 'This field is required',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled field',
    options: sampleOptions,
    value: 'option1',
    disabled: true,
  },
};

export const WithPlaceholder: Story = {
  args: {
    label: 'Category',
    placeholder: 'Select a category...',
    options: sampleOptions,
  },
};
