import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../app.js';
import prisma from '../../db/client.js';
import authService from '../../services/auth.service.js';
import { Roles } from '../../../../shared/types/user.types.js';
import { encryptToken } from '../../services/encryption.js';

const app = createApp();

describe('Bank Accounts Routes', () => {
  // Test user credentials
  const viewerUser = {
    email: 'viewer@example.com',
    password: 'viewerPassword123',
  };

  const landlordUser = {
    email: 'landlord@example.com',
    password: 'landlordPassword123',
  };

  const adminUser = {
    email: 'admin@example.com',
    password: 'adminPassword123',
  };

  let viewerCookies: string[];
  let landlordCookies: string[];
  let adminCookies: string[];

  // Valid bank account data
  const validBankAccount = {
    accountId: 'acc_test123',
    accountName: 'Test Current Account',
    accountType: 'uk_retail',
    provider: 'monzo',
    accessToken: encryptToken('test_access_token'),
    refreshToken: encryptToken('test_refresh_token'),
    tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
    syncEnabled: true,
    syncFromDate: new Date('2024-01-01'),
    lastSyncStatus: 'never_synced',
  };

  beforeAll(async () => {
    // Clean database
    await prisma.bankAccount.deleteMany({});
    await prisma.user.deleteMany({});

    // Create viewer user and login
    await authService.createUser(viewerUser.email, viewerUser.password, Roles.VIEWER);

    const viewerLoginResponse = await request(app).post('/api/auth/login').send({
      email: viewerUser.email,
      password: viewerUser.password,
    });

    viewerCookies = [viewerLoginResponse.headers['set-cookie']];

    // Create landlord user and login
    await authService.createUser(landlordUser.email, landlordUser.password, Roles.LANDLORD);

    const landlordLoginResponse = await request(app).post('/api/auth/login').send({
      email: landlordUser.email,
      password: landlordUser.password,
    });

    landlordCookies = [landlordLoginResponse.headers['set-cookie']];

    // Create admin user and login
    await authService.createUser(adminUser.email, adminUser.password, Roles.ADMIN);

    const adminLoginResponse = await request(app).post('/api/auth/login').send({
      email: adminUser.email,
      password: adminUser.password,
    });

    adminCookies = [adminLoginResponse.headers['set-cookie']];
  });

  afterAll(async () => {
    // Clean up after all tests
    await prisma.bankAccount.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean bank accounts before each test
    await prisma.bankAccount.deleteMany({});
  });

  describe('GET /api/bank/accounts', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/bank/accounts');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .get('/api/bank/accounts')
        .set('Cookie', viewerCookies);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should block LANDLORD role', async () => {
      const response = await request(app)
        .get('/api/bank/accounts')
        .set('Cookie', landlordCookies);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should return empty array when no accounts exist', async () => {
      const response = await request(app)
        .get('/api/bank/accounts')
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.accounts).toEqual([]);
    });

    it('should return all bank accounts for admin', async () => {
      // Create multiple bank accounts
      const account1 = await prisma.bankAccount.create({ data: validBankAccount });
      const account2 = await prisma.bankAccount.create({
        data: {
          ...validBankAccount,
          accountId: 'acc_test456',
          accountName: 'Another Account',
        },
      });

      const response = await request(app)
        .get('/api/bank/accounts')
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.accounts).toHaveLength(2);

      // Check that accounts are ordered by createdAt desc (newest first)
      expect(response.body.accounts[0].id).toBe(account2.id);
      expect(response.body.accounts[1].id).toBe(account1.id);
    });

    it('should exclude sensitive tokens from response', async () => {
      await prisma.bankAccount.create({ data: validBankAccount });

      const response = await request(app)
        .get('/api/bank/accounts')
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.accounts).toHaveLength(1);

      // Verify tokens are not in response
      expect(response.body.accounts[0].accessToken).toBeUndefined();
      expect(response.body.accounts[0].refreshToken).toBeUndefined();

      // Verify other fields are present
      expect(response.body.accounts[0].accountId).toBe(validBankAccount.accountId);
      expect(response.body.accounts[0].accountName).toBe(validBankAccount.accountName);
      expect(response.body.accounts[0].syncEnabled).toBe(true);
    });
  });

  describe('GET /api/bank/accounts/:id', () => {
    it('should require authentication', async () => {
      const account = await prisma.bankAccount.create({ data: validBankAccount });

      const response = await request(app).get(`/api/bank/accounts/${account.id}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should require admin role', async () => {
      const account = await prisma.bankAccount.create({ data: validBankAccount });

      const response = await request(app)
        .get(`/api/bank/accounts/${account.id}`)
        .set('Cookie', viewerCookies);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should block LANDLORD role', async () => {
      const account = await prisma.bankAccount.create({ data: validBankAccount });

      const response = await request(app)
        .get(`/api/bank/accounts/${account.id}`)
        .set('Cookie', landlordCookies);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should return bank account by id for admin', async () => {
      const account = await prisma.bankAccount.create({ data: validBankAccount });

      const response = await request(app)
        .get(`/api/bank/accounts/${account.id}`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.account.id).toBe(account.id);
      expect(response.body.account.accountName).toBe(account.accountName);
    });

    it('should exclude sensitive tokens from response', async () => {
      const account = await prisma.bankAccount.create({ data: validBankAccount });

      const response = await request(app)
        .get(`/api/bank/accounts/${account.id}`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify tokens are not in response
      expect(response.body.account.accessToken).toBeUndefined();
      expect(response.body.account.refreshToken).toBeUndefined();

      // Verify other fields are present
      expect(response.body.account.accountId).toBe(validBankAccount.accountId);
      expect(response.body.account.accountName).toBe(validBankAccount.accountName);
    });

    it('should return 404 for non-existent account', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/bank/accounts/${nonExistentId}`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Bank account not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/bank/accounts/invalid-id')
        .set('Cookie', adminCookies);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid bank account ID format');
    });
  });

  describe('PATCH /api/bank/accounts/:id', () => {
    it('should require authentication', async () => {
      const account = await prisma.bankAccount.create({ data: validBankAccount });

      const response = await request(app)
        .patch(`/api/bank/accounts/${account.id}`)
        .send({ accountName: 'Updated Name' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should require admin role', async () => {
      const account = await prisma.bankAccount.create({ data: validBankAccount });

      const response = await request(app)
        .patch(`/api/bank/accounts/${account.id}`)
        .set('Cookie', viewerCookies)
        .send({ accountName: 'Updated Name' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should block LANDLORD role', async () => {
      const account = await prisma.bankAccount.create({ data: validBankAccount });

      const response = await request(app)
        .patch(`/api/bank/accounts/${account.id}`)
        .set('Cookie', landlordCookies)
        .send({ accountName: 'Updated Name' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should update account name', async () => {
      const account = await prisma.bankAccount.create({ data: validBankAccount });

      const response = await request(app)
        .patch(`/api/bank/accounts/${account.id}`)
        .set('Cookie', adminCookies)
        .send({ accountName: 'Updated Account Name' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.account.accountName).toBe('Updated Account Name');
      expect(response.body.account.syncEnabled).toBe(validBankAccount.syncEnabled); // Unchanged
    });

    it('should update syncEnabled flag', async () => {
      const account = await prisma.bankAccount.create({ data: validBankAccount });

      const response = await request(app)
        .patch(`/api/bank/accounts/${account.id}`)
        .set('Cookie', adminCookies)
        .send({ syncEnabled: false });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.account.syncEnabled).toBe(false);
      expect(response.body.account.accountName).toBe(validBankAccount.accountName); // Unchanged
    });

    it('should update syncFromDate', async () => {
      const account = await prisma.bankAccount.create({ data: validBankAccount });
      const newSyncFromDate = new Date('2025-01-01');

      const response = await request(app)
        .patch(`/api/bank/accounts/${account.id}`)
        .set('Cookie', adminCookies)
        .send({ syncFromDate: newSyncFromDate.toISOString() });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(new Date(response.body.account.syncFromDate)).toEqual(newSyncFromDate);
    });

    it('should update multiple fields at once', async () => {
      const account = await prisma.bankAccount.create({ data: validBankAccount });

      const updateData = {
        accountName: 'New Name',
        syncEnabled: false,
        syncFromDate: new Date('2025-06-01').toISOString(),
      };

      const response = await request(app)
        .patch(`/api/bank/accounts/${account.id}`)
        .set('Cookie', adminCookies)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.account.accountName).toBe('New Name');
      expect(response.body.account.syncEnabled).toBe(false);
      expect(new Date(response.body.account.syncFromDate)).toEqual(new Date('2025-06-01'));
    });

    it('should exclude sensitive tokens from response', async () => {
      const account = await prisma.bankAccount.create({ data: validBankAccount });

      const response = await request(app)
        .patch(`/api/bank/accounts/${account.id}`)
        .set('Cookie', adminCookies)
        .send({ accountName: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.account.accessToken).toBeUndefined();
      expect(response.body.account.refreshToken).toBeUndefined();
    });

    it('should return 404 for non-existent account', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .patch(`/api/bank/accounts/${nonExistentId}`)
        .set('Cookie', adminCookies)
        .send({ accountName: 'Updated Name' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Bank account not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .patch('/api/bank/accounts/invalid-id')
        .set('Cookie', adminCookies)
        .send({ accountName: 'Updated Name' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid bank account ID format');
    });

    it('should reject empty account name', async () => {
      const account = await prisma.bankAccount.create({ data: validBankAccount });

      const response = await request(app)
        .patch(`/api/bank/accounts/${account.id}`)
        .set('Cookie', adminCookies)
        .send({ accountName: '' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Account name is required');
    });

    it('should allow partial updates', async () => {
      const account = await prisma.bankAccount.create({ data: validBankAccount });

      const response = await request(app)
        .patch(`/api/bank/accounts/${account.id}`)
        .set('Cookie', adminCookies)
        .send({ syncEnabled: false });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.account.syncEnabled).toBe(false);
      expect(response.body.account.accountName).toBe(validBankAccount.accountName);
    });

    it('should update updatedAt timestamp', async () => {
      const account = await prisma.bankAccount.create({ data: validBankAccount });
      const originalUpdatedAt = account.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const response = await request(app)
        .patch(`/api/bank/accounts/${account.id}`)
        .set('Cookie', adminCookies)
        .send({ accountName: 'Updated Name' });

      expect(response.status).toBe(200);
      const updatedAt = new Date(response.body.account.updatedAt);
      expect(updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('DELETE /api/bank/accounts/:id', () => {
    it('should require authentication', async () => {
      const account = await prisma.bankAccount.create({ data: validBankAccount });

      const response = await request(app).delete(`/api/bank/accounts/${account.id}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should require admin role', async () => {
      const account = await prisma.bankAccount.create({ data: validBankAccount });

      const response = await request(app)
        .delete(`/api/bank/accounts/${account.id}`)
        .set('Cookie', viewerCookies);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should block LANDLORD role', async () => {
      const account = await prisma.bankAccount.create({ data: validBankAccount });

      const response = await request(app)
        .delete(`/api/bank/accounts/${account.id}`)
        .set('Cookie', landlordCookies);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should delete bank account', async () => {
      const account = await prisma.bankAccount.create({ data: validBankAccount });

      const response = await request(app)
        .delete(`/api/bank/accounts/${account.id}`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Bank account deleted successfully');

      // Verify account no longer exists in database
      const deletedAccount = await prisma.bankAccount.findUnique({
        where: { id: account.id },
      });
      expect(deletedAccount).toBeNull();
    });

    it('should return 404 for non-existent account', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .delete(`/api/bank/accounts/${nonExistentId}`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Bank account not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .delete('/api/bank/accounts/invalid-id')
        .set('Cookie', adminCookies);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid bank account ID format');
    });

    it('should delete webhook from Monzo when deleting account with webhook', async () => {
      // Mock global fetch for webhook deletion
      const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
      global.fetch = mockFetch;

      // Mock successful webhook deletion
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      // Create account with webhook
      const account = await prisma.bankAccount.create({
        data: {
          ...validBankAccount,
          webhookId: 'webhook_test_123',
          webhookUrl: 'https://example.com/webhook',
        },
      });

      const response = await request(app)
        .delete(`/api/bank/accounts/${account.id}`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Bank account deleted successfully');

      // Verify fetch was called to delete the webhook
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.monzo.com/webhooks/webhook_test_123',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Bearer'),
          }),
        })
      );

      // Verify account no longer exists in database
      const deletedAccount = await prisma.bankAccount.findUnique({
        where: { id: account.id },
      });
      expect(deletedAccount).toBeNull();
    });

    it('should not call webhook API when account has no webhook', async () => {
      // Mock global fetch
      const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
      global.fetch = mockFetch;

      // Create account without webhook
      const account = await prisma.bankAccount.create({
        data: {
          ...validBankAccount,
          webhookId: null,
          webhookUrl: null,
        },
      });

      const response = await request(app)
        .delete(`/api/bank/accounts/${account.id}`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify fetch was NOT called (no webhook to delete)
      expect(mockFetch).not.toHaveBeenCalled();

      // Verify account was still deleted
      const deletedAccount = await prisma.bankAccount.findUnique({
        where: { id: account.id },
      });
      expect(deletedAccount).toBeNull();
    });

    it('should still delete account even if webhook deletion fails', async () => {
      // Mock global fetch for webhook deletion
      const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
      global.fetch = mockFetch;

      // Mock failed webhook deletion
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Webhook not found',
      } as Response);

      // Create account with webhook
      const account = await prisma.bankAccount.create({
        data: {
          ...validBankAccount,
          webhookId: 'webhook_test_456',
          webhookUrl: 'https://example.com/webhook',
        },
      });

      const response = await request(app)
        .delete(`/api/bank/accounts/${account.id}`)
        .set('Cookie', adminCookies);

      // Should still succeed
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Bank account deleted successfully');

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify account was still deleted despite webhook deletion failure
      const deletedAccount = await prisma.bankAccount.findUnique({
        where: { id: account.id },
      });
      expect(deletedAccount).toBeNull();
    });
  });

  describe('Integration scenarios', () => {
    it('should list, get, update, and delete a bank account', async () => {
      // Create account
      const account = await prisma.bankAccount.create({ data: validBankAccount });

      // List accounts
      const listResponse = await request(app)
        .get('/api/bank/accounts')
        .set('Cookie', adminCookies);

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.accounts).toHaveLength(1);
      expect(listResponse.body.accounts[0].id).toBe(account.id);

      // Get single account
      const getResponse = await request(app)
        .get(`/api/bank/accounts/${account.id}`)
        .set('Cookie', adminCookies);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.account.id).toBe(account.id);

      // Update account
      const updateResponse = await request(app)
        .patch(`/api/bank/accounts/${account.id}`)
        .set('Cookie', adminCookies)
        .send({ syncEnabled: false });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.account.syncEnabled).toBe(false);

      // Delete account
      const deleteResponse = await request(app)
        .delete(`/api/bank/accounts/${account.id}`)
        .set('Cookie', adminCookies);

      expect(deleteResponse.status).toBe(200);

      // Verify deletion
      const finalListResponse = await request(app)
        .get('/api/bank/accounts')
        .set('Cookie', adminCookies);
      expect(finalListResponse.body.accounts).toHaveLength(0);
    });

    it('should handle multiple accounts in list', async () => {
      // Create 3 bank accounts
      const accounts = [];
      for (let i = 0; i < 3; i++) {
        const account = await prisma.bankAccount.create({
          data: {
            ...validBankAccount,
            accountId: `acc_test${i}`,
            accountName: `Account ${i + 1}`,
          },
        });
        accounts.push(account);
      }

      // List all
      const listResponse = await request(app)
        .get('/api/bank/accounts')
        .set('Cookie', adminCookies);

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.accounts).toHaveLength(3);

      // Verify ordered by creation date desc (newest first)
      for (let i = 0; i < 2; i++) {
        const current = new Date(listResponse.body.accounts[i].createdAt);
        const next = new Date(listResponse.body.accounts[i + 1].createdAt);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });
  });

  describe('Edge cases', () => {
    it('should not expose tokens even if manually requested', async () => {
      const account = await prisma.bankAccount.create({ data: validBankAccount });

      const response = await request(app)
        .get(`/api/bank/accounts/${account.id}`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.account).toBeDefined();
      expect(response.body.account.accessToken).toBeUndefined();
      expect(response.body.account.refreshToken).toBeUndefined();

      // Verify tokens exist in database
      const dbAccount = await prisma.bankAccount.findUnique({
        where: { id: account.id },
      });
      expect(dbAccount?.accessToken).toBeDefined();
      expect(dbAccount?.refreshToken).toBeDefined();
    });
  });

  describe('POST /api/bank/accounts/:id/sync', () => {
    // Mock global fetch for these tests
    beforeAll(() => {
      global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should require authentication', async () => {
      const account = await prisma.bankAccount.create({ data: validBankAccount });

      const response = await request(app).post(`/api/bank/accounts/${account.id}/sync`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should require admin role', async () => {
      const account = await prisma.bankAccount.create({ data: validBankAccount });

      const response = await request(app)
        .post(`/api/bank/accounts/${account.id}/sync`)
        .set('Cookie', viewerCookies);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should block LANDLORD role', async () => {
      const account = await prisma.bankAccount.create({ data: validBankAccount });

      const response = await request(app)
        .post(`/api/bank/accounts/${account.id}/sync`)
        .set('Cookie', landlordCookies);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .post('/api/bank/accounts/invalid-id/sync')
        .set('Cookie', adminCookies);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid bank account ID format');
    });

    it('should return 404 for non-existent account', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .post(`/api/bank/accounts/${nonExistentId}/sync`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Bank account not found');
    });

    it('should successfully trigger manual sync', async () => {
      const account = await prisma.bankAccount.create({
        data: {
          ...validBankAccount,
          lastSyncAt: new Date('2024-02-01'),
        },
      });

      // Mock Monzo API response
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transactions: [
            {
              id: 'tx_1',
              created: new Date('2024-02-02').toISOString(),
              description: 'Test transaction',
              amount: 1000,
              currency: 'GBP',
              notes: '',
              category: 'general',
            },
          ],
        }),
      } as Response);

      const response = await request(app)
        .post(`/api/bank/accounts/${account.id}/sync`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result.transactionsFetched).toBe(1);
      expect(response.body.result.lastSyncStatus).toBe('success');
    });

    it('should return 409 when sync already in progress', async () => {
      const account = await prisma.bankAccount.create({ data: validBankAccount });

      // Create in-progress sync log
      await prisma.syncLog.create({
        data: {
          bankAccountId: account.id,
          syncType: 'manual',
          status: 'in_progress',
        },
      });

      const response = await request(app)
        .post(`/api/bank/accounts/${account.id}/sync`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Sync already in progress');
    });

    it('should return 401 when access token has expired', async () => {
      const account = await prisma.bankAccount.create({
        data: {
          ...validBankAccount,
          tokenExpiresAt: new Date(Date.now() - 3600 * 1000), // Expired
        },
      });

      const response = await request(app)
        .post(`/api/bank/accounts/${account.id}/sync`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token has expired. Please reconnect your bank account.');
    });

    it('should return 500 for API errors', async () => {
      const account = await prisma.bankAccount.create({
        data: {
          ...validBankAccount,
          lastSyncAt: new Date('2024-02-01'),
        },
      });

      // Mock API error
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        text: async () => 'API Error',
      } as Response);

      const response = await request(app)
        .post(`/api/bank/accounts/${account.id}/sync`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Failed to fetch transactions');
    });

    it('should handle sync with no new transactions', async () => {
      const account = await prisma.bankAccount.create({
        data: {
          ...validBankAccount,
          lastSyncAt: new Date('2024-02-01'),
        },
      });

      // Mock empty API response
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [] }),
      } as Response);

      const response = await request(app)
        .post(`/api/bank/accounts/${account.id}/sync`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result.transactionsFetched).toBe(0);
      expect(response.body.result.lastSyncStatus).toBe('success');
    });
  });
});
