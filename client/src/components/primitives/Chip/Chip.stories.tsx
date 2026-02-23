import type { Meta, StoryObj } from '@storybook/react-vite';
import { Chip } from './Chip';

const meta: Meta<typeof Chip> = {
  title: 'Primitives/Chip',
  component: Chip,
  argTypes: {
    color: {
      control: 'select',
      options: ['default', 'primary', 'success', 'warning', 'error'],
    },
    size: {
      control: 'select',
      options: ['small', 'medium'],
    },
  },
};

export default meta;

type Story = StoryObj<typeof Chip>;

// ---------------------------------------------------------------------------
// Basic
// ---------------------------------------------------------------------------

export const Default: Story = {
  args: {
    label: 'Default',
    color: 'default',
  },
};

export const Primary: Story = {
  args: {
    label: 'Primary',
    color: 'primary',
  },
};

export const Success: Story = {
  args: {
    label: 'Success',
    color: 'success',
  },
};

export const Warning: Story = {
  args: {
    label: 'Warning',
    color: 'warning',
  },
};

export const Error: Story = {
  args: {
    label: 'Error',
    color: 'error',
  },
};

// ---------------------------------------------------------------------------
// Sizes
// ---------------------------------------------------------------------------

export const Small: Story = {
  args: {
    label: 'Small chip',
    size: 'small',
  },
};

export const Medium: Story = {
  args: {
    label: 'Medium chip',
    size: 'medium',
  },
};

// ---------------------------------------------------------------------------
// With delete
// ---------------------------------------------------------------------------

export const WithDelete: Story = {
  args: {
    label: 'Removable',
    color: 'primary',
    onDelete: () => alert('Deleted!'),
  },
};

export const SmallWithDelete: Story = {
  args: {
    label: 'Small removable',
    size: 'small',
    color: 'error',
    onDelete: () => alert('Deleted!'),
  },
};

// ---------------------------------------------------------------------------
// Gallery - all colors
// ---------------------------------------------------------------------------

export const AllColors: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Chip label="Default" color="default" />
      <Chip label="Primary" color="primary" />
      <Chip label="Success" color="success" />
      <Chip label="Warning" color="warning" />
      <Chip label="Error" color="error" />
    </div>
  ),
};

export const AllColorsWithDelete: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Chip label="Default" color="default" onDelete={() => {}} />
      <Chip label="Primary" color="primary" onDelete={() => {}} />
      <Chip label="Success" color="success" onDelete={() => {}} />
      <Chip label="Warning" color="warning" onDelete={() => {}} />
      <Chip label="Error" color="error" onDelete={() => {}} />
    </div>
  ),
};

export const BothSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Chip label="Small" size="small" color="primary" />
      <Chip label="Medium" size="medium" color="primary" />
      <Chip label="Small delete" size="small" color="success" onDelete={() => {}} />
      <Chip label="Medium delete" size="medium" color="success" onDelete={() => {}} />
    </div>
  ),
};
