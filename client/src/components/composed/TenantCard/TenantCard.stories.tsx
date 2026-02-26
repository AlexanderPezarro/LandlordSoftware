import type { Meta, StoryObj } from '@storybook/react-vite';
import { TenantCard } from './TenantCard';
import type { Tenant, Property } from '../../../types/api.types';

function makeTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: 'tenant-1',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    phone: '07700 900123',
    status: 'Active',
    emergencyContactName: 'John Smith',
    emergencyContactPhone: '07700 900456',
    notes: null,
    createdAt: '2025-06-01T00:00:00.000Z',
    updatedAt: '2025-06-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: 'prop-1',
    name: '14 Elm Street',
    street: '14 Elm Street',
    city: 'London',
    county: 'Greater London',
    postcode: 'SW1A 1AA',
    propertyType: 'Flat',
    purchaseDate: null,
    purchasePrice: null,
    status: 'Occupied',
    notes: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const meta: Meta<typeof TenantCard> = {
  title: 'Composed/TenantCard',
  component: TenantCard,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 380 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof TenantCard>;

// ---------------------------------------------------------------------------
// Active lease
// ---------------------------------------------------------------------------

export const ActiveLease: Story = {
  args: {
    tenant: makeTenant({
      status: 'Active',
    }),
    currentProperty: makeProperty(),
  },
};

// ---------------------------------------------------------------------------
// Expired lease (Former tenant)
// ---------------------------------------------------------------------------

export const ExpiredLease: Story = {
  args: {
    tenant: makeTenant({
      firstName: 'Robert',
      lastName: 'Taylor',
      email: 'robert.taylor@example.com',
      phone: '07700 900789',
      status: 'Former',
      emergencyContactName: null,
      emergencyContactPhone: null,
    }),
    currentProperty: makeProperty({ name: '8 Oak Avenue' }),
  },
};

// ---------------------------------------------------------------------------
// No lease (Prospective tenant)
// ---------------------------------------------------------------------------

export const NoLease: Story = {
  args: {
    tenant: makeTenant({
      firstName: 'Emily',
      lastName: 'Chen',
      email: 'emily.chen@example.com',
      phone: null,
      status: 'Prospective',
      emergencyContactName: null,
      emergencyContactPhone: null,
    }),
  },
};

// ---------------------------------------------------------------------------
// Clickable
// ---------------------------------------------------------------------------

export const Clickable: Story = {
  args: {
    tenant: makeTenant(),
    currentProperty: makeProperty(),
    onClick: () => alert('Card clicked!'),
  },
};
