import React from 'react';
import Table from '../../primitives/Table';
import TransactionRow from './TransactionRow';
import type { Transaction } from '../../../types/api.types';

/* ------------------------------------------------------------------ */
/*  Storybook CSF3 – works once @storybook/react is installed         */
/* ------------------------------------------------------------------ */

export default {
  title: 'Composed/TransactionRow',
  component: TransactionRow,
  decorators: [
    (Story: React.FC) => (
      <Table>
        <Table.Head>
          <Table.Row>
            <Table.Cell as="th">Date</Table.Cell>
            <Table.Cell as="th">Property</Table.Cell>
            <Table.Cell as="th">Type</Table.Cell>
            <Table.Cell as="th">Category</Table.Cell>
            <Table.Cell as="th">Amount</Table.Cell>
            <Table.Cell as="th">Actions</Table.Cell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <Story />
        </Table.Body>
      </Table>
    ),
  ],
};

/* ---- Shared helpers ---- */

const baseTransaction: Transaction = {
  id: 'txn-001',
  propertyId: 'prop-001',
  type: 'Income',
  category: 'Rent',
  amount: 1200,
  transactionDate: '2025-06-15T00:00:00.000Z',
  description: 'Monthly rent',
  createdAt: '2025-06-01T00:00:00.000Z',
  updatedAt: '2025-06-01T00:00:00.000Z',
  property: {
    id: 'prop-001',
    name: '42 Oak Avenue',
    street: '42 Oak Avenue',
    city: 'London',
    county: 'Greater London',
    postcode: 'SW1A 1AA',
    propertyType: 'Flat',
    status: 'Occupied',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
};

const noop = () => {
  /* no-op for stories */
};

/* ---- Stories ---- */

/** Rent payment shown in green. */
export const IncomeRow = {
  args: {
    transaction: { ...baseTransaction },
    onEdit: noop,
    onDelete: noop,
  },
};

/** Maintenance expense shown in red. */
export const ExpenseRow = {
  args: {
    transaction: {
      ...baseTransaction,
      id: 'txn-002',
      type: 'Expense' as const,
      category: 'Maintenance',
      amount: 350,
      description: 'Boiler repair',
    },
    onEdit: noop,
    onDelete: noop,
  },
};

/** Transaction with ownership splits. */
export const SplitTransaction = {
  args: {
    transaction: {
      ...baseTransaction,
      id: 'txn-003',
      type: 'Expense' as const,
      category: 'Insurance',
      amount: 800,
      description: 'Building insurance premium',
      splits: [
        { userId: 'user-1', percentage: 60, amount: 480 },
        { userId: 'user-2', percentage: 40, amount: 320 },
      ],
      paidByUserId: 'user-1',
      paidBy: { id: 'user-1', email: 'owner@example.com' },
    },
    onEdit: noop,
    onDelete: noop,
  },
};
