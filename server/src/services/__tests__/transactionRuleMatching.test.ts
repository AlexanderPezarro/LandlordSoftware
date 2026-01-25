import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { processTransactions } from '../transactionProcessor.js';
import prisma from '../../db/client.js';
import { encryptToken } from '../encryption.js';
import type { MonzoTransaction } from '../monzo/types.js';

describe('Transaction Rule Matching and Creation', () => {
  let testBankAccountId: string;
  let testPropertyId: string;
  const testAccountId = 'acc_test_rule_matching_123';

  beforeAll(async () => {
    // Clean database
    await prisma.pendingTransaction.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.bankTransaction.deleteMany({});
    await prisma.matchingRule.deleteMany({});
    await prisma.bankAccount.deleteMany({});
    await prisma.lease.deleteMany({});
    await prisma.tenant.deleteMany({});
    await prisma.property.deleteMany({});

    // Create test property
    const property = await prisma.property.create({
      data: {
        name: 'Test Property',
        street: '123 Test St',
        city: 'Test City',
        county: 'Test County',
        postcode: 'TE1 1ST',
        propertyType: 'House',
        status: 'Occupied',
      },
    });
    testPropertyId = property.id;

    // Create test bank account
    const bankAccount = await prisma.bankAccount.create({
      data: {
        accountId: testAccountId,
        accountName: 'Test Rule Matching Account',
        accountType: 'uk_retail',
        provider: 'monzo',
        accessToken: encryptToken('test_access_token'),
        refreshToken: encryptToken('test_refresh_token'),
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        syncEnabled: true,
        syncFromDate: new Date('2024-01-01'),
        lastSyncStatus: 'never_synced',
      },
    });
    testBankAccountId = bankAccount.id;
  });

  afterAll(async () => {
    // Clean up after all tests
    await prisma.pendingTransaction.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.bankTransaction.deleteMany({});
    await prisma.matchingRule.deleteMany({});
    await prisma.bankAccount.deleteMany({});
    await prisma.lease.deleteMany({});
    await prisma.tenant.deleteMany({});
    await prisma.property.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean before each test
    await prisma.pendingTransaction.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.bankTransaction.deleteMany({});
    await prisma.matchingRule.deleteMany({});
  });

  describe('fully matched transactions', () => {
    it('should create Transaction when all three fields are matched (propertyId, type, category)', async () => {
      // Create a matching rule that matches all three fields
      await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccountId,
          priority: 0,
          enabled: true,
          name: 'Rent Payment Rule',
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [
              {
                field: 'description',
                matchType: 'contains',
                value: 'rent payment',
                caseSensitive: false,
              },
            ],
          }),
          propertyId: testPropertyId,
          type: 'INCOME',
          category: 'Rent',
        },
      });

      const monzoTransactions: MonzoTransaction[] = [
        {
          id: 'tx_001',
          account_id: testAccountId,
          created: '2024-01-15T10:30:00Z',
          description: 'Monthly Rent Payment',
          amount: -150000, // £1,500 income (negative in Monzo = money in)
          currency: 'GBP',
          notes: '',
          settled: '2024-01-15T10:30:00Z',
        },
      ];

      const result = await processTransactions(monzoTransactions, testBankAccountId);

      expect(result.processed).toBe(1);
      expect(result.errors).toHaveLength(0);

      // Verify Transaction was created
      const transaction = await prisma.transaction.findFirst({
        where: {
          propertyId: testPropertyId,
        },
      });

      expect(transaction).toBeDefined();
      expect(transaction?.propertyId).toBe(testPropertyId);
      expect(transaction?.type).toBe('Income');
      expect(transaction?.category).toBe('Rent');
      expect(transaction?.amount).toBe(-1500); // Preserve sign from BankTransaction
      expect(transaction?.description).toBe('Monthly Rent Payment');
      expect(transaction?.isImported).toBe(true);
      expect(transaction?.importedAt).toBeDefined();

      // Verify BankTransaction is linked to Transaction
      const bankTransaction = await prisma.bankTransaction.findFirst({
        where: { externalId: 'tx_001' },
      });

      expect(bankTransaction?.transactionId).toBe(transaction?.id);
      expect(bankTransaction?.pendingTransactionId).toBeNull();

      // Verify no PendingTransaction was created
      const pendingTransactionCount = await prisma.pendingTransaction.count();
      expect(pendingTransactionCount).toBe(0);
    });

    it('should correctly convert INCOME type to Income', async () => {
      await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccountId,
          priority: 0,
          enabled: true,
          name: 'Security Deposit Rule',
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [
              {
                field: 'description',
                matchType: 'contains',
                value: 'security deposit',
              },
            ],
          }),
          propertyId: testPropertyId,
          type: 'INCOME',
          category: 'Security Deposit',
        },
      });

      const monzoTransactions: MonzoTransaction[] = [
        {
          id: 'tx_001',
          account_id: testAccountId,
          created: '2024-01-15T10:30:00Z',
          description: 'Security Deposit Payment',
          amount: -100000, // £1,000
          currency: 'GBP',
          notes: '',
          settled: '2024-01-15T10:30:00Z',
        },
      ];

      await processTransactions(monzoTransactions, testBankAccountId);

      const transaction = await prisma.transaction.findFirst();
      expect(transaction?.type).toBe('Income');
      expect(transaction?.category).toBe('Security Deposit');
    });

    it('should correctly convert EXPENSE type to Expense', async () => {
      await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccountId,
          priority: 0,
          enabled: true,
          name: 'Maintenance Rule',
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [
              {
                field: 'description',
                matchType: 'contains',
                value: 'plumber',
              },
            ],
          }),
          propertyId: testPropertyId,
          type: 'EXPENSE',
          category: 'Maintenance',
        },
      });

      const monzoTransactions: MonzoTransaction[] = [
        {
          id: 'tx_001',
          account_id: testAccountId,
          created: '2024-01-15T10:30:00Z',
          description: 'Plumber service call',
          amount: 15000, // £150 expense
          currency: 'GBP',
          notes: '',
          settled: '2024-01-15T10:30:00Z',
        },
      ];

      await processTransactions(monzoTransactions, testBankAccountId);

      const transaction = await prisma.transaction.findFirst();
      expect(transaction?.type).toBe('Expense');
      expect(transaction?.category).toBe('Maintenance');
    });

    it('should preserve amount sign from BankTransaction', async () => {
      await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccountId,
          priority: 0,
          enabled: true,
          name: 'Test Rule',
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'test' }],
          }),
          propertyId: testPropertyId,
          type: 'EXPENSE',
          category: 'Other',
        },
      });

      const monzoTransactions: MonzoTransaction[] = [
        {
          id: 'tx_001',
          account_id: testAccountId,
          created: '2024-01-15T10:30:00Z',
          description: 'Test transaction',
          amount: 5000, // Positive amount
          currency: 'GBP',
          notes: '',
          settled: '2024-01-15T10:30:00Z',
        },
      ];

      await processTransactions(monzoTransactions, testBankAccountId);

      const transaction = await prisma.transaction.findFirst();
      expect(transaction?.amount).toBe(50); // Preserves positive
    });

    it('should handle all Income categories correctly', async () => {
      const categories = ['Rent', 'Security Deposit', 'Late Fee', 'Lease Fee'];

      for (const category of categories) {
        await prisma.matchingRule.deleteMany({});
        await prisma.transaction.deleteMany({});
        await prisma.bankTransaction.deleteMany({});

        await prisma.matchingRule.create({
          data: {
            bankAccountId: testBankAccountId,
            priority: 0,
            enabled: true,
            name: `${category} Rule`,
            conditions: JSON.stringify({
              operator: 'AND',
              rules: [{ field: 'description', matchType: 'equals', value: category }],
            }),
            propertyId: testPropertyId,
            type: 'INCOME',
            category,
          },
        });

        const monzoTransactions: MonzoTransaction[] = [
          {
            id: `tx_${category}`,
            account_id: testAccountId,
            created: '2024-01-15T10:30:00Z',
            description: category,
            amount: -10000,
            currency: 'GBP',
            notes: '',
            settled: '2024-01-15T10:30:00Z',
          },
        ];

        await processTransactions(monzoTransactions, testBankAccountId);

        const transaction = await prisma.transaction.findFirst();
        expect(transaction?.type).toBe('Income');
        expect(transaction?.category).toBe(category);
      }
    });

    it('should handle all Expense categories correctly', async () => {
      const categories = [
        'Maintenance',
        'Repair',
        'Utilities',
        'Insurance',
        'Property Tax',
        'Management Fee',
        'Legal Fee',
        'Transport',
        'Other',
      ];

      for (const category of categories) {
        await prisma.matchingRule.deleteMany({});
        await prisma.transaction.deleteMany({});
        await prisma.bankTransaction.deleteMany({});

        await prisma.matchingRule.create({
          data: {
            bankAccountId: testBankAccountId,
            priority: 0,
            enabled: true,
            name: `${category} Rule`,
            conditions: JSON.stringify({
              operator: 'AND',
              rules: [{ field: 'description', matchType: 'equals', value: category }],
            }),
            propertyId: testPropertyId,
            type: 'EXPENSE',
            category,
          },
        });

        const monzoTransactions: MonzoTransaction[] = [
          {
            id: `tx_${category}`,
            account_id: testAccountId,
            created: '2024-01-15T10:30:00Z',
            description: category,
            amount: 10000,
            currency: 'GBP',
            notes: '',
            settled: '2024-01-15T10:30:00Z',
          },
        ];

        await processTransactions(monzoTransactions, testBankAccountId);

        const transaction = await prisma.transaction.findFirst();
        expect(transaction?.type).toBe('Expense');
        expect(transaction?.category).toBe(category);
      }
    });
  });

  describe('partially matched transactions', () => {
    it('should create PendingTransaction when only propertyId is matched', async () => {
      await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccountId,
          priority: 0,
          enabled: true,
          name: 'Property Only Rule',
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'property' }],
          }),
          propertyId: testPropertyId,
          type: null,
          category: null,
        },
      });

      const monzoTransactions: MonzoTransaction[] = [
        {
          id: 'tx_001',
          account_id: testAccountId,
          created: '2024-01-15T10:30:00Z',
          description: 'Property related transaction',
          amount: 10000,
          currency: 'GBP',
          notes: '',
          settled: '2024-01-15T10:30:00Z',
        },
      ];

      await processTransactions(monzoTransactions, testBankAccountId);

      // Verify no Transaction was created
      const transactionCount = await prisma.transaction.count();
      expect(transactionCount).toBe(0);

      // Verify PendingTransaction was created with propertyId
      const pendingTransaction = await prisma.pendingTransaction.findFirst();
      expect(pendingTransaction).toBeDefined();
      expect(pendingTransaction?.propertyId).toBe(testPropertyId);
      expect(pendingTransaction?.type).toBeNull();
      expect(pendingTransaction?.category).toBeNull();
      expect(pendingTransaction?.description).toBe('Property related transaction');

      // Verify BankTransaction is linked to PendingTransaction
      const bankTransaction = await prisma.bankTransaction.findFirst({
        where: { externalId: 'tx_001' },
      });
      expect(bankTransaction?.pendingTransactionId).toBe(pendingTransaction?.id);
      expect(bankTransaction?.transactionId).toBeNull();
    });

    it('should create PendingTransaction when only type and category are matched', async () => {
      await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccountId,
          priority: 0,
          enabled: true,
          name: 'Type Category Only Rule',
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'maintenance' }],
          }),
          propertyId: null,
          type: 'EXPENSE',
          category: 'Maintenance',
        },
      });

      const monzoTransactions: MonzoTransaction[] = [
        {
          id: 'tx_001',
          account_id: testAccountId,
          created: '2024-01-15T10:30:00Z',
          description: 'Maintenance work',
          amount: 5000,
          currency: 'GBP',
          notes: '',
          settled: '2024-01-15T10:30:00Z',
        },
      ];

      await processTransactions(monzoTransactions, testBankAccountId);

      // Verify PendingTransaction was created with type and category
      const pendingTransaction = await prisma.pendingTransaction.findFirst();
      expect(pendingTransaction).toBeDefined();
      expect(pendingTransaction?.propertyId).toBeNull();
      expect(pendingTransaction?.type).toBe('Expense');
      expect(pendingTransaction?.category).toBe('Maintenance');
    });

    it('should create PendingTransaction when propertyId and type are matched but not category', async () => {
      await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccountId,
          priority: 0,
          enabled: true,
          name: 'Property and Type Rule',
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'payment' }],
          }),
          propertyId: testPropertyId,
          type: 'INCOME',
          category: null,
        },
      });

      const monzoTransactions: MonzoTransaction[] = [
        {
          id: 'tx_001',
          account_id: testAccountId,
          created: '2024-01-15T10:30:00Z',
          description: 'Payment received',
          amount: -5000,
          currency: 'GBP',
          notes: '',
          settled: '2024-01-15T10:30:00Z',
        },
      ];

      await processTransactions(monzoTransactions, testBankAccountId);

      const pendingTransaction = await prisma.pendingTransaction.findFirst();
      expect(pendingTransaction).toBeDefined();
      expect(pendingTransaction?.propertyId).toBe(testPropertyId);
      expect(pendingTransaction?.type).toBe('Income');
      expect(pendingTransaction?.category).toBeNull();
    });
  });

  describe('unmatched transactions', () => {
    it('should create PendingTransaction with no fields when no rules match', async () => {
      // Create a rule that won't match
      await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccountId,
          priority: 0,
          enabled: true,
          name: 'Non-matching Rule',
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'will_not_match' }],
          }),
          propertyId: testPropertyId,
          type: 'INCOME',
          category: 'Rent',
        },
      });

      const monzoTransactions: MonzoTransaction[] = [
        {
          id: 'tx_001',
          account_id: testAccountId,
          created: '2024-01-15T10:30:00Z',
          description: 'Random transaction',
          amount: 10000,
          currency: 'GBP',
          notes: '',
          settled: '2024-01-15T10:30:00Z',
        },
      ];

      await processTransactions(monzoTransactions, testBankAccountId);

      // Verify PendingTransaction was created with no matched fields
      const pendingTransaction = await prisma.pendingTransaction.findFirst();
      expect(pendingTransaction).toBeDefined();
      expect(pendingTransaction?.propertyId).toBeNull();
      expect(pendingTransaction?.type).toBeNull();
      expect(pendingTransaction?.category).toBeNull();
      expect(pendingTransaction?.description).toBe('Random transaction');
    });

    it('should create PendingTransaction when no rules exist', async () => {
      const monzoTransactions: MonzoTransaction[] = [
        {
          id: 'tx_001',
          account_id: testAccountId,
          created: '2024-01-15T10:30:00Z',
          description: 'Transaction with no rules',
          amount: 10000,
          currency: 'GBP',
          notes: '',
          settled: '2024-01-15T10:30:00Z',
        },
      ];

      await processTransactions(monzoTransactions, testBankAccountId);

      const pendingTransaction = await prisma.pendingTransaction.findFirst();
      expect(pendingTransaction).toBeDefined();
      expect(pendingTransaction?.propertyId).toBeNull();
      expect(pendingTransaction?.type).toBeNull();
      expect(pendingTransaction?.category).toBeNull();
    });
  });

  describe('validation', () => {
    it('should create PendingTransaction when property does not exist', async () => {
      const nonExistentPropertyId = '00000000-0000-0000-0000-000000000000';

      await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccountId,
          priority: 0,
          enabled: true,
          name: 'Invalid Property Rule',
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'test' }],
          }),
          propertyId: nonExistentPropertyId,
          type: 'INCOME',
          category: 'Rent',
        },
      });

      const monzoTransactions: MonzoTransaction[] = [
        {
          id: 'tx_001',
          account_id: testAccountId,
          created: '2024-01-15T10:30:00Z',
          description: 'Test transaction',
          amount: -10000,
          currency: 'GBP',
          notes: '',
          settled: '2024-01-15T10:30:00Z',
        },
      ];

      await processTransactions(monzoTransactions, testBankAccountId);

      // Should create PendingTransaction instead of Transaction
      const transactionCount = await prisma.transaction.count();
      expect(transactionCount).toBe(0);

      const pendingTransaction = await prisma.pendingTransaction.findFirst();
      expect(pendingTransaction).toBeDefined();
      // The matched fields should still be stored for review
      expect(pendingTransaction?.propertyId).toBe(nonExistentPropertyId);
      expect(pendingTransaction?.type).toBe('Income');
      expect(pendingTransaction?.category).toBe('Rent');
    });

    it('should create PendingTransaction when type/category combination is invalid', async () => {
      await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccountId,
          priority: 0,
          enabled: true,
          name: 'Invalid Type/Category Rule',
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'test' }],
          }),
          propertyId: testPropertyId,
          type: 'INCOME',
          category: 'Maintenance', // Maintenance is an Expense category, not Income
        },
      });

      const monzoTransactions: MonzoTransaction[] = [
        {
          id: 'tx_001',
          account_id: testAccountId,
          created: '2024-01-15T10:30:00Z',
          description: 'Test transaction',
          amount: -10000,
          currency: 'GBP',
          notes: '',
          settled: '2024-01-15T10:30:00Z',
        },
      ];

      await processTransactions(monzoTransactions, testBankAccountId);

      // Should create PendingTransaction instead of Transaction
      const transactionCount = await prisma.transaction.count();
      expect(transactionCount).toBe(0);

      const pendingTransaction = await prisma.pendingTransaction.findFirst();
      expect(pendingTransaction).toBeDefined();
      // The matched fields should still be stored for review
      expect(pendingTransaction?.propertyId).toBe(testPropertyId);
      expect(pendingTransaction?.type).toBe('Income');
      expect(pendingTransaction?.category).toBe('Maintenance');
    });
  });

  describe('rule priority and accumulation', () => {
    it('should accumulate fields from multiple rules in priority order', async () => {
      // Rule 1: Matches property (priority 0)
      await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccountId,
          priority: 0,
          enabled: true,
          name: 'Property Rule',
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'transaction' }],
          }),
          propertyId: testPropertyId,
          type: null,
          category: null,
        },
      });

      // Rule 2: Matches type and category (priority 1)
      await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccountId,
          priority: 1,
          enabled: true,
          name: 'Type/Category Rule',
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'transaction' }],
          }),
          propertyId: null,
          type: 'EXPENSE',
          category: 'Maintenance',
        },
      });

      const monzoTransactions: MonzoTransaction[] = [
        {
          id: 'tx_001',
          account_id: testAccountId,
          created: '2024-01-15T10:30:00Z',
          description: 'Transaction test',
          amount: 10000,
          currency: 'GBP',
          notes: '',
          settled: '2024-01-15T10:30:00Z',
        },
      ];

      await processTransactions(monzoTransactions, testBankAccountId);

      // Should create Transaction with all fields accumulated
      const transaction = await prisma.transaction.findFirst();
      expect(transaction).toBeDefined();
      expect(transaction?.propertyId).toBe(testPropertyId);
      expect(transaction?.type).toBe('Expense');
      expect(transaction?.category).toBe('Maintenance');
    });

    it('should respect global rules (null bankAccountId)', async () => {
      // Create a global rule
      await prisma.matchingRule.create({
        data: {
          bankAccountId: null, // Global rule
          priority: 0,
          enabled: true,
          name: 'Global Rule',
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'global' }],
          }),
          propertyId: testPropertyId,
          type: 'INCOME',
          category: 'Rent',
        },
      });

      const monzoTransactions: MonzoTransaction[] = [
        {
          id: 'tx_001',
          account_id: testAccountId,
          created: '2024-01-15T10:30:00Z',
          description: 'Global transaction',
          amount: -10000,
          currency: 'GBP',
          notes: '',
          settled: '2024-01-15T10:30:00Z',
        },
      ];

      await processTransactions(monzoTransactions, testBankAccountId);

      const transaction = await prisma.transaction.findFirst();
      expect(transaction).toBeDefined();
      expect(transaction?.propertyId).toBe(testPropertyId);
    });

    it('should prefer account-specific rules over global rules', async () => {
      // Create a global rule (priority 0)
      await prisma.matchingRule.create({
        data: {
          bankAccountId: null,
          priority: 0,
          enabled: true,
          name: 'Global Rule',
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'test' }],
          }),
          propertyId: null,
          type: 'INCOME',
          category: 'Rent',
        },
      });

      // Create an account-specific rule (priority 0)
      await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccountId,
          priority: 0,
          enabled: true,
          name: 'Account Rule',
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'test' }],
          }),
          propertyId: testPropertyId,
          type: 'EXPENSE',
          category: 'Maintenance',
        },
      });

      const monzoTransactions: MonzoTransaction[] = [
        {
          id: 'tx_001',
          account_id: testAccountId,
          created: '2024-01-15T10:30:00Z',
          description: 'Test transaction',
          amount: 10000,
          currency: 'GBP',
          notes: '',
          settled: '2024-01-15T10:30:00Z',
        },
      ];

      await processTransactions(monzoTransactions, testBankAccountId);

      // Should use account-specific rule
      const transaction = await prisma.transaction.findFirst();
      expect(transaction).toBeDefined();
      expect(transaction?.type).toBe('Expense');
      expect(transaction?.category).toBe('Maintenance');
    });
  });

  describe('multiple transactions', () => {
    it('should handle mix of fully matched, partially matched, and unmatched transactions', async () => {
      // Create rules
      await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccountId,
          priority: 0,
          enabled: true,
          name: 'Rent Rule',
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'rent' }],
          }),
          propertyId: testPropertyId,
          type: 'INCOME',
          category: 'Rent',
        },
      });

      await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccountId,
          priority: 1,
          enabled: true,
          name: 'Partial Rule',
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'partial' }],
          }),
          propertyId: testPropertyId,
          type: null,
          category: null,
        },
      });

      const monzoTransactions: MonzoTransaction[] = [
        {
          id: 'tx_001',
          account_id: testAccountId,
          created: '2024-01-15T10:30:00Z',
          description: 'Rent payment',
          amount: -100000,
          currency: 'GBP',
          notes: '',
          settled: '2024-01-15T10:30:00Z',
        },
        {
          id: 'tx_002',
          account_id: testAccountId,
          created: '2024-01-16T10:30:00Z',
          description: 'Partial match transaction',
          amount: 5000,
          currency: 'GBP',
          notes: '',
          settled: '2024-01-16T10:30:00Z',
        },
        {
          id: 'tx_003',
          account_id: testAccountId,
          created: '2024-01-17T10:30:00Z',
          description: 'No match transaction',
          amount: 3000,
          currency: 'GBP',
          notes: '',
          settled: '2024-01-17T10:30:00Z',
        },
      ];

      const result = await processTransactions(monzoTransactions, testBankAccountId);

      expect(result.processed).toBe(3);
      expect(result.errors).toHaveLength(0);

      // Verify 1 Transaction created
      const transactionCount = await prisma.transaction.count();
      expect(transactionCount).toBe(1);

      const transaction = await prisma.transaction.findFirst({
        where: { description: 'Rent payment' },
      });
      expect(transaction).toBeDefined();

      // Verify 2 PendingTransactions created
      const pendingTransactionCount = await prisma.pendingTransaction.count();
      expect(pendingTransactionCount).toBe(2);

      const partialPending = await prisma.pendingTransaction.findFirst({
        where: { description: 'Partial match transaction' },
      });
      expect(partialPending?.propertyId).toBe(testPropertyId);

      const noMatchPending = await prisma.pendingTransaction.findFirst({
        where: { description: 'No match transaction' },
      });
      expect(noMatchPending?.propertyId).toBeNull();
    });
  });

  describe('PendingTransaction fields', () => {
    it('should copy all required fields to PendingTransaction', async () => {
      const monzoTransactions: MonzoTransaction[] = [
        {
          id: 'tx_001',
          account_id: testAccountId,
          created: '2024-01-15T10:30:00Z',
          description: 'Test transaction',
          amount: 10000,
          currency: 'GBP',
          notes: '',
          settled: '2024-01-15T10:30:00Z',
        },
      ];

      await processTransactions(monzoTransactions, testBankAccountId);

      const bankTransaction = await prisma.bankTransaction.findFirst({
        where: { externalId: 'tx_001' },
      });

      const pendingTransaction = await prisma.pendingTransaction.findFirst();
      expect(pendingTransaction).toBeDefined();
      expect(pendingTransaction?.bankTransactionId).toBe(bankTransaction?.id);
      expect(pendingTransaction?.description).toBe('Test transaction');
      expect(pendingTransaction?.transactionDate).toEqual(new Date('2024-01-15T10:30:00Z'));
      expect(pendingTransaction?.createdAt).toBeDefined();
      expect(pendingTransaction?.reviewedAt).toBeNull();
      expect(pendingTransaction?.reviewedBy).toBeNull();
    });
  });
});
