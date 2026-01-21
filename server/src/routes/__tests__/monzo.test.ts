import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import prisma from '../../db/client.js';
import authService from '../../services/auth.service.js';

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
const mockImportFullHistory = jest.fn<(bankAccountId: string) => Promise<void>>();

jest.unstable_mockModule('../../services/monzo.service.js', () => ({
  generateAuthUrl: mockGenerateAuthUrl,
  validateState: mockValidateState,
  exchangeCodeForTokens: mockExchangeCodeForTokens,
  getAccountInfo: mockGetAccountInfo,
  importFullHistory: mockImportFullHistory,
}));

// Import app after mocking
const { createApp } = await import('../../app.js');
const app = createApp();

describe('Monzo OAuth Routes', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'testPassword123',
  };

  let authCookie: string;

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
      mockImportFullHistory.mockResolvedValue(undefined);

      const response = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ code: mockCode, state: mockState });

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/settings?success=monzo_connected');

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
      mockImportFullHistory.mockResolvedValue(undefined);

      const response = await request(app)
        .get('/api/bank/monzo/callback')
        .query({ code: mockCode, state: mockState });

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/settings?success=monzo_connected');

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
      expect(response.headers.location).toBe('/settings?success=monzo_connected');

      // Verify import was attempted
      expect(mockImportFullHistory).toHaveBeenCalled();
    });
  });
});
