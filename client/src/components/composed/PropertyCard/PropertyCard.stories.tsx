import type { Meta, StoryObj } from '@storybook/react-vite';
import { PropertyCard } from './PropertyCard';
import type { PropertyWithLease } from '../../../types/component.types';

function makeProperty(overrides: Partial<PropertyWithLease> = {}): PropertyWithLease {
  return {
    id: 'prop-1',
    name: '12 Baker Street',
    street: '12 Baker Street',
    city: 'London',
    county: 'Greater London',
    postcode: 'NW1 6XE',
    propertyType: 'Flat',
    purchaseDate: '2020-06-01',
    purchasePrice: 350000,
    status: 'Occupied',
    notes: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-06-01T00:00:00.000Z',
    activeLease: null,
    ...overrides,
  };
}

const meta: Meta<typeof PropertyCard> = {
  title: 'Composed/PropertyCard',
  component: PropertyCard,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof PropertyCard>;

// ---------------------------------------------------------------------------
// Occupied property with active lease
// ---------------------------------------------------------------------------

export const Occupied: Story = {
  args: {
    property: makeProperty({
      status: 'Occupied',
      activeLease: {
        id: 'lease-1',
        propertyId: 'prop-1',
        tenantId: 'tenant-1',
        startDate: '2024-01-01',
        endDate: '2025-01-01',
        monthlyRent: 1250,
        securityDepositAmount: 1250,
        status: 'Active',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    }),
    onClick: () => {},
    onEdit: (e) => e.stopPropagation(),
    onDelete: (e) => e.stopPropagation(),
  },
};

// ---------------------------------------------------------------------------
// Vacant property (available, no lease)
// ---------------------------------------------------------------------------

export const Vacant: Story = {
  args: {
    property: makeProperty({
      name: '8 Elm Terrace',
      street: '8 Elm Terrace',
      city: 'Manchester',
      county: 'Greater Manchester',
      postcode: 'M1 2AB',
      propertyType: 'Terraced',
      status: 'Available',
      activeLease: null,
    }),
    onClick: () => {},
    onEdit: (e) => e.stopPropagation(),
  },
};

// ---------------------------------------------------------------------------
// Multi-owner property
// ---------------------------------------------------------------------------

export const MultiOwner: Story = {
  args: {
    property: {
      ...makeProperty({
        name: '42 Victoria Road',
        street: '42 Victoria Road',
        city: 'Birmingham',
        county: 'West Midlands',
        postcode: 'B1 1BB',
        propertyType: 'Semi-Detached',
        status: 'Occupied',
        activeLease: {
          id: 'lease-2',
          propertyId: 'prop-2',
          tenantId: 'tenant-2',
          startDate: '2024-03-01',
          endDate: '2025-03-01',
          monthlyRent: 950,
          securityDepositAmount: 950,
          status: 'Active',
          createdAt: '2024-03-01T00:00:00.000Z',
          updatedAt: '2024-03-01T00:00:00.000Z',
        },
      }),
      owners: [
        { userId: 'user-1', email: 'alice@example.com', percentage: 60 },
        { userId: 'user-2', email: 'bob@example.com', percentage: 40 },
      ],
    } as PropertyWithLease & { owners: Array<{ userId: string; email: string; percentage: number }> },
    onClick: () => {},
    onEdit: (e) => e.stopPropagation(),
    onDelete: (e) => e.stopPropagation(),
  },
};
