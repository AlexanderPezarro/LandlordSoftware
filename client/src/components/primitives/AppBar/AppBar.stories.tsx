import type { Meta, StoryObj } from '@storybook/react-vite';
import { AppBar } from './AppBar';

const meta: Meta<typeof AppBar> = {
  title: 'Primitives/AppBar',
  component: AppBar,
  decorators: [
    (Story) => (
      <div style={{ minHeight: 120 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof AppBar>;

export const WithTitle: Story = {
  render: () => (
    <AppBar>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 500, margin: 0 }}>
        Property Manager
      </h1>
    </AppBar>
  ),
};

export const WithMenuAndActions: Story = {
  render: () => (
    <AppBar>
      <button
        type="button"
        style={{
          background: 'none',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          fontSize: '1.5rem',
          marginRight: 16,
          padding: 4,
        }}
        aria-label="Open menu"
      >
        &#9776;
      </button>

      <h1 style={{ fontSize: '1.25rem', fontWeight: 500, margin: 0, flex: 1 }}>
        Dashboard
      </h1>

      <button
        type="button"
        style={{
          background: 'none',
          border: '1px solid rgba(255,255,255,0.5)',
          borderRadius: 4,
          color: 'inherit',
          cursor: 'pointer',
          padding: '6px 12px',
          marginLeft: 8,
        }}
      >
        Notifications
      </button>

      <button
        type="button"
        style={{
          background: 'none',
          border: '1px solid rgba(255,255,255,0.5)',
          borderRadius: 4,
          color: 'inherit',
          cursor: 'pointer',
          padding: '6px 12px',
          marginLeft: 8,
        }}
      >
        Profile
      </button>
    </AppBar>
  ),
};
