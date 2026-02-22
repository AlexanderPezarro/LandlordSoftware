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
      await new Promise((resolve) => setTimeout(resolve, 2000));

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
    }, 15000); // Increase timeout for pagination test

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

      // importFullHistory now throws on error, so we need to catch it
      await expect(monzoService.importFullHistory(bankAccount.id)).rejects.toThrow();
      await new Promise((resolve) => setTimeout(resolve, 500));

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
        amount: 3.5,
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
      expect(importedTransaction?.amount).toBe(3.5);
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

  describe('syncNewTransactions', () => {
    it('should sync transactions since lastSyncAt', async () => {
      const lastSyncAt = new Date('2024-02-01');
      const bankAccount = await prisma.bankAccount.create({
        data: {
          accountId: 'acc_sync_test',
          accountName: 'Test Account',
          accountType: 'current',
          provider: 'monzo',
          accessToken: encryptToken('test_access_token'),
          syncFromDate: new Date('2024-01-01'),
          lastSyncAt,
          syncEnabled: true,
          lastSyncStatus: 'success',
        },
      });

      const transactions = [
        {
          id: 'tx_new_1',
          created: new Date('2024-02-02').toISOString(),
          description: 'New transaction 1',
          amount: 1000,
          currency: 'GBP',
          notes: 'Note 1',
          category: 'general',
        },
        {
          id: 'tx_new_2',
          created: new Date('2024-02-03').toISOString(),
          description: 'New transaction 2',
          amount: 2000,
          currency: 'GBP',
          notes: 'Note 2',
          category: 'eating_out',
        },
      ];

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions }),
      } as Response);

      const result = await monzoService.syncNewTransactions(bankAccount.id);

      // Verify fetch was called with correct parameters
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const fetchUrl = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0][0] as string;
      expect(fetchUrl).toContain(`account_id=${bankAccount.accountId}`);
      expect(fetchUrl).toContain(`since=${encodeURIComponent(lastSyncAt.toISOString())}`);
      expect(fetchUrl).toContain('limit=100');

      // Verify result
      expect(result.success).toBe(true);
      expect(result.transactionsFetched).toBe(2);
      expect(result.lastSyncAt).toBeTruthy();

      // Verify transactions were imported
      const importedTransactions = await prisma.bankTransaction.findMany({
        where: { bankAccountId: bankAccount.id },
      });
      expect(importedTransactions).toHaveLength(2);

      // Verify sync log
      const syncLog = await prisma.syncLog.findFirst({
        where: { bankAccountId: bankAccount.id },
      });
      expect(syncLog?.syncType).toBe('manual');
      expect(syncLog?.status).toBe('success');
      expect(syncLog?.transactionsFetched).toBe(2);

      // Verify bank account was updated
      const updatedBankAccount = await prisma.bankAccount.findUnique({
        where: { id: bankAccount.id },
      });
      expect(updatedBankAccount?.lastSyncStatus).toBe('success');
      expect(updatedBankAccount?.lastSyncAt?.getTime()).toBeGreaterThan(lastSyncAt.getTime());
    });

    it('should use syncFromDate when lastSyncAt is null', async () => {
      const syncFromDate = new Date('2024-01-01');
      const bankAccount = await prisma.bankAccount.create({
        data: {
          accountId: 'acc_sync_no_last',
          accountName: 'Test Account',
          accountType: 'current',
          provider: 'monzo',
          accessToken: encryptToken('test_access_token'),
          syncFromDate,
          syncEnabled: true,
          lastSyncStatus: 'never_synced',
        },
      });

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [] }),
      } as Response);

      await monzoService.syncNewTransactions(bankAccount.id);

      const fetchUrl = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0][0] as string;
      expect(fetchUrl).toContain(`since=${encodeURIComponent(syncFromDate.toISOString())}`);
    });

    it('should handle pagination with multiple pages', async () => {
      const bankAccount = await prisma.bankAccount.create({
        data: {
          accountId: 'acc_sync_pagination',
          accountName: 'Test Account',
          accountType: 'current',
          provider: 'monzo',
          accessToken: encryptToken('test_access_token'),
          syncFromDate: new Date('2024-01-01'),
          lastSyncAt: new Date('2024-02-01'),
          syncEnabled: true,
          lastSyncStatus: 'success',
        },
      });

      // Mock first page (100 transactions)
      const firstPage = Array.from({ length: 100 }, (_, i) => ({
        id: `tx_page1_${i}`,
        created: new Date(Date.UTC(2024, 1, 2 + i)).toISOString(),
        description: `Transaction ${i}`,
        amount: 1000 + i,
        currency: 'GBP',
        notes: '',
        category: 'general',
      }));

      // Mock second page (50 transactions)
      const secondPage = Array.from({ length: 50 }, (_, i) => ({
        id: `tx_page2_${i}`,
        created: new Date(Date.UTC(2024, 1, 102 + i)).toISOString(),
        description: `Transaction ${100 + i}`,
        amount: 2000 + i,
        currency: 'GBP',
        notes: '',
        category: 'general',
      }));

      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ transactions: firstPage }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ transactions: secondPage }),
        } as Response);

      const result = await monzoService.syncNewTransactions(bankAccount.id);

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result.transactionsFetched).toBe(150);

      const importedTransactions = await prisma.bankTransaction.findMany({
        where: { bankAccountId: bankAccount.id },
      });
      expect(importedTransactions).toHaveLength(150);
    });

    it('should return 409 conflict if sync already in progress', async () => {
      const bankAccount = await prisma.bankAccount.create({
        data: {
          accountId: 'acc_sync_conflict',
          accountName: 'Test Account',
          accountType: 'current',
          provider: 'monzo',
          accessToken: encryptToken('test_access_token'),
          syncFromDate: new Date('2024-01-01'),
          lastSyncAt: new Date('2024-02-01'),
          syncEnabled: true,
          lastSyncStatus: 'success',
        },
      });

      // Create an in-progress sync log
      await prisma.syncLog.create({
        data: {
          bankAccountId: bankAccount.id,
          syncType: 'manual',
          status: 'in_progress',
        },
      });

      const result = await monzoService.syncNewTransactions(bankAccount.id);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sync already in progress');
    });

    // Note: Expired token test removed - tokens are now automatically refreshed
    // The retry logic and token refresh are tested separately in utils tests

    it('should handle API errors gracefully', async () => {
      const bankAccount = await prisma.bankAccount.create({
        data: {
          accountId: 'acc_sync_error',
          accountName: 'Test Account',
          accountType: 'current',
          provider: 'monzo',
          accessToken: encryptToken('test_access_token'),
          syncFromDate: new Date('2024-01-01'),
          lastSyncAt: new Date('2024-02-01'),
          syncEnabled: true,
          lastSyncStatus: 'success',
        },
      });

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        text: async () => 'API Error',
      } as Response);

      const result = await monzoService.syncNewTransactions(bankAccount.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch transactions');

      // Verify sync log shows failed status
      const syncLog = await prisma.syncLog.findFirst({
        where: { bankAccountId: bankAccount.id },
        orderBy: { startedAt: 'desc' },
      });
      expect(syncLog?.status).toBe('failed');
    });

    it('should handle timeout with 30-second limit', async () => {
      const bankAccount = await prisma.bankAccount.create({
        data: {
          accountId: 'acc_sync_timeout',
          accountName: 'Test Account',
          accountType: 'current',
          provider: 'monzo',
          accessToken: encryptToken('test_access_token'),
          syncFromDate: new Date('2024-01-01'),
          lastSyncAt: new Date('2024-02-01'),
          syncEnabled: true,
          lastSyncStatus: 'success',
        },
      });

      // Mock a slow response that should complete normally
      const transactions = Array.from({ length: 10 }, (_, i) => ({
        id: `tx_timeout_${i}`,
        created: new Date(Date.UTC(2024, 1, 2 + i)).toISOString(),
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

      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      await monzoService.syncNewTransactions(bankAccount.id);

      // Verify setTimeout was called with 30000ms
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 30000);

      jest.restoreAllMocks();
    });

    it('should skip duplicate transactions', async () => {
      const bankAccount = await prisma.bankAccount.create({
        data: {
          accountId: 'acc_sync_duplicates',
          accountName: 'Test Account',
          accountType: 'current',
          provider: 'monzo',
          accessToken: encryptToken('test_access_token'),
          syncFromDate: new Date('2024-01-01'),
          lastSyncAt: new Date('2024-02-01'),
          syncEnabled: true,
          lastSyncStatus: 'success',
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
          transactionDate: new Date('2024-02-02'),
        },
      });

      const transactions = [
        {
          id: 'tx_existing', // Duplicate
          created: new Date('2024-02-02').toISOString(),
          description: 'Existing transaction',
          amount: 1000,
          currency: 'GBP',
          notes: '',
          category: 'general',
        },
        {
          id: 'tx_new',
          created: new Date('2024-02-03').toISOString(),
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

      const result = await monzoService.syncNewTransactions(bankAccount.id);

      expect(result.transactionsFetched).toBe(2);

      const allTransactions = await prisma.bankTransaction.findMany({
        where: { bankAccountId: bankAccount.id },
      });
      expect(allTransactions).toHaveLength(2); // 1 existing + 1 new
    });

    it('should update lastSyncAt only on complete success', async () => {
      const lastSyncAt = new Date('2024-02-01');
      const bankAccount = await prisma.bankAccount.create({
        data: {
          accountId: 'acc_sync_partial',
          accountName: 'Test Account',
          accountType: 'current',
          provider: 'monzo',
          accessToken: encryptToken('test_access_token'),
          syncFromDate: new Date('2024-01-01'),
          lastSyncAt,
          syncEnabled: true,
          lastSyncStatus: 'success',
        },
      });

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        text: async () => 'API Error',
      } as Response);

      await monzoService.syncNewTransactions(bankAccount.id);

      // Verify lastSyncAt was not updated on failure
      const updatedBankAccount = await prisma.bankAccount.findUnique({
        where: { id: bankAccount.id },
      });
      expect(updatedBankAccount?.lastSyncAt?.getTime()).toBe(lastSyncAt.getTime());
      expect(updatedBankAccount?.lastSyncStatus).toBe('failed');
    });
  });

  describe('registerWebhook', () => {
    it('should successfully register webhook and return webhookId and webhookUrl', async () => {
      const accessToken = 'test_access_token';
      const accountId = 'acc_123';
      const webhookUrl = 'https://example.com/api/bank/webhooks/monzo/secret-123';

      const mockResponse = {
        webhook: {
          id: 'webhook_123',
          account_id: accountId,
          url: webhookUrl,
        },
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await monzoService.registerWebhook(accessToken, accountId, webhookUrl);

      expect(result.webhookId).toBe('webhook_123');
      expect(result.webhookUrl).toBe(webhookUrl);

      // Verify fetch was called correctly
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0];
      expect(url).toBe('https://api.monzo.com/webhooks');
      expect(options?.method).toBe('POST');
      expect(options?.headers).toEqual({
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      });

      // Verify request body
      const body = options?.body as URLSearchParams;
      expect(body.get('account_id')).toBe(accountId);
      expect(body.get('url')).toBe(webhookUrl);
    });

    it('should throw error when webhook registration fails', async () => {
      const accessToken = 'test_access_token';
      const accountId = 'acc_123';
      const webhookUrl = 'https://example.com/webhooks';

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Webhook registration failed',
      } as Response);

      await expect(
        monzoService.registerWebhook(accessToken, accountId, webhookUrl)
      ).rejects.toThrow('Failed to register webhook with Monzo');

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle network errors', async () => {
      const accessToken = 'test_access_token';
      const accountId = 'acc_123';
      const webhookUrl = 'https://example.com/webhooks';

      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(
        monzoService.registerWebhook(accessToken, accountId, webhookUrl)
      ).rejects.toThrow('Network error');
    });
  });

  describe('deleteWebhook', () => {
    it('should successfully delete webhook', async () => {
      const accessToken = 'test_access_token';
      const webhookId = 'webhook_123';

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      await monzoService.deleteWebhook(accessToken, webhookId);

      // Verify fetch was called correctly
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0];
      expect(url).toBe(`https://api.monzo.com/webhooks/${webhookId}`);
      expect(options?.method).toBe('DELETE');
      expect(options?.headers).toEqual({
        Authorization: `Bearer ${accessToken}`,
      });
    });

    it('should throw error when webhook deletion fails', async () => {
      const accessToken = 'test_access_token';
      const webhookId = 'webhook_123';

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Webhook not found',
      } as Response);

      await expect(
        monzoService.deleteWebhook(accessToken, webhookId)
      ).rejects.toThrow('Failed to delete webhook from Monzo');

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle network errors', async () => {
      const accessToken = 'test_access_token';
      const webhookId = 'webhook_123';

      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(
        monzoService.deleteWebhook(accessToken, webhookId)
      ).rejects.toThrow('Network error');
    });
  });
});
