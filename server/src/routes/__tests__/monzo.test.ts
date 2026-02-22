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
const mockStorePendingConnection = jest.fn<(accessToken: string, refreshToken: string | undefined, expiresIn: number, syncFromDate: Date) => string>();
const mockGetPendingConnection = jest.fn<(pendingId: string) => {
  accessToken: string;
  refreshToken: string | undefined;
  expiresIn: number;
  syncFromDate: Date;
}>();
const mockDeletePendingConnection = jest.fn<(pendingId: string) => void>();

jest.unstable_mockModule('../../services/monzo.service.js', () => ({
  generateAuthUrl: mockGenerateAuthUrl,
  validateState: mockValidateState,
  exchangeCodeForTokens: mockExchangeCodeForTokens,
  getAccountInfo: mockGetAccountInfo,
  importFullHistory: mockImportFullHistory,
  syncNewTransactions: mockSyncNewTransactions,
  registerWebhook: mockRegisterWebhook,
  deleteWebhook: mockDeleteWebhook,
  storePendingConnection: mockStorePendingConnection,
  getPendingConnection: mockGetPendingConnection,
  deletePendingConnection: mockDeletePendingConnection,
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

    it('should exchange code for tokens and store pending connection', async () => {
      const mockState = 'valid_state';
      const mockCode = 'auth_code_123';
      const mockSyncFromDate = new Date('2024-01-01');
      const mockTokenResponse = {
        access_token: 'access_token_123',
        refresh_token: 'refresh_token_123',
        expires_in: 3600,
      };

      mockValidateState.mockReturnValue(mockSyncFromDate);
      mockExchangeCodeForTokens.mockResolvedValue(mockTokenResponse);
      mockStorePendingConnection.mockReturnValue('pending_id_abc');

      const response = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ code: mockCode, state: mockState });

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/settings?pending_approval=monzo&pendingId=pending_id_abc');

      expect(mockValidateState).toHaveBeenCalledWith(mockState);
      expect(mockExchangeCodeForTokens).toHaveBeenCalledWith(mockCode);
      expect(mockStorePendingConnection).toHaveBeenCalledWith(
        mockTokenResponse.access_token,
        mockTokenResponse.refresh_token,
        mockTokenResponse.expires_in,
        mockSyncFromDate
      );

      // Should NOT call getAccountInfo or importFullHistory
      expect(mockGetAccountInfo).not.toHaveBeenCalled();
      expect(mockImportFullHistory).not.toHaveBeenCalled();
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
  });

  describe('POST /api/bank/monzo/complete-connection', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/bank/monzo/complete-connection')
        .send({ pendingId: 'test' });

      expect(response.status).toBe(401);
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .post('/api/bank/monzo/complete-connection')
        .set('Cookie', authCookie)
        .send({ pendingId: 'test' });

      expect(response.status).toBe(403);
    });

    it('should return 400 for missing pendingId', async () => {
      const response = await request(app)
        .post('/api/bank/monzo/complete-connection')
        .set('Cookie', adminCookie)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing');
    });

    it('should return 400 for unknown pendingId', async () => {
      mockGetPendingConnection.mockImplementation(() => {
        throw new Error('Pending connection not found or expired');
      });

      const response = await request(app)
        .post('/api/bank/monzo/complete-connection')
        .set('Cookie', adminCookie)
        .send({ pendingId: 'nonexistent_id' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should complete connection and create bank account', async () => {
      const mockPending = {
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_123',
        expiresIn: 3600,
        syncFromDate: new Date('2024-01-01'),
      };
      const mockAccountInfo = {
        accountId: 'acc_complete_test',
        accountName: 'Current Account',
        accountType: 'current',
      };

      mockGetPendingConnection.mockReturnValue(mockPending);
      mockGetAccountInfo.mockResolvedValue(mockAccountInfo);
      mockImportFullHistory.mockResolvedValue('sync-log-123');

      const response = await request(app)
        .post('/api/bank/monzo/complete-connection')
        .set('Cookie', adminCookie)
        .send({ pendingId: 'valid_pending_id' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.bankAccountId).toBeTruthy();

      // Verify pending connection was deleted
      expect(mockDeletePendingConnection).toHaveBeenCalledWith('valid_pending_id');

      // Verify bank account was created
      const bankAccount = await prisma.bankAccount.findUnique({
        where: { accountId: mockAccountInfo.accountId },
      });
      expect(bankAccount).toBeTruthy();
      expect(bankAccount?.accountName).toBe('Current Account');
      expect(bankAccount?.provider).toBe('monzo');
      expect(bankAccount?.accessToken).not.toBe(mockPending.accessToken);

      // Verify import was triggered
      expect(mockImportFullHistory).toHaveBeenCalledWith(bankAccount!.id);
    });

    it('should return 403 when SCA not yet approved', async () => {
      const mockPending = {
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_123',
        expiresIn: 3600,
        syncFromDate: new Date('2024-01-01'),
      };

      mockGetPendingConnection.mockReturnValue(mockPending);
      mockGetAccountInfo.mockRejectedValue(new Error('Failed to fetch account information'));

      const response = await request(app)
        .post('/api/bank/monzo/complete-connection')
        .set('Cookie', adminCookie)
        .send({ pendingId: 'valid_pending_id' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not yet approved');

      // Pending connection should NOT be deleted (allows retry)
      expect(mockDeletePendingConnection).not.toHaveBeenCalled();
    });

    it('should register webhook during complete connection', async () => {
      process.env.MONZO_WEBHOOK_SECRET = 'test-secret';

      const mockPending = {
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_123',
        expiresIn: 3600,
        syncFromDate: new Date('2024-01-01'),
      };
      const mockAccountInfo = {
        accountId: 'acc_webhook_complete',
        accountName: 'Current Account',
        accountType: 'current',
      };
      const mockWebhookResult = {
        webhookId: 'webhook_123',
        webhookUrl: 'http://localhost:3000/api/bank/webhooks/monzo/test-secret',
      };

      mockGetPendingConnection.mockReturnValue(mockPending);
      mockGetAccountInfo.mockResolvedValue(mockAccountInfo);
      mockRegisterWebhook.mockResolvedValue(mockWebhookResult);
      mockImportFullHistory.mockResolvedValue('sync-log-123');

      const response = await request(app)
        .post('/api/bank/monzo/complete-connection')
        .set('Cookie', adminCookie)
        .send({ pendingId: 'valid_pending_id' });

      expect(response.status).toBe(200);
      expect(mockRegisterWebhook).toHaveBeenCalledWith(
        mockPending.accessToken,
        mockAccountInfo.accountId,
        expect.stringContaining('/api/bank/webhooks/monzo/')
      );

      const bankAccount = await prisma.bankAccount.findUnique({
        where: { accountId: mockAccountInfo.accountId },
      });
      expect(bankAccount?.webhookId).toBe('webhook_123');
    });

    it('should succeed even if webhook registration fails', async () => {
      process.env.MONZO_WEBHOOK_SECRET = 'test-secret';

      const mockPending = {
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_123',
        expiresIn: 3600,
        syncFromDate: new Date('2024-01-01'),
      };
      const mockAccountInfo = {
        accountId: 'acc_webhook_fail_complete',
        accountName: 'Current Account',
        accountType: 'current',
      };

      mockGetPendingConnection.mockReturnValue(mockPending);
      mockGetAccountInfo.mockResolvedValue(mockAccountInfo);
      mockRegisterWebhook.mockRejectedValue(new Error('Webhook failed'));
      mockImportFullHistory.mockResolvedValue('sync-log-123');

      const response = await request(app)
        .post('/api/bank/monzo/complete-connection')
        .set('Cookie', adminCookie)
        .send({ pendingId: 'valid_pending_id' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const bankAccount = await prisma.bankAccount.findUnique({
        where: { accountId: mockAccountInfo.accountId },
      });
      expect(bankAccount?.webhookId).toBeNull();
    });

    it('should delete old webhook on re-authentication', async () => {
      process.env.MONZO_WEBHOOK_SECRET = 'test-secret';

      const mockAccountInfo = {
        accountId: 'acc_reauth_complete',
        accountName: 'Current Account',
        accountType: 'current',
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

      const mockPending = {
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
        expiresIn: 3600,
        syncFromDate: new Date('2024-01-01'),
      };

      mockGetPendingConnection.mockReturnValue(mockPending);
      mockGetAccountInfo.mockResolvedValue(mockAccountInfo);
      mockDeleteWebhook.mockResolvedValue(undefined);
      mockRegisterWebhook.mockResolvedValue({ webhookId: 'webhook_new', webhookUrl: 'http://localhost:3000/api/bank/webhooks/monzo/test-secret' });
      mockImportFullHistory.mockResolvedValue('sync-log-123');

      const response = await request(app)
        .post('/api/bank/monzo/complete-connection')
        .set('Cookie', adminCookie)
        .send({ pendingId: 'valid_pending_id' });

      expect(response.status).toBe(200);
      expect(mockDeleteWebhook).toHaveBeenCalledWith(mockPending.accessToken, 'webhook_old_123');
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
