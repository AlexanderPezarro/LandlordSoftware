import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../app.js';
import prisma from '../../db/client.js';
import { encryptToken } from '../../services/encryption.js';

const app = createApp();

describe('Webhook Routes', () => {
  let testBankAccountId: string;
  const testAccountId = 'acc_test_webhook_123';

  beforeAll(async () => {
    // Clean database
    await prisma.syncLog.deleteMany({});
    await prisma.bankTransaction.deleteMany({});
    await prisma.bankAccount.deleteMany({});
  });

  afterAll(async () => {
    // Clean up after all tests
    await prisma.syncLog.deleteMany({});
    await prisma.bankTransaction.deleteMany({});
    await prisma.bankAccount.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean before each test
    await prisma.syncLog.deleteMany({});
    await prisma.bankTransaction.deleteMany({});
    await prisma.bankAccount.deleteMany({});

    // Create test bank account
    const bankAccount = await prisma.bankAccount.create({
      data: {
        accountId: testAccountId,
        accountName: 'Test Webhook Account',
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

  describe('POST /api/bank/webhooks/monzo/:secret', () => {
    const validSecret = 'test-webhook-secret-123';

    beforeEach(() => {
      // Set environment variable for tests
      process.env.MONZO_WEBHOOK_SECRET = validSecret;
    });

    it('should reject webhook with missing secret parameter', async () => {
      const webhookPayload = {
        type: 'transaction.created',
        data: {
          account_id: testAccountId,
          id: 'tx_test_001',
          created: '2024-01-15T10:30:00Z',
          description: 'Test Transaction',
          amount: -100,
          currency: 'GBP',
          notes: '',
        },
      };

      const response = await request(app)
        .post('/api/bank/webhooks/monzo')
        .send(webhookPayload);

      // Should return 404 since the route requires :secret parameter
      expect(response.status).toBe(404);
    });

    it('should reject webhook with invalid secret', async () => {
      const webhookPayload = {
        type: 'transaction.created',
        data: {
          account_id: testAccountId,
          id: 'tx_test_002',
          created: '2024-01-15T10:30:00Z',
          description: 'Test Transaction',
          amount: -100,
          currency: 'GBP',
          notes: '',
        },
      };

      const response = await request(app)
        .post('/api/bank/webhooks/monzo/wrong-secret')
        .send(webhookPayload);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Forbidden');

      // Verify no transaction was created
      const transactions = await prisma.bankTransaction.count({
        where: { bankAccountId: testBankAccountId },
      });
      expect(transactions).toBe(0);

      // Verify no sync log was created
      const syncLogs = await prisma.syncLog.count({
        where: { bankAccountId: testBankAccountId },
      });
      expect(syncLogs).toBe(0);
    });

    it('should return 500 when MONZO_WEBHOOK_SECRET is not configured', async () => {
      // Temporarily remove environment variable
      const originalSecret = process.env.MONZO_WEBHOOK_SECRET;
      delete process.env.MONZO_WEBHOOK_SECRET;

      const webhookPayload = {
        type: 'transaction.created',
        data: {
          account_id: testAccountId,
          id: 'tx_test_003',
          created: '2024-01-15T10:30:00Z',
          description: 'Test Transaction',
          amount: -100,
          currency: 'GBP',
          notes: '',
        },
      };

      const response = await request(app)
        .post('/api/bank/webhooks/monzo/any-secret')
        .send(webhookPayload);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Webhook not configured');

      // Restore environment variable
      process.env.MONZO_WEBHOOK_SECRET = originalSecret;
    });

    it('should successfully process a valid transaction.created webhook with valid secret', async () => {
      const webhookPayload = {
        type: 'transaction.created',
        data: {
          account_id: testAccountId,
          id: 'tx_webhook_001',
          created: '2024-01-15T10:30:00Z',
          description: 'Coffee Shop',
          amount: -3.5,
          currency: 'GBP',
          notes: 'Morning coffee',
          merchant: {
            id: 'merch_001',
            name: 'Coffee Shop Ltd',
          },
          counterparty: {
            name: 'Coffee Shop',
          },
          category: 'eating_out',
          settled: '2024-01-15T10:31:00Z',
        },
      };

      const response = await request(app)
        .post(`/api/bank/webhooks/monzo/${validSecret}`)
        .send(webhookPayload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Webhook processed successfully');

      // Verify BankTransaction was created
      const bankTransaction = await prisma.bankTransaction.findFirst({
        where: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_webhook_001',
        },
      });

      expect(bankTransaction).not.toBeNull();
      expect(bankTransaction?.amount).toBe(-3.5);
      expect(bankTransaction?.currency).toBe('GBP');
      expect(bankTransaction?.description).toBe('Coffee Shop');
      expect(bankTransaction?.counterpartyName).toBe('Coffee Shop');
      expect(bankTransaction?.reference).toBe('Morning coffee');
      expect(bankTransaction?.merchant).toBe('Coffee Shop Ltd');
      expect(bankTransaction?.category).toBe('eating_out');
      expect(bankTransaction?.transactionDate).toEqual(new Date('2024-01-15T10:30:00Z'));
      expect(bankTransaction?.settledDate).toEqual(new Date('2024-01-15T10:31:00Z'));

      // Verify SyncLog was created and completed successfully
      const syncLog = await prisma.syncLog.findFirst({
        where: {
          bankAccountId: testBankAccountId,
          syncType: 'webhook',
        },
      });

      expect(syncLog).not.toBeNull();
      expect(syncLog?.status).toBe('success');
      expect(syncLog?.transactionsFetched).toBe(1);
      expect(syncLog?.webhookEventId).toBe('tx_webhook_001');
      expect(syncLog?.completedAt).not.toBeNull();

      // Verify bank account was updated
      const updatedAccount = await prisma.bankAccount.findUnique({
        where: { id: testBankAccountId },
      });

      expect(updatedAccount?.lastSyncStatus).toBe('success');
      expect(updatedAccount?.lastSyncAt).not.toBeNull();
    });

    it('should handle duplicate webhooks (idempotency)', async () => {
      const webhookPayload = {
        type: 'transaction.created',
        data: {
          account_id: testAccountId,
          id: 'tx_webhook_duplicate',
          created: '2024-01-15T11:00:00Z',
          description: 'Duplicate Transaction',
          amount: -1000,
          currency: 'GBP',
          notes: '',
        },
      };

      // Send webhook first time
      const response1 = await request(app)
        .post(`/api/bank/webhooks/monzo/${validSecret}`)
        .send(webhookPayload);

      expect(response1.status).toBe(200);
      expect(response1.body.success).toBe(true);
      expect(response1.body.message).toBe('Webhook processed successfully');

      // Count transactions after first webhook
      const transactionsAfterFirst = await prisma.bankTransaction.count({
        where: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_webhook_duplicate',
        },
      });
      expect(transactionsAfterFirst).toBe(1);

      // Count sync logs after first webhook
      const syncLogsAfterFirst = await prisma.syncLog.count({
        where: {
          bankAccountId: testBankAccountId,
          syncType: 'webhook',
          webhookEventId: 'tx_webhook_duplicate',
        },
      });
      expect(syncLogsAfterFirst).toBe(1);

      // Send same webhook again
      const response2 = await request(app)
        .post(`/api/bank/webhooks/monzo/${validSecret}`)
        .send(webhookPayload);

      expect(response2.status).toBe(200);
      expect(response2.body.success).toBe(true);
      expect(response2.body.message).toBe('Webhook event already processed');

      // Verify no duplicate transaction was created
      const transactionsAfterSecond = await prisma.bankTransaction.count({
        where: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_webhook_duplicate',
        },
      });
      expect(transactionsAfterSecond).toBe(1);

      // Verify no duplicate sync log was created (idempotency - should still be 1)
      const syncLogsAfterSecond = await prisma.syncLog.count({
        where: {
          bankAccountId: testBankAccountId,
          syncType: 'webhook',
          webhookEventId: 'tx_webhook_duplicate',
        },
      });
      expect(syncLogsAfterSecond).toBe(1);
    });

    it('should return 400 for invalid webhook type', async () => {
      const invalidPayload = {
        type: 'invalid.event',
        data: {},
      };

      const response = await request(app)
        .post(`/api/bank/webhooks/monzo/${validSecret}`)
        .send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid webhook payload');

      // Verify no transaction was created
      const transactions = await prisma.bankTransaction.count({
        where: { bankAccountId: testBankAccountId },
      });
      expect(transactions).toBe(0);
    });

    it('should return 400 for missing data field', async () => {
      const invalidPayload = {
        type: 'transaction.created',
        // Missing data field
      };

      const response = await request(app)
        .post(`/api/bank/webhooks/monzo/${validSecret}`)
        .send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid webhook payload');
    });

    it('should return 400 for missing required transaction fields', async () => {
      const invalidPayload = {
        type: 'transaction.created',
        data: {
          // Missing account_id, id, and amount
          description: 'Test',
          currency: 'GBP',
        },
      };

      const response = await request(app)
        .post(`/api/bank/webhooks/monzo/${validSecret}`)
        .send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing required transaction fields');
    });

    it('should return 200 for webhook with unknown account_id', async () => {
      const webhookPayload = {
        type: 'transaction.created',
        data: {
          account_id: 'acc_unknown_account',
          id: 'tx_unknown',
          created: '2024-01-15T12:00:00Z',
          description: 'Unknown Account Transaction',
          amount: -500,
          currency: 'GBP',
          notes: '',
        },
      };

      const response = await request(app)
        .post(`/api/bank/webhooks/monzo/${validSecret}`)
        .send(webhookPayload);

      // Should return 200 but indicate account not found
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Webhook received but account not found');

      // Verify no transaction was created
      const transactions = await prisma.bankTransaction.count();
      expect(transactions).toBe(0);

      // Verify no sync log was created
      const syncLogs = await prisma.syncLog.count();
      expect(syncLogs).toBe(0);
    });

    it('should handle transactions with minimal data', async () => {
      const webhookPayload = {
        type: 'transaction.created',
        data: {
          account_id: testAccountId,
          id: 'tx_minimal',
          created: '2024-01-15T13:00:00Z',
          description: 'Minimal Transaction',
          amount: -2.5,
          currency: 'GBP',
          notes: '',
          // No merchant, counterparty, category, or settled
        },
      };

      const response = await request(app)
        .post(`/api/bank/webhooks/monzo/${validSecret}`)
        .send(webhookPayload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify transaction was created with null optional fields
      const bankTransaction = await prisma.bankTransaction.findFirst({
        where: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_minimal',
        },
      });

      expect(bankTransaction).not.toBeNull();
      expect(bankTransaction?.amount).toBe(-2.5);
      expect(bankTransaction?.counterpartyName).toBeNull();
      expect(bankTransaction?.reference).toBeNull();
      expect(bankTransaction?.merchant).toBeNull();
      expect(bankTransaction?.category).toBeNull();
      expect(bankTransaction?.settledDate).toBeNull();
    });

    it('should handle positive amounts (credits)', async () => {
      const webhookPayload = {
        type: 'transaction.created',
        data: {
          account_id: testAccountId,
          id: 'tx_credit',
          created: '2024-01-15T14:00:00Z',
          description: 'Refund',
          amount: 15, // £15.00 credit
          currency: 'GBP',
          notes: 'Refund from merchant',
        },
      };

      const response = await request(app)
        .post(`/api/bank/webhooks/monzo/${validSecret}`)
        .send(webhookPayload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const bankTransaction = await prisma.bankTransaction.findFirst({
        where: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_credit',
        },
      });

      expect(bankTransaction).not.toBeNull();
      expect(bankTransaction?.amount).toBe(15);
    });

    it('should handle amount of zero', async () => {
      const webhookPayload = {
        type: 'transaction.created',
        data: {
          account_id: testAccountId,
          id: 'tx_zero',
          created: '2024-01-15T15:00:00Z',
          description: 'Zero Amount Transaction',
          amount: 0,
          currency: 'GBP',
          notes: '',
        },
      };

      const response = await request(app)
        .post(`/api/bank/webhooks/monzo/${validSecret}`)
        .send(webhookPayload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const bankTransaction = await prisma.bankTransaction.findFirst({
        where: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_zero',
        },
      });

      expect(bankTransaction).not.toBeNull();
      expect(bankTransaction?.amount).toBe(0);
    });

    it('should update SyncLog with error on processing failure', async () => {
      // Create a scenario that will cause a processing error
      // We'll mock a database error by disconnecting (not recommended in production)
      // Instead, we'll test with invalid date format
      const webhookPayload = {
        type: 'transaction.created',
        data: {
          account_id: testAccountId,
          id: 'tx_error',
          created: 'invalid-date-format', // This will cause an error
          description: 'Error Transaction',
          amount: -100,
          currency: 'GBP',
          notes: '',
        },
      };

      const response = await request(app)
        .post(`/api/bank/webhooks/monzo/${validSecret}`)
        .send(webhookPayload);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('An error occurred while processing webhook');

      // Verify sync log was created with error status
      const syncLog = await prisma.syncLog.findFirst({
        where: {
          bankAccountId: testBankAccountId,
          syncType: 'webhook',
        },
      });

      expect(syncLog).not.toBeNull();
      expect(syncLog?.status).toBe('failed');
      expect(syncLog?.errorMessage).not.toBeNull();
      expect(syncLog?.completedAt).not.toBeNull();
    });

    it('should be publicly accessible (no authentication required)', async () => {
      const webhookPayload = {
        type: 'transaction.created',
        data: {
          account_id: testAccountId,
          id: 'tx_public',
          created: '2024-01-15T16:00:00Z',
          description: 'Public Access Test',
          amount: -100,
          currency: 'GBP',
          notes: '',
        },
      };

      // Send request without any authentication headers
      const response = await request(app)
        .post(`/api/bank/webhooks/monzo/${validSecret}`)
        .send(webhookPayload);

      // Should succeed without authentication
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
