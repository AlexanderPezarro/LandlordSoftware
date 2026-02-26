import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Dialog } from './Dialog';

const meta: Meta<typeof Dialog> = {
  title: 'Primitives/Dialog',
  component: Dialog,
};

export default meta;

type Story = StoryObj<typeof Dialog>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function DialogDemo({
  size,
  disableBackdropClose,
}: {
  size?: 'small' | 'medium' | 'large';
  disableBackdropClose?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open {size ?? 'medium'} dialog
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size={size}
        disableBackdropClose={disableBackdropClose}
      >
        <Dialog.Title>Dialog Title</Dialog.Title>
        <Dialog.Content>
          <p>
            This is a {size ?? 'medium'} dialog. Click the backdrop or press
            Escape to close.
          </p>
        </Dialog.Content>
        <Dialog.Actions>
          <button type="button" onClick={() => setOpen(false)}>
            Cancel
          </button>
          <button type="button" onClick={() => setOpen(false)}>
            Confirm
          </button>
        </Dialog.Actions>
      </Dialog>
    </>
  );
}

function ScrollableDialogDemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open scrollable dialog
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} size="medium">
        <Dialog.Title>Scrollable Content</Dialog.Title>
        <Dialog.Content>
          {Array.from({ length: 30 }, (_, i) => (
            <p key={i}>
              Paragraph {i + 1}: Lorem ipsum dolor sit amet, consectetur
              adipiscing elit. Sed do eiusmod tempor incididunt ut labore et
              dolore magna aliqua.
            </p>
          ))}
        </Dialog.Content>
        <Dialog.Actions>
          <button type="button" onClick={() => setOpen(false)}>
            Close
          </button>
        </Dialog.Actions>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

export const Small: Story = {
  render: () => <DialogDemo size="small" />,
};

export const Medium: Story = {
  render: () => <DialogDemo size="medium" />,
};

export const Large: Story = {
  render: () => <DialogDemo size="large" />,
};

export const ScrollableContent: Story = {
  render: () => <ScrollableDialogDemo />,
};

export const DisableBackdropClose: Story = {
  render: () => <DialogDemo size="medium" disableBackdropClose />,
};
