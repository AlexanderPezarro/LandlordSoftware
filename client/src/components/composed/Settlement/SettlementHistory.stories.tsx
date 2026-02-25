import type { Meta, StoryObj } from '@storybook/react-vite';
import { SettlementHistory } from './SettlementHistory';
import type { Settlement } from './SettlementHistory';

const meta: Meta<typeof SettlementHistory> = {
  title: 'Composed/Settlement/SettlementHistory',
  component: SettlementHistory,
};

export default meta;

type Story = StoryObj<typeof SettlementHistory>;

const sampleSettlements: Settlement[] = [
  {
    id: 'settle-1',
    fromUserId: 'user-2',
    toUserId: 'user-1',
    amount: 150.0,
    settlementDate: '2026-01-15T00:00:00.000Z',
    notes: 'January rent share',
    fromUser: { id: 'user-2', email: 'bob@example.com' },
    toUser: { id: 'user-1', email: 'alice@example.com' },
  },
  {
    id: 'settle-2',
    fromUserId: 'user-3',
    toUserId: 'user-1',
    amount: 200.0,
    settlementDate: '2026-02-01T00:00:00.000Z',
    fromUser: { id: 'user-3', email: 'charlie@example.com' },
    toUser: { id: 'user-1', email: 'alice@example.com' },
  },
  {
    id: 'settle-3',
    fromUserId: 'user-2',
    toUserId: 'user-3',
    amount: 75.5,
    settlementDate: '2026-02-10T00:00:00.000Z',
    notes: 'Repair cost reimbursement',
    fromUser: { id: 'user-2', email: 'bob@example.com' },
    toUser: { id: 'user-3', email: 'charlie@example.com' },
  },
];

export const EmptyHistory: Story = {
  args: {
    settlements: [],
  },
};

export const PopulatedHistory: Story = {
  args: {
    settlements: sampleSettlements,
  },
};
