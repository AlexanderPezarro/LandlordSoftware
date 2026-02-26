import type { Meta, StoryObj } from '@storybook/react-vite';
import { Toast } from './Toast';

const meta: Meta<typeof Toast> = {
  title: 'Primitives/Toast',
  component: Toast,
  argTypes: {
    severity: {
      control: 'select',
      options: ['success', 'error', 'warning', 'info'],
    },
    message: {
      control: 'text',
    },
    autoHideDuration: {
      control: 'number',
    },
  },
};

export default meta;

type Story = StoryObj<typeof Toast>;

export const Success: Story = {
  args: {
    open: true,
    severity: 'success',
    message: 'Operation completed successfully.',
    onClose: () => {},
  },
};

export const Error: Story = {
  args: {
    open: true,
    severity: 'error',
    message: 'Something went wrong. Please try again.',
    onClose: () => {},
  },
};

export const Warning: Story = {
  args: {
    open: true,
    severity: 'warning',
    message: 'This action cannot be undone.',
    onClose: () => {},
  },
};

export const Info: Story = {
  args: {
    open: true,
    severity: 'info',
    message: 'A new version is available.',
    onClose: () => {},
  },
};
