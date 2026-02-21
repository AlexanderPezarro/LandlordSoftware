/**
 * Integration tests for Monzo OAuth flow
 *
 * These tests verify the complete OAuth flow from initiate → callback → transaction import → webhook registration
 * Unlike unit tests, these tests do NOT mock the service layer - they test the full integration
 * through routes → services → database. Only external API calls to Monzo are mocked.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../app.js';
import prisma from '../../db/client.js';
import authService from '../../services/auth.service.js';
import { Roles } from '../../../../shared/types/user.types.js';
import { decryptToken } from '../../services/encryption.js';

const app = createApp();

describe('Monzo OAuth Integration Tests', () => {
  const testUser = {
    email: 'oauth-test@example.com',
    password: 'testPassword123',
  };

  const adminUser = {
    email: 'oauth-admin@example.com',
    password: 'adminPassword123',
  };

  let authCookie: string;
  let adminCookie: string;
  let originalFetch: typeof global.fetch;

  beforeAll(async () => {
    // Save original fetch
    originalFetch = global.fetch;

    // Clean database
    await prisma.bankAccount.deleteMany({});
    await prisma.user.deleteMany({});

    // Create regular user
    await authService.createUser(testUser.email, testUser.password);
    const loginResponse = await request(app).post('/api/auth/login').send(testUser);
    authCookie = loginResponse.headers['set-cookie'][0];

    // Create admin user and get cookie
    await authService.createUser(adminUser.email, adminUser.password, Roles.ADMIN);
    const adminLoginResponse = await request(app).post('/api/auth/login').send(adminUser);
    adminCookie = adminLoginResponse.headers['set-cookie'][0];

    // Set required environment variables
    process.env.MONZO_CLIENT_ID = 'test_client_id';
    process.env.MONZO_CLIENT_SECRET = 'test_client_secret';
    process.env.MONZO_REDIRECT_URI = 'http://localhost:3000/api/bank/monzo/callback';
    process.env.BANK_TOKEN_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    process.env.MONZO_WEBHOOK_SECRET = 'test-webhook-secret-uuid';
    process.env.WEBHOOK_BASE_URL = 'http://localhost:3000';
  });

  afterAll(async () => {
    // Restore original fetch
    global.fetch = originalFetch;

    // Clean up
    await prisma.syncLog.deleteMany({});
    await prisma.bankTransaction.deleteMany({});
    await prisma.bankAccount.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up before each test
    await prisma.syncLog.deleteMany({});
    await prisma.bankTransaction.deleteMany({});
    await prisma.bankAccount.deleteMany({});

    // Reset fetch mock
    global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Helper to run the two-step OAuth flow:
   * 1. Initiate OAuth → get state
   * 2. Callback with code + state → get pendingId
   * 3. Complete connection → create BankAccount
   *
   * Callers must set up global.fetch mocks before calling this.
   * Token exchange mock should be first, then account info, webhook, transactions.
   */
  async function initiateAndCallback(syncFromDays = 90) {
    // Step 1: Initiate OAuth flow
    const initiateResponse = await request(app)
      .post('/api/bank/monzo/connect')
      .set('Cookie', authCookie)
      .send({ syncFromDays });

    expect(initiateResponse.status).toBe(200);
    const urlParams = new URL(initiateResponse.body.authUrl).searchParams;
    const state = urlParams.get('state');
    expect(state).toBeTruthy();
    return state!;
  }

  async function callbackAndGetPendingId(code: string, state: string) {
    const callbackResponse = await request(app)
      .get('/api/bank/monzo/callback')
      .query({ code, state });

    expect(callbackResponse.status).toBe(302);
    expect(callbackResponse.headers.location).toContain('pending_approval=monzo');

    const redirectUrl = new URL(callbackResponse.headers.location, 'http://localhost:3000');
    const pendingId = redirectUrl.searchParams.get('pendingId');
    expect(pendingId).toBeTruthy();
    return pendingId!;
  }

  describe('Complete OAuth Flow', () => {
    it('should complete full OAuth flow: initiate → callback → complete-connection → import', async () => {
      const mockAccessToken = 'test_access_token_xyz';
      const mockRefreshToken = 'test_refresh_token_xyz';
      const mockAccountId = 'acc_test_integration_123';

      // Mock token exchange (for callback)
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: mockAccessToken,
          refresh_token: mockRefreshToken,
          expires_in: 21600,
        }),
      } as Response);

      // Step 1 & 2: Initiate and callback
      const state = await initiateAndCallback(90);
      const pendingId = await callbackAndGetPendingId('test_auth_code_123', state);

      // No bank account should exist yet
      const preAccounts = await prisma.bankAccount.findMany({});
      expect(preAccounts).toHaveLength(0);

      // Set up mocks for complete-connection (account info, webhook, transactions)
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          accounts: [{ id: mockAccountId, description: 'Integration Test Current Account', type: 'uk_retail' }],
        }),
      } as Response);

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          webhook: { id: 'webhook_integration_123', account_id: mockAccountId, url: 'http://localhost:3000/api/bank/webhooks/monzo/test-webhook-secret-uuid' },
        }),
      } as Response);

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [] }),
      } as Response);

      // Step 3: Complete connection
      const completeResponse = await request(app)
        .post('/api/bank/monzo/complete-connection')
        .set('Cookie', adminCookie)
        .send({ pendingId });

      expect(completeResponse.status).toBe(200);
      expect(completeResponse.body.success).toBe(true);
      const bankAccountId = completeResponse.body.bankAccountId;

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify BankAccount was created
      const bankAccount = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
      expect(bankAccount).toBeTruthy();
      expect(bankAccount?.accountId).toBe(mockAccountId);
      expect(bankAccount?.accountName).toBe('Integration Test Current Account');
      expect(bankAccount?.provider).toBe('monzo');
      expect(bankAccount?.syncEnabled).toBe(true);
      expect(bankAccount?.webhookId).toBe('webhook_integration_123');

      // Verify tokens are encrypted
      expect(bankAccount?.accessToken).not.toBe(mockAccessToken);
      const decryptedAccessToken = decryptToken(bankAccount!.accessToken);
      expect(decryptedAccessToken).toBe(mockAccessToken);

      // Verify sync log was created
      const syncLog = await prisma.syncLog.findFirst({ where: { bankAccountId }, orderBy: { startedAt: 'desc' } });
      expect(syncLog).toBeTruthy();
      expect(syncLog?.syncType).toBe('initial');
    }, 10000);

    it('should handle authorization code expiry (invalid state)', async () => {
      await request(app).post('/api/bank/monzo/connect').set('Cookie', authCookie).send({ syncFromDays: 30 });
      await new Promise((resolve) => setTimeout(resolve, 50));

      const callbackResponse = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ code: 'test_code', state: 'invalid_expired_state' });

      expect(callbackResponse.status).toBe(302);
      expect(callbackResponse.headers.location).toContain('/settings?error=');
    });

    it('should handle token exchange failure', async () => {
      const state = await initiateAndCallback(90);

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Invalid authorization code',
      } as Response);

      const callbackResponse = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ code: 'invalid_code', state });

      expect(callbackResponse.status).toBe(302);
      expect(callbackResponse.headers.location).toContain('/settings?error=oauth_failed');
    });

    it('should handle account info fetch failure (SCA not approved) in complete-connection', async () => {
      // Mock token exchange
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'test_token', refresh_token: 'test_refresh', expires_in: 21600 }),
      } as Response);

      const state = await initiateAndCallback(90);
      const pendingId = await callbackAndGetPendingId('test_code', state);

      // Mock failed account info (SCA not approved)
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        text: async () => '{"code":"forbidden.insufficient_permissions"}',
      } as Response);

      const completeResponse = await request(app)
        .post('/api/bank/monzo/complete-connection')
        .set('Cookie', adminCookie)
        .send({ pendingId });

      expect(completeResponse.status).toBe(403);
      expect(completeResponse.body.error).toContain('not yet approved');

      // No bank account should be created
      const bankAccounts = await prisma.bankAccount.findMany({});
      expect(bankAccounts).toHaveLength(0);
    });

    it('should complete connection even if webhook registration fails', async () => {
      const mockAccountId = 'acc_webhook_fail_123';

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'test_token_webhook_fail', refresh_token: 'test_refresh', expires_in: 21600 }),
      } as Response);

      const state = await initiateAndCallback(90);
      const pendingId = await callbackAndGetPendingId('test_code', state);

      // Account info succeeds
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accounts: [{ id: mockAccountId, description: 'Test Account', type: 'uk_retail' }] }),
      } as Response);

      // Webhook fails
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Webhook registration failed',
      } as Response);

      // Transaction fetch for import
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [] }),
      } as Response);

      const completeResponse = await request(app)
        .post('/api/bank/monzo/complete-connection')
        .set('Cookie', adminCookie)
        .send({ pendingId });

      expect(completeResponse.status).toBe(200);
      expect(completeResponse.body.success).toBe(true);

      const bankAccount = await prisma.bankAccount.findUnique({ where: { accountId: mockAccountId } });
      expect(bankAccount?.webhookId).toBeNull();
      expect(bankAccount?.syncEnabled).toBe(true);
    });

    it('should import transactions after complete-connection', async () => {
      const mockAccountId = 'acc_import_123';

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'test_token_import', refresh_token: 'test_refresh', expires_in: 21600 }),
      } as Response);

      const state = await initiateAndCallback(180);
      const pendingId = await callbackAndGetPendingId('test_code', state);

      // Account info
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accounts: [{ id: mockAccountId, description: 'Test Import Account', type: 'uk_retail' }] }),
      } as Response);

      // Webhook
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ webhook: { id: 'webhook_import_123', account_id: mockAccountId, url: 'http://localhost:3000/api/bank/webhooks/monzo/test-webhook-secret-uuid' } }),
      } as Response);

      // Transactions
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transactions: [
            { id: 'tx_1', created: new Date(Date.now() - 86400000).toISOString(), description: 'Coffee Shop', amount: -350, currency: 'GBP', notes: '', category: 'eating_out' },
            { id: 'tx_2', created: new Date(Date.now() - 172800000).toISOString(), description: 'Grocery Store', amount: -2500, currency: 'GBP', notes: '', category: 'groceries' },
          ],
        }),
      } as Response);

      const completeResponse = await request(app)
        .post('/api/bank/monzo/complete-connection')
        .set('Cookie', adminCookie)
        .send({ pendingId });

      expect(completeResponse.status).toBe(200);
      const bankAccountId = completeResponse.body.bankAccountId;

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const syncLog = await prisma.syncLog.findFirst({ where: { bankAccountId } });
      expect(syncLog).toBeTruthy();
      expect(['success', 'partial']).toContain(syncLog?.status);
      expect(syncLog?.transactionsFetched).toBe(2);

      const transactions = await prisma.bankTransaction.findMany({ where: { bankAccountId } });
      expect(transactions.length).toBeGreaterThanOrEqual(2);
    }, 5000);

    it('should handle re-authentication by updating existing account', async () => {
      const mockAccountId = 'acc_reauth_123';

      const existingAccount = await prisma.bankAccount.create({
        data: {
          accountId: mockAccountId,
          accountName: 'Old Account Name',
          accountType: 'uk_retail',
          provider: 'monzo',
          accessToken: 'old_encrypted_token',
          refreshToken: 'old_refresh_token',
          tokenExpiresAt: new Date(Date.now() - 86400000),
          syncFromDate: new Date(Date.now() - 90 * 86400000),
          syncEnabled: false,
          lastSyncStatus: 'failed',
          webhookId: 'old_webhook_123',
          webhookUrl: 'http://localhost:3000/api/bank/webhooks/monzo/old-secret',
        },
      });

      const newAccessToken = 'new_access_token';
      const newRefreshToken = 'new_refresh_token';

      // Token exchange
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: newAccessToken, refresh_token: newRefreshToken, expires_in: 21600 }),
      } as Response);

      const state = await initiateAndCallback(30);
      const pendingId = await callbackAndGetPendingId('test_code', state);

      // Account info
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accounts: [{ id: mockAccountId, description: 'Updated Account Name', type: 'uk_retail' }] }),
      } as Response);

      // Delete old webhook
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true, json: async () => ({}),
      } as Response);

      // Register new webhook
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ webhook: { id: 'new_webhook_456', account_id: mockAccountId, url: 'http://localhost:3000/api/bank/webhooks/monzo/test-webhook-secret-uuid' } }),
      } as Response);

      // Transactions
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true, json: async () => ({ transactions: [] }),
      } as Response);

      const completeResponse = await request(app)
        .post('/api/bank/monzo/complete-connection')
        .set('Cookie', adminCookie)
        .send({ pendingId });

      expect(completeResponse.status).toBe(200);

      const accounts = await prisma.bankAccount.findMany({ where: { accountId: mockAccountId } });
      expect(accounts).toHaveLength(1);

      const updatedAccount = accounts[0];
      expect(updatedAccount.id).toBe(existingAccount.id);
      expect(updatedAccount.accountName).toBe('Updated Account Name');
      expect(updatedAccount.syncEnabled).toBe(true);
      expect(updatedAccount.webhookId).toBe('new_webhook_456');

      const decryptedAccessToken = decryptToken(updatedAccount.accessToken);
      expect(decryptedAccessToken).toBe(newAccessToken);

      // Verify old webhook was deleted
      const fetchCalls = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls;
      const deleteWebhookCall = fetchCalls.find((call) => call[0] === 'https://api.monzo.com/webhooks/old_webhook_123');
      expect(deleteWebhookCall).toBeTruthy();
      expect(deleteWebhookCall![1]?.method).toBe('DELETE');
    });
  });

  describe('State Management and Security', () => {
    it('should generate unique state for each OAuth initiation', async () => {
      const response1 = await request(app)
        .post('/api/bank/monzo/connect')
        .set('Cookie', authCookie)
        .send({ syncFromDays: 90 });

      const response2 = await request(app)
        .post('/api/bank/monzo/connect')
        .set('Cookie', authCookie)
        .send({ syncFromDays: 90 });

      expect(response1.body.success).toBe(true);
      expect(response2.body.success).toBe(true);

      const state1 = new URL(response1.body.authUrl).searchParams.get('state');
      const state2 = new URL(response2.body.authUrl).searchParams.get('state');

      expect(state1).toBeTruthy();
      expect(state2).toBeTruthy();
      expect(state1).not.toBe(state2);
    });

    it('should reject callback with missing state', async () => {
      const response = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ code: 'test_code' });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('/settings?error=missing_state');
    });

    it('should reject callback with missing code', async () => {
      const response = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ state: 'test_state' });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('/settings?error=missing_code');
    });

    it('should reject callback with invalid state', async () => {
      const response = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ code: 'test_code', state: 'invalid_state_xyz' });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('/settings?error=oauth_failed');
    });

    it('should only allow state to be used once (replay protection)', async () => {
      // Mock token exchange for first callback
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'test_token', refresh_token: 'test_refresh', expires_in: 21600 }),
      } as Response);

      const state = await initiateAndCallback(90);

      // First callback should succeed (get pendingId)
      const firstCallback = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ code: 'test_code_1', state });

      expect(firstCallback.status).toBe(302);
      expect(firstCallback.headers.location).toContain('pending_approval=monzo');

      // Second callback with same state should fail (state was deleted after first use)
      const secondCallback = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ code: 'test_code_2', state });

      expect(secondCallback.status).toBe(302);
      expect(secondCallback.headers.location).toContain('/settings?error=oauth_failed');
    });
  });

  describe('Webhook Integration', () => {
    it('should register webhook with correct URL format during complete-connection', async () => {
      const mockAccessToken = 'test_token_webhook';
      const mockAccountId = 'acc_webhook_format';

      // Token exchange
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: mockAccessToken, refresh_token: 'test_refresh', expires_in: 21600 }),
      } as Response);

      const state = await initiateAndCallback(90);
      const pendingId = await callbackAndGetPendingId('test_code', state);

      // Account info
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accounts: [{ id: mockAccountId, description: 'Webhook Test', type: 'uk_retail' }] }),
      } as Response);

      // Webhook registration
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ webhook: { id: 'webhook_format_test', account_id: mockAccountId, url: 'http://localhost:3000/api/bank/webhooks/monzo/test-webhook-secret-uuid' } }),
      } as Response);

      // Transactions
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [] }),
      } as Response);

      await request(app)
        .post('/api/bank/monzo/complete-connection')
        .set('Cookie', adminCookie)
        .send({ pendingId });

      // Verify webhook registration call
      const fetchCalls = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls;
      const webhookCall = fetchCalls.find((call) => call[0] === 'https://api.monzo.com/webhooks');

      expect(webhookCall).toBeTruthy();
      expect(webhookCall![1]?.method).toBe('POST');
      expect(webhookCall![1]?.headers).toEqual(
        expect.objectContaining({
          Authorization: `Bearer ${mockAccessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        })
      );

      const body = new URLSearchParams(webhookCall![1]?.body as string);
      expect(body.get('account_id')).toBe(mockAccountId);
      expect(body.get('url')).toBe('http://localhost:3000/api/bank/webhooks/monzo/test-webhook-secret-uuid');
    });

    it('should skip webhook registration when MONZO_WEBHOOK_SECRET not set', async () => {
      const originalSecret = process.env.MONZO_WEBHOOK_SECRET;
      delete process.env.MONZO_WEBHOOK_SECRET;

      // Token exchange
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'test_token', refresh_token: 'test_refresh', expires_in: 21600 }),
      } as Response);

      const state = await initiateAndCallback(90);
      const pendingId = await callbackAndGetPendingId('test_code', state);

      // Account info
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accounts: [{ id: 'acc_no_webhook', description: 'No Webhook Test', type: 'uk_retail' }] }),
      } as Response);

      // Transactions (no webhook mock needed)
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [] }),
      } as Response);

      const response = await request(app)
        .post('/api/bank/monzo/complete-connection')
        .set('Cookie', adminCookie)
        .send({ pendingId });

      expect(response.status).toBe(200);

      // Verify webhook registration was NOT attempted
      const fetchCalls = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls;
      const webhookCall = fetchCalls.find((call) => call[0] === 'https://api.monzo.com/webhooks');
      expect(webhookCall).toBeUndefined();

      process.env.MONZO_WEBHOOK_SECRET = originalSecret;
    });
  });
});
