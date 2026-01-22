import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../app.js';
import prisma from '../../db/client.js';
import authService from '../../services/auth.service.js';
import { Roles } from '../../../../shared/types/user.types.js';
import { encryptToken } from '../../services/encryption.js';

const app = createApp();

describe('Matching Rules Routes', () => {
  // Test user credentials
  const adminUser = {
    email: 'admin@example.com',
    password: 'adminPassword123',
  };

  let adminCookies: string[];
  let testBankAccount: any;
  let testProperty: any;

  // Valid rule data
  const validRuleConditions = JSON.stringify({
    operator: 'AND',
    rules: [
      {
        field: 'description',
        matchType: 'contains',
        value: 'rent',
        caseSensitive: false,
      },
    ],
  });

  beforeAll(async () => {
    // Clean database
    await prisma.matchingRule.deleteMany({});
    await prisma.bankAccount.deleteMany({});
    await prisma.property.deleteMany({});
    await prisma.user.deleteMany({});

    // Create admin user and login
    await authService.createUser(adminUser.email, adminUser.password, Roles.ADMIN);

    const adminLoginResponse = await request(app).post('/api/auth/login').send({
      email: adminUser.email,
      password: adminUser.password,
    });

    adminCookies = [adminLoginResponse.headers['set-cookie']];

    // Create test property
    testProperty = await prisma.property.create({
      data: {
        name: 'Test Property',
        street: '123 Test St',
        city: 'London',
        county: 'Greater London',
        postcode: 'SW1A 1AA',
        propertyType: 'House',
        status: 'Available',
      },
    });

    // Create test bank account
    testBankAccount = await prisma.bankAccount.create({
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
  });

  afterAll(async () => {
    // Clean up after all tests
    await prisma.matchingRule.deleteMany({});
    await prisma.bankAccount.deleteMany({});
    await prisma.property.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean matching rules before each test
    await prisma.matchingRule.deleteMany({});
  });

  describe('GET /api/bank/accounts/:accountId/rules', () => {
    it('should require authentication', async () => {
      const response = await request(app).get(`/api/bank/accounts/${testBankAccount.id}/rules`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should require admin role', async () => {
      // Create viewer user
      await authService.createUser('viewer@example.com', 'password123', Roles.VIEWER);
      const viewerLoginResponse = await request(app).post('/api/auth/login').send({
        email: 'viewer@example.com',
        password: 'password123',
      });
      const viewerCookies = [viewerLoginResponse.headers['set-cookie']];

      const response = await request(app)
        .get(`/api/bank/accounts/${testBankAccount.id}/rules`)
        .set('Cookie', viewerCookies);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');

      // Cleanup
      await prisma.user.delete({ where: { email: 'viewer@example.com' } });
    });

    it('should return empty array when no rules exist', async () => {
      const response = await request(app)
        .get(`/api/bank/accounts/${testBankAccount.id}/rules`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.rules).toEqual([]);
    });

    it('should return account-specific rules ordered by priority', async () => {
      // Create rules with different priorities
      await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccount.id,
          priority: 2,
          name: 'Rule 2',
          enabled: true,
          conditions: validRuleConditions,
          type: 'INCOME',
          category: 'Rent',
        },
      });

      await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccount.id,
          priority: 0,
          name: 'Rule 0',
          enabled: true,
          conditions: validRuleConditions,
          type: 'INCOME',
          category: 'Rent',
        },
      });

      await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccount.id,
          priority: 1,
          name: 'Rule 1',
          enabled: true,
          conditions: validRuleConditions,
          type: 'INCOME',
          category: 'Rent',
        },
      });

      const response = await request(app)
        .get(`/api/bank/accounts/${testBankAccount.id}/rules`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.rules).toHaveLength(3);

      // Verify order by priority
      expect(response.body.rules[0].name).toBe('Rule 0');
      expect(response.body.rules[1].name).toBe('Rule 1');
      expect(response.body.rules[2].name).toBe('Rule 2');
    });

    it('should return both account-specific and global rules', async () => {
      // Create account-specific rule
      await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccount.id,
          priority: 0,
          name: 'Account Rule',
          enabled: true,
          conditions: validRuleConditions,
          type: 'INCOME',
          category: 'Rent',
        },
      });

      // Create global rule
      await prisma.matchingRule.create({
        data: {
          bankAccountId: null,
          priority: 100,
          name: 'Global Rule',
          enabled: true,
          conditions: validRuleConditions,
          type: 'EXPENSE',
          category: 'Other',
        },
      });

      const response = await request(app)
        .get(`/api/bank/accounts/${testBankAccount.id}/rules`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.rules).toHaveLength(2);

      // Verify both types are returned
      expect(response.body.rules[0].name).toBe('Account Rule');
      expect(response.body.rules[0].bankAccountId).toBe(testBankAccount.id);
      expect(response.body.rules[1].name).toBe('Global Rule');
      expect(response.body.rules[1].bankAccountId).toBeNull();
    });

    it('should return 404 for non-existent bank account', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/bank/accounts/${nonExistentId}/rules`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Bank account not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/bank/accounts/invalid-id/rules')
        .set('Cookie', adminCookies);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid bank account ID format');
    });
  });

  describe('POST /api/bank/accounts/:accountId/rules', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/bank/accounts/${testBankAccount.id}/rules`)
        .send({
          name: 'Test Rule',
          enabled: true,
          conditions: validRuleConditions,
          type: 'INCOME',
          category: 'Rent',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should require admin role', async () => {
      // Create viewer user
      await authService.createUser('viewer2@example.com', 'password123', Roles.VIEWER);
      const viewerLoginResponse = await request(app).post('/api/auth/login').send({
        email: 'viewer2@example.com',
        password: 'password123',
      });
      const viewerCookies = [viewerLoginResponse.headers['set-cookie']];

      const response = await request(app)
        .post(`/api/bank/accounts/${testBankAccount.id}/rules`)
        .set('Cookie', viewerCookies)
        .send({
          name: 'Test Rule',
          enabled: true,
          conditions: validRuleConditions,
          type: 'INCOME',
          category: 'Rent',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);

      // Cleanup
      await prisma.user.delete({ where: { email: 'viewer2@example.com' } });
    });

    it('should create a new rule with auto-assigned priority', async () => {
      const response = await request(app)
        .post(`/api/bank/accounts/${testBankAccount.id}/rules`)
        .set('Cookie', adminCookies)
        .send({
          name: 'New Rent Rule',
          enabled: true,
          conditions: validRuleConditions,
          type: 'INCOME',
          category: 'Rent',
          propertyId: testProperty.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.rule.name).toBe('New Rent Rule');
      expect(response.body.rule.bankAccountId).toBe(testBankAccount.id);
      expect(response.body.rule.priority).toBe(0);
      expect(response.body.rule.enabled).toBe(true);
      expect(response.body.rule.type).toBe('INCOME');
      expect(response.body.rule.category).toBe('Rent');
      expect(response.body.rule.propertyId).toBe(testProperty.id);
    });

    it('should auto-assign priority as max + 1 for the account', async () => {
      // Create existing rules
      await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccount.id,
          priority: 0,
          name: 'Existing Rule 1',
          enabled: true,
          conditions: validRuleConditions,
        },
      });

      await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccount.id,
          priority: 2,
          name: 'Existing Rule 2',
          enabled: true,
          conditions: validRuleConditions,
        },
      });

      const response = await request(app)
        .post(`/api/bank/accounts/${testBankAccount.id}/rules`)
        .set('Cookie', adminCookies)
        .send({
          name: 'New Rule',
          enabled: true,
          conditions: validRuleConditions,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.rule.priority).toBe(3);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post(`/api/bank/accounts/${testBankAccount.id}/rules`)
        .set('Cookie', adminCookies)
        .send({
          enabled: true,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should validate conditions JSON format', async () => {
      const response = await request(app)
        .post(`/api/bank/accounts/${testBankAccount.id}/rules`)
        .set('Cookie', adminCookies)
        .send({
          name: 'Invalid Rule',
          enabled: true,
          conditions: 'invalid json',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('conditions');
    });

    it('should return 404 for non-existent bank account', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post(`/api/bank/accounts/${nonExistentId}/rules`)
        .set('Cookie', adminCookies)
        .send({
          name: 'Test Rule',
          enabled: true,
          conditions: validRuleConditions,
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Bank account not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .post('/api/bank/accounts/invalid-id/rules')
        .set('Cookie', adminCookies)
        .send({
          name: 'Test Rule',
          enabled: true,
          conditions: validRuleConditions,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid bank account ID format');
    });

    it('should validate propertyId if provided', async () => {
      const response = await request(app)
        .post(`/api/bank/accounts/${testBankAccount.id}/rules`)
        .set('Cookie', adminCookies)
        .send({
          name: 'Test Rule',
          enabled: true,
          conditions: validRuleConditions,
          propertyId: 'invalid-uuid',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/bank/rules/:id', () => {
    it('should require authentication', async () => {
      const rule = await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccount.id,
          priority: 0,
          name: 'Test Rule',
          enabled: true,
          conditions: validRuleConditions,
        },
      });

      const response = await request(app).get(`/api/bank/rules/${rule.id}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should require admin role', async () => {
      const rule = await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccount.id,
          priority: 0,
          name: 'Test Rule',
          enabled: true,
          conditions: validRuleConditions,
        },
      });

      // Create viewer user
      await authService.createUser('viewer3@example.com', 'password123', Roles.VIEWER);
      const viewerLoginResponse = await request(app).post('/api/auth/login').send({
        email: 'viewer3@example.com',
        password: 'password123',
      });
      const viewerCookies = [viewerLoginResponse.headers['set-cookie']];

      const response = await request(app)
        .get(`/api/bank/rules/${rule.id}`)
        .set('Cookie', viewerCookies);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);

      // Cleanup
      await prisma.user.delete({ where: { email: 'viewer3@example.com' } });
    });

    it('should return rule by id', async () => {
      const rule = await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccount.id,
          priority: 0,
          name: 'Test Rule',
          enabled: true,
          conditions: validRuleConditions,
          type: 'INCOME',
          category: 'Rent',
        },
      });

      const response = await request(app)
        .get(`/api/bank/rules/${rule.id}`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.rule.id).toBe(rule.id);
      expect(response.body.rule.name).toBe('Test Rule');
      expect(response.body.rule.type).toBe('INCOME');
    });

    it('should return global rules', async () => {
      const globalRule = await prisma.matchingRule.create({
        data: {
          bankAccountId: null,
          priority: 100,
          name: 'Global Rule',
          enabled: true,
          conditions: validRuleConditions,
        },
      });

      const response = await request(app)
        .get(`/api/bank/rules/${globalRule.id}`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.rule.id).toBe(globalRule.id);
      expect(response.body.rule.bankAccountId).toBeNull();
    });

    it('should return 404 for non-existent rule', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/bank/rules/${nonExistentId}`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Matching rule not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/bank/rules/invalid-id')
        .set('Cookie', adminCookies);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid rule ID format');
    });
  });

  describe('PUT /api/bank/rules/:id', () => {
    it('should require authentication', async () => {
      const rule = await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccount.id,
          priority: 0,
          name: 'Test Rule',
          enabled: true,
          conditions: validRuleConditions,
        },
      });

      const response = await request(app)
        .put(`/api/bank/rules/${rule.id}`)
        .send({ name: 'Updated Rule' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should require admin role', async () => {
      const rule = await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccount.id,
          priority: 0,
          name: 'Test Rule',
          enabled: true,
          conditions: validRuleConditions,
        },
      });

      // Create viewer user
      await authService.createUser('viewer4@example.com', 'password123', Roles.VIEWER);
      const viewerLoginResponse = await request(app).post('/api/auth/login').send({
        email: 'viewer4@example.com',
        password: 'password123',
      });
      const viewerCookies = [viewerLoginResponse.headers['set-cookie']];

      const response = await request(app)
        .put(`/api/bank/rules/${rule.id}`)
        .set('Cookie', viewerCookies)
        .send({ name: 'Updated Rule' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);

      // Cleanup
      await prisma.user.delete({ where: { email: 'viewer4@example.com' } });
    });

    it('should update rule name', async () => {
      const rule = await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccount.id,
          priority: 0,
          name: 'Old Name',
          enabled: true,
          conditions: validRuleConditions,
        },
      });

      const response = await request(app)
        .put(`/api/bank/rules/${rule.id}`)
        .set('Cookie', adminCookies)
        .send({ name: 'New Name' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.rule.name).toBe('New Name');
      expect(response.body.rule.enabled).toBe(true); // Unchanged
    });

    it('should update rule enabled status', async () => {
      const rule = await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccount.id,
          priority: 0,
          name: 'Test Rule',
          enabled: true,
          conditions: validRuleConditions,
        },
      });

      const response = await request(app)
        .put(`/api/bank/rules/${rule.id}`)
        .set('Cookie', adminCookies)
        .send({ enabled: false });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.rule.enabled).toBe(false);
      expect(response.body.rule.name).toBe('Test Rule'); // Unchanged
    });

    it('should update multiple fields at once', async () => {
      const rule = await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccount.id,
          priority: 0,
          name: 'Old Name',
          enabled: true,
          conditions: validRuleConditions,
          type: 'INCOME',
          category: 'Rent',
        },
      });

      const response = await request(app)
        .put(`/api/bank/rules/${rule.id}`)
        .set('Cookie', adminCookies)
        .send({
          name: 'Updated Name',
          enabled: false,
          type: 'EXPENSE',
          category: 'Maintenance',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.rule.name).toBe('Updated Name');
      expect(response.body.rule.enabled).toBe(false);
      expect(response.body.rule.type).toBe('EXPENSE');
      expect(response.body.rule.category).toBe('Maintenance');
    });

    it('should not allow updating global rules', async () => {
      const globalRule = await prisma.matchingRule.create({
        data: {
          bankAccountId: null,
          priority: 100,
          name: 'Global Rule',
          enabled: true,
          conditions: validRuleConditions,
        },
      });

      const response = await request(app)
        .put(`/api/bank/rules/${globalRule.id}`)
        .set('Cookie', adminCookies)
        .send({ name: 'Updated Global Rule' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Cannot modify global rules');
    });

    it('should return 404 for non-existent rule', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .put(`/api/bank/rules/${nonExistentId}`)
        .set('Cookie', adminCookies)
        .send({ name: 'Updated Rule' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Matching rule not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .put('/api/bank/rules/invalid-id')
        .set('Cookie', adminCookies)
        .send({ name: 'Updated Rule' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid rule ID format');
    });
  });

  describe('DELETE /api/bank/rules/:id', () => {
    it('should require authentication', async () => {
      const rule = await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccount.id,
          priority: 0,
          name: 'Test Rule',
          enabled: true,
          conditions: validRuleConditions,
        },
      });

      const response = await request(app).delete(`/api/bank/rules/${rule.id}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should require admin role', async () => {
      const rule = await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccount.id,
          priority: 0,
          name: 'Test Rule',
          enabled: true,
          conditions: validRuleConditions,
        },
      });

      // Create viewer user
      await authService.createUser('viewer5@example.com', 'password123', Roles.VIEWER);
      const viewerLoginResponse = await request(app).post('/api/auth/login').send({
        email: 'viewer5@example.com',
        password: 'password123',
      });
      const viewerCookies = [viewerLoginResponse.headers['set-cookie']];

      const response = await request(app)
        .delete(`/api/bank/rules/${rule.id}`)
        .set('Cookie', viewerCookies);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);

      // Cleanup
      await prisma.user.delete({ where: { email: 'viewer5@example.com' } });
    });

    it('should delete a rule', async () => {
      const rule = await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccount.id,
          priority: 0,
          name: 'Test Rule',
          enabled: true,
          conditions: validRuleConditions,
        },
      });

      const response = await request(app)
        .delete(`/api/bank/rules/${rule.id}`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Matching rule deleted successfully');

      // Verify deletion
      const deletedRule = await prisma.matchingRule.findUnique({
        where: { id: rule.id },
      });
      expect(deletedRule).toBeNull();
    });

    it('should not allow deleting global rules', async () => {
      const globalRule = await prisma.matchingRule.create({
        data: {
          bankAccountId: null,
          priority: 100,
          name: 'Global Rule',
          enabled: true,
          conditions: validRuleConditions,
        },
      });

      const response = await request(app)
        .delete(`/api/bank/rules/${globalRule.id}`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Cannot delete global rules');

      // Verify not deleted
      const rule = await prisma.matchingRule.findUnique({
        where: { id: globalRule.id },
      });
      expect(rule).not.toBeNull();
    });

    it('should return 404 for non-existent rule', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .delete(`/api/bank/rules/${nonExistentId}`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Matching rule not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .delete('/api/bank/rules/invalid-id')
        .set('Cookie', adminCookies);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid rule ID format');
    });
  });

  describe('POST /api/bank/rules/reorder', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/bank/rules/reorder')
        .send({ ruleIds: [] });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should require admin role', async () => {
      // Create viewer user
      await authService.createUser('viewer6@example.com', 'password123', Roles.VIEWER);
      const viewerLoginResponse = await request(app).post('/api/auth/login').send({
        email: 'viewer6@example.com',
        password: 'password123',
      });
      const viewerCookies = [viewerLoginResponse.headers['set-cookie']];

      const response = await request(app)
        .post('/api/bank/rules/reorder')
        .set('Cookie', viewerCookies)
        .send({ ruleIds: [] });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);

      // Cleanup
      await prisma.user.delete({ where: { email: 'viewer6@example.com' } });
    });

    it('should reorder rules based on array position', async () => {
      // Create three rules
      const rule1 = await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccount.id,
          priority: 0,
          name: 'Rule 1',
          enabled: true,
          conditions: validRuleConditions,
        },
      });

      const rule2 = await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccount.id,
          priority: 1,
          name: 'Rule 2',
          enabled: true,
          conditions: validRuleConditions,
        },
      });

      const rule3 = await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccount.id,
          priority: 2,
          name: 'Rule 3',
          enabled: true,
          conditions: validRuleConditions,
        },
      });

      // Reorder: rule3, rule1, rule2
      const response = await request(app)
        .post('/api/bank/rules/reorder')
        .set('Cookie', adminCookies)
        .send({ ruleIds: [rule3.id, rule1.id, rule2.id] });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify new priorities
      const updatedRule1 = await prisma.matchingRule.findUnique({
        where: { id: rule1.id },
      });
      const updatedRule2 = await prisma.matchingRule.findUnique({
        where: { id: rule2.id },
      });
      const updatedRule3 = await prisma.matchingRule.findUnique({
        where: { id: rule3.id },
      });

      expect(updatedRule3?.priority).toBe(0);
      expect(updatedRule1?.priority).toBe(1);
      expect(updatedRule2?.priority).toBe(2);
    });

    it('should reject reorder with global rules', async () => {
      const globalRule = await prisma.matchingRule.create({
        data: {
          bankAccountId: null,
          priority: 100,
          name: 'Global Rule',
          enabled: true,
          conditions: validRuleConditions,
        },
      });

      const response = await request(app)
        .post('/api/bank/rules/reorder')
        .set('Cookie', adminCookies)
        .send({ ruleIds: [globalRule.id] });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Cannot reorder global rules');
    });

    it('should validate at least one rule ID is required', async () => {
      const response = await request(app)
        .post('/api/bank/rules/reorder')
        .set('Cookie', adminCookies)
        .send({ ruleIds: [] });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent rule IDs', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post('/api/bank/rules/reorder')
        .set('Cookie', adminCookies)
        .send({ ruleIds: [nonExistentId] });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('POST /api/bank/rules/:id/test', () => {
    it('should require authentication', async () => {
      const rule = await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccount.id,
          priority: 0,
          name: 'Test Rule',
          enabled: true,
          conditions: validRuleConditions,
        },
      });

      const response = await request(app)
        .post(`/api/bank/rules/${rule.id}/test`)
        .send({
          description: 'Monthly rent payment',
          amount: 1000,
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should require admin role', async () => {
      const rule = await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccount.id,
          priority: 0,
          name: 'Test Rule',
          enabled: true,
          conditions: validRuleConditions,
        },
      });

      // Create viewer user
      await authService.createUser('viewer7@example.com', 'password123', Roles.VIEWER);
      const viewerLoginResponse = await request(app).post('/api/auth/login').send({
        email: 'viewer7@example.com',
        password: 'password123',
      });
      const viewerCookies = [viewerLoginResponse.headers['set-cookie']];

      const response = await request(app)
        .post(`/api/bank/rules/${rule.id}/test`)
        .set('Cookie', viewerCookies)
        .send({
          description: 'Monthly rent payment',
          amount: 1000,
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);

      // Cleanup
      await prisma.user.delete({ where: { email: 'viewer7@example.com' } });
    });

    it('should test rule against sample transaction and return match', async () => {
      const rule = await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccount.id,
          priority: 0,
          name: 'Rent Rule',
          enabled: true,
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [
              {
                field: 'description',
                matchType: 'contains',
                value: 'rent',
                caseSensitive: false,
              },
            ],
          }),
          type: 'INCOME',
          category: 'Rent',
        },
      });

      const response = await request(app)
        .post(`/api/bank/rules/${rule.id}/test`)
        .set('Cookie', adminCookies)
        .send({
          description: 'Monthly rent payment',
          amount: 1000,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.matches).toBe(true);
      expect(response.body.result.matchedRules).toContain(rule.id);
      expect(response.body.result.type).toBe('INCOME');
      expect(response.body.result.category).toBe('Rent');
    });

    it('should test rule against sample transaction and return no match', async () => {
      const rule = await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccount.id,
          priority: 0,
          name: 'Rent Rule',
          enabled: true,
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [
              {
                field: 'description',
                matchType: 'contains',
                value: 'rent',
                caseSensitive: false,
              },
            ],
          }),
          type: 'INCOME',
          category: 'Rent',
        },
      });

      const response = await request(app)
        .post(`/api/bank/rules/${rule.id}/test`)
        .set('Cookie', adminCookies)
        .send({
          description: 'Coffee shop payment',
          amount: 5.50,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.matches).toBe(false);
      expect(response.body.result.matchedRules).toHaveLength(0);
    });

    it('should validate required fields', async () => {
      const rule = await prisma.matchingRule.create({
        data: {
          bankAccountId: testBankAccount.id,
          priority: 0,
          name: 'Test Rule',
          enabled: true,
          conditions: validRuleConditions,
        },
      });

      const response = await request(app)
        .post(`/api/bank/rules/${rule.id}/test`)
        .set('Cookie', adminCookies)
        .send({
          // Missing description and amount
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent rule', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post(`/api/bank/rules/${nonExistentId}/test`)
        .set('Cookie', adminCookies)
        .send({
          description: 'Test transaction',
          amount: 100,
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Matching rule not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .post('/api/bank/rules/invalid-id/test')
        .set('Cookie', adminCookies)
        .send({
          description: 'Test transaction',
          amount: 100,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid rule ID format');
    });
  });

  describe('Rule reprocessing integration', () => {
    beforeEach(async () => {
      // Clean related tables
      await prisma.pendingTransaction.deleteMany({});
      await prisma.transaction.deleteMany({});
      await prisma.bankTransaction.deleteMany({});
    });

    describe('POST /api/bank/accounts/:accountId/rules - with reprocessing', () => {
      it('should reprocess pending transactions after creating a rule', async () => {
        // Create a pending transaction
        const bankTx = await prisma.bankTransaction.create({
          data: {
            bankAccountId: testBankAccount.id,
            externalId: 'tx_reprocess_001',
            amount: 1000,
            currency: 'GBP',
            description: 'Monthly rent payment',
            transactionDate: new Date('2024-01-15'),
          },
        });

        const pendingTx = await prisma.pendingTransaction.create({
          data: {
            bankTransactionId: bankTx.id,
            transactionDate: bankTx.transactionDate,
            description: bankTx.description,
          },
        });

        await prisma.bankTransaction.update({
          where: { id: bankTx.id },
          data: { pendingTransactionId: pendingTx.id },
        });

        // Create rule that matches the pending transaction
        const response = await request(app)
          .post(`/api/bank/accounts/${testBankAccount.id}/rules`)
          .set('Cookie', adminCookies)
          .send({
            name: 'Rent Rule',
            enabled: true,
            conditions: JSON.stringify({
              operator: 'AND',
              rules: [
                {
                  field: 'description',
                  matchType: 'contains',
                  value: 'rent',
                  caseSensitive: false,
                },
              ],
            }),
            propertyId: testProperty.id,
            type: 'INCOME',
            category: 'Rent',
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.rule).toBeDefined();

        // Check reprocessing stats
        expect(response.body.reprocessing).toBeDefined();
        expect(response.body.reprocessing.processed).toBe(1);
        expect(response.body.reprocessing.approved).toBe(1);
        expect(response.body.reprocessing.failed).toBe(0);

        // Verify transaction was created
        const transaction = await prisma.transaction.findFirst({
          where: { propertyId: testProperty.id },
        });
        expect(transaction).toBeDefined();

        // Verify pending was deleted
        const deletedPending = await prisma.pendingTransaction.findUnique({
          where: { id: pendingTx.id },
        });
        expect(deletedPending).toBeNull();
      });
    });

    describe('PUT /api/bank/rules/:id - with reprocessing', () => {
      it('should reprocess pending transactions after updating a rule', async () => {
        // Create initial rule without propertyId
        const rule = await prisma.matchingRule.create({
          data: {
            bankAccountId: testBankAccount.id,
            priority: 0,
            name: 'Incomplete Rule',
            enabled: true,
            conditions: JSON.stringify({
              operator: 'AND',
              rules: [
                {
                  field: 'description',
                  matchType: 'contains',
                  value: 'rent',
                  caseSensitive: false,
                },
              ],
            }),
            type: 'INCOME',
            category: 'Rent',
            // No propertyId
          },
        });

        // Create a pending transaction
        const bankTx = await prisma.bankTransaction.create({
          data: {
            bankAccountId: testBankAccount.id,
            externalId: 'tx_update_001',
            amount: 1000,
            currency: 'GBP',
            description: 'Monthly rent payment',
            transactionDate: new Date('2024-01-15'),
          },
        });

        const pendingTx = await prisma.pendingTransaction.create({
          data: {
            bankTransactionId: bankTx.id,
            transactionDate: bankTx.transactionDate,
            description: bankTx.description,
            type: 'Income',
            category: 'Rent',
            // No propertyId
          },
        });

        await prisma.bankTransaction.update({
          where: { id: bankTx.id },
          data: { pendingTransactionId: pendingTx.id },
        });

        // Update rule to add propertyId
        const response = await request(app)
          .put(`/api/bank/rules/${rule.id}`)
          .set('Cookie', adminCookies)
          .send({
            propertyId: testProperty.id,
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // Check reprocessing stats
        expect(response.body.reprocessing).toBeDefined();
        expect(response.body.reprocessing.processed).toBe(1);
        expect(response.body.reprocessing.approved).toBe(1);

        // Verify transaction was created
        const transaction = await prisma.transaction.findFirst({
          where: { propertyId: testProperty.id },
        });
        expect(transaction).toBeDefined();

        // Verify pending was deleted
        const deletedPending = await prisma.pendingTransaction.findUnique({
          where: { id: pendingTx.id },
        });
        expect(deletedPending).toBeNull();
      });
    });

    describe('DELETE /api/bank/rules/:id - with reprocessing', () => {
      it('should reprocess pending transactions after deleting a rule', async () => {
        // Create first rule with lower priority (propertyId only)
        const rule1 = await prisma.matchingRule.create({
          data: {
            bankAccountId: testBankAccount.id,
            priority: 0,
            name: 'Property Rule',
            enabled: true,
            conditions: JSON.stringify({
              operator: 'AND',
              rules: [
                {
                  field: 'description',
                  matchType: 'contains',
                  value: 'rent',
                  caseSensitive: false,
                },
              ],
            }),
            propertyId: testProperty.id,
          },
        });

        // Create second rule with higher priority (type and category)
        await prisma.matchingRule.create({
          data: {
            bankAccountId: testBankAccount.id,
            priority: 1,
            name: 'Type/Category Rule',
            enabled: true,
            conditions: JSON.stringify({
              operator: 'AND',
              rules: [
                {
                  field: 'description',
                  matchType: 'contains',
                  value: 'rent',
                  caseSensitive: false,
                },
              ],
            }),
            type: 'INCOME',
            category: 'Rent',
          },
        });

        // Create a pending transaction (should be fully matched by both rules)
        const bankTx = await prisma.bankTransaction.create({
          data: {
            bankAccountId: testBankAccount.id,
            externalId: 'tx_delete_001',
            amount: 1000,
            currency: 'GBP',
            description: 'Monthly rent payment',
            transactionDate: new Date('2024-01-15'),
          },
        });

        const pendingTx = await prisma.pendingTransaction.create({
          data: {
            bankTransactionId: bankTx.id,
            transactionDate: bankTx.transactionDate,
            description: bankTx.description,
            propertyId: testProperty.id,
            type: 'Income',
            category: 'Rent',
          },
        });

        await prisma.bankTransaction.update({
          where: { id: bankTx.id },
          data: { pendingTransactionId: pendingTx.id },
        });

        // Delete the first rule (should still be matched by second rule)
        const response = await request(app)
          .delete(`/api/bank/rules/${rule1.id}`)
          .set('Cookie', adminCookies);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // Check reprocessing stats
        expect(response.body.reprocessing).toBeDefined();
        expect(response.body.reprocessing.processed).toBe(1);
        // Should NOT be approved (missing propertyId after deletion)
        expect(response.body.reprocessing.approved).toBe(0);

        // Verify pending still exists but updated
        const updatedPending = await prisma.pendingTransaction.findUnique({
          where: { id: pendingTx.id },
        });
        expect(updatedPending).not.toBeNull();
        expect(updatedPending?.propertyId).toBeNull(); // propertyId removed
        expect(updatedPending?.type).toBe('Income');
        expect(updatedPending?.category).toBe('Rent');
      });
    });
  });
});
