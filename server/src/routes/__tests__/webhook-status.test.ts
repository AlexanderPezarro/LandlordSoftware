import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../app.js';
import prisma from '../../db/client.js';
import authService from '../../services/auth.service.js';
import { Roles } from '../../../../shared/types/user.types.js';
import { encryptToken } from '../../services/encryption.js';
import type { AccountWebhookStatus } from '../../../../shared/types/index.js';

const app = createApp();

describe('Webhook Status Routes', () => {
  // Test user credentials
  const adminUser = {
    email: 'admin-webhook-status@example.com',
    password: 'adminPassword123',
  };

  const viewerUser = {
    email: 'viewer-webhook-status@example.com',
    password: 'viewerPassword123',
  };

  let adminCookies: string[];
  let viewerCookies: string[];
  let testBankAccount1Id: string;
  let testBankAccount2Id: string;

  beforeAll(async () => {
    // Clean database
    await prisma.syncLog.deleteMany({});
    await prisma.bankTransaction.deleteMany({});
    await prisma.bankAccount.deleteMany({});
    await prisma.user.deleteMany({});

    // Create admin user and login
    await authService.createUser(adminUser.email, adminUser.password, Roles.ADMIN);
    const adminLoginResponse = await request(app).post('/api/auth/login').send({
      email: adminUser.email,
      password: adminUser.password,
    });
    adminCookies = [adminLoginResponse.headers['set-cookie']];

    // Create viewer user and login
    await authService.createUser(viewerUser.email, viewerUser.password, Roles.VIEWER);
    const viewerLoginResponse = await request(app).post('/api/auth/login').send({
      email: viewerUser.email,
      password: viewerUser.password,
    });
    viewerCookies = [viewerLoginResponse.headers['set-cookie']];
  });

  afterAll(async () => {
    // Clean up after all tests
    await prisma.syncLog.deleteMany({});
    await prisma.bankTransaction.deleteMany({});
    await prisma.bankAccount.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean before each test
    await prisma.syncLog.deleteMany({});
    await prisma.bankTransaction.deleteMany({});
    await prisma.bankAccount.deleteMany({});

    // Create test bank accounts
    const bankAccount1 = await prisma.bankAccount.create({
      data: {
        accountId: 'acc_webhook_status_1',
        accountName: 'Test Webhook Account 1',
        accountType: 'uk_retail',
        provider: 'monzo',
        accessToken: encryptToken('test_access_token_1'),
        refreshToken: encryptToken('test_refresh_token_1'),
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        syncEnabled: true,
        syncFromDate: new Date('2024-01-01'),
        lastSyncStatus: 'success',
        webhookId: 'webhook_123',
        webhookUrl: 'https://example.com/webhooks/monzo/secret123',
      },
    });
    testBankAccount1Id = bankAccount1.id;

    const bankAccount2 = await prisma.bankAccount.create({
      data: {
        accountId: 'acc_webhook_status_2',
        accountName: 'Test Webhook Account 2',
        accountType: 'uk_retail',
        provider: 'monzo',
        accessToken: encryptToken('test_access_token_2'),
        refreshToken: encryptToken('test_refresh_token_2'),
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        syncEnabled: true,
        syncFromDate: new Date('2024-01-01'),
        lastSyncStatus: 'success',
        webhookId: 'webhook_456',
        webhookUrl: 'https://example.com/webhooks/monzo/secret456',
      },
    });
    testBankAccount2Id = bankAccount2.id;
  });

  describe('GET /api/bank/webhooks/status', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/bank/webhooks/status');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .get('/api/bank/webhooks/status')
        .set('Cookie', viewerCookies);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should return webhook status when no webhook events exist', async () => {
      const response = await request(app)
        .get('/api/bank/webhooks/status')
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        lastEventTimestamp: null,
        recentEvents: [],
        failedCount24h: 0,
        failedCount1h: 0,
        accountStatuses: [
          {
            accountId: testBankAccount1Id,
            accountName: 'Test Webhook Account 1',
            lastWebhookAt: null,
            lastWebhookStatus: null,
            webhookId: 'webhook_123',
          },
          {
            accountId: testBankAccount2Id,
            accountName: 'Test Webhook Account 2',
            lastWebhookAt: null,
            lastWebhookStatus: null,
            webhookId: 'webhook_456',
          },
        ],
      });
    });

    it('should return recent successful webhook events', async () => {
      // Create successful webhook events
      const now = new Date();
      await prisma.syncLog.create({
        data: {
          bankAccountId: testBankAccount1Id,
          syncType: 'webhook',
          status: 'success',
          startedAt: new Date(now.getTime() - 1000 * 60 * 5), // 5 minutes ago
          completedAt: new Date(now.getTime() - 1000 * 60 * 5 + 1000),
          transactionsFetched: 1,
          webhookEventId: 'evt_123',
        },
      });

      await prisma.syncLog.create({
        data: {
          bankAccountId: testBankAccount2Id,
          syncType: 'webhook',
          status: 'success',
          startedAt: new Date(now.getTime() - 1000 * 60 * 10), // 10 minutes ago
          completedAt: new Date(now.getTime() - 1000 * 60 * 10 + 1000),
          transactionsFetched: 1,
          webhookEventId: 'evt_456',
        },
      });

      const response = await request(app)
        .get('/api/bank/webhooks/status')
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.lastEventTimestamp).toBeTruthy();
      expect(response.body.data.recentEvents).toHaveLength(2);
      expect(response.body.data.failedCount24h).toBe(0);
      expect(response.body.data.failedCount1h).toBe(0);

      // Most recent event should be first
      expect(response.body.data.recentEvents[0].webhookEventId).toBe('evt_123');
      expect(response.body.data.recentEvents[0].status).toBe('success');
      expect(response.body.data.recentEvents[1].webhookEventId).toBe('evt_456');
    });

    it('should count failed webhooks in last 24 hours', async () => {
      const now = new Date();

      // Create failed webhook events in last 24 hours
      await prisma.syncLog.create({
        data: {
          bankAccountId: testBankAccount1Id,
          syncType: 'webhook',
          status: 'failed',
          startedAt: new Date(now.getTime() - 1000 * 60 * 60 * 2), // 2 hours ago
          completedAt: new Date(now.getTime() - 1000 * 60 * 60 * 2 + 1000),
          errorMessage: 'Test error 1',
          webhookEventId: 'evt_fail_1',
        },
      });

      await prisma.syncLog.create({
        data: {
          bankAccountId: testBankAccount2Id,
          syncType: 'webhook',
          status: 'failed',
          startedAt: new Date(now.getTime() - 1000 * 60 * 60 * 12), // 12 hours ago
          completedAt: new Date(now.getTime() - 1000 * 60 * 60 * 12 + 1000),
          errorMessage: 'Test error 2',
          webhookEventId: 'evt_fail_2',
        },
      });

      // Create a failed webhook event older than 24 hours (should not be counted)
      await prisma.syncLog.create({
        data: {
          bankAccountId: testBankAccount1Id,
          syncType: 'webhook',
          status: 'failed',
          startedAt: new Date(now.getTime() - 1000 * 60 * 60 * 25), // 25 hours ago
          completedAt: new Date(now.getTime() - 1000 * 60 * 60 * 25 + 1000),
          errorMessage: 'Test error old',
          webhookEventId: 'evt_fail_old',
        },
      });

      const response = await request(app)
        .get('/api/bank/webhooks/status')
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.failedCount24h).toBe(2);
      expect(response.body.data.failedCount1h).toBe(0);
    });

    it('should count failed webhooks in last hour for critical alert', async () => {
      const now = new Date();

      // Create 3 failed webhook events in last hour
      await prisma.syncLog.create({
        data: {
          bankAccountId: testBankAccount1Id,
          syncType: 'webhook',
          status: 'failed',
          startedAt: new Date(now.getTime() - 1000 * 60 * 10), // 10 minutes ago
          completedAt: new Date(now.getTime() - 1000 * 60 * 10 + 1000),
          errorMessage: 'Test error 1',
          webhookEventId: 'evt_fail_1',
        },
      });

      await prisma.syncLog.create({
        data: {
          bankAccountId: testBankAccount1Id,
          syncType: 'webhook',
          status: 'failed',
          startedAt: new Date(now.getTime() - 1000 * 60 * 30), // 30 minutes ago
          completedAt: new Date(now.getTime() - 1000 * 60 * 30 + 1000),
          errorMessage: 'Test error 2',
          webhookEventId: 'evt_fail_2',
        },
      });

      await prisma.syncLog.create({
        data: {
          bankAccountId: testBankAccount2Id,
          syncType: 'webhook',
          status: 'failed',
          startedAt: new Date(now.getTime() - 1000 * 60 * 50), // 50 minutes ago
          completedAt: new Date(now.getTime() - 1000 * 60 * 50 + 1000),
          errorMessage: 'Test error 3',
          webhookEventId: 'evt_fail_3',
        },
      });

      const response = await request(app)
        .get('/api/bank/webhooks/status')
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.failedCount1h).toBe(3);
      expect(response.body.data.failedCount24h).toBe(3);
    });

    it('should limit recent events to 20 entries', async () => {
      const now = new Date();

      // Create 25 webhook events
      for (let i = 0; i < 25; i++) {
        await prisma.syncLog.create({
          data: {
            bankAccountId: i % 2 === 0 ? testBankAccount1Id : testBankAccount2Id,
            syncType: 'webhook',
            status: 'success',
            startedAt: new Date(now.getTime() - 1000 * 60 * i),
            completedAt: new Date(now.getTime() - 1000 * 60 * i + 1000),
            transactionsFetched: 1,
            webhookEventId: `evt_${i}`,
          },
        });
      }

      const response = await request(app)
        .get('/api/bank/webhooks/status')
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.recentEvents).toHaveLength(20);
    });

    it('should include per-account webhook status', async () => {
      const now = new Date();

      // Create webhook events for account 1
      await prisma.syncLog.create({
        data: {
          bankAccountId: testBankAccount1Id,
          syncType: 'webhook',
          status: 'success',
          startedAt: new Date(now.getTime() - 1000 * 60 * 5),
          completedAt: new Date(now.getTime() - 1000 * 60 * 5 + 1000),
          transactionsFetched: 1,
          webhookEventId: 'evt_acc1',
        },
      });

      // Create webhook events for account 2 (failed)
      await prisma.syncLog.create({
        data: {
          bankAccountId: testBankAccount2Id,
          syncType: 'webhook',
          status: 'failed',
          startedAt: new Date(now.getTime() - 1000 * 60 * 10),
          completedAt: new Date(now.getTime() - 1000 * 60 * 10 + 1000),
          errorMessage: 'Test error',
          webhookEventId: 'evt_acc2',
        },
      });

      const response = await request(app)
        .get('/api/bank/webhooks/status')
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const account1Status = response.body.data.accountStatuses.find(
        (s: AccountWebhookStatus) => s.accountId === testBankAccount1Id
      );
      expect(account1Status.lastWebhookStatus).toBe('success');
      expect(account1Status.lastWebhookAt).toBeTruthy();

      const account2Status = response.body.data.accountStatuses.find(
        (s: AccountWebhookStatus) => s.accountId === testBankAccount2Id
      );
      expect(account2Status.lastWebhookStatus).toBe('failed');
      expect(account2Status.lastWebhookAt).toBeTruthy();
    });

    it('should only include accounts with webhooks configured', async () => {
      // Create account without webhook
      await prisma.bankAccount.create({
        data: {
          accountId: 'acc_no_webhook',
          accountName: 'Account Without Webhook',
          accountType: 'uk_retail',
          provider: 'monzo',
          accessToken: encryptToken('test_access_token_3'),
          syncEnabled: true,
          syncFromDate: new Date('2024-01-01'),
          lastSyncStatus: 'success',
          webhookId: null,
          webhookUrl: null,
        },
      });

      const response = await request(app)
        .get('/api/bank/webhooks/status')
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accountStatuses).toHaveLength(2);
      expect(
        response.body.data.accountStatuses.every((s: AccountWebhookStatus) => s.webhookId !== null)
      ).toBe(true);
    });
  });
});
