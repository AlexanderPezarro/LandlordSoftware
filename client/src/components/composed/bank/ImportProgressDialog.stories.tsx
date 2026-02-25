import type { Meta, StoryObj } from '@storybook/react-vite';
import { ImportProgressDialog } from './ImportProgressDialog';

const meta: Meta<typeof ImportProgressDialog> = {
  title: 'Composed/Bank/ImportProgressDialog',
  component: ImportProgressDialog,
};

export default meta;

type Story = StoryObj<typeof ImportProgressDialog>;

export const DialogOpen: Story = {
  args: {
    open: true,
    syncLogId: 'sync-123',
    onClose: () => {},
  },
};
