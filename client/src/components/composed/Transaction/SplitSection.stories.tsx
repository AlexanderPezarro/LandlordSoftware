import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SplitSection } from './SplitSection';
import type { SplitSectionProps, TransactionSplit } from './SplitSection';
import type { PropertyOwnership } from '../../../services/api/propertyOwnership.service';

const meta: Meta<typeof SplitSection> = {
  title: 'Composed/Transaction/SplitSection',
  component: SplitSection,
};

export default meta;

type Story = StoryObj<typeof SplitSection>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ownershipTwoWay: PropertyOwnership[] = [
  {
    id: 'own-1',
    userId: 'user-1',
    propertyId: 'prop-1',
    ownershipPercentage: 50,
    user: { id: 'user-1', email: 'alice@example.com', role: 'LANDLORD' },
  },
  {
    id: 'own-2',
    userId: 'user-2',
    propertyId: 'prop-1',
    ownershipPercentage: 50,
    user: { id: 'user-2', email: 'bob@example.com', role: 'LANDLORD' },
  },
];

const ownershipThreeWay: PropertyOwnership[] = [
  {
    id: 'own-1',
    userId: 'user-1',
    propertyId: 'prop-1',
    ownershipPercentage: 40,
    user: { id: 'user-1', email: 'alice@example.com', role: 'LANDLORD' },
  },
  {
    id: 'own-2',
    userId: 'user-2',
    propertyId: 'prop-1',
    ownershipPercentage: 35,
    user: { id: 'user-2', email: 'bob@example.com', role: 'LANDLORD' },
  },
  {
    id: 'own-3',
    userId: 'user-3',
    propertyId: 'prop-1',
    ownershipPercentage: 25,
    user: { id: 'user-3', email: 'charlie@example.com', role: 'LANDLORD' },
  },
];

function makeSplits(
  ownership: PropertyOwnership[],
  amount: number,
  percentageOverrides?: Record<string, number>
): TransactionSplit[] {
  return ownership.map((o) => {
    const pct = percentageOverrides?.[o.userId] ?? o.ownershipPercentage;
    return {
      userId: o.userId,
      percentage: pct,
      amount: (amount * pct) / 100,
    };
  });
}

// ---------------------------------------------------------------------------
// Interactive wrapper so splits are editable in stories
// ---------------------------------------------------------------------------

function InteractiveSplitSection(
  props: Omit<SplitSectionProps, 'splits' | 'onSplitsChange'> & {
    initialSplits: TransactionSplit[];
  }
) {
  const { initialSplits, ...rest } = props;
  const [splits, setSplits] = useState<TransactionSplit[]>(initialSplits);
  return <SplitSection {...rest} splits={splits} onSplitsChange={setSplits} />;
}

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

const AMOUNT = 1200;

export const TwoWaySplit: Story = {
  render: () => (
    <InteractiveSplitSection
      propertyOwnership={ownershipTwoWay}
      amount={AMOUNT}
      initialSplits={makeSplits(ownershipTwoWay, AMOUNT)}
    />
  ),
};

export const ThreeWaySplit: Story = {
  render: () => (
    <InteractiveSplitSection
      propertyOwnership={ownershipThreeWay}
      amount={AMOUNT}
      initialSplits={makeSplits(ownershipThreeWay, AMOUNT)}
    />
  ),
};

export const ValidationError: Story = {
  render: () => (
    <InteractiveSplitSection
      propertyOwnership={ownershipTwoWay}
      amount={AMOUNT}
      initialSplits={makeSplits(ownershipTwoWay, AMOUNT, {
        'user-1': 60,
        'user-2': 30,
      })}
    />
  ),
};
