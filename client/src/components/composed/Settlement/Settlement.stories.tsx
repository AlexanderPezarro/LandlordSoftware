import type { Meta, StoryObj } from '@storybook/react-vite';
import { BalanceCard } from './BalanceCard';
import type { Balance } from './BalanceCard';

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

