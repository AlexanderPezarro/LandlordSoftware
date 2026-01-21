import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import prisma from '../../db/client.js';
import * as monzoService from '../monzo.service.js';
import { encryptToken } from '../encryption.js';

// Mock global fetch
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('Monzo Service - importFullHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await prisma.bankTransaction.deleteMany({});
    await prisma.syncLog.deleteMany({});
    await prisma.bankAccount.deleteMany({});
  });

  describe('importFullHistory', () => {
    it('should fetch and import transactions successfully with pagination', async () => {
      const bankAccount = await prisma.bankAccount.create({
        data: {
          accountId: 'acc_test_123',
          accountName: 'Test Account',
          accountType: 'current',
          provider: 'monzo',
          accessToken: encryptToken('test_access_token'),
          syncFromDate: new Date('2024-01-01'),
          syncEnabled: true,
          lastSyncStatus: 'never_synced',
        },
      });

      // Mock first page response (100 transactions)
      const firstPageTransactions = Array.from({ length: 100 }, (_, i) => ({
        id: `tx_${i}`,
        created: new Date(Date.UTC(2024, 0, 1 + i)).toISOString(),
        description: `Transaction ${i}`,
        amount: 1000 + i, // pence
        currency: 'GBP',
        notes: `Note ${i}`,
        merchant: { id: `merchant_${i}`, name: `Merchant ${i}` },
        counterparty: { name: `Counterparty ${i}` },
        category: 'general',
        settled: new Date(Date.UTC(2024, 0, 1 + i)).toISOString(),
      }));

      // Mock second page response (50 transactions)
      const secondPageTransactions = Array.from({ length: 50 }, (_, i) => ({
        id: `tx_${100 + i}`,
        created: new Date(Date.UTC(2024, 0, 101 + i)).toISOString(),
        description: `Transaction ${100 + i}`,
        amount: 2000 + i,
        currency: 'GBP',
        notes: `Note ${100 + i}`,
        category: 'eating_out',
        settled: new Date(Date.UTC(2024, 0, 101 + i)).toISOString(),
      }));

      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ transactions: firstPageTransactions }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ transactions: secondPageTransactions }),
        } as Response);

      await monzoService.importFullHistory(bankAccount.id);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify fetch was called correctly
      expect(global.fetch).toHaveBeenCalledTimes(2);

      // First call - initial fetch
      const firstCallArgs = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0];
      expect(firstCallArgs[0]).toContain('/transactions');
      expect(firstCallArgs[0]).toContain(`account_id=${bankAccount.accountId}`);
      expect(firstCallArgs[0]).toContain('limit=100');
      expect(firstCallArgs[0]).toContain('since=2024-01-01');

      // Second call - with before parameter
      const secondCallArgs = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[1];
      expect(secondCallArgs[0]).toContain('before=');

      // Verify transactions were imported
      const importedTransactions = await prisma.bankTransaction.findMany({
        where: { bankAccountId: bankAccount.id },
      });
      expect(importedTransactions).toHaveLength(150);

      // Verify sync log was created with success
      const syncLog = await prisma.syncLog.findFirst({
        where: { bankAccountId: bankAccount.id },
      });
      expect(syncLog).toBeTruthy();
      expect(syncLog?.syncType).toBe('initial');
      expect(syncLog?.status).toBe('success');
      expect(syncLog?.transactionsFetched).toBe(150);
      expect(syncLog?.completedAt).toBeTruthy();

      // Verify bank account was updated
      const updatedBankAccount = await prisma.bankAccount.findUnique({
        where: { id: bankAccount.id },
      });
      expect(updatedBankAccount?.lastSyncStatus).toBe('success');
      expect(updatedBankAccount?.lastSyncAt).toBeTruthy();
    });

    it('should handle empty transaction list', async () => {
      const bankAccount = await prisma.bankAccount.create({
        data: {
          accountId: 'acc_test_empty',
          accountName: 'Empty Account',
          accountType: 'current',
          provider: 'monzo',
          accessToken: encryptToken('test_access_token'),
          syncFromDate: new Date('2024-01-01'),
          syncEnabled: true,
          lastSyncStatus: 'never_synced',
        },
      });

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [] }),
      } as Response);

      await monzoService.importFullHistory(bankAccount.id);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const syncLog = await prisma.syncLog.findFirst({
        where: { bankAccountId: bankAccount.id },
      });
      expect(syncLog?.status).toBe('success');
      expect(syncLog?.transactionsFetched).toBe(0);
    });

    it('should skip duplicate transactions', async () => {
      const bankAccount = await prisma.bankAccount.create({
        data: {
          accountId: 'acc_test_duplicates',
          accountName: 'Test Account',
          accountType: 'current',
          provider: 'monzo',
          accessToken: encryptToken('test_access_token'),
          syncFromDate: new Date('2024-01-01'),
          syncEnabled: true,
          lastSyncStatus: 'never_synced',
        },
      });

      // Create existing transaction
      await prisma.bankTransaction.create({
        data: {
          bankAccountId: bankAccount.id,
          externalId: 'tx_existing',
          amount: 10.0,
          currency: 'GBP',
          description: 'Existing transaction',
          transactionDate: new Date('2024-01-01'),
        },
      });

      // Mock response with duplicate
      const transactions = [
        {
          id: 'tx_existing', // Duplicate
          created: new Date('2024-01-01').toISOString(),
          description: 'Existing transaction',
          amount: 1000,
          currency: 'GBP',
          notes: '',
          category: 'general',
        },
        {
          id: 'tx_new',
          created: new Date('2024-01-02').toISOString(),
          description: 'New transaction',
          amount: 2000,
          currency: 'GBP',
          notes: '',
          category: 'general',
        },
      ];

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions }),
      } as Response);

      await monzoService.importFullHistory(bankAccount.id);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should have 2 transactions total (1 existing + 1 new)
      const allTransactions = await prisma.bankTransaction.findMany({
        where: { bankAccountId: bankAccount.id },
      });
      expect(allTransactions).toHaveLength(2);

      const syncLog = await prisma.syncLog.findFirst({
        where: { bankAccountId: bankAccount.id },
      });
      expect(syncLog?.transactionsFetched).toBe(2);
      expect(syncLog?.status).toBe('success');
    });

    it('should handle API errors and mark as failed', async () => {
      const bankAccount = await prisma.bankAccount.create({
        data: {
          accountId: 'acc_test_error',
          accountName: 'Test Account',
          accountType: 'current',
          provider: 'monzo',
          accessToken: encryptToken('test_access_token'),
          syncFromDate: new Date('2024-01-01'),
          syncEnabled: true,
          lastSyncStatus: 'never_synced',
        },
      });

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        text: async () => 'API Error',
      } as Response);

      await monzoService.importFullHistory(bankAccount.id);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const syncLog = await prisma.syncLog.findFirst({
        where: { bankAccountId: bankAccount.id },
      });
      expect(syncLog?.status).toBe('failed');
      expect(syncLog?.errorMessage).toBeTruthy();

      const updatedBankAccount = await prisma.bankAccount.findUnique({
        where: { id: bankAccount.id },
      });
      expect(updatedBankAccount?.lastSyncStatus).toBe('failed');
    });

    it('should set timeout and handle graceful shutdown', async () => {
      const bankAccount = await prisma.bankAccount.create({
        data: {
          accountId: 'acc_test_timeout',
          accountName: 'Test Account',
          accountType: 'current',
          provider: 'monzo',
          accessToken: encryptToken('test_access_token'),
          syncFromDate: new Date('2024-01-01'),
          syncEnabled: true,
          lastSyncStatus: 'never_synced',
        },
      });

      // Mock successful fetch that completes normally
      const transactions = Array.from({ length: 50 }, (_, i) => ({
        id: `tx_${i}`,
        created: new Date(Date.UTC(2024, 0, 1 + i)).toISOString(),
        description: `Transaction ${i}`,
        amount: 1000,
        currency: 'GBP',
        notes: '',
        category: 'general',
      }));

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions }),
      } as Response);

      // Spy on setTimeout and clearTimeout before import
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      await monzoService.importFullHistory(bankAccount.id);

      // Verify setTimeout was called with 270000ms (4m30s safety buffer)
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 270000);

      // Verify clearTimeout was called (timeout cleared after successful completion)
      expect(clearTimeoutSpy).toHaveBeenCalled();

      // Verify import completed successfully
      const syncLog = await prisma.syncLog.findFirst({
        where: { bankAccountId: bankAccount.id },
      });
      expect(syncLog?.status).toBe('success');
      expect(syncLog?.transactionsFetched).toBe(50);

      jest.restoreAllMocks();
    });

    it('should correctly map transaction fields', async () => {
      jest.restoreAllMocks(); // Clear any mocked setTimeout from previous tests
      jest.clearAllMocks();

      const bankAccount = await prisma.bankAccount.create({
        data: {
          accountId: 'acc_test_mapping',
          accountName: 'Test Account',
          accountType: 'current',
          provider: 'monzo',
          accessToken: encryptToken('test_access_token'),
          syncFromDate: new Date('2024-01-01'),
          syncEnabled: true,
          lastSyncStatus: 'never_synced',
        },
      });

      const transaction = {
        id: 'tx_map_test',
        created: '2024-01-15T10:30:00Z',
        description: 'Coffee Shop Purchase',
        amount: 350, // £3.50 in pence
        currency: 'GBP',
        notes: 'Morning coffee',
        merchant: { id: 'merchant_123', name: 'Coffee Shop' },
        counterparty: { name: 'John Doe' },
        category: 'eating_out',
        settled: '2024-01-16T10:30:00Z',
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [transaction] }),
      } as Response);

      await monzoService.importFullHistory(bankAccount.id);
      await new Promise((resolve) => setTimeout(resolve, 200));

      const importedTransaction = await prisma.bankTransaction.findFirst({
        where: { bankAccountId: bankAccount.id },
      });

      expect(importedTransaction).toBeTruthy();
      expect(importedTransaction?.externalId).toBe('tx_map_test');
      expect(importedTransaction?.amount).toBe(3.5); // Converted from pence
      expect(importedTransaction?.currency).toBe('GBP');
      expect(importedTransaction?.description).toBe('Coffee Shop Purchase');
      expect(importedTransaction?.counterpartyName).toBe('John Doe');
      expect(importedTransaction?.reference).toBe('Morning coffee');
      expect(importedTransaction?.merchant).toBe('Coffee Shop');
      expect(importedTransaction?.category).toBe('eating_out');
      expect(importedTransaction?.transactionDate).toEqual(new Date('2024-01-15T10:30:00Z'));
      expect(importedTransaction?.settledDate).toEqual(new Date('2024-01-16T10:30:00Z'));
    });

    it('should handle transactions with missing optional fields', async () => {
      jest.restoreAllMocks(); // Clear any mocked setTimeout from previous tests
      jest.clearAllMocks();

      const bankAccount = await prisma.bankAccount.create({
        data: {
          accountId: 'acc_test_optional',
          accountName: 'Test Account',
          accountType: 'current',
          provider: 'monzo',
          accessToken: encryptToken('test_access_token'),
          syncFromDate: new Date('2024-01-01'),
          syncEnabled: true,
          lastSyncStatus: 'never_synced',
        },
      });

      const transaction = {
        id: 'tx_minimal',
        created: '2024-01-15T10:30:00Z',
        description: 'Minimal Transaction',
        amount: 1000,
        currency: 'GBP',
        notes: '',
        // No merchant, counterparty, category, or settled
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [transaction] }),
      } as Response);

      await monzoService.importFullHistory(bankAccount.id);
      await new Promise((resolve) => setTimeout(resolve, 200));

      const importedTransaction = await prisma.bankTransaction.findFirst({
        where: { bankAccountId: bankAccount.id },
      });

      expect(importedTransaction).toBeTruthy();
      expect(importedTransaction?.externalId).toBe('tx_minimal');
      expect(importedTransaction?.counterpartyName).toBeNull();
      expect(importedTransaction?.merchant).toBeNull();
      expect(importedTransaction?.category).toBeNull();
      expect(importedTransaction?.settledDate).toBeNull();
    });

    it('should not await import (fire and forget)', async () => {
      jest.restoreAllMocks(); // Clear any mocked setTimeout from previous tests
      jest.clearAllMocks();

      const bankAccount = await prisma.bankAccount.create({
        data: {
          accountId: 'acc_test_async',
          accountName: 'Test Account',
          accountType: 'current',
          provider: 'monzo',
          accessToken: encryptToken('test_access_token'),
          syncFromDate: new Date('2024-01-01'),
          syncEnabled: true,
          lastSyncStatus: 'never_synced',
        },
      });

      const transactions = [
        {
          id: 'tx_async',
          created: '2024-01-15T10:30:00Z',
          description: 'Async Test',
          amount: 1000,
          currency: 'GBP',
          notes: '',
          category: 'general',
        },
      ];

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions }),
      } as Response);

      // Should return immediately without awaiting
      const startTime = Date.now();
      monzoService.importFullHistory(bankAccount.id); // Don't await
      const endTime = Date.now();

      // Should complete almost instantly (not waiting for fetch)
      expect(endTime - startTime).toBeLessThan(50);

      // Give time for background import to complete
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Verify import completed in background
      const importedTransaction = await prisma.bankTransaction.findFirst({
        where: { bankAccountId: bankAccount.id },
      });
      expect(importedTransaction).toBeTruthy();
    });
  });
});
