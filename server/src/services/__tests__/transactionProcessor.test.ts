import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { processTransactions } from '../transactionProcessor.js';
import prisma from '../../db/client.js';
import { encryptToken } from '../encryption.js';
import type { MonzoTransaction } from '../monzo/types.js';

describe('Transaction Processor Service', () => {
  let testBankAccountId: string;
  const testAccountId = 'acc_test_processor_123';

  beforeAll(async () => {
    // Clean database
    await prisma.bankTransaction.deleteMany({});
    await prisma.bankAccount.deleteMany({});

    // Create test bank account
    const bankAccount = await prisma.bankAccount.create({
      data: {
        accountId: testAccountId,
        accountName: 'Test Transaction Processor Account',
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

  describe('successful processing', () => {
    it('should process a single transaction successfully', async () => {
      const monzoTransactions: MonzoTransaction[] = [
        {
          id: 'tx_001',
          account_id: 'acc_001',
          created: '2024-01-15T10:30:00Z',
          description: 'Coffee Shop',
          amount: 3.5,
          currency: 'GBP',
          notes: '',
          merchant: { id: 'merch_001', name: 'Coffee Co' },
          counterparty: null,
          category: 'eating_out',
          settled: '2024-01-15T10:30:00Z',
        },
      ];

      const result = await processTransactions(monzoTransactions, testBankAccountId);

      expect(result.processed).toBe(1);
      expect(result.duplicatesSkipped).toBe(0);
      expect(result.errors).toHaveLength(0);

      // Verify transaction was created in database
      const savedTx = await prisma.bankTransaction.findFirst({
        where: { externalId: 'tx_001' },
      });

      expect(savedTx).toBeDefined();
      expect(savedTx?.amount).toBe(3.5);
      expect(savedTx?.description).toBe('Coffee Shop');
      expect(savedTx?.merchant).toBe('Coffee Co');
      expect(savedTx?.category).toBe('eating_out');
      expect(savedTx?.currency).toBe('GBP');
    });

    it('should process multiple transactions successfully', async () => {
      const monzoTransactions: MonzoTransaction[] = [
        {
          id: 'tx_001',
          account_id: 'acc_001',
          created: '2024-01-15T10:30:00Z',
          description: 'Coffee Shop',
          amount: 3.5,
          currency: 'GBP',
          notes: '',
          settled: '2024-01-15T10:30:00Z',
        },
        {
          id: 'tx_002',
          account_id: 'acc_001',
          created: '2024-01-16T14:20:00Z',
          description: 'Grocery Store',
          amount: 25.5,
          currency: 'GBP',
          notes: '',
          settled: '2024-01-16T14:20:00Z',
        },
      ];

      const result = await processTransactions(monzoTransactions, testBankAccountId);

      expect(result.processed).toBe(2);
      expect(result.duplicatesSkipped).toBe(0);
      expect(result.errors).toHaveLength(0);

      // Verify both transactions were created
      const tx1 = await prisma.bankTransaction.findFirst({
        where: { externalId: 'tx_001' },
      });
      const tx2 = await prisma.bankTransaction.findFirst({
        where: { externalId: 'tx_002' },
      });

      expect(tx1).toBeDefined();
      expect(tx1?.amount).toBe(3.5);
      expect(tx2).toBeDefined();
      expect(tx2?.amount).toBe(25.5);
    });

    it('should handle transactions with counterparty information', async () => {
      const monzoTransactions: MonzoTransaction[] = [
        {
          id: 'tx_001',
          account_id: 'acc_001',
          created: '2024-01-15T10:30:00Z',
          description: 'Transfer',
          amount: -50, // Income (negative in Monzo = money in)
          currency: 'GBP',
          notes: '',
          counterparty: { name: 'John Smith' },
          settled: '2024-01-15T10:30:00Z',
        },
      ];

      const result = await processTransactions(monzoTransactions, testBankAccountId);

      expect(result.processed).toBe(1);

      const savedTx = await prisma.bankTransaction.findFirst({
        where: { externalId: 'tx_001' },
      });

      expect(savedTx?.counterpartyName).toBe('John Smith');
      expect(savedTx?.amount).toBe(-50);
    });

    it('should handle transactions without settled date', async () => {
      const monzoTransactions: MonzoTransaction[] = [
        {
          id: 'tx_001',
          account_id: 'acc_001',
          created: '2024-01-15T10:30:00Z',
          description: 'Pending Transaction',
          amount: 1,
          currency: 'GBP',
          notes: '',
          // No settled date
        },
      ];

      const result = await processTransactions(monzoTransactions, testBankAccountId);

      expect(result.processed).toBe(1);

      const savedTx = await prisma.bankTransaction.findFirst({
        where: { externalId: 'tx_001' },
      });

      expect(savedTx?.settledDate).toBeNull();
    });

    it('should handle transaction notes as reference field', async () => {
      const monzoTransactions: MonzoTransaction[] = [
        {
          id: 'tx_001',
          account_id: 'acc_001',
          created: '2024-01-15T10:30:00Z',
          description: 'Transaction',
          amount: 5,
          currency: 'GBP',
          notes: 'Personal note about transaction',
          settled: '2024-01-15T10:30:00Z',
        },
      ];

      const result = await processTransactions(monzoTransactions, testBankAccountId);

      expect(result.processed).toBe(1);

      const savedTx = await prisma.bankTransaction.findFirst({
        where: { externalId: 'tx_001' },
      });

      expect(savedTx?.reference).toBe('Personal note about transaction');
    });

    it('should handle empty notes as null reference', async () => {
      const monzoTransactions: MonzoTransaction[] = [
        {
          id: 'tx_001',
          account_id: 'acc_001',
          created: '2024-01-15T10:30:00Z',
          description: 'Transaction',
          amount: 5,
          currency: 'GBP',
          notes: '',
          settled: '2024-01-15T10:30:00Z',
        },
      ];

      const result = await processTransactions(monzoTransactions, testBankAccountId);

      expect(result.processed).toBe(1);

      const savedTx = await prisma.bankTransaction.findFirst({
        where: { externalId: 'tx_001' },
      });

      expect(savedTx?.reference).toBeNull();
    });

    it('should store amounts as-is from Monzo API', async () => {
      const monzoTransactions: MonzoTransaction[] = [
        {
          id: 'tx_001',
          account_id: 'acc_001',
          created: '2024-01-15T10:30:00Z',
          description: 'Transaction',
          amount: 123.45,
          currency: 'GBP',
          notes: '',
          settled: '2024-01-15T10:30:00Z',
        },
      ];

      const result = await processTransactions(monzoTransactions, testBankAccountId);

      expect(result.processed).toBe(1);

      const savedTx = await prisma.bankTransaction.findFirst({
        where: { externalId: 'tx_001' },
      });

      expect(savedTx?.amount).toBe(123.45);
    });
  });

  describe('duplicate detection', () => {
    it('should skip exact duplicate transactions by externalId', async () => {
      // Create existing transaction
      await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_001',
          amount: 5,
          currency: 'GBP',
          description: 'Duplicate Transaction',
          transactionDate: new Date('2024-01-15T10:30:00Z'),
          settledDate: new Date('2024-01-15T10:30:00Z'),
        },
      });

      const monzoTransactions: MonzoTransaction[] = [
        {
          id: 'tx_001', // Same externalId
          account_id: 'acc_001',
          created: '2024-01-15T10:30:00Z',
          description: 'Duplicate Transaction',
          amount: 5,
          currency: 'GBP',
          notes: '',
          settled: '2024-01-15T10:30:00Z',
        },
      ];

      const result = await processTransactions(monzoTransactions, testBankAccountId);

      expect(result.processed).toBe(0);
      expect(result.duplicatesSkipped).toBe(1);
      expect(result.errors).toHaveLength(0);

      // Verify only one transaction exists
      const count = await prisma.bankTransaction.count({
        where: { externalId: 'tx_001' },
      });
      expect(count).toBe(1);
    });

    it('should skip fuzzy duplicate transactions', async () => {
      // Create existing transaction
      await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_existing',
          amount: 10,
          currency: 'GBP',
          description: 'Coffee Shop Purchase',
          transactionDate: new Date('2024-01-15T10:30:00Z'),
          settledDate: new Date('2024-01-15T10:30:00Z'),
        },
      });

      const monzoTransactions: MonzoTransaction[] = [
        {
          id: 'tx_new',
          account_id: 'acc_001',
          created: '2024-01-15T10:30:00Z',
          description: 'Coffee Shop Purchase', // Same description
          amount: 10, // Same amount
          currency: 'GBP',
          notes: '',
          settled: '2024-01-15T10:30:00Z',
        },
      ];

      const result = await processTransactions(monzoTransactions, testBankAccountId);

      expect(result.processed).toBe(0);
      expect(result.duplicatesSkipped).toBe(1);
      expect(result.errors).toHaveLength(0);

      // Verify only the original transaction exists
      const count = await prisma.bankTransaction.count();
      expect(count).toBe(1);
    });

    it('should handle mix of duplicates and new transactions', async () => {
      // Create existing transaction
      await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_002',
          amount: 10,
          currency: 'GBP',
          description: 'Duplicate Transaction',
          transactionDate: new Date('2024-01-16T11:00:00Z'),
          settledDate: new Date('2024-01-16T11:00:00Z'),
        },
      });

      const monzoTransactions: MonzoTransaction[] = [
        {
          id: 'tx_001',
          account_id: 'acc_001',
          created: '2024-01-15T10:30:00Z',
          description: 'New Transaction 1',
          amount: 5,
          currency: 'GBP',
          notes: '',
          settled: '2024-01-15T10:30:00Z',
        },
        {
          id: 'tx_002', // Duplicate
          account_id: 'acc_001',
          created: '2024-01-16T11:00:00Z',
          description: 'Duplicate Transaction',
          amount: 10,
          currency: 'GBP',
          notes: '',
          settled: '2024-01-16T11:00:00Z',
        },
        {
          id: 'tx_003',
          account_id: 'acc_001',
          created: '2024-01-17T12:00:00Z',
          description: 'New Transaction 2',
          amount: 7.5,
          currency: 'GBP',
          notes: '',
          settled: '2024-01-17T12:00:00Z',
        },
      ];

      const result = await processTransactions(monzoTransactions, testBankAccountId);

      expect(result.processed).toBe(2);
      expect(result.duplicatesSkipped).toBe(1);
      expect(result.errors).toHaveLength(0);

      // Verify correct transactions exist
      const tx1 = await prisma.bankTransaction.findFirst({
        where: { externalId: 'tx_001' },
      });
      const tx2 = await prisma.bankTransaction.findFirst({
        where: { externalId: 'tx_002' },
      });
      const tx3 = await prisma.bankTransaction.findFirst({
        where: { externalId: 'tx_003' },
      });

      expect(tx1).toBeDefined();
      expect(tx2).toBeDefined(); // Original, not replaced
      expect(tx2?.amount).toBe(10); // Original amount
      expect(tx3).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should continue processing when one transaction fails due to invalid data', async () => {
      const monzoTransactions: MonzoTransaction[] = [
        {
          id: 'tx_001',
          account_id: 'acc_001',
          created: '2024-01-15T10:30:00Z',
          description: 'Good Transaction',
          amount: 5,
          currency: 'GBP',
          notes: '',
          settled: '2024-01-15T10:30:00Z',
        },
        {
          id: 'tx_002',
          account_id: 'acc_001',
          created: 'invalid-date', // Invalid date format
          description: 'Bad Transaction',
          amount: 10,
          currency: 'GBP',
          notes: '',
          settled: '2024-01-16T11:00:00Z',
        },
        {
          id: 'tx_003',
          account_id: 'acc_001',
          created: '2024-01-17T12:00:00Z',
          description: 'Another Good Transaction',
          amount: 7.5,
          currency: 'GBP',
          notes: '',
          settled: '2024-01-17T12:00:00Z',
        },
      ];

      const result = await processTransactions(monzoTransactions, testBankAccountId);

      expect(result.processed).toBe(2);
      expect(result.duplicatesSkipped).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].transactionId).toBe('tx_002');

      // Verify only good transactions were saved
      const tx1 = await prisma.bankTransaction.findFirst({
        where: { externalId: 'tx_001' },
      });
      const tx2 = await prisma.bankTransaction.findFirst({
        where: { externalId: 'tx_002' },
      });
      const tx3 = await prisma.bankTransaction.findFirst({
        where: { externalId: 'tx_003' },
      });

      expect(tx1).toBeDefined();
      expect(tx2).toBeNull();
      expect(tx3).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty transaction array', async () => {
      const result = await processTransactions([], testBankAccountId);

      expect(result.processed).toBe(0);
      expect(result.duplicatesSkipped).toBe(0);
      expect(result.errors).toHaveLength(0);

      const count = await prisma.bankTransaction.count();
      expect(count).toBe(0);
    });

    it('should handle transactions with all optional fields missing', async () => {
      const monzoTransactions: MonzoTransaction[] = [
        {
          id: 'tx_001',
          account_id: 'acc_001',
          created: '2024-01-15T10:30:00Z',
          description: 'Minimal Transaction',
          amount: 5,
          currency: 'GBP',
          notes: '',
          // No merchant, counterparty, category, or settled
        },
      ];

      const result = await processTransactions(monzoTransactions, testBankAccountId);

      expect(result.processed).toBe(1);

      const savedTx = await prisma.bankTransaction.findFirst({
        where: { externalId: 'tx_001' },
      });

      expect(savedTx?.merchant).toBeNull();
      expect(savedTx?.counterpartyName).toBeNull();
      expect(savedTx?.category).toBeNull();
      expect(savedTx?.settledDate).toBeNull();
    });

    it('should handle very large amounts', async () => {
      const monzoTransactions: MonzoTransaction[] = [
        {
          id: 'tx_001',
          account_id: 'acc_001',
          created: '2024-01-15T10:30:00Z',
          description: 'Large Transaction',
          amount: 10000000, // £10,000,000
          currency: 'GBP',
          notes: '',
          settled: '2024-01-15T10:30:00Z',
        },
      ];

      const result = await processTransactions(monzoTransactions, testBankAccountId);

      expect(result.processed).toBe(1);

      const savedTx = await prisma.bankTransaction.findFirst({
        where: { externalId: 'tx_001' },
      });

      expect(savedTx?.amount).toBe(10000000);
    });

    it('should handle zero amount transactions', async () => {
      const monzoTransactions: MonzoTransaction[] = [
        {
          id: 'tx_001',
          account_id: 'acc_001',
          created: '2024-01-15T10:30:00Z',
          description: 'Zero Transaction',
          amount: 0,
          currency: 'GBP',
          notes: '',
          settled: '2024-01-15T10:30:00Z',
        },
      ];

      const result = await processTransactions(monzoTransactions, testBankAccountId);

      expect(result.processed).toBe(1);

      const savedTx = await prisma.bankTransaction.findFirst({
        where: { externalId: 'tx_001' },
      });

      expect(savedTx?.amount).toBe(0);
    });

    it('should handle negative amounts (credits/refunds)', async () => {
      const monzoTransactions: MonzoTransaction[] = [
        {
          id: 'tx_001',
          account_id: 'acc_001',
          created: '2024-01-15T10:30:00Z',
          description: 'Refund',
          amount: -50, // £50 refund
          currency: 'GBP',
          notes: '',
          settled: '2024-01-15T10:30:00Z',
        },
      ];

      const result = await processTransactions(monzoTransactions, testBankAccountId);

      expect(result.processed).toBe(1);

      const savedTx = await prisma.bankTransaction.findFirst({
        where: { externalId: 'tx_001' },
      });

      expect(savedTx?.amount).toBe(-50);
    });
  });
});
