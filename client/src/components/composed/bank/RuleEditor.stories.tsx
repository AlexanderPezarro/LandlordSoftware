import type { Meta, StoryObj } from '@storybook/react-vite';
import { RuleEditor } from './RuleEditor';

const meta: Meta<typeof RuleEditor> = {
  title: 'Composed/Bank/RuleEditor',
  component: RuleEditor,
};

export default meta;

type Story = StoryObj<typeof RuleEditor>;

const sampleProperties = [
  { id: 'prop-1', name: '42 Oakwood Drive' },
  { id: 'prop-2', name: '15 Victoria Street' },
  { id: 'prop-3', name: '8 Riverside Court' },
];

export const NewRule: Story = {
  args: {
    onSave: () => {},
    onCancel: () => {},
    onTest: () => {},
    properties: sampleProperties,
  },
};

export const EditingRule: Story = {
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

export const RuleEditorLoading: Story = {
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
