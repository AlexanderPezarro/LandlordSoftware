import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import prisma from '../../db/client.js';
import { checkForDuplicate } from '../duplicateDetection.js';
import { encryptToken } from '../encryption.js';

describe('Duplicate Detection Service', () => {
  let testBankAccountId: string;
  const testAccountId = 'acc_test_duplicate_123';

  beforeAll(async () => {
    // Clean database
    await prisma.bankTransaction.deleteMany({});
    await prisma.bankAccount.deleteMany({});

    // Create test bank account
    const bankAccount = await prisma.bankAccount.create({
      data: {
        accountId: testAccountId,
        accountName: 'Test Duplicate Detection Account',
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
    await prisma.bankTransaction.deleteMany({});
    await prisma.bankAccount.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean before each test
    await prisma.bankTransaction.deleteMany({});
  });

  describe('Exact duplicate detection (by externalId)', () => {
    it('should detect exact duplicate by bankAccountId + externalId', async () => {
      // Create existing transaction
      const existing = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_exact_001',
          amount: -50.00,
          currency: 'GBP',
          description: 'Coffee Shop',
          transactionDate: new Date('2024-01-15T10:30:00Z'),
        },
      });

      // Check for duplicate with same externalId
      const result = await checkForDuplicate({
        bankAccountId: testBankAccountId,
        externalId: 'tx_exact_001',
        amount: -50.00,
        description: 'Coffee Shop',
        transactionDate: new Date('2024-01-15T10:30:00Z'),
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.matchType).toBe('exact');
      expect(result.matchedTransaction).toBeDefined();
      expect(result.matchedTransaction?.id).toBe(existing.id);
      expect(result.matchedTransaction?.externalId).toBe('tx_exact_001');
    });

    it('should not detect duplicate with different externalId but same data', async () => {
      // Create existing transaction
      await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_exact_002',
          amount: -50.00,
          currency: 'GBP',
          description: 'Coffee Shop',
          transactionDate: new Date('2024-01-15T10:30:00Z'),
        },
      });

      // Check for duplicate with different externalId
      const result = await checkForDuplicate({
        bankAccountId: testBankAccountId,
        externalId: 'tx_exact_003',
        amount: -50.00,
        description: 'Coffee Shop',
        transactionDate: new Date('2024-01-15T10:30:00Z'),
      });

      // Should not be exact match (different externalId)
      // But might be fuzzy match
      expect(result.matchType).not.toBe('exact');
    });

    it('should not detect duplicate with same externalId but different bankAccountId', async () => {
      // Create another bank account
      const otherBankAccount = await prisma.bankAccount.create({
        data: {
          accountId: 'acc_test_other_456',
          accountName: 'Other Account',
          accountType: 'uk_retail',
          provider: 'monzo',
          accessToken: encryptToken('test_access_token_2'),
          syncEnabled: true,
          syncFromDate: new Date('2024-01-01'),
          lastSyncStatus: 'never_synced',
        },
      });

      // Create existing transaction in first account
      await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_exact_004',
          amount: -50.00,
          currency: 'GBP',
          description: 'Coffee Shop',
          transactionDate: new Date('2024-01-15T10:30:00Z'),
        },
      });

      // Check for duplicate in different account (should not be duplicate)
      const result = await checkForDuplicate({
        bankAccountId: otherBankAccount.id,
        externalId: 'tx_exact_004',
        amount: -50.00,
        description: 'Coffee Shop',
        transactionDate: new Date('2024-01-15T10:30:00Z'),
      });

      expect(result.isDuplicate).toBe(false);
      expect(result.matchType).toBe(null);
      expect(result.matchedTransaction).toBe(null);

      // Clean up
      await prisma.bankAccount.delete({ where: { id: otherBankAccount.id } });
    });
  });

  describe('Fuzzy duplicate detection', () => {
    it('should detect fuzzy duplicate with same amount, date, and similar description', async () => {
      // Create existing transaction
      const existing = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_fuzzy_001',
          amount: -75.50,
          currency: 'GBP',
          description: 'Tesco Supermarket Oxford Street',
          transactionDate: new Date('2024-01-20T14:30:00Z'),
        },
      });

      // Check for duplicate with similar description (>80% match)
      const result = await checkForDuplicate({
        bankAccountId: testBankAccountId,
        externalId: 'tx_fuzzy_002',
        amount: -75.50,
        description: 'Tesco Supermarket Oxford St',
        transactionDate: new Date('2024-01-20T14:30:00Z'),
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.matchType).toBe('fuzzy');
      expect(result.matchedTransaction).toBeDefined();
      expect(result.matchedTransaction?.id).toBe(existing.id);
    });

    it('should detect fuzzy duplicate within ±1 day window', async () => {
      // Create existing transaction on Jan 20
      const existing = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_fuzzy_003',
          amount: -100.00,
          currency: 'GBP',
          description: 'Monthly Subscription Service',
          transactionDate: new Date('2024-01-20T10:00:00Z'),
        },
      });

      // Check for duplicate on Jan 19 (1 day before)
      const result1 = await checkForDuplicate({
        bankAccountId: testBankAccountId,
        externalId: 'tx_fuzzy_004',
        amount: -100.00,
        description: 'Monthly Subscription Service',
        transactionDate: new Date('2024-01-19T10:00:00Z'),
      });

      expect(result1.isDuplicate).toBe(true);
      expect(result1.matchType).toBe('fuzzy');
      expect(result1.matchedTransaction?.id).toBe(existing.id);

      // Check for duplicate on Jan 21 (1 day after)
      const result2 = await checkForDuplicate({
        bankAccountId: testBankAccountId,
        externalId: 'tx_fuzzy_005',
        amount: -100.00,
        description: 'Monthly Subscription Service',
        transactionDate: new Date('2024-01-21T10:00:00Z'),
      });

      expect(result2.isDuplicate).toBe(true);
      expect(result2.matchType).toBe('fuzzy');
      expect(result2.matchedTransaction?.id).toBe(existing.id);
    });

    it('should not detect fuzzy duplicate outside ±1 day window', async () => {
      // Create existing transaction on Jan 20
      await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_fuzzy_006',
          amount: -100.00,
          currency: 'GBP',
          description: 'Monthly Subscription Service',
          transactionDate: new Date('2024-01-20T10:00:00Z'),
        },
      });

      // Check for duplicate on Jan 18 (2 days before - outside window)
      const result1 = await checkForDuplicate({
        bankAccountId: testBankAccountId,
        externalId: 'tx_fuzzy_007',
        amount: -100.00,
        description: 'Monthly Subscription Service',
        transactionDate: new Date('2024-01-18T10:00:00Z'),
      });

      expect(result1.isDuplicate).toBe(false);
      expect(result1.matchType).toBe(null);

      // Check for duplicate on Jan 22 (2 days after - outside window)
      const result2 = await checkForDuplicate({
        bankAccountId: testBankAccountId,
        externalId: 'tx_fuzzy_008',
        amount: -100.00,
        description: 'Monthly Subscription Service',
        transactionDate: new Date('2024-01-22T10:00:00Z'),
      });

      expect(result2.isDuplicate).toBe(false);
      expect(result2.matchType).toBe(null);
    });

    it('should not detect fuzzy duplicate with different amounts', async () => {
      // Create existing transaction
      await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_fuzzy_009',
          amount: -50.00,
          currency: 'GBP',
          description: 'Coffee Shop',
          transactionDate: new Date('2024-01-20T10:00:00Z'),
        },
      });

      // Check for duplicate with different amount
      const result = await checkForDuplicate({
        bankAccountId: testBankAccountId,
        externalId: 'tx_fuzzy_010',
        amount: -50.01, // Different amount
        description: 'Coffee Shop',
        transactionDate: new Date('2024-01-20T10:00:00Z'),
      });

      expect(result.isDuplicate).toBe(false);
      expect(result.matchType).toBe(null);
    });

    it('should not detect fuzzy duplicate with description similarity <80%', async () => {
      // Create existing transaction
      await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_fuzzy_011',
          amount: -50.00,
          currency: 'GBP',
          description: 'Amazon Marketplace Purchase',
          transactionDate: new Date('2024-01-20T10:00:00Z'),
        },
      });

      // Check for duplicate with very different description (<80% similarity)
      const result = await checkForDuplicate({
        bankAccountId: testBankAccountId,
        externalId: 'tx_fuzzy_012',
        amount: -50.00,
        description: 'Starbucks Coffee',
        transactionDate: new Date('2024-01-20T10:00:00Z'),
      });

      expect(result.isDuplicate).toBe(false);
      expect(result.matchType).toBe(null);
    });

    it('should handle case-insensitive description matching', async () => {
      // Create existing transaction
      const existing = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_fuzzy_013',
          amount: -50.00,
          currency: 'GBP',
          description: 'COFFEE SHOP PAYMENT',
          transactionDate: new Date('2024-01-20T10:00:00Z'),
        },
      });

      // Check for duplicate with different case
      const result = await checkForDuplicate({
        bankAccountId: testBankAccountId,
        externalId: 'tx_fuzzy_014',
        amount: -50.00,
        description: 'coffee shop payment',
        transactionDate: new Date('2024-01-20T10:00:00Z'),
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.matchType).toBe('fuzzy');
      expect(result.matchedTransaction?.id).toBe(existing.id);
    });

    it('should handle whitespace normalization in description matching', async () => {
      // Create existing transaction
      const existing = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_fuzzy_015',
          amount: -50.00,
          currency: 'GBP',
          description: 'Coffee   Shop    Payment',
          transactionDate: new Date('2024-01-20T10:00:00Z'),
        },
      });

      // Check for duplicate with normalized whitespace
      const result = await checkForDuplicate({
        bankAccountId: testBankAccountId,
        externalId: 'tx_fuzzy_016',
        amount: -50.00,
        description: 'Coffee Shop Payment',
        transactionDate: new Date('2024-01-20T10:00:00Z'),
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.matchType).toBe('fuzzy');
      expect(result.matchedTransaction?.id).toBe(existing.id);
    });
  });

  describe('Priority: Exact match takes precedence over fuzzy', () => {
    it('should return exact match when both exact and fuzzy matches exist', async () => {
      // Create exact match transaction
      const exactMatch = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_priority_001',
          amount: -50.00,
          currency: 'GBP',
          description: 'Coffee Shop',
          transactionDate: new Date('2024-01-20T10:00:00Z'),
        },
      });

      // Create potential fuzzy match transaction (different externalId, similar description)
      await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_priority_002',
          amount: -50.00,
          currency: 'GBP',
          description: 'Coffee Shop Payment',
          transactionDate: new Date('2024-01-20T10:00:00Z'),
        },
      });

      // Check for duplicate - should find exact match first
      const result = await checkForDuplicate({
        bankAccountId: testBankAccountId,
        externalId: 'tx_priority_001',
        amount: -50.00,
        description: 'Coffee Shop',
        transactionDate: new Date('2024-01-20T10:00:00Z'),
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.matchType).toBe('exact');
      expect(result.matchedTransaction?.id).toBe(exactMatch.id);
    });
  });

  describe('No duplicate scenarios', () => {
    it('should return no duplicate when no matching transactions exist', async () => {
      const result = await checkForDuplicate({
        bankAccountId: testBankAccountId,
        externalId: 'tx_new_001',
        amount: -99.99,
        description: 'Unique Transaction',
        transactionDate: new Date('2024-01-25T10:00:00Z'),
      });

      expect(result.isDuplicate).toBe(false);
      expect(result.matchType).toBe(null);
      expect(result.matchedTransaction).toBe(null);
    });

    it('should return no duplicate when database is empty', async () => {
      const result = await checkForDuplicate({
        bankAccountId: testBankAccountId,
        externalId: 'tx_new_002',
        amount: -50.00,
        description: 'First Transaction',
        transactionDate: new Date('2024-01-25T10:00:00Z'),
      });

      expect(result.isDuplicate).toBe(false);
      expect(result.matchType).toBe(null);
      expect(result.matchedTransaction).toBe(null);
    });
  });

  describe('Edge cases', () => {
    it('should handle positive and negative amounts correctly', async () => {
      // Create existing debit transaction
      const debit = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_edge_001',
          amount: -100.00, // Debit
          currency: 'GBP',
          description: 'Purchase',
          transactionDate: new Date('2024-01-20T10:00:00Z'),
        },
      });

      // Check for duplicate debit
      const result1 = await checkForDuplicate({
        bankAccountId: testBankAccountId,
        externalId: 'tx_edge_002',
        amount: -100.00,
        description: 'Purchase',
        transactionDate: new Date('2024-01-20T10:00:00Z'),
      });

      expect(result1.isDuplicate).toBe(true);
      expect(result1.matchedTransaction?.id).toBe(debit.id);

      // Create existing credit transaction
      const credit = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_edge_003',
          amount: 500.00, // Credit
          currency: 'GBP',
          description: 'Refund',
          transactionDate: new Date('2024-01-20T10:00:00Z'),
        },
      });

      // Check for duplicate credit
      const result2 = await checkForDuplicate({
        bankAccountId: testBankAccountId,
        externalId: 'tx_edge_004',
        amount: 500.00,
        description: 'Refund',
        transactionDate: new Date('2024-01-20T10:00:00Z'),
      });

      expect(result2.isDuplicate).toBe(true);
      expect(result2.matchedTransaction?.id).toBe(credit.id);

      // Should not match debit with credit of same absolute value
      const result3 = await checkForDuplicate({
        bankAccountId: testBankAccountId,
        externalId: 'tx_edge_005',
        amount: 100.00, // Positive
        description: 'Purchase',
        transactionDate: new Date('2024-01-20T10:00:00Z'),
      });

      expect(result3.isDuplicate).toBe(false);
    });

    it('should handle very small amounts correctly', async () => {
      const existing = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_edge_006',
          amount: -0.01,
          currency: 'GBP',
          description: 'Rounding adjustment',
          transactionDate: new Date('2024-01-20T10:00:00Z'),
        },
      });

      const result = await checkForDuplicate({
        bankAccountId: testBankAccountId,
        externalId: 'tx_edge_007',
        amount: -0.01,
        description: 'Rounding adjustment',
        transactionDate: new Date('2024-01-20T10:00:00Z'),
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.matchedTransaction?.id).toBe(existing.id);
    });

    it('should handle empty/minimal descriptions', async () => {
      const existing = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_edge_008',
          amount: -50.00,
          currency: 'GBP',
          description: 'A',
          transactionDate: new Date('2024-01-20T10:00:00Z'),
        },
      });

      const result = await checkForDuplicate({
        bankAccountId: testBankAccountId,
        externalId: 'tx_edge_009',
        amount: -50.00,
        description: 'A',
        transactionDate: new Date('2024-01-20T10:00:00Z'),
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.matchedTransaction?.id).toBe(existing.id);
    });

    it('should handle very long descriptions', async () => {
      const longDesc = 'A'.repeat(500);
      const existing = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_edge_010',
          amount: -50.00,
          currency: 'GBP',
          description: longDesc,
          transactionDate: new Date('2024-01-20T10:00:00Z'),
        },
      });

      const result = await checkForDuplicate({
        bankAccountId: testBankAccountId,
        externalId: 'tx_edge_011',
        amount: -50.00,
        description: longDesc,
        transactionDate: new Date('2024-01-20T10:00:00Z'),
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.matchedTransaction?.id).toBe(existing.id);
    });

    it('should handle date boundaries correctly (midnight transitions)', async () => {
      // Create transaction at 23:59:59 on Jan 20
      const existing = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_edge_012',
          amount: -50.00,
          currency: 'GBP',
          description: 'Late night purchase',
          transactionDate: new Date('2024-01-20T23:59:59Z'),
        },
      });

      // Check for duplicate at 00:00:01 on Jan 21 (should be within ±1 day)
      const result = await checkForDuplicate({
        bankAccountId: testBankAccountId,
        externalId: 'tx_edge_013',
        amount: -50.00,
        description: 'Late night purchase',
        transactionDate: new Date('2024-01-21T00:00:01Z'),
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.matchedTransaction?.id).toBe(existing.id);
    });
  });

  describe('Performance with multiple potential matches', () => {
    it('should return first match when multiple fuzzy matches exist', async () => {
      // Create multiple similar transactions (>80% similarity)
      await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_perf_001',
          amount: -50.00,
          currency: 'GBP',
          description: 'Tesco Superstore Main Street',
          transactionDate: new Date('2024-01-20T10:00:00Z'),
        },
      });

      await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_perf_002',
          amount: -50.00,
          currency: 'GBP',
          description: 'Tesco Superstore High Street',
          transactionDate: new Date('2024-01-20T11:00:00Z'),
        },
      });

      const mostRecent = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_perf_003',
          amount: -50.00,
          currency: 'GBP',
          description: 'Tesco Superstore Bank Street',
          transactionDate: new Date('2024-01-20T12:00:00Z'),
        },
      });

      // Check for duplicate - should return one of them (>80% similar)
      const result = await checkForDuplicate({
        bankAccountId: testBankAccountId,
        externalId: 'tx_perf_004',
        amount: -50.00,
        description: 'Tesco Superstore West Street',
        transactionDate: new Date('2024-01-20T10:00:00Z'),
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.matchType).toBe('fuzzy');
      expect(result.matchedTransaction).toBeDefined();
      // Should match the most recent transaction due to orderBy desc
      expect(result.matchedTransaction?.id).toBe(mostRecent.id);
    });
  });
});
