import type { Meta, StoryObj } from '@storybook/react-vite';
import { BalanceCard } from './BalanceCard';
import { SettlementForm } from './SettlementForm';
import { SettlementHistory } from './SettlementHistory';
import type { Balance } from './BalanceCard';
import type { Settlement } from './SettlementHistory';

// ---------------------------------------------------------------------------
// BalanceCard stories
// ---------------------------------------------------------------------------

const balanceCardMeta: Meta<typeof BalanceCard> = {
  title: 'Composed/Settlement/BalanceCard',
  component: BalanceCard,
};

export default balanceCardMeta;

type BalanceCardStory = StoryObj<typeof BalanceCard>;

const sampleBalances: Balance[] = [
  {
    userA: 'user-1',
    userB: 'user-2',
    amount: 250.0,
    userADetails: { id: 'user-1', email: 'alice@example.com' },
    userBDetails: { id: 'user-2', email: 'bob@example.com' },
  },
  {
    userA: 'user-1',
    userB: 'user-3',
    amount: -75.5,
    userADetails: { id: 'user-1', email: 'alice@example.com' },
    userBDetails: { id: 'user-3', email: 'charlie@example.com' },
  },
];

export const PositiveBalance: BalanceCardStory = {
  args: {
    balances: [sampleBalances[0]],
    currentUserId: 'user-1',
  },
};

export const NegativeBalance: BalanceCardStory = {
  args: {
    balances: [sampleBalances[1]],
    currentUserId: 'user-3',
  },
};

export const AllSettled: BalanceCardStory = {
  args: {
    balances: [],
  },
};

export const MultipleBalances: BalanceCardStory = {
  args: {
    balances: sampleBalances,
    currentUserId: 'user-1',
  },
};

// ---------------------------------------------------------------------------
// SettlementForm stories
// ---------------------------------------------------------------------------

const settlementFormMeta: Meta<typeof SettlementForm> = {
  title: 'Composed/Settlement/SettlementForm',
  component: SettlementForm,
};

// We need a second default export-like object for Storybook, but since we can
// only have one default export, we use a named story with render functions below.

type SettlementFormStory = StoryObj<typeof SettlementForm>;

const sampleOwners = [
  { userId: 'user-1', user: { id: 'user-1', email: 'alice@example.com' } },
  { userId: 'user-2', user: { id: 'user-2', email: 'bob@example.com' } },
  { userId: 'user-3', user: { id: 'user-3', email: 'charlie@example.com' } },
];

export const FormOpen: SettlementFormStory = {
  ...settlementFormMeta,
  args: {
    open: true,
    onClose: () => {},
    propertyId: 'prop-1',
    owners: sampleOwners,
    balances: sampleBalances,
    onSuccess: () => {},
  },
};

export const FormWithSuggestions: SettlementFormStory = {
  ...settlementFormMeta,
  args: {
    open: true,
    onClose: () => {},
    propertyId: 'prop-1',
    owners: sampleOwners,
    balances: sampleBalances,
    onSuccess: () => {},
    suggestedFrom: 'user-2',
    suggestedTo: 'user-1',
    suggestedAmount: 250.0,
  },
};

// ---------------------------------------------------------------------------
// SettlementHistory stories
// ---------------------------------------------------------------------------

const settlementHistoryMeta: Meta<typeof SettlementHistory> = {
  title: 'Composed/Settlement/SettlementHistory',
  component: SettlementHistory,
};

type SettlementHistoryStory = StoryObj<typeof SettlementHistory>;

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

export const EmptyHistory: SettlementHistoryStory = {
  ...settlementHistoryMeta,
  args: {
    settlements: [],
  },
};

export const PopulatedHistory: SettlementHistoryStory = {
  ...settlementHistoryMeta,
  args: {
    settlements: sampleSettlements,
  },
};
