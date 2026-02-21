import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import prisma from '../../db/client.js';
import authService from '../../services/auth.service.js';
import { Roles } from '../../../../shared/types/user.types.js';

// Mock the monzo service before importing app
const mockGenerateAuthUrl = jest.fn<(syncFromDays: number) => string>();
const mockValidateState = jest.fn<(state: string) => Date>();
const mockExchangeCodeForTokens = jest.fn<(code: string) => Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}>>();
const mockGetAccountInfo = jest.fn<(accessToken: string) => Promise<{
  accountId: string;
  accountName: string;
  accountType: string;
}>>();
const mockImportFullHistory = jest.fn<(bankAccountId: string) => Promise<string>>();
const mockSyncNewTransactions = jest.fn<(bankAccountId: string) => Promise<{
  success: boolean;
  transactionsFetched?: number;
  lastSyncAt?: Date;
  lastSyncStatus?: string;
  error?: string;
}>>();
const mockRegisterWebhook = jest.fn<(accessToken: string, accountId: string, webhookUrl: string) => Promise<{
  webhookId: string;
  webhookUrl: string;
}>>();
const mockDeleteWebhook = jest.fn<(accessToken: string, webhookId: string) => Promise<void>>();

jest.unstable_mockModule('../../services/monzo.service.js', () => ({
  generateAuthUrl: mockGenerateAuthUrl,
  validateState: mockValidateState,
  exchangeCodeForTokens: mockExchangeCodeForTokens,
  getAccountInfo: mockGetAccountInfo,
  importFullHistory: mockImportFullHistory,
  syncNewTransactions: mockSyncNewTransactions,
  registerWebhook: mockRegisterWebhook,
  deleteWebhook: mockDeleteWebhook,
}));

// Import app after mocking
const { createApp } = await import('../../app.js');
const app = createApp();

describe('Monzo OAuth Routes', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'testPassword123',
  };

  const adminUser = {
    email: 'admin@example.com',
    password: 'adminPassword123',
  };

  let authCookie: string;
  let adminCookie: string;

  beforeAll(async () => {
    // Clean database
    await prisma.bankAccount.deleteMany({});
    await prisma.user.deleteMany({});

    // Create test user
    await authService.createUser(testUser.email, testUser.password);

    // Login to get session cookie
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send(testUser);

    authCookie = loginResponse.headers['set-cookie'][0];

    // Create admin user
    await authService.createUser(adminUser.email, adminUser.password, Roles.ADMIN);

    // Login admin to get session cookie
    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send(adminUser);

    adminCookie = adminLoginResponse.headers['set-cookie'][0];
  });

  afterAll(async () => {
    await prisma.bankAccount.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  beforeEach(async () => {
    await prisma.bankAccount.deleteMany({});
    jest.clearAllMocks();
  });

  describe('POST /api/bank/monzo/connect', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/bank/monzo/connect')
        .send({ syncFromDays: 90 });

      expect(response.status).toBe(401);
    });

    it('should validate syncFromDays parameter', async () => {
      const response = await request(app)
        .post('/api/bank/monzo/connect')
        .set('Cookie', authCookie)
        .send({ syncFromDays: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('number');
    });

    it('should reject syncFromDays less than 1', async () => {
      const response = await request(app)
        .post('/api/bank/monzo/connect')
        .set('Cookie', authCookie)
        .send({ syncFromDays: 0 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject syncFromDays greater than 1825 (5 years)', async () => {
      const response = await request(app)
        .post('/api/bank/monzo/connect')
        .set('Cookie', authCookie)
        .send({ syncFromDays: 2000 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should use default of 90 days if not provided', async () => {
      const mockAuthUrl = 'https://auth.monzo.com/oauth2/authorize?client_id=test&state=encoded_state&redirect_uri=http://localhost:3000/callback&response_type=code';

      mockGenerateAuthUrl.mockReturnValue(mockAuthUrl);

      const response = await request(app)
        .post('/api/bank/monzo/connect')
        .set('Cookie', authCookie)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.authUrl).toBe(mockAuthUrl);

      // Verify generateAuthUrl was called with 90 days
      expect(mockGenerateAuthUrl).toHaveBeenCalledWith(90);
    });

    it('should generate auth URL with custom syncFromDays', async () => {
      const mockAuthUrl = 'https://auth.monzo.com/oauth2/authorize?client_id=test&state=encoded_state&redirect_uri=http://localhost:3000/callback&response_type=code';

      mockGenerateAuthUrl.mockReturnValue(mockAuthUrl);

      const response = await request(app)
        .post('/api/bank/monzo/connect')
        .set('Cookie', authCookie)
        .send({ syncFromDays: 180 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.authUrl).toBe(mockAuthUrl);

      expect(mockGenerateAuthUrl).toHaveBeenCalledWith(180);
    });

    it('should handle service errors gracefully', async () => {
      mockGenerateAuthUrl.mockImplementation(() => {
        throw new Error('Service error');
      });

      const response = await request(app)
        .post('/api/bank/monzo/connect')
        .set('Cookie', authCookie)
        .send({ syncFromDays: 90 });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to generate Monzo authorization URL');
    });
  });

  describe('GET /api/bank/monzo/callback', () => {
    it('should handle missing code parameter', async () => {
      const response = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ state: 'test_state' });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('/settings?error=');
    });

    it('should handle missing state parameter', async () => {
      const response = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ code: 'test_code' });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('/settings?error=');
    });

    it('should handle OAuth error parameter', async () => {
      const response = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ error: 'access_denied' });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('/settings?error=access_denied');
    });

    it('should exchange code for tokens and save bank account', async () => {
      const mockState = 'valid_state';
      const mockCode = 'auth_code_123';
      const mockTokenResponse = {
        access_token: 'access_token_123',
        refresh_token: 'refresh_token_123',
        expires_in: 3600,
        syncFromDate: new Date('2024-01-01'),
      };
      const mockAccountInfo = {
        accountId: 'acc_123',
        accountName: 'Current Account',
        accountType: 'current',
      };

      mockValidateState.mockReturnValue(mockTokenResponse.syncFromDate);
      mockExchangeCodeForTokens.mockResolvedValue(mockTokenResponse);
      mockGetAccountInfo.mockResolvedValue(mockAccountInfo);
      mockImportFullHistory.mockResolvedValue('sync-log-123');

      const response = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ code: mockCode, state: mockState });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('/settings?success=monzo_connected&bankAccountId=');

      // Verify service methods were called
      expect(mockValidateState).toHaveBeenCalledWith(mockState);
      expect(mockExchangeCodeForTokens).toHaveBeenCalledWith(mockCode);
      expect(mockGetAccountInfo).toHaveBeenCalledWith(mockTokenResponse.access_token);

      // Verify bank account was created
      const bankAccount = await prisma.bankAccount.findUnique({
        where: { accountId: mockAccountInfo.accountId },
      });

      expect(bankAccount).toBeTruthy();
      expect(bankAccount?.accountName).toBe(mockAccountInfo.accountName);
      expect(bankAccount?.provider).toBe('monzo');
      expect(bankAccount?.syncEnabled).toBe(true);
      expect(bankAccount?.lastSyncStatus).toBe('never_synced');
      // Access token should be encrypted (not plaintext)
      expect(bankAccount?.accessToken).not.toBe(mockTokenResponse.access_token);

      // Verify import was triggered (fire and forget)
      expect(mockImportFullHistory).toHaveBeenCalledWith(bankAccount!.id);
    });

    it('should handle invalid state parameter', async () => {
      mockValidateState.mockImplementation(() => {
        throw new Error('Invalid state');
      });

      const response = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ code: 'test_code', state: 'invalid_state' });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('/settings?error=');
    });

    it('should handle token exchange errors', async () => {
      const mockSyncFromDate = new Date('2024-01-01');

      mockValidateState.mockReturnValue(mockSyncFromDate);
      mockExchangeCodeForTokens.mockRejectedValue(new Error('Token exchange failed'));

      const response = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ code: 'test_code', state: 'valid_state' });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('/settings?error=');
    });

    it('should handle duplicate account connection gracefully', async () => {
      const mockState = 'valid_state';
      const mockCode = 'auth_code_123';
      const mockTokenResponse = {
        access_token: 'access_token_123',
        refresh_token: 'refresh_token_123',
        expires_in: 3600,
        syncFromDate: new Date('2024-01-01'),
      };
      const mockAccountInfo = {
        accountId: 'acc_duplicate',
        accountName: 'Current Account',
        accountType: 'current',
      };

      // Create existing bank account
      await prisma.bankAccount.create({
        data: {
          accountId: mockAccountInfo.accountId,
          accountName: 'Old Name',
          accountType: 'current',
          provider: 'monzo',
          accessToken: 'old_encrypted_token',
          syncFromDate: new Date('2023-01-01'),
          syncEnabled: true,
          lastSyncStatus: 'never_synced',
        },
      });

      mockValidateState.mockReturnValue(mockTokenResponse.syncFromDate);
      mockExchangeCodeForTokens.mockResolvedValue(mockTokenResponse);
      mockGetAccountInfo.mockResolvedValue(mockAccountInfo);
      mockImportFullHistory.mockResolvedValue('sync-log-123');

      const response = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ code: mockCode, state: mockState });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('/settings?success=monzo_connected&bankAccountId=');

      // Verify bank account was updated, not duplicated
      const bankAccounts = await prisma.bankAccount.findMany({
        where: { accountId: mockAccountInfo.accountId },
      });

      expect(bankAccounts).toHaveLength(1);
      expect(bankAccounts[0].accountName).toBe(mockAccountInfo.accountName);

      // Verify import was triggered
      expect(mockImportFullHistory).toHaveBeenCalled();
    });

    it('should redirect even if background import fails', async () => {
      const mockState = 'valid_state';
      const mockCode = 'auth_code_123';
      const mockTokenResponse = {
        access_token: 'access_token_123',
        refresh_token: 'refresh_token_123',
        expires_in: 3600,
        syncFromDate: new Date('2024-01-01'),
      };
      const mockAccountInfo = {
        accountId: 'acc_import_fail',
        accountName: 'Current Account',
        accountType: 'current',
      };

      mockValidateState.mockReturnValue(mockTokenResponse.syncFromDate);
      mockExchangeCodeForTokens.mockResolvedValue(mockTokenResponse);
      mockGetAccountInfo.mockResolvedValue(mockAccountInfo);
      // Mock import failure
      mockImportFullHistory.mockRejectedValue(new Error('Import failed'));

      const response = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ code: mockCode, state: mockState });

      // Should still redirect successfully (fire and forget)
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('/settings?success=monzo_connected&bankAccountId=');

      // Verify import was attempted
      expect(mockImportFullHistory).toHaveBeenCalled();
    });

    it('should register webhook during OAuth callback', async () => {
      // Set webhook secret for this test
      process.env.MONZO_WEBHOOK_SECRET = 'test-secret';

      const mockState = 'valid_state';
      const mockCode = 'auth_code_123';
      const mockTokenResponse = {
        access_token: 'access_token_123',
        refresh_token: 'refresh_token_123',
        expires_in: 3600,
        syncFromDate: new Date('2024-01-01'),
      };
      const mockAccountInfo = {
        accountId: 'acc_webhook_test',
        accountName: 'Current Account',
        accountType: 'current',
      };
      const mockWebhookResult = {
        webhookId: 'webhook_123',
        webhookUrl: 'http://localhost:3000/api/bank/webhooks/monzo/test-secret',
      };

      mockValidateState.mockReturnValue(mockTokenResponse.syncFromDate);
      mockExchangeCodeForTokens.mockResolvedValue(mockTokenResponse);
      mockGetAccountInfo.mockResolvedValue(mockAccountInfo);
      mockRegisterWebhook.mockResolvedValue(mockWebhookResult);
      mockImportFullHistory.mockResolvedValue('sync-log-123');

      const response = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ code: mockCode, state: mockState });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('/settings?success=monzo_connected&bankAccountId=');

      // Verify webhook was registered
      expect(mockRegisterWebhook).toHaveBeenCalledWith(
        mockTokenResponse.access_token,
        mockAccountInfo.accountId,
        expect.stringContaining('/api/bank/webhooks/monzo/')
      );

      // Verify bank account has webhook info
      const bankAccount = await prisma.bankAccount.findUnique({
        where: { accountId: mockAccountInfo.accountId },
      });

      expect(bankAccount?.webhookId).toBe('webhook_123');
      expect(bankAccount?.webhookUrl).toBe(mockWebhookResult.webhookUrl);
    });

    it('should delete old webhook on re-authentication', async () => {
      // Set webhook secret for this test
      process.env.MONZO_WEBHOOK_SECRET = 'test-secret';

      const mockState = 'valid_state';
      const mockCode = 'auth_code_123';
      const mockTokenResponse = {
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expires_in: 3600,
        syncFromDate: new Date('2024-01-01'),
      };
      const mockAccountInfo = {
        accountId: 'acc_reauth',
        accountName: 'Current Account',
        accountType: 'current',
      };
      const mockNewWebhookResult = {
        webhookId: 'webhook_new_123',
        webhookUrl: 'http://localhost:3000/api/bank/webhooks/monzo/test-secret',
      };

      // Create existing bank account with old webhook
      await prisma.bankAccount.create({
        data: {
          accountId: mockAccountInfo.accountId,
          accountName: 'Old Name',
          accountType: 'current',
          provider: 'monzo',
          accessToken: 'old_encrypted_token',
          syncFromDate: new Date('2023-01-01'),
          syncEnabled: true,
          lastSyncStatus: 'never_synced',
          webhookId: 'webhook_old_123',
          webhookUrl: 'http://localhost:3000/api/bank/webhooks/monzo/old-secret',
        },
      });

      mockValidateState.mockReturnValue(mockTokenResponse.syncFromDate);
      mockExchangeCodeForTokens.mockResolvedValue(mockTokenResponse);
      mockGetAccountInfo.mockResolvedValue(mockAccountInfo);
      mockDeleteWebhook.mockResolvedValue(undefined);
      mockRegisterWebhook.mockResolvedValue(mockNewWebhookResult);
      mockImportFullHistory.mockResolvedValue('sync-log-123');

      const response = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ code: mockCode, state: mockState });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('/settings?success=monzo_connected&bankAccountId=');

      // Verify old webhook was deleted
      expect(mockDeleteWebhook).toHaveBeenCalledWith(
        mockTokenResponse.access_token,
        'webhook_old_123'
      );

      // Verify new webhook was registered
      expect(mockRegisterWebhook).toHaveBeenCalledWith(
        mockTokenResponse.access_token,
        mockAccountInfo.accountId,
        expect.stringContaining('/api/bank/webhooks/monzo/')
      );

      // Verify bank account has new webhook info
      const bankAccount = await prisma.bankAccount.findUnique({
        where: { accountId: mockAccountInfo.accountId },
      });

      expect(bankAccount?.webhookId).toBe('webhook_new_123');
      expect(bankAccount?.webhookUrl).toBe(mockNewWebhookResult.webhookUrl);
    });

    it('should complete OAuth even if webhook registration fails', async () => {
      // Set webhook secret for this test
      process.env.MONZO_WEBHOOK_SECRET = 'test-secret';

      const mockState = 'valid_state';
      const mockCode = 'auth_code_123';
      const mockTokenResponse = {
        access_token: 'access_token_123',
        refresh_token: 'refresh_token_123',
        expires_in: 3600,
        syncFromDate: new Date('2024-01-01'),
      };
      const mockAccountInfo = {
        accountId: 'acc_webhook_fail',
        accountName: 'Current Account',
        accountType: 'current',
      };

      mockValidateState.mockReturnValue(mockTokenResponse.syncFromDate);
      mockExchangeCodeForTokens.mockResolvedValue(mockTokenResponse);
      mockGetAccountInfo.mockResolvedValue(mockAccountInfo);
      mockRegisterWebhook.mockRejectedValue(new Error('Webhook registration failed'));
      mockImportFullHistory.mockResolvedValue('sync-log-123');

      const response = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ code: mockCode, state: mockState });

      // Should still redirect successfully
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('/settings?success=monzo_connected&bankAccountId=');

      // Verify bank account was created without webhook info
      const bankAccount = await prisma.bankAccount.findUnique({
        where: { accountId: mockAccountInfo.accountId },
      });

      expect(bankAccount).toBeTruthy();
      expect(bankAccount?.webhookId).toBeNull();
      expect(bankAccount?.webhookUrl).toBeNull();

      // Verify import was still triggered
      expect(mockImportFullHistory).toHaveBeenCalled();
    });

    it('should use default webhook base URL when not configured', async () => {
      // Set webhook secret but not base URL
      process.env.MONZO_WEBHOOK_SECRET = 'test-secret';
      const originalBaseUrl = process.env.WEBHOOK_BASE_URL;
      delete process.env.WEBHOOK_BASE_URL;

      const mockState = 'valid_state';
      const mockCode = 'auth_code_123';
      const mockTokenResponse = {
        access_token: 'access_token_123',
        refresh_token: 'refresh_token_123',
        expires_in: 3600,
        syncFromDate: new Date('2024-01-01'),
      };
      const mockAccountInfo = {
        accountId: 'acc_default_url',
        accountName: 'Current Account',
        accountType: 'current',
      };
      const mockWebhookResult = {
        webhookId: 'webhook_default',
        webhookUrl: 'http://localhost:3000/api/bank/webhooks/monzo/test-secret',
      };

      mockValidateState.mockReturnValue(mockTokenResponse.syncFromDate);
      mockExchangeCodeForTokens.mockResolvedValue(mockTokenResponse);
      mockGetAccountInfo.mockResolvedValue(mockAccountInfo);
      mockRegisterWebhook.mockResolvedValue(mockWebhookResult);
      mockImportFullHistory.mockResolvedValue('sync-log-123');

      const response = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ code: mockCode, state: mockState });

      expect(response.status).toBe(302);

      // Verify webhook was registered with default localhost URL
      expect(mockRegisterWebhook).toHaveBeenCalledWith(
        mockTokenResponse.access_token,
        mockAccountInfo.accountId,
        expect.stringContaining('http://localhost:3000/api/bank/webhooks/monzo/')
      );

      // Restore env var
      if (originalBaseUrl) {
        process.env.WEBHOOK_BASE_URL = originalBaseUrl;
      }
    });

    it('should skip webhook registration when MONZO_WEBHOOK_SECRET is not configured', async () => {
      const originalSecret = process.env.MONZO_WEBHOOK_SECRET;
      delete process.env.MONZO_WEBHOOK_SECRET;

      const mockState = 'valid_state';
      const mockCode = 'auth_code_123';
      const mockTokenResponse = {
        access_token: 'access_token_123',
        refresh_token: 'refresh_token_123',
        expires_in: 3600,
        syncFromDate: new Date('2024-01-01'),
      };
      const mockAccountInfo = {
        accountId: 'acc_no_secret',
        accountName: 'Current Account',
        accountType: 'current',
      };

      mockValidateState.mockReturnValue(mockTokenResponse.syncFromDate);
      mockExchangeCodeForTokens.mockResolvedValue(mockTokenResponse);
      mockGetAccountInfo.mockResolvedValue(mockAccountInfo);
      mockImportFullHistory.mockResolvedValue('sync-log-123');

      const response = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ code: mockCode, state: mockState });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('/settings?success=monzo_connected&bankAccountId=');

      // Verify webhook registration was NOT attempted
      expect(mockRegisterWebhook).not.toHaveBeenCalled();

      // Verify bank account was still created without webhook
      const bankAccount = await prisma.bankAccount.findUnique({
        where: { accountId: mockAccountInfo.accountId },
      });

      expect(bankAccount).toBeTruthy();
      expect(bankAccount?.webhookId).toBeNull();
      expect(bankAccount?.webhookUrl).toBeNull();

      // Restore env var
      if (originalSecret) {
        process.env.MONZO_WEBHOOK_SECRET = originalSecret;
      }
    });
  });

  describe('GET /api/bank/monzo/import-progress/:syncLogId', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/bank/monzo/import-progress/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .get('/api/bank/monzo/import-progress/00000000-0000-0000-0000-000000000000')
        .set('Cookie', authCookie);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should return 400 for invalid sync log ID format', async () => {
      const response = await request(app)
        .get('/api/bank/monzo/import-progress/invalid-id')
        .set('Cookie', adminCookie);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid sync log ID');
    });

    it('should return 404 for non-existent sync log', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/bank/monzo/import-progress/${nonExistentId}`)
        .set('Cookie', adminCookie);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Sync log not found');
    });

    it('should send initial SSE event for in-progress sync', async () => {
      // Create a test bank account and sync log
      const bankAccount = await prisma.bankAccount.create({
        data: {
          accountId: 'acc_test_progress',
          accountName: 'Test Account',
          accountType: 'current',
          provider: 'monzo',
          accessToken: 'encrypted_token',
          syncFromDate: new Date('2024-01-01'),
          syncEnabled: true,
          lastSyncStatus: 'never_synced',
        },
      });

      const syncLog = await prisma.syncLog.create({
        data: {
          bankAccountId: bankAccount.id,
          syncType: 'initial',
          status: 'in_progress',
        },
      });

      // For in-progress syncs, the endpoint keeps the connection open
      // We'll just verify it doesn't throw an error when we start the request
      // In a real scenario, this would be consumed by the frontend via EventSource
      const testPromise = request(app)
        .get(`/api/bank/monzo/import-progress/${syncLog.id}`)
        .set('Cookie', adminCookie)
        .timeout(100)
        .catch(err => {
          // Expect timeout since connection stays open
          expect(err.timeout).toBe(100);
        });

      await testPromise;
    });

    it('should close connection immediately for completed sync', async () => {
      // Create a test bank account and completed sync log
      const bankAccount = await prisma.bankAccount.create({
        data: {
          accountId: 'acc_test_completed',
          accountName: 'Test Account',
          accountType: 'current',
          provider: 'monzo',
          accessToken: 'encrypted_token',
          syncFromDate: new Date('2024-01-01'),
          syncEnabled: true,
          lastSyncStatus: 'success',
        },
      });

      const syncLog = await prisma.syncLog.create({
        data: {
          bankAccountId: bankAccount.id,
          syncType: 'initial',
          status: 'success',
          completedAt: new Date(),
          transactionsFetched: 100,
          transactionsSkipped: 10,
        },
      });

      // Make request to SSE endpoint
      const response = await request(app)
        .get(`/api/bank/monzo/import-progress/${syncLog.id}`)
        .set('Cookie', adminCookie)
        .timeout(1000);

      // Should receive initial status and close
      expect(response.status).toBe(200);
    });

    it('should handle failed sync log', async () => {
      // Create a test bank account and failed sync log
      const bankAccount = await prisma.bankAccount.create({
        data: {
          accountId: 'acc_test_failed',
          accountName: 'Test Account',
          accountType: 'current',
          provider: 'monzo',
          accessToken: 'encrypted_token',
          syncFromDate: new Date('2024-01-01'),
          syncEnabled: true,
          lastSyncStatus: 'failed',
        },
      });

      const syncLog = await prisma.syncLog.create({
        data: {
          bankAccountId: bankAccount.id,
          syncType: 'initial',
          status: 'failed',
          completedAt: new Date(),
          transactionsFetched: 50,
          transactionsSkipped: 0,
          errorMessage: 'Test error message',
        },
      });

      // Make request to SSE endpoint
      const response = await request(app)
        .get(`/api/bank/monzo/import-progress/${syncLog.id}`)
        .set('Cookie', adminCookie)
        .timeout(1000);

      // Should receive initial failed status and close
      expect(response.status).toBe(200);
    });
  });
});
