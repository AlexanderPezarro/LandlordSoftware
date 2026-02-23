import type { Meta, StoryObj } from '@storybook/react-vite';
import { EventBadge } from './EventBadge';
import type { Event } from '../../../types/api.types';

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: '1',
    propertyId: 'prop-1',
    eventType: 'Maintenance',
    title: 'Fix leaking faucet',
    scheduledDate: '2026-03-15T00:00:00.000Z',
    completed: false,
    completedDate: null,
    description: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const meta: Meta<typeof EventBadge> = {
  title: 'Composed/EventBadge',
  component: EventBadge,
};

export default meta;

type Story = StoryObj<typeof EventBadge>;

// ---------------------------------------------------------------------------
// Individual event types
// ---------------------------------------------------------------------------

export const Maintenance: Story = {
  args: {
    event: makeEvent({ eventType: 'Maintenance', title: 'Fix leaking faucet' }),
  },
};

export const Inspection: Story = {
  args: {
    event: makeEvent({ eventType: 'Inspection', title: 'Annual property inspection' }),
  },
};

export const LeaseRenewal: Story = {
  args: {
    event: makeEvent({ eventType: 'Lease Renewal', title: 'Renew lease for Unit 3A' }),
  },
};

export const Repair: Story = {
  args: {
    event: makeEvent({ eventType: 'Repair', title: 'Replace broken window' }),
  },
};

export const Viewing: Story = {
  args: {
    event: makeEvent({ eventType: 'Viewing', title: 'Property showing' }),
  },
};

export const Meeting: Story = {
  args: {
    event: makeEvent({ eventType: 'Meeting', title: 'Tenant meeting' }),
  },
};

export const RentDueDate: Story = {
  args: {
    event: makeEvent({ eventType: 'Rent Due Date', title: 'Monthly rent due' }),
  },
};

// ---------------------------------------------------------------------------
// With click handler
// ---------------------------------------------------------------------------

export const Clickable: Story = {
  args: {
    event: makeEvent({ eventType: 'Maintenance', title: 'Fix leaking faucet' }),
    onClick: () => alert('Clicked!'),
  },
};

// ---------------------------------------------------------------------------
// Gallery - all event types
// ---------------------------------------------------------------------------

export const AllEventTypes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <EventBadge event={makeEvent({ eventType: 'Maintenance' })} />
      <EventBadge event={makeEvent({ eventType: 'Inspection' })} />
      <EventBadge event={makeEvent({ eventType: 'Lease Renewal' })} />
      <EventBadge event={makeEvent({ eventType: 'Repair' })} />
      <EventBadge event={makeEvent({ eventType: 'Viewing' })} />
      <EventBadge event={makeEvent({ eventType: 'Meeting' })} />
      <EventBadge event={makeEvent({ eventType: 'Rent Due Date' })} />
    </div>
  ),
};
