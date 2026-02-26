import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { OwnerInput, type OwnerInputProps } from './OwnerInput';

const sampleUsers = [
  { id: 'user-1', email: 'alice@example.com', role: 'LANDLORD' as const, createdAt: '2025-01-01' },
  { id: 'user-2', email: 'bob@example.com', role: 'LANDLORD' as const, createdAt: '2025-01-01' },
  { id: 'user-3', email: 'carol@example.com', role: 'ADMIN' as const, createdAt: '2025-01-01' },
];

// ---------------------------------------------------------------------------
// OwnerInput stories
// ---------------------------------------------------------------------------

const ownerInputMeta: Meta<typeof OwnerInput> = {
  title: 'Composed/PropertyOwnership',
  component: OwnerInput,
  args: {
    users: sampleUsers,
    disabled: false,
  },
};

export default ownerInputMeta;

type Story = StoryObj<typeof OwnerInput>;

// ---------------------------------------------------------------------------
// Single owner
// ---------------------------------------------------------------------------

export const SingleOwner: Story = {
  args: {
    userId: 'user-1',
    percentage: 100,
    users: sampleUsers,
  },
  render: function SingleOwnerRender(args: OwnerInputProps) {
    const [userId, setUserId] = useState(args.userId);
    const [percentage, setPercentage] = useState(args.percentage);
    return (
      <OwnerInput
        {...args}
        userId={userId}
        percentage={percentage}
        onUserChange={setUserId}
        onPercentageChange={setPercentage}
        onRemove={() => alert('Remove clicked')}
      />
    );
  },
};

// ---------------------------------------------------------------------------
// Multi-owner
// ---------------------------------------------------------------------------

interface OwnerState {
  userId: string;
  percentage: number;
}

export const MultiOwner: Story = {
  render: function MultiOwnerRender() {
    const [owners, setOwners] = useState<OwnerState[]>([
      { userId: 'user-1', percentage: 60 },
      { userId: 'user-2', percentage: 40 },
    ]);

    const handleUserChange = (index: number, userId: string) => {
      setOwners((prev) => prev.map((o, i) => (i === index ? { ...o, userId } : o)));
    };

    const handlePercentageChange = (index: number, percentage: number) => {
      setOwners((prev) => prev.map((o, i) => (i === index ? { ...o, percentage } : o)));
    };

    const handleRemove = (index: number) => {
      setOwners((prev) => prev.filter((_, i) => i !== index));
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {owners.map((owner, index) => (
          <OwnerInput
            key={index}
            userId={owner.userId}
            percentage={owner.percentage}
            users={sampleUsers.filter(
              (u) => u.id === owner.userId || !owners.some((o) => o.userId === u.id)
            )}
            onUserChange={(uid) => handleUserChange(index, uid)}
            onPercentageChange={(pct) => handlePercentageChange(index, pct)}
            onRemove={() => handleRemove(index)}
          />
        ))}
      </div>
    );
  },
};

// ---------------------------------------------------------------------------
// Validation error
// ---------------------------------------------------------------------------

export const ValidationError: Story = {
  args: {
    userId: 'user-1',
    percentage: 50,
    users: sampleUsers,
    error: 'Duplicate owner selected',
  },
  render: function ValidationErrorRender(args: OwnerInputProps) {
    const [userId, setUserId] = useState(args.userId);
    const [percentage, setPercentage] = useState(args.percentage);
    return (
      <OwnerInput
        {...args}
        userId={userId}
        percentage={percentage}
        onUserChange={setUserId}
        onPercentageChange={setPercentage}
        onRemove={() => alert('Remove clicked')}
      />
    );
  },
};
