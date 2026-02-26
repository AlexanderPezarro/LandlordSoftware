import type { Meta, StoryObj } from '@storybook/react-vite';
import { Plus } from 'lucide-react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Primitives/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'text', 'icon'],
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof Button>;

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
};

export const Text: Story = {
  args: {
    variant: 'text',
    children: 'Text Button',
  },
};

export const Icon: Story = {
  args: {
    variant: 'icon',
    children: <Plus size={20} />,
    'aria-label': 'Add',
  },
};

// ---------------------------------------------------------------------------
// Sizes
// ---------------------------------------------------------------------------

export const Small: Story = {
  args: {
    size: 'small',
    children: 'Small',
  },
};

export const Medium: Story = {
  args: {
    size: 'medium',
    children: 'Medium',
  },
};

export const Large: Story = {
  args: {
    size: 'large',
    children: 'Large',
  },
};

// ---------------------------------------------------------------------------
// With icons
// ---------------------------------------------------------------------------

export const WithStartIcon: Story = {
  args: {
    startIcon: <Plus size={18} />,
    children: 'Add Item',
  },
};

export const WithEndIcon: Story = {
  args: {
    endIcon: <Plus size={18} />,
    children: 'Add Item',
  },
};

export const WithBothIcons: Story = {
  args: {
    startIcon: <Plus size={18} />,
    endIcon: <Plus size={18} />,
    children: 'Add Item',
  },
};

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

export const Loading: Story = {
  args: {
    loading: true,
    children: 'Saving...',
  },
};

export const LoadingSecondary: Story = {
  args: {
    variant: 'secondary',
    loading: true,
    children: 'Loading...',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled',
  },
};

export const DisabledSecondary: Story = {
  args: {
    variant: 'secondary',
    disabled: true,
    children: 'Disabled',
  },
};

export const FullWidth: Story = {
  args: {
    fullWidth: true,
    children: 'Full Width Button',
  },
};
