import type { Meta, StoryObj } from '@storybook/react-vite';
import { Spinner } from './Spinner';

const meta: Meta<typeof Spinner> = {
  title: 'Primitives/Spinner',
  component: Spinner,
  argTypes: {
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
    label: {
      control: 'text',
    },
  },
};

export default meta;

type Story = StoryObj<typeof Spinner>;

export const Small: Story = {
  args: {
    size: 'small',
  },
};

export const Medium: Story = {
  args: {
    size: 'medium',
  },
};

export const Large: Story = {
  args: {
    size: 'large',
  },
};

export const WithLabel: Story = {
  args: {
    size: 'medium',
    label: 'Loading...',
  },
};

export const SmallWithLabel: Story = {
  args: {
    size: 'small',
    label: 'Please wait',
  },
};

export const LargeWithLabel: Story = {
  args: {
    size: 'large',
    label: 'Fetching data...',
  },
};
