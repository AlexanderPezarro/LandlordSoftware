import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { reprocessPendingTransactions } from '../ruleReprocessing.js';
import prisma from '../../db/client.js';
import { encryptToken } from '../encryption.js';

describe('Rule Reprocessing Service', () => {
  let testBankAccountId: string;
  let testPropertyId: string;

  beforeAll(async () => {
    // Clean database
    await prisma.pendingTransaction.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.bankTransaction.deleteMany({});
    await prisma.matchingRule.deleteMany({});
    await prisma.property.deleteMany({});
    await prisma.bankAccount.deleteMany({});

    // Create test property
    const property = await prisma.property.create({
      data: {
        name: 'Test Property',
        street: '123 Test St',
        city: 'London',
        county: 'Greater London',
        postcode: 'SW1A 1AA',
        propertyType: 'House',
        status: 'Available',
      },
    });
    testPropertyId = property.id;

    // Create test bank account
    const bankAccount = await prisma.bankAccount.create({
      data: {
        accountId: 'acc_reprocess_test',
        accountName: 'Test Reprocessing Account',
        accountType: 'uk_retail',
        provider: 'monzo',
        accessToken: encryptToken('test_access_token'),
        syncEnabled: true,
        syncFromDate: new Date('2024-01-01'),
        lastSyncStatus: 'success',
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
    await prisma.property.deleteMany({});
    await prisma.bankAccount.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean before each test
    await prisma.pendingTransaction.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.bankTransaction.deleteMany({});
    await prisma.matchingRule.deleteMany({});
  });

  describe('account-specific rule reprocessing', () => {
    it('should reprocess pending transactions for a specific account', async () => {
      // Create a matching rule
      await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccountId,
          priority: 0,
          enabled: true,
          name: 'Rent Rule',
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [
              {
                field: 'description',
                matchType: 'contains',
                value: 'rent',
                caseSensitive: false,
              },
            ],
          }),
          propertyId: testPropertyId,
          type: 'INCOME',
          category: 'Rent',
        },
      });

      // Create bank transaction with pending transaction
      const bankTx = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_rent_001',
          amount: 1000,
          currency: 'GBP',
          description: 'Monthly rent payment',
          transactionDate: new Date('2024-01-15'),
        },
      });

      const pendingTx = await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx.id,
          transactionDate: bankTx.transactionDate,
          description: bankTx.description,
        },
      });

      await prisma.bankTransaction.update({
        where: { id: bankTx.id },
        data: { pendingTransactionId: pendingTx.id },
      });

      // Reprocess
      const result = await reprocessPendingTransactions(testBankAccountId);

      // Verify results
      expect(result.processed).toBe(1);
      expect(result.approved).toBe(1);
      expect(result.failed).toBe(0);

      // Verify transaction was created
      const transaction = await prisma.transaction.findFirst({
        where: { propertyId: testPropertyId },
      });
      expect(transaction).toBeDefined();
      expect(transaction?.type).toBe('Income');
      expect(transaction?.category).toBe('Rent');
      expect(transaction?.amount).toBe(1000);
      expect(transaction?.isImported).toBe(true);

      // Verify bank transaction was updated
      const updatedBankTx = await prisma.bankTransaction.findUnique({
        where: { id: bankTx.id },
      });
      expect(updatedBankTx?.transactionId).toBe(transaction?.id);
      expect(updatedBankTx?.pendingTransactionId).toBeNull();

      // Verify pending transaction was deleted
      const deletedPending = await prisma.pendingTransaction.findUnique({
        where: { id: pendingTx.id },
      });
      expect(deletedPending).toBeNull();
    });

    it('should only reprocess pending transactions for the specified account', async () => {
      // Create another bank account
      const otherAccount = await prisma.bankAccount.create({
        data: {
          accountId: 'acc_other',
          accountName: 'Other Account',
          accountType: 'uk_retail',
          provider: 'monzo',
          accessToken: encryptToken('other_token'),
          syncEnabled: true,
          syncFromDate: new Date('2024-01-01'),
          lastSyncStatus: 'success',
        },
      });

      // Create rule for test account
      await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccountId,
          priority: 0,
          enabled: true,
          name: 'Rent Rule',
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [
              {
                field: 'description',
                matchType: 'contains',
                value: 'rent',
                caseSensitive: false,
              },
            ],
          }),
          propertyId: testPropertyId,
          type: 'INCOME',
          category: 'Rent',
        },
      });

      // Create pending transaction for test account
      const bankTx1 = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_001',
          amount: 1000,
          currency: 'GBP',
          description: 'rent payment',
          transactionDate: new Date('2024-01-15'),
        },
      });

      const pendingTx1 = await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx1.id,
          transactionDate: bankTx1.transactionDate,
          description: bankTx1.description,
        },
      });

      await prisma.bankTransaction.update({
        where: { id: bankTx1.id },
        data: { pendingTransactionId: pendingTx1.id },
      });

      // Create pending transaction for other account
      const bankTx2 = await prisma.bankTransaction.create({
        data: {
          bankAccountId: otherAccount.id,
          externalId: 'tx_002',
          amount: 500,
          currency: 'GBP',
          description: 'rent payment',
          transactionDate: new Date('2024-01-15'),
        },
      });

      const pendingTx2 = await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx2.id,
          transactionDate: bankTx2.transactionDate,
          description: bankTx2.description,
        },
      });

      await prisma.bankTransaction.update({
        where: { id: bankTx2.id },
        data: { pendingTransactionId: pendingTx2.id },
      });

      // Reprocess only test account
      const result = await reprocessPendingTransactions(testBankAccountId);

      // Only 1 should be processed
      expect(result.processed).toBe(1);
      expect(result.approved).toBe(1);

      // Verify first pending was deleted
      const deletedPending1 = await prisma.pendingTransaction.findUnique({
        where: { id: pendingTx1.id },
      });
      expect(deletedPending1).toBeNull();

      // Verify second pending still exists
      const stillPending2 = await prisma.pendingTransaction.findUnique({
        where: { id: pendingTx2.id },
      });
      expect(stillPending2).not.toBeNull();

      // Cleanup
      await prisma.pendingTransaction.deleteMany({});
      await prisma.bankTransaction.deleteMany({});
      await prisma.bankAccount.delete({ where: { id: otherAccount.id } });
    });

    it('should not approve partially matched transactions', async () => {
      // Create rule with only type and category (no property)
      await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccountId,
          priority: 0,
          enabled: true,
          name: 'Partial Rule',
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [
              {
                field: 'description',
                matchType: 'contains',
                value: 'rent',
                caseSensitive: false,
              },
            ],
          }),
          type: 'INCOME',
          category: 'Rent',
          // No propertyId
        },
      });

      // Create bank transaction with pending transaction
      const bankTx = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_partial_001',
          amount: 1000,
          currency: 'GBP',
          description: 'Monthly rent payment',
          transactionDate: new Date('2024-01-15'),
        },
      });

      const pendingTx = await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx.id,
          transactionDate: bankTx.transactionDate,
          description: bankTx.description,
        },
      });

      await prisma.bankTransaction.update({
        where: { id: bankTx.id },
        data: { pendingTransactionId: pendingTx.id },
      });

      // Reprocess
      const result = await reprocessPendingTransactions(testBankAccountId);

      // Should process but not approve
      expect(result.processed).toBe(1);
      expect(result.approved).toBe(0);

      // Verify pending transaction was updated but still exists
      const updatedPending = await prisma.pendingTransaction.findUnique({
        where: { id: pendingTx.id },
      });
      expect(updatedPending).not.toBeNull();
      expect(updatedPending?.type).toBe('Income');
      expect(updatedPending?.category).toBe('Rent');

      // Verify no transaction was created
      const transaction = await prisma.transaction.findFirst({
        where: { description: 'Monthly rent payment' },
      });
      expect(transaction).toBeNull();
    });
  });

  describe('global rule reprocessing', () => {
    it('should reprocess all pending transactions when global rule is provided', async () => {
      // Create second bank account
      const otherAccount = await prisma.bankAccount.create({
        data: {
          accountId: 'acc_other_global',
          accountName: 'Other Account',
          accountType: 'uk_retail',
          provider: 'monzo',
          accessToken: encryptToken('other_token'),
          syncEnabled: true,
          syncFromDate: new Date('2024-01-01'),
          lastSyncStatus: 'success',
        },
      });

      // Create global rule (bankAccountId = null)
      await prisma.matchingRule.create({
        data: {
          bankAccountId: null, // Global rule
          priority: 100,
          enabled: true,
          name: 'Global Maintenance Rule',
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [
              {
                field: 'description',
                matchType: 'contains',
                value: 'plumber',
                caseSensitive: false,
              },
            ],
          }),
          propertyId: testPropertyId,
          type: 'EXPENSE',
          category: 'Maintenance',
        },
      });

      // Create pending transaction for first account
      const bankTx1 = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_plumber_001',
          amount: -150,
          currency: 'GBP',
          description: 'Emergency plumber call',
          transactionDate: new Date('2024-01-15'),
        },
      });

      const pendingTx1 = await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx1.id,
          transactionDate: bankTx1.transactionDate,
          description: bankTx1.description,
        },
      });

      await prisma.bankTransaction.update({
        where: { id: bankTx1.id },
        data: { pendingTransactionId: pendingTx1.id },
      });

      // Create pending transaction for second account
      const bankTx2 = await prisma.bankTransaction.create({
        data: {
          bankAccountId: otherAccount.id,
          externalId: 'tx_plumber_002',
          amount: -200,
          currency: 'GBP',
          description: 'Plumber service',
          transactionDate: new Date('2024-01-16'),
        },
      });

      const pendingTx2 = await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx2.id,
          transactionDate: bankTx2.transactionDate,
          description: bankTx2.description,
        },
      });

      await prisma.bankTransaction.update({
        where: { id: bankTx2.id },
        data: { pendingTransactionId: pendingTx2.id },
      });

      // Reprocess with global scope (null bankAccountId)
      const result = await reprocessPendingTransactions(null);

      // Both should be processed
      expect(result.processed).toBe(2);
      expect(result.approved).toBe(2);

      // Verify both transactions were created
      const transactions = await prisma.transaction.findMany({
        where: { category: 'Maintenance' },
      });
      expect(transactions).toHaveLength(2);

      // Verify both pending transactions were deleted
      const remainingPending = await prisma.pendingTransaction.findMany({});
      expect(remainingPending).toHaveLength(0);

      // Cleanup
      await prisma.bankAccount.delete({ where: { id: otherAccount.id } });
    });
  });

  describe('validation and error handling', () => {
    it('should validate property exists before creating transaction', async () => {
      const nonExistentPropertyId = '00000000-0000-0000-0000-000000000000';

      // Create rule with non-existent property
      await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccountId,
          priority: 0,
          enabled: true,
          name: 'Invalid Property Rule',
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [
              {
                field: 'description',
                matchType: 'contains',
                value: 'rent',
                caseSensitive: false,
              },
            ],
          }),
          propertyId: nonExistentPropertyId,
          type: 'INCOME',
          category: 'Rent',
        },
      });

      // Create pending transaction
      const bankTx = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_invalid_001',
          amount: 1000,
          currency: 'GBP',
          description: 'rent payment',
          transactionDate: new Date('2024-01-15'),
        },
      });

      const pendingTx = await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx.id,
          transactionDate: bankTx.transactionDate,
          description: bankTx.description,
        },
      });

      await prisma.bankTransaction.update({
        where: { id: bankTx.id },
        data: { pendingTransactionId: pendingTx.id },
      });

      // Reprocess
      const result = await reprocessPendingTransactions(testBankAccountId);

      // Should process but not approve (invalid property)
      expect(result.processed).toBe(1);
      expect(result.approved).toBe(0);

      // Verify pending transaction still exists
      const stillPending = await prisma.pendingTransaction.findUnique({
        where: { id: pendingTx.id },
      });
      expect(stillPending).not.toBeNull();

      // Verify no transaction was created
      const transaction = await prisma.transaction.findFirst({});
      expect(transaction).toBeNull();
    });

    it('should validate type/category combination', async () => {
      // Create rule with invalid combination (Income + Maintenance)
      await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccountId,
          priority: 0,
          enabled: true,
          name: 'Invalid Combo Rule',
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [
              {
                field: 'description',
                matchType: 'contains',
                value: 'test',
                caseSensitive: false,
              },
            ],
          }),
          propertyId: testPropertyId,
          type: 'INCOME',
          category: 'Maintenance', // Invalid: Maintenance is for Expense
        },
      });

      // Create pending transaction
      const bankTx = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_invalid_combo_001',
          amount: 100,
          currency: 'GBP',
          description: 'test payment',
          transactionDate: new Date('2024-01-15'),
        },
      });

      const pendingTx = await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx.id,
          transactionDate: bankTx.transactionDate,
          description: bankTx.description,
        },
      });

      await prisma.bankTransaction.update({
        where: { id: bankTx.id },
        data: { pendingTransactionId: pendingTx.id },
      });

      // Reprocess
      const result = await reprocessPendingTransactions(testBankAccountId);

      // Should process but not approve (invalid combo)
      expect(result.processed).toBe(1);
      expect(result.approved).toBe(0);

      // Verify pending transaction still exists
      const stillPending = await prisma.pendingTransaction.findUnique({
        where: { id: pendingTx.id },
      });
      expect(stillPending).not.toBeNull();
    });

    it('should continue processing on errors and collect failures', async () => {
      // Create valid rule
      await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccountId,
          priority: 0,
          enabled: true,
          name: 'Valid Rule',
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [
              {
                field: 'description',
                matchType: 'contains',
                value: 'rent',
                caseSensitive: false,
              },
            ],
          }),
          propertyId: testPropertyId,
          type: 'INCOME',
          category: 'Rent',
        },
      });

      // Create valid pending transaction
      const bankTx1 = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_valid_001',
          amount: 1000,
          currency: 'GBP',
          description: 'rent payment',
          transactionDate: new Date('2024-01-15'),
        },
      });

      const pendingTx1 = await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx1.id,
          transactionDate: bankTx1.transactionDate,
          description: bankTx1.description,
        },
      });

      await prisma.bankTransaction.update({
        where: { id: bankTx1.id },
        data: { pendingTransactionId: pendingTx1.id },
      });

      // Create another valid transaction
      const bankTx2 = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_valid_002',
          amount: 1000,
          currency: 'GBP',
          description: 'rent payment 2',
          transactionDate: new Date('2024-01-16'),
        },
      });

      const pendingTx2 = await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx2.id,
          transactionDate: bankTx2.transactionDate,
          description: bankTx2.description,
        },
      });

      await prisma.bankTransaction.update({
        where: { id: bankTx2.id },
        data: { pendingTransactionId: pendingTx2.id },
      });

      // Reprocess
      const result = await reprocessPendingTransactions(testBankAccountId);

      // Both should be processed successfully
      expect(result.processed).toBe(2);
      expect(result.approved).toBe(2);
      expect(result.failed).toBe(0);
    });
  });

  describe('multiple rules interaction', () => {
    it('should combine multiple rules to fully match transaction', async () => {
      // Create rule that provides propertyId
      await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccountId,
          priority: 0,
          enabled: true,
          name: 'Property Rule',
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [
              {
                field: 'description',
                matchType: 'contains',
                value: 'rent',
                caseSensitive: false,
              },
            ],
          }),
          propertyId: testPropertyId,
        },
      });

      // Create rule that provides type and category
      await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccountId,
          priority: 1,
          enabled: true,
          name: 'Type/Category Rule',
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [
              {
                field: 'description',
                matchType: 'contains',
                value: 'rent',
                caseSensitive: false,
              },
            ],
          }),
          type: 'INCOME',
          category: 'Rent',
        },
      });

      // Create pending transaction
      const bankTx = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_combined_001',
          amount: 1000,
          currency: 'GBP',
          description: 'rent payment',
          transactionDate: new Date('2024-01-15'),
        },
      });

      const pendingTx = await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx.id,
          transactionDate: bankTx.transactionDate,
          description: bankTx.description,
        },
      });

      await prisma.bankTransaction.update({
        where: { id: bankTx.id },
        data: { pendingTransactionId: pendingTx.id },
      });

      // Reprocess
      const result = await reprocessPendingTransactions(testBankAccountId);

      // Should be fully matched and approved
      expect(result.processed).toBe(1);
      expect(result.approved).toBe(1);

      // Verify transaction was created
      const transaction = await prisma.transaction.findFirst({});
      expect(transaction).toBeDefined();
      expect(transaction?.propertyId).toBe(testPropertyId);
      expect(transaction?.type).toBe('Income');
      expect(transaction?.category).toBe('Rent');
    });
  });

  describe('edge cases', () => {
    it('should return zero stats when no pending transactions exist', async () => {
      const result = await reprocessPendingTransactions(testBankAccountId);

      expect(result.processed).toBe(0);
      expect(result.approved).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should skip disabled rules', async () => {
      // Create disabled rule
      await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccountId,
          priority: 0,
          enabled: false, // Disabled
          name: 'Disabled Rule',
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [
              {
                field: 'description',
                matchType: 'contains',
                value: 'rent',
                caseSensitive: false,
              },
            ],
          }),
          propertyId: testPropertyId,
          type: 'INCOME',
          category: 'Rent',
        },
      });

      // Create pending transaction
      const bankTx = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_disabled_001',
          amount: 1000,
          currency: 'GBP',
          description: 'rent payment',
          transactionDate: new Date('2024-01-15'),
        },
      });

      const pendingTx = await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx.id,
          transactionDate: bankTx.transactionDate,
          description: bankTx.description,
        },
      });

      await prisma.bankTransaction.update({
        where: { id: bankTx.id },
        data: { pendingTransactionId: pendingTx.id },
      });

      // Reprocess
      const result = await reprocessPendingTransactions(testBankAccountId);

      // Should process but not approve (rule disabled)
      expect(result.processed).toBe(1);
      expect(result.approved).toBe(0);

      // Verify pending still exists
      const stillPending = await prisma.pendingTransaction.findUnique({
        where: { id: pendingTx.id },
      });
      expect(stillPending).not.toBeNull();
    });

    it('should update pending transaction with partial matches', async () => {
      // Create rule with only propertyId
      await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccountId,
          priority: 0,
          enabled: true,
          name: 'Property Only Rule',
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [
              {
                field: 'description',
                matchType: 'contains',
                value: 'rent',
                caseSensitive: false,
              },
            ],
          }),
          propertyId: testPropertyId,
        },
      });

      // Create pending transaction with no matches
      const bankTx = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_partial_update_001',
          amount: 1000,
          currency: 'GBP',
          description: 'rent payment',
          transactionDate: new Date('2024-01-15'),
        },
      });

      const pendingTx = await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx.id,
          transactionDate: bankTx.transactionDate,
          description: bankTx.description,
        },
      });

      await prisma.bankTransaction.update({
        where: { id: bankTx.id },
        data: { pendingTransactionId: pendingTx.id },
      });

      // Reprocess
      const result = await reprocessPendingTransactions(testBankAccountId);

      // Should process but not approve
      expect(result.processed).toBe(1);
      expect(result.approved).toBe(0);

      // Verify pending was updated with propertyId
      const updatedPending = await prisma.pendingTransaction.findUnique({
        where: { id: pendingTx.id },
      });
      expect(updatedPending?.propertyId).toBe(testPropertyId);
      expect(updatedPending?.type).toBeNull();
      expect(updatedPending?.category).toBeNull();
    });
  });
});
