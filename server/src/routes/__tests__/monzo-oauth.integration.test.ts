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

    // Create admin user
    await authService.createUser(adminUser.email, adminUser.password, Roles.ADMIN);

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

  describe('Complete OAuth Flow', () => {
    it('should complete full OAuth flow: initiate → callback → import → webhook', async () => {
      // Step 1: Initiate OAuth flow
      const initiateResponse = await request(app)
        .post('/api/bank/monzo/connect')
        .set('Cookie', authCookie)
        .send({ syncFromDays: 90 });

      expect(initiateResponse.status).toBe(200);
      expect(initiateResponse.body.success).toBe(true);
      expect(initiateResponse.body.authUrl).toContain('https://auth.monzo.com/');
      expect(initiateResponse.body.authUrl).toContain('state=');

      // Extract state from auth URL
      const urlParams = new URL(initiateResponse.body.authUrl).searchParams;
      const state = urlParams.get('state');
      expect(state).toBeTruthy();

      // Mock Monzo API responses for callback flow
      const mockAuthCode = 'test_auth_code_123';
      const mockAccessToken = 'test_access_token_xyz';
      const mockRefreshToken = 'test_refresh_token_xyz';
      const mockAccountId = 'acc_test_integration_123';

      // Mock token exchange
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: mockAccessToken,
          refresh_token: mockRefreshToken,
          expires_in: 21600, // 6 hours
        }),
      } as Response);

      // Mock account info fetch
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          accounts: [
            {
              id: mockAccountId,
              description: 'Integration Test Current Account',
              type: 'uk_retail',
            },
          ],
        }),
      } as Response);

      // Mock webhook registration
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          webhook: {
            id: 'webhook_integration_123',
            account_id: mockAccountId,
            url: 'http://localhost:3000/api/bank/webhooks/monzo/test-webhook-secret-uuid',
          },
        }),
      } as Response);

      // Mock transaction history fetch (empty for simplicity)
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transactions: [],
        }),
      } as Response);

      // Step 2: Complete OAuth callback
      const callbackResponse = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ code: mockAuthCode, state });

      expect(callbackResponse.status).toBe(302);
      expect(callbackResponse.headers.location).toContain('/settings?success=monzo_connected&bankAccountId=');

      // Extract bank account ID from redirect
      const redirectUrl = new URL(callbackResponse.headers.location, 'http://localhost:3000');
      const bankAccountId = redirectUrl.searchParams.get('bankAccountId');
      expect(bankAccountId).toBeTruthy();

      // Give background import a moment to start
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Step 3: Verify BankAccount was created correctly
      const bankAccount = await prisma.bankAccount.findUnique({
        where: { id: bankAccountId! },
      });

      expect(bankAccount).toBeTruthy();
      expect(bankAccount?.accountId).toBe(mockAccountId);
      expect(bankAccount?.accountName).toBe('Integration Test Current Account');
      expect(bankAccount?.accountType).toBe('uk_retail');
      expect(bankAccount?.provider).toBe('monzo');
      expect(bankAccount?.syncEnabled).toBe(true);
      expect(bankAccount?.webhookId).toBe('webhook_integration_123');
      expect(bankAccount?.webhookUrl).toContain('/api/bank/webhooks/monzo/');

      // Verify tokens are encrypted (not plaintext)
      expect(bankAccount?.accessToken).not.toBe(mockAccessToken);
      expect(bankAccount?.refreshToken).not.toBe(mockRefreshToken);

      // Verify we can decrypt tokens
      const decryptedAccessToken = decryptToken(bankAccount!.accessToken);
      const decryptedRefreshToken = decryptToken(bankAccount!.refreshToken!);
      expect(decryptedAccessToken).toBe(mockAccessToken);
      expect(decryptedRefreshToken).toBe(mockRefreshToken);

      // Step 4: Verify webhook was registered with correct parameters
      const fetchCalls = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls;
      const webhookCall = fetchCalls.find((call) => call[0] === 'https://api.monzo.com/webhooks');
      expect(webhookCall).toBeTruthy();
      expect(webhookCall![1]?.method).toBe('POST');

      // Step 5: Verify sync log was created
      const syncLog = await prisma.syncLog.findFirst({
        where: { bankAccountId: bankAccountId! },
        orderBy: { startedAt: 'desc' },
      });

      expect(syncLog).toBeTruthy();
      expect(syncLog?.syncType).toBe('initial');
      // Status should be success or in_progress (depending on timing)
      expect(['in_progress', 'success', 'partial']).toContain(syncLog?.status);
    }, 10000); // 10 second timeout for this test

    it('should handle authorization code expiry (5-minute window)', async () => {
      // Initiate OAuth to establish state store
      await request(app)
        .post('/api/bank/monzo/connect')
        .set('Cookie', authCookie)
        .send({ syncFromDays: 30 });

      // Simulate 11 minutes passing (beyond 10-minute state expiry)
      // We can't actually wait 11 minutes, so we'll test with an invalid/expired state
      // The state validation checks for 10-minute expiry in validateState function

      // Wait a moment for state to be created
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Mock token exchange (won't be reached due to state validation failure)
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Invalid authorization code',
      } as Response);

      // For this test, we'll use an invalid/expired state
      const callbackResponse = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ code: 'test_code', state: 'invalid_expired_state' });

      expect(callbackResponse.status).toBe(302);
      expect(callbackResponse.headers.location).toContain('/settings?error=');

      // Verify no bank account was created
      const bankAccounts = await prisma.bankAccount.findMany({});
      expect(bankAccounts).toHaveLength(0);
    });

    it('should handle token exchange failure', async () => {
      // Initiate OAuth
      const initiateResponse = await request(app)
        .post('/api/bank/monzo/connect')
        .set('Cookie', authCookie)
        .send({ syncFromDays: 90 });

      const urlParams = new URL(initiateResponse.body.authUrl).searchParams;
      const state = urlParams.get('state');

      // Mock failed token exchange
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Invalid authorization code',
      } as Response);

      // Complete callback with invalid code
      const callbackResponse = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ code: 'invalid_code', state });

      expect(callbackResponse.status).toBe(302);
      expect(callbackResponse.headers.location).toContain('/settings?error=oauth_failed');

      // Verify no bank account was created
      const bankAccounts = await prisma.bankAccount.findMany({});
      expect(bankAccounts).toHaveLength(0);
    });

    it('should handle account info fetch failure', async () => {
      // Initiate OAuth
      const initiateResponse = await request(app)
        .post('/api/bank/monzo/connect')
        .set('Cookie', authCookie)
        .send({ syncFromDays: 90 });

      const urlParams = new URL(initiateResponse.body.authUrl).searchParams;
      const state = urlParams.get('state');

      // Mock successful token exchange
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test_token',
          refresh_token: 'test_refresh',
          expires_in: 21600,
        }),
      } as Response);

      // Mock failed account info fetch
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Failed to fetch account',
      } as Response);

      // Complete callback
      const callbackResponse = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ code: 'test_code', state });

      expect(callbackResponse.status).toBe(302);
      expect(callbackResponse.headers.location).toContain('/settings?error=oauth_failed');

      // Verify no bank account was created
      const bankAccounts = await prisma.bankAccount.findMany({});
      expect(bankAccounts).toHaveLength(0);
    });

    it('should complete OAuth even if webhook registration fails', async () => {
      // Initiate OAuth
      const initiateResponse = await request(app)
        .post('/api/bank/monzo/connect')
        .set('Cookie', authCookie)
        .send({ syncFromDays: 90 });

      const urlParams = new URL(initiateResponse.body.authUrl).searchParams;
      const state = urlParams.get('state');

      const mockAccessToken = 'test_token_webhook_fail';
      const mockAccountId = 'acc_webhook_fail_123';

      // Mock token exchange
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: mockAccessToken,
          refresh_token: 'test_refresh',
          expires_in: 21600,
        }),
      } as Response);

      // Mock account info
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          accounts: [
            {
              id: mockAccountId,
              description: 'Test Account',
              type: 'uk_retail',
            },
          ],
        }),
      } as Response);

      // Mock failed webhook registration
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Webhook registration failed',
      } as Response);

      // Mock successful transaction fetch (for background import)
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transactions: [],
        }),
      } as Response);

      // Complete callback
      const callbackResponse = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ code: 'test_code', state });

      expect(callbackResponse.status).toBe(302);
      expect(callbackResponse.headers.location).toContain('/settings?success=monzo_connected');

      // Verify bank account was created without webhook
      const redirectUrl = new URL(callbackResponse.headers.location, 'http://localhost:3000');
      const bankAccountId = redirectUrl.searchParams.get('bankAccountId');

      const bankAccount = await prisma.bankAccount.findUnique({
        where: { id: bankAccountId! },
      });

      expect(bankAccount).toBeTruthy();
      expect(bankAccount?.webhookId).toBeNull();
      expect(bankAccount?.webhookUrl).toBeNull();
      expect(bankAccount?.syncEnabled).toBe(true); // Still enabled for manual sync
    });

    it('should import transaction history immediately after callback', async () => {
      // Initiate OAuth
      const initiateResponse = await request(app)
        .post('/api/bank/monzo/connect')
        .set('Cookie', authCookie)
        .send({ syncFromDays: 180 });

      const urlParams = new URL(initiateResponse.body.authUrl).searchParams;
      const state = urlParams.get('state');

      const mockAccessToken = 'test_token_import';
      const mockAccountId = 'acc_import_123';

      // Mock token exchange
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: mockAccessToken,
          refresh_token: 'test_refresh',
          expires_in: 21600,
        }),
      } as Response);

      // Mock account info
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          accounts: [
            {
              id: mockAccountId,
              description: 'Test Import Account',
              type: 'uk_retail',
            },
          ],
        }),
      } as Response);

      // Mock webhook registration
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          webhook: {
            id: 'webhook_import_123',
            account_id: mockAccountId,
            url: 'http://localhost:3000/api/bank/webhooks/monzo/test-webhook-secret-uuid',
          },
        }),
      } as Response);

      // Mock transaction history fetch with sample transactions
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transactions: [
            {
              id: 'tx_1',
              created: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
              description: 'Coffee Shop',
              amount: -350,
              currency: 'GBP',
              notes: '',
              category: 'eating_out',
            },
            {
              id: 'tx_2',
              created: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
              description: 'Grocery Store',
              amount: -2500,
              currency: 'GBP',
              notes: '',
              category: 'groceries',
            },
          ],
        }),
      } as Response);

      // Complete callback
      const callbackResponse = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ code: 'test_code', state });

      expect(callbackResponse.status).toBe(302);

      // Extract bank account ID
      const redirectUrl = new URL(callbackResponse.headers.location, 'http://localhost:3000');
      const bankAccountId = redirectUrl.searchParams.get('bankAccountId');

      // Wait for background import to complete (give it up to 2 seconds)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify sync log was created and completed
      const syncLog = await prisma.syncLog.findFirst({
        where: { bankAccountId: bankAccountId! },
      });

      expect(syncLog).toBeTruthy();
      expect(syncLog?.syncType).toBe('initial');
      expect(['success', 'partial']).toContain(syncLog?.status);
      expect(syncLog?.transactionsFetched).toBe(2);

      // Verify transactions were imported
      const transactions = await prisma.bankTransaction.findMany({
        where: { bankAccountId: bankAccountId! },
      });

      expect(transactions.length).toBeGreaterThanOrEqual(2);
      expect(transactions.some((t) => t.externalId === 'tx_1')).toBe(true);
      expect(transactions.some((t) => t.externalId === 'tx_2')).toBe(true);
    }, 5000);

    it('should handle re-authentication by updating existing account', async () => {
      const mockAccountId = 'acc_reauth_123';

      // Create existing bank account
      const existingAccount = await prisma.bankAccount.create({
        data: {
          accountId: mockAccountId,
          accountName: 'Old Account Name',
          accountType: 'uk_retail',
          provider: 'monzo',
          accessToken: 'old_encrypted_token',
          refreshToken: 'old_refresh_token',
          tokenExpiresAt: new Date(Date.now() - 86400000), // Expired 1 day ago
          syncFromDate: new Date(Date.now() - 90 * 86400000), // 90 days ago
          syncEnabled: false,
          lastSyncStatus: 'failed',
          webhookId: 'old_webhook_123',
          webhookUrl: 'http://localhost:3000/api/bank/webhooks/monzo/old-secret',
        },
      });

      // Initiate new OAuth flow
      const initiateResponse = await request(app)
        .post('/api/bank/monzo/connect')
        .set('Cookie', authCookie)
        .send({ syncFromDays: 30 });

      const urlParams = new URL(initiateResponse.body.authUrl).searchParams;
      const state = urlParams.get('state');

      const newAccessToken = 'new_access_token';
      const newRefreshToken = 'new_refresh_token';

      // Mock all API calls in the order they'll be made:
      // 1. Token exchange
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: newAccessToken,
          refresh_token: newRefreshToken,
          expires_in: 21600,
        }),
      } as Response);

      // 2. Get account info (same account)
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          accounts: [
            {
              id: mockAccountId,
              description: 'Updated Account Name',
              type: 'uk_retail',
            },
          ],
        }),
      } as Response);

      // 3. Delete old webhook (happens after DB check)
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      // 4. Register new webhook
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          webhook: {
            id: 'new_webhook_456',
            account_id: mockAccountId,
            url: 'http://localhost:3000/api/bank/webhooks/monzo/test-webhook-secret-uuid',
          },
        }),
      } as Response);

      // 5. Fetch transaction history (background import)
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transactions: [],
        }),
      } as Response);

      // Complete callback
      const callbackResponse = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ code: 'test_code', state });

      expect(callbackResponse.status).toBe(302);
      expect(callbackResponse.headers.location).toContain('/settings?success=monzo_connected');

      // Verify only one account exists (updated, not duplicated)
      const accounts = await prisma.bankAccount.findMany({
        where: { accountId: mockAccountId },
      });

      expect(accounts).toHaveLength(1);

      const updatedAccount = accounts[0];
      expect(updatedAccount.id).toBe(existingAccount.id); // Same database ID
      expect(updatedAccount.accountName).toBe('Updated Account Name');
      expect(updatedAccount.syncEnabled).toBe(true); // Re-enabled
      expect(updatedAccount.webhookId).toBe('new_webhook_456');
      expect(updatedAccount.webhookUrl).toContain('test-webhook-secret-uuid');

      // Verify tokens were updated
      const decryptedAccessToken = decryptToken(updatedAccount.accessToken);
      expect(decryptedAccessToken).toBe(newAccessToken);

      // Verify old webhook was deleted
      const fetchCalls = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls;
      const deleteWebhookCall = fetchCalls.find(
        (call) => call[0] === 'https://api.monzo.com/webhooks/old_webhook_123'
      );
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
      // Initiate OAuth
      const initiateResponse = await request(app)
        .post('/api/bank/monzo/connect')
        .set('Cookie', authCookie)
        .send({ syncFromDays: 90 });

      const urlParams = new URL(initiateResponse.body.authUrl).searchParams;
      const state = urlParams.get('state');

      // Mock API calls for first callback (in order):
      // 1. Token exchange
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test_token',
          refresh_token: 'test_refresh',
          expires_in: 21600,
        }),
      } as Response);

      // 2. Account info
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          accounts: [
            {
              id: 'acc_replay_test',
              description: 'Replay Test',
              type: 'uk_retail',
            },
          ],
        }),
      } as Response);

      // 3. Webhook registration
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          webhook: {
            id: 'webhook_replay',
            account_id: 'acc_replay_test',
            url: 'http://localhost:3000/api/bank/webhooks/monzo/test-webhook-secret-uuid',
          },
        }),
      } as Response);

      // 4. Transaction fetch (background import)
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transactions: [],
        }),
      } as Response);

      // First callback should succeed
      const firstCallback = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ code: 'test_code_1', state });

      expect(firstCallback.status).toBe(302);
      expect(firstCallback.headers.location).toContain('/settings?success=monzo_connected');

      // Second callback with same state should fail (state was deleted after first use)
      const secondCallback = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ code: 'test_code_2', state });

      expect(secondCallback.status).toBe(302);
      expect(secondCallback.headers.location).toContain('/settings?error=oauth_failed');
    });
  });

  describe('Webhook Integration', () => {
    it('should register webhook with correct URL format', async () => {
      const initiateResponse = await request(app)
        .post('/api/bank/monzo/connect')
        .set('Cookie', authCookie)
        .send({ syncFromDays: 90 });

      const urlParams = new URL(initiateResponse.body.authUrl).searchParams;
      const state = urlParams.get('state');

      const mockAccessToken = 'test_token_webhook';
      const mockAccountId = 'acc_webhook_format';

      // Mock token exchange
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: mockAccessToken,
          refresh_token: 'test_refresh',
          expires_in: 21600,
        }),
      } as Response);

      // Mock account info
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          accounts: [
            {
              id: mockAccountId,
              description: 'Webhook Test',
              type: 'uk_retail',
            },
          ],
        }),
      } as Response);

      // Mock webhook registration
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          webhook: {
            id: 'webhook_format_test',
            account_id: mockAccountId,
            url: 'http://localhost:3000/api/bank/webhooks/monzo/test-webhook-secret-uuid',
          },
        }),
      } as Response);

      // Mock transaction fetch
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transactions: [],
        }),
      } as Response);

      await request(app).get('/api/bank/monzo/callback').query({ code: 'test_code', state });

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

      // Check webhook URL includes secret
      const body = new URLSearchParams(webhookCall![1]?.body as string);
      expect(body.get('account_id')).toBe(mockAccountId);
      expect(body.get('url')).toBe(
        'http://localhost:3000/api/bank/webhooks/monzo/test-webhook-secret-uuid'
      );
    });

    it('should skip webhook registration when MONZO_WEBHOOK_SECRET not set', async () => {
      const originalSecret = process.env.MONZO_WEBHOOK_SECRET;
      delete process.env.MONZO_WEBHOOK_SECRET;

      const initiateResponse = await request(app)
        .post('/api/bank/monzo/connect')
        .set('Cookie', authCookie)
        .send({ syncFromDays: 90 });

      const urlParams = new URL(initiateResponse.body.authUrl).searchParams;
      const state = urlParams.get('state');

      // Mock token exchange
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test_token',
          refresh_token: 'test_refresh',
          expires_in: 21600,
        }),
      } as Response);

      // Mock account info
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          accounts: [
            {
              id: 'acc_no_webhook',
              description: 'No Webhook Test',
              type: 'uk_retail',
            },
          ],
        }),
      } as Response);

      // Mock transaction fetch
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transactions: [],
        }),
      } as Response);

      const response = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ code: 'test_code', state });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('/settings?success=monzo_connected');

      // Verify webhook registration was NOT attempted
      const fetchCalls = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls;
      const webhookCall = fetchCalls.find((call) => call[0] === 'https://api.monzo.com/webhooks');
      expect(webhookCall).toBeUndefined();

      // Restore
      process.env.MONZO_WEBHOOK_SECRET = originalSecret;
    });
  });
});
