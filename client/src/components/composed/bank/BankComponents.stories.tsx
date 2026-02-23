import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { BankAccountsList } from './BankAccountsList';
import { ImportProgressDialog } from './ImportProgressDialog';
import { RuleEditor } from './RuleEditor';
import type { BankAccount } from '../../../services/api/bank.service';

// ---------------------------------------------------------------------------
// BankAccountsList stories
// ---------------------------------------------------------------------------

const bankAccountsListMeta: Meta<typeof BankAccountsList> = {
  title: 'Composed/Bank/BankAccountsList',
  component: BankAccountsList,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
};

export default bankAccountsListMeta;

type BankAccountsListStory = StoryObj<typeof BankAccountsList>;

const sampleAccounts: BankAccount[] = [
  {
    id: 'acc-1',
    accountId: 'monzo-123',
    accountName: 'Monzo Current Account',
    accountType: 'Current',
    provider: 'Monzo',
    syncEnabled: true,
    syncFromDate: '2025-12-01T00:00:00.000Z',
    lastSyncAt: new Date(Date.now() - 5 * 60000).toISOString(),
    lastSyncStatus: 'synced',
    webhookId: 'wh-123',
    webhookUrl: 'https://example.com/webhook',
    pendingCount: 3,
    createdAt: '2025-12-01T00:00:00.000Z',
    updatedAt: '2026-02-23T00:00:00.000Z',
  },
  {
    id: 'acc-2',
    accountId: 'monzo-456',
    accountName: 'Monzo Business Account',
    accountType: 'Business',
    provider: 'Monzo',
    syncEnabled: true,
    syncFromDate: '2025-11-01T00:00:00.000Z',
    lastSyncAt: null,
    lastSyncStatus: 'never_synced',
    webhookId: null,
    webhookUrl: null,
    pendingCount: 0,
    createdAt: '2025-11-01T00:00:00.000Z',
    updatedAt: '2026-02-23T00:00:00.000Z',
  },
  {
    id: 'acc-3',
    accountId: 'monzo-789',
    accountName: 'Property Expenses',
    accountType: 'Current',
    provider: 'Monzo',
    syncEnabled: false,
    syncFromDate: '2025-10-01T00:00:00.000Z',
    lastSyncAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    lastSyncStatus: 'error',
    webhookId: 'wh-789',
    webhookUrl: 'https://example.com/webhook',
    pendingCount: 12,
    createdAt: '2025-10-01T00:00:00.000Z',
    updatedAt: '2026-02-23T00:00:00.000Z',
  },
];

export const MultipleAccounts: BankAccountsListStory = {
  args: {
    accounts: sampleAccounts,
  },
};

export const SingleAccount: BankAccountsListStory = {
  args: {
    accounts: [sampleAccounts[0]],
  },
};

export const SyncingAccount: BankAccountsListStory = {
  args: {
    accounts: [
      {
        ...sampleAccounts[0],
        lastSyncStatus: 'syncing',
      },
    ],
  },
};

export const EmptyAccounts: BankAccountsListStory = {
  args: {
    accounts: [],
  },
};

// ---------------------------------------------------------------------------
// ImportProgressDialog stories
// ---------------------------------------------------------------------------

const importProgressMeta: Meta<typeof ImportProgressDialog> = {
  title: 'Composed/Bank/ImportProgressDialog',
  component: ImportProgressDialog,
};

type ImportProgressStory = StoryObj<typeof ImportProgressDialog>;

export const DialogOpen: ImportProgressStory = {
  ...importProgressMeta,
  args: {
    open: true,
    syncLogId: 'sync-123',
    onClose: () => {},
  },
};

// ---------------------------------------------------------------------------
// RuleEditor stories
// ---------------------------------------------------------------------------

const ruleEditorMeta: Meta<typeof RuleEditor> = {
  title: 'Composed/Bank/RuleEditor',
  component: RuleEditor,
};

type RuleEditorStory = StoryObj<typeof RuleEditor>;

const sampleProperties = [
  { id: 'prop-1', name: '42 Oakwood Drive' },
  { id: 'prop-2', name: '15 Victoria Street' },
  { id: 'prop-3', name: '8 Riverside Court' },
];

export const NewRule: RuleEditorStory = {
  ...ruleEditorMeta,
  args: {
    onSave: () => {},
    onCancel: () => {},
    onTest: () => {},
    properties: sampleProperties,
  },
};

export const EditingRule: RuleEditorStory = {
  ...ruleEditorMeta,
  args: {
    initialData: {
      name: 'Rent Payments',
      enabled: true,
      conditions: {
        operator: 'OR',
        rules: [
          {
            field: 'description',
            matchType: 'contains',
            value: 'rent',
            caseSensitive: false,
          },
          {
            field: 'counterpartyName',
            matchType: 'startsWith',
            value: 'Tenant',
            caseSensitive: false,
          },
        ],
      },
      propertyId: 'prop-1',
      type: 'INCOME',
      category: 'Rent',
    },
    onSave: () => {},
    onCancel: () => {},
    onTest: () => {},
    properties: sampleProperties,
  },
};

export const RuleEditorLoading: RuleEditorStory = {
  ...ruleEditorMeta,
  args: {
    initialData: {
      name: 'Utility Bills',
      enabled: true,
      conditions: {
        operator: 'AND',
        rules: [
          {
            field: 'description',
            matchType: 'contains',
            value: 'utility',
            caseSensitive: false,
          },
        ],
      },
      propertyId: null,
      type: 'EXPENSE',
      category: 'Utilities',
    },
    onSave: () => {},
    onCancel: () => {},
    loading: true,
    properties: sampleProperties,
  },
};

// ---------------------------------------------------------------------------
// WebhookStatusWidget stories
// ---------------------------------------------------------------------------
// Note: WebhookStatusWidget fetches data internally from bankService,
// so it is not easily driven by Storybook args without mocking the service.
// Include it as documentation only in the story file.
