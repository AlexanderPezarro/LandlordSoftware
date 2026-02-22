import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../app.js';
import prisma from '../../db/client.js';
import authService from '../../services/auth.service.js';
import { Roles } from '../../../../shared/types/user.types.js';
import { encryptToken } from '../../services/encryption.js';

const app = createApp();

describe('Pending Transactions Routes', () => {
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
  let testBankAccountId: string;
  let testPropertyId: string;
  let adminUserId: string;

  beforeAll(async () => {
    // Clean database
    await prisma.pendingTransaction.deleteMany({});
    await prisma.bankTransaction.deleteMany({});
    await prisma.bankAccount.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.lease.deleteMany({});
    await prisma.tenant.deleteMany({});
    await prisma.property.deleteMany({});
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
    const adminUserRecord = await authService.createUser(
      adminUser.email,
      adminUser.password,
      Roles.ADMIN
    );
    adminUserId = adminUserRecord.id;

    const adminLoginResponse = await request(app).post('/api/auth/login').send({
      email: adminUser.email,
      password: adminUser.password,
    });

    adminCookies = [adminLoginResponse.headers['set-cookie']];

    // Create test property
    const property = await prisma.property.create({
      data: {
        name: 'Test Property',
        street: '123 Test St',
        city: 'Test City',
        county: 'Test County',
        postcode: 'TE1 1ST',
        propertyType: 'House',
        status: 'Occupied',
      },
    });
    testPropertyId = property.id;

    // Create test bank account
    const bankAccount = await prisma.bankAccount.create({
      data: {
        accountId: 'acc_test123',
        accountName: 'Test Current Account',
        accountType: 'uk_retail',
        provider: 'monzo',
        accessToken: encryptToken('test_access_token'),
        syncEnabled: true,
        syncFromDate: new Date('2024-01-01'),
        lastSyncStatus: 'never_synced',
      },
    });
    testBankAccountId = bankAccount.id;
  });

  afterAll(async () => {
    // Clean up after all tests
    await prisma.pendingTransaction.deleteMany({});
    await prisma.bankTransaction.deleteMany({});
    await prisma.bankAccount.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.lease.deleteMany({});
    await prisma.tenant.deleteMany({});
    await prisma.property.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean pending transactions and bank transactions before each test
    await prisma.pendingTransaction.deleteMany({});
    await prisma.bankTransaction.deleteMany({});
    await prisma.transaction.deleteMany({});
  });

  describe('GET /api/pending-transactions', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/pending-transactions');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .get('/api/pending-transactions')
        .set('Cookie', viewerCookies);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should block LANDLORD role', async () => {
      const response = await request(app)
        .get('/api/pending-transactions')
        .set('Cookie', landlordCookies);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should return empty array when no pending transactions exist', async () => {
      const response = await request(app)
        .get('/api/pending-transactions')
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.pendingTransactions).toEqual([]);
    });

    it('should return all unreviewed pending transactions', async () => {
      // Create bank transaction with pending transaction
      const bankTx = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_pending_1',
          description: 'Test pending transaction',
          amount: 1000,
          currency: 'GBP',
          transactionDate: new Date('2024-01-15'),
        },
      });

      const pendingTx = await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx.id,
          transactionDate: new Date('2024-01-15'),
          description: 'Test pending transaction',
        },
      });

      const response = await request(app)
        .get('/api/pending-transactions')
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.pendingTransactions).toHaveLength(1);
      expect(response.body.pendingTransactions[0].id).toBe(pendingTx.id);
      expect(response.body.pendingTransactions[0].bankTransaction.amount).toBe(1000);
      expect(response.body.pendingTransactions[0].bankAccount.accountName).toBe('Test Current Account');
    });

    it('should exclude reviewed pending transactions by default', async () => {
      // Create reviewed pending transaction
      const bankTx = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_reviewed_1',
          description: 'Reviewed transaction',
          amount: 500,
          currency: 'GBP',
          transactionDate: new Date('2024-01-15'),
        },
      });

      await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx.id,
          transactionDate: new Date('2024-01-15'),
          description: 'Reviewed transaction',
          reviewedAt: new Date(),
          reviewedBy: adminUserId,
        },
      });

      const response = await request(app)
        .get('/api/pending-transactions')
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.pendingTransactions).toHaveLength(0);
    });

    it('should filter by bank account', async () => {
      // Create another bank account
      const bankAccount2 = await prisma.bankAccount.create({
        data: {
          accountId: 'acc_test456',
          accountName: 'Another Account',
          accountType: 'uk_retail',
          provider: 'monzo',
          accessToken: encryptToken('test_access_token_2'),
          syncEnabled: true,
          syncFromDate: new Date('2024-01-01'),
          lastSyncStatus: 'never_synced',
        },
      });

      // Create pending transactions for different accounts
      const bankTx1 = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_acc1',
          description: 'From account 1',
          amount: 1000,
          currency: 'GBP',
          transactionDate: new Date('2024-01-15'),
        },
      });

      await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx1.id,
          transactionDate: new Date('2024-01-15'),
          description: 'From account 1',
        },
      });

      const bankTx2 = await prisma.bankTransaction.create({
        data: {
          bankAccountId: bankAccount2.id,
          externalId: 'tx_acc2',
          description: 'From account 2',
          amount: 500,
          currency: 'GBP',
          transactionDate: new Date('2024-01-16'),
        },
      });

      await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx2.id,
          transactionDate: new Date('2024-01-16'),
          description: 'From account 2',
        },
      });

      const response = await request(app)
        .get('/api/pending-transactions')
        .query({ bank_account_id: testBankAccountId })
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.pendingTransactions).toHaveLength(1);
      expect(response.body.pendingTransactions[0].bankAccount.id).toBe(testBankAccountId);
    });

    it('should filter by review status', async () => {
      // Create unreviewed transaction
      const bankTx1 = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_unreviewed',
          description: 'Unreviewed',
          amount: 1000,
          currency: 'GBP',
          transactionDate: new Date('2024-01-15'),
        },
      });

      await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx1.id,
          transactionDate: new Date('2024-01-15'),
          description: 'Unreviewed',
        },
      });

      // Create reviewed transaction
      const bankTx2 = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_reviewed',
          description: 'Reviewed',
          amount: 500,
          currency: 'GBP',
          transactionDate: new Date('2024-01-16'),
        },
      });

      await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx2.id,
          transactionDate: new Date('2024-01-16'),
          description: 'Reviewed',
          reviewedAt: new Date(),
          reviewedBy: adminUserId,
        },
      });

      // Filter for reviewed
      const response = await request(app)
        .get('/api/pending-transactions')
        .query({ review_status: 'reviewed' })
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.pendingTransactions).toHaveLength(1);
      expect(response.body.pendingTransactions[0].reviewedAt).toBeTruthy();
    });

    it('should search by description', async () => {
      const bankTx = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_search',
          description: 'Unique search term here',
          amount: 1000,
          currency: 'GBP',
          transactionDate: new Date('2024-01-15'),
        },
      });

      await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx.id,
          transactionDate: new Date('2024-01-15'),
          description: 'Unique search term here',
        },
      });

      const response = await request(app)
        .get('/api/pending-transactions')
        .query({ search: 'Unique search' })
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.pendingTransactions).toHaveLength(1);
    });

    it('should order by transaction date descending', async () => {
      const bankTx1 = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_old',
          description: 'Older transaction',
          amount: 1000,
          currency: 'GBP',
          transactionDate: new Date('2024-01-10'),
        },
      });

      await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx1.id,
          transactionDate: new Date('2024-01-10'),
          description: 'Older transaction',
        },
      });

      const bankTx2 = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_new',
          description: 'Newer transaction',
          amount: 500,
          currency: 'GBP',
          transactionDate: new Date('2024-01-20'),
        },
      });

      await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx2.id,
          transactionDate: new Date('2024-01-20'),
          description: 'Newer transaction',
        },
      });

      const response = await request(app)
        .get('/api/pending-transactions')
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.pendingTransactions).toHaveLength(2);
      expect(response.body.pendingTransactions[0].description).toBe('Newer transaction');
      expect(response.body.pendingTransactions[1].description).toBe('Older transaction');
    });
  });

  describe('PATCH /api/pending-transactions/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app).patch('/api/pending-transactions/test-id');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .patch('/api/pending-transactions/test-id')
        .set('Cookie', viewerCookies);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should update pending transaction fields', async () => {
      const bankTx = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_update',
          description: 'Update test',
          amount: 1000,
          currency: 'GBP',
          transactionDate: new Date('2024-01-15'),
        },
      });

      const pendingTx = await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx.id,
          transactionDate: new Date('2024-01-15'),
          description: 'Update test',
        },
      });

      const response = await request(app)
        .patch(`/api/pending-transactions/${pendingTx.id}`)
        .set('Cookie', adminCookies)
        .send({
          propertyId: testPropertyId,
          type: 'Income',
          category: 'Rent',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.pendingTransaction.propertyId).toBe(testPropertyId);
      expect(response.body.pendingTransaction.type).toBe('Income');
      expect(response.body.pendingTransaction.category).toBe('Rent');
    });

    it('should return 404 for non-existent pending transaction', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .patch(`/api/pending-transactions/${nonExistentId}`)
        .set('Cookie', adminCookies)
        .send({ type: 'Income' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Pending transaction not found');
    });

    it('should validate property exists', async () => {
      const bankTx = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_validate',
          description: 'Validation test',
          amount: 1000,
          currency: 'GBP',
          transactionDate: new Date('2024-01-15'),
        },
      });

      const pendingTx = await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx.id,
          transactionDate: new Date('2024-01-15'),
          description: 'Validation test',
        },
      });

      const response = await request(app)
        .patch(`/api/pending-transactions/${pendingTx.id}`)
        .set('Cookie', adminCookies)
        .send({
          propertyId: '00000000-0000-0000-0000-000000000000',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Property not found');
    });
  });

  describe('POST /api/pending-transactions/:id/approve', () => {
    it('should require authentication', async () => {
      const response = await request(app).post('/api/pending-transactions/test-id/approve');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .post('/api/pending-transactions/test-id/approve')
        .set('Cookie', viewerCookies);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should approve pending transaction and create transaction', async () => {
      const bankTx = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_approve',
          description: 'Approval test',
          amount: 1000,
          currency: 'GBP',
          transactionDate: new Date('2024-01-15'),
        },
      });

      const pendingTx = await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx.id,
          propertyId: testPropertyId,
          type: 'Income',
          category: 'Rent',
          transactionDate: new Date('2024-01-15'),
          description: 'Approval test',
        },
      });

      const response = await request(app)
        .post(`/api/pending-transactions/${pendingTx.id}/approve`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.transaction).toBeDefined();
      expect(response.body.transaction.propertyId).toBe(testPropertyId);
      expect(response.body.transaction.type).toBe('Income');
      expect(response.body.transaction.category).toBe('Rent');
      expect(response.body.transaction.amount).toBe(1000);
      expect(response.body.transaction.isImported).toBe(true);

      // Verify pending transaction was marked as reviewed
      const updatedPending = await prisma.pendingTransaction.findUnique({
        where: { id: pendingTx.id },
      });
      expect(updatedPending?.reviewedAt).toBeTruthy();
      expect(updatedPending?.reviewedBy).toBe(adminUserId);

      // Verify bank transaction is linked
      const updatedBankTx = await prisma.bankTransaction.findUnique({
        where: { id: bankTx.id },
      });
      expect(updatedBankTx?.transactionId).toBeTruthy();
    });

    it('should require propertyId before approval', async () => {
      const bankTx = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_no_property',
          description: 'Missing property',
          amount: 1000,
          currency: 'GBP',
          transactionDate: new Date('2024-01-15'),
        },
      });

      const pendingTx = await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx.id,
          transactionDate: new Date('2024-01-15'),
          description: 'Missing property',
        },
      });

      const response = await request(app)
        .post(`/api/pending-transactions/${pendingTx.id}/approve`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('propertyId is required');
    });

    it('should require type before approval', async () => {
      const bankTx = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_no_type',
          description: 'Missing type',
          amount: 1000,
          currency: 'GBP',
          transactionDate: new Date('2024-01-15'),
        },
      });

      const pendingTx = await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx.id,
          propertyId: testPropertyId,
          transactionDate: new Date('2024-01-15'),
          description: 'Missing type',
        },
      });

      const response = await request(app)
        .post(`/api/pending-transactions/${pendingTx.id}/approve`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('type is required');
    });

    it('should require category before approval', async () => {
      const bankTx = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_no_category',
          description: 'Missing category',
          amount: 1000,
          currency: 'GBP',
          transactionDate: new Date('2024-01-15'),
        },
      });

      const pendingTx = await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx.id,
          propertyId: testPropertyId,
          type: 'Income',
          transactionDate: new Date('2024-01-15'),
          description: 'Missing category',
        },
      });

      const response = await request(app)
        .post(`/api/pending-transactions/${pendingTx.id}/approve`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('category is required');
    });

    it('should return 404 for non-existent pending transaction', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .post(`/api/pending-transactions/${nonExistentId}/approve`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Pending transaction not found');
    });

    it('should prevent double approval', async () => {
      const bankTx = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_double',
          description: 'Double approval test',
          amount: 1000,
          currency: 'GBP',
          transactionDate: new Date('2024-01-15'),
        },
      });

      const pendingTx = await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx.id,
          propertyId: testPropertyId,
          type: 'Income',
          category: 'Rent',
          transactionDate: new Date('2024-01-15'),
          description: 'Double approval test',
          reviewedAt: new Date(),
          reviewedBy: adminUserId,
        },
      });

      const response = await request(app)
        .post(`/api/pending-transactions/${pendingTx.id}/approve`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already been reviewed');
    });
  });

  describe('GET /api/pending-transactions/count', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/pending-transactions/count');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .get('/api/pending-transactions/count')
        .set('Cookie', viewerCookies);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should return count of unreviewed pending transactions', async () => {
      // Create unreviewed transactions
      for (let i = 0; i < 3; i++) {
        const bankTx = await prisma.bankTransaction.create({
          data: {
            bankAccountId: testBankAccountId,
            externalId: `tx_count_${i}`,
            description: `Unreviewed ${i}`,
            amount: 1000,
            currency: 'GBP',
            transactionDate: new Date('2024-01-15'),
          },
        });

        await prisma.pendingTransaction.create({
          data: {
            bankTransactionId: bankTx.id,
            transactionDate: new Date('2024-01-15'),
            description: `Unreviewed ${i}`,
          },
        });
      }

      // Create reviewed transaction (should not be counted)
      const bankTx = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_reviewed_count',
          description: 'Reviewed',
          amount: 500,
          currency: 'GBP',
          transactionDate: new Date('2024-01-16'),
        },
      });

      await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx.id,
          transactionDate: new Date('2024-01-16'),
          description: 'Reviewed',
          reviewedAt: new Date(),
          reviewedBy: adminUserId,
        },
      });

      const response = await request(app)
        .get('/api/pending-transactions/count')
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(3);
    });
  });

  describe('POST /api/pending-transactions/bulk/approve', () => {
    it('should require authentication', async () => {
      const response = await request(app).post('/api/pending-transactions/bulk/approve');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .post('/api/pending-transactions/bulk/approve')
        .set('Cookie', viewerCookies);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should approve multiple pending transactions', async () => {
      // Create multiple pending transactions
      const pendingIds = [];

      for (let i = 0; i < 3; i++) {
        const bankTx = await prisma.bankTransaction.create({
          data: {
            bankAccountId: testBankAccountId,
            externalId: `tx_bulk_approve_${i}`,
            description: `Bulk approve ${i}`,
            amount: 1000 + i * 100,
            currency: 'GBP',
            transactionDate: new Date('2024-01-15'),
          },
        });

        const pendingTx = await prisma.pendingTransaction.create({
          data: {
            bankTransactionId: bankTx.id,
            propertyId: testPropertyId,
            type: 'Income',
            category: 'Rent',
            transactionDate: new Date('2024-01-15'),
            description: `Bulk approve ${i}`,
          },
        });

        pendingIds.push(pendingTx.id);
      }

      const response = await request(app)
        .post('/api/pending-transactions/bulk/approve')
        .set('Cookie', adminCookies)
        .send({ ids: pendingIds });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(3);
      expect(response.body.transactions).toHaveLength(3);

      // Verify all were marked as reviewed
      for (const id of pendingIds) {
        const pending = await prisma.pendingTransaction.findUnique({
          where: { id },
        });
        expect(pending?.reviewedAt).toBeTruthy();
        expect(pending?.reviewedBy).toBe(adminUserId);
      }

      // Verify transactions were created
      const transactions = await prisma.transaction.findMany({
        where: {
          isImported: true,
        },
      });
      expect(transactions).toHaveLength(3);
    });

    it('should reject if any transaction is missing required fields', async () => {
      const bankTx1 = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_complete',
          description: 'Complete',
          amount: 1000,
          currency: 'GBP',
          transactionDate: new Date('2024-01-15'),
        },
      });

      const pendingTx1 = await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx1.id,
          propertyId: testPropertyId,
          type: 'Income',
          category: 'Rent',
          transactionDate: new Date('2024-01-15'),
          description: 'Complete',
        },
      });

      const bankTx2 = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_incomplete',
          description: 'Incomplete',
          amount: 1000,
          currency: 'GBP',
          transactionDate: new Date('2024-01-15'),
        },
      });

      const pendingTx2 = await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx2.id,
          transactionDate: new Date('2024-01-15'),
          description: 'Incomplete',
        },
      });

      const response = await request(app)
        .post('/api/pending-transactions/bulk/approve')
        .set('Cookie', adminCookies)
        .send({ ids: [pendingTx1.id, pendingTx2.id] });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cannot approve transactions');
      expect(response.body.details).toBeDefined();

      // Verify neither was approved
      const pending1 = await prisma.pendingTransaction.findUnique({
        where: { id: pendingTx1.id },
      });
      expect(pending1?.reviewedAt).toBeNull();
    });

    it('should reject if any transaction is already reviewed', async () => {
      const bankTx = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_already_reviewed',
          description: 'Already reviewed',
          amount: 1000,
          currency: 'GBP',
          transactionDate: new Date('2024-01-15'),
        },
      });

      const pendingTx = await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx.id,
          propertyId: testPropertyId,
          type: 'Income',
          category: 'Rent',
          transactionDate: new Date('2024-01-15'),
          description: 'Already reviewed',
          reviewedAt: new Date(),
          reviewedBy: adminUserId,
        },
      });

      const response = await request(app)
        .post('/api/pending-transactions/bulk/approve')
        .set('Cookie', adminCookies)
        .send({ ids: [pendingTx.id] });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.details).toBeDefined();
    });

    it('should validate ids array', async () => {
      const response = await request(app)
        .post('/api/pending-transactions/bulk/approve')
        .set('Cookie', adminCookies)
        .send({ ids: [] });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('At least one ID is required');
    });
  });

  describe('POST /api/pending-transactions/bulk/update', () => {
    it('should require authentication', async () => {
      const response = await request(app).post('/api/pending-transactions/bulk/update');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .post('/api/pending-transactions/bulk/update')
        .set('Cookie', viewerCookies);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should update multiple pending transactions', async () => {
      // Create multiple pending transactions without property
      const pendingIds = [];

      for (let i = 0; i < 3; i++) {
        const bankTx = await prisma.bankTransaction.create({
          data: {
            bankAccountId: testBankAccountId,
            externalId: `tx_bulk_update_${i}`,
            description: `Bulk update ${i}`,
            amount: 1000,
            currency: 'GBP',
            transactionDate: new Date('2024-01-15'),
          },
        });

        const pendingTx = await prisma.pendingTransaction.create({
          data: {
            bankTransactionId: bankTx.id,
            transactionDate: new Date('2024-01-15'),
            description: `Bulk update ${i}`,
          },
        });

        pendingIds.push(pendingTx.id);
      }

      const response = await request(app)
        .post('/api/pending-transactions/bulk/update')
        .set('Cookie', adminCookies)
        .send({
          ids: pendingIds,
          updates: {
            propertyId: testPropertyId,
            type: 'Expense',
            category: 'Maintenance',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(3);

      // Verify all were updated
      for (const id of pendingIds) {
        const pending = await prisma.pendingTransaction.findUnique({
          where: { id },
        });
        expect(pending?.propertyId).toBe(testPropertyId);
        expect(pending?.type).toBe('Expense');
        expect(pending?.category).toBe('Maintenance');
      }
    });

    it('should reject if any transaction is already reviewed', async () => {
      const bankTx1 = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_unreviewed',
          description: 'Unreviewed',
          amount: 1000,
          currency: 'GBP',
          transactionDate: new Date('2024-01-15'),
        },
      });

      const pendingTx1 = await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx1.id,
          transactionDate: new Date('2024-01-15'),
          description: 'Unreviewed',
        },
      });

      const bankTx2 = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_reviewed_skip',
          description: 'Reviewed',
          amount: 1000,
          currency: 'GBP',
          transactionDate: new Date('2024-01-15'),
        },
      });

      const pendingTx2 = await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx2.id,
          transactionDate: new Date('2024-01-15'),
          description: 'Reviewed',
          reviewedAt: new Date(),
          reviewedBy: adminUserId,
        },
      });

      const response = await request(app)
        .post('/api/pending-transactions/bulk/update')
        .set('Cookie', adminCookies)
        .send({
          ids: [pendingTx1.id, pendingTx2.id],
          updates: {
            type: 'Income',
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already been reviewed');

      // Verify neither was updated
      const pending1 = await prisma.pendingTransaction.findUnique({
        where: { id: pendingTx1.id },
      });
      expect(pending1?.type).toBeNull(); // Should not be updated

      const pending2 = await prisma.pendingTransaction.findUnique({
        where: { id: pendingTx2.id },
      });
      expect(pending2?.type).toBeNull(); // Should not be updated
    });

    it('should validate property exists', async () => {
      const response = await request(app)
        .post('/api/pending-transactions/bulk/update')
        .set('Cookie', adminCookies)
        .send({
          ids: ['00000000-0000-0000-0000-000000000000'],
          updates: {
            propertyId: '00000000-0000-0000-0000-000000000000',
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Property not found');
    });

    it('should require at least one update field', async () => {
      const response = await request(app)
        .post('/api/pending-transactions/bulk/update')
        .set('Cookie', adminCookies)
        .send({
          ids: ['00000000-0000-0000-0000-000000000000'],
          updates: {},
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('At least one field must be provided for update');
    });
  });

  describe('POST /api/pending-transactions/bulk/reject', () => {
    it('should require authentication', async () => {
      const response = await request(app).post('/api/pending-transactions/bulk/reject');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .post('/api/pending-transactions/bulk/reject')
        .set('Cookie', viewerCookies);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should delete multiple pending transactions', async () => {
      const pendingIds = [];

      for (let i = 0; i < 3; i++) {
        const bankTx = await prisma.bankTransaction.create({
          data: {
            bankAccountId: testBankAccountId,
            externalId: `tx_bulk_reject_${i}`,
            description: `Bulk reject ${i}`,
            amount: 1000,
            currency: 'GBP',
            transactionDate: new Date('2024-01-15'),
          },
        });

        const pendingTx = await prisma.pendingTransaction.create({
          data: {
            bankTransactionId: bankTx.id,
            transactionDate: new Date('2024-01-15'),
            description: `Bulk reject ${i}`,
          },
        });

        pendingIds.push(pendingTx.id);
      }

      const response = await request(app)
        .post('/api/pending-transactions/bulk/reject')
        .set('Cookie', adminCookies)
        .send({ ids: pendingIds });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(3);

      // Verify all were deleted
      for (const id of pendingIds) {
        const pending = await prisma.pendingTransaction.findUnique({
          where: { id },
        });
        expect(pending).toBeNull();
      }
    });

    it('should reject if any transaction is already reviewed', async () => {
      const bankTx1 = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_unreviewed_delete',
          description: 'Unreviewed',
          amount: 1000,
          currency: 'GBP',
          transactionDate: new Date('2024-01-15'),
        },
      });

      const pendingTx1 = await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx1.id,
          transactionDate: new Date('2024-01-15'),
          description: 'Unreviewed',
        },
      });

      const bankTx2 = await prisma.bankTransaction.create({
        data: {
          bankAccountId: testBankAccountId,
          externalId: 'tx_reviewed_nodelete',
          description: 'Reviewed',
          amount: 1000,
          currency: 'GBP',
          transactionDate: new Date('2024-01-15'),
        },
      });

      const pendingTx2 = await prisma.pendingTransaction.create({
        data: {
          bankTransactionId: bankTx2.id,
          transactionDate: new Date('2024-01-15'),
          description: 'Reviewed',
          reviewedAt: new Date(),
          reviewedBy: adminUserId,
        },
      });

      const response = await request(app)
        .post('/api/pending-transactions/bulk/reject')
        .set('Cookie', adminCookies)
        .send({ ids: [pendingTx1.id, pendingTx2.id] });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already been reviewed');

      // Verify neither was deleted
      const pending1 = await prisma.pendingTransaction.findUnique({
        where: { id: pendingTx1.id },
      });
      expect(pending1).not.toBeNull(); // Should not be deleted

      const pending2 = await prisma.pendingTransaction.findUnique({
        where: { id: pendingTx2.id },
      });
      expect(pending2).not.toBeNull(); // Should not be deleted
    });

    it('should validate ids array', async () => {
      const response = await request(app)
        .post('/api/pending-transactions/bulk/reject')
        .set('Cookie', adminCookies)
        .send({ ids: [] });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('At least one ID is required');
    });
  });
});
