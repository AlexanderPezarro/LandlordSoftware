import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConfirmDialog } from './ConfirmDialog';

const meta: Meta<typeof ConfirmDialog> = {
  title: 'Composed/ConfirmDialog',
  component: ConfirmDialog,
};

export default meta;

type Story = StoryObj<typeof ConfirmDialog>;

export const Warning: Story = {
  args: {
    open: true,
    title: 'Unsaved Changes',
    message:
      'You have unsaved changes that will be lost. Are you sure you want to leave this page?',
    severity: 'warning',
    confirmLabel: 'Discard',
    cancelLabel: 'Cancel',
    onConfirm: () => {},
    onCancel: () => {},
  },
};

export const Danger: Story = {
  args: {
    open: true,
    title: 'Delete Property',
    message:
      'This will permanently delete the property and all associated data. This action cannot be undone.',
    severity: 'danger',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    onConfirm: () => {},
    onCancel: () => {},
  },
};
