import type { Meta, StoryObj } from '@storybook/react-vite';
import { ToastProvider } from '../../../contexts/ToastContext';
import { SettlementForm } from './SettlementForm';
import type { Balance } from './BalanceCard';

const meta: Meta<typeof SettlementForm> = {
  title: 'Composed/Settlement/SettlementForm',
  component: SettlementForm,
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof SettlementForm>;

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

const sampleOwners = [
  { userId: 'user-1', user: { id: 'user-1', email: 'alice@example.com' } },
  { userId: 'user-2', user: { id: 'user-2', email: 'bob@example.com' } },
  { userId: 'user-3', user: { id: 'user-3', email: 'charlie@example.com' } },
];

export const FormOpen: Story = {
  args: {
    open: true,
    onClose: () => {},
    propertyId: 'prop-1',
    owners: sampleOwners,
    balances: sampleBalances,
    onSuccess: () => {},
  },
};

export const FormWithSuggestions: Story = {
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
