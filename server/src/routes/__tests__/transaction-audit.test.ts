import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../app.js';
import prisma from '../../db/client.js';
import authService from '../../services/auth.service.js';

const app = createApp();

describe('Transaction Audit Log', () => {
  // Test user credentials
  const testUser = {
    email: 'audit-test@example.com',
    password: 'testPassword123',
  };

  let authCookies: string[];
  let userId: string;
  let testProperty: any;
  let testTransaction: any;

  beforeAll(async () => {
    // Clean database
    await prisma.transactionAuditLog.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.lease.deleteMany({});
    await prisma.tenant.deleteMany({});
    await prisma.property.deleteMany({});
    await prisma.user.deleteMany({ where: { email: testUser.email } });

    // Create test user and login
    await authService.createUser(testUser.email, testUser.password);

    // Get userId
    const user = await prisma.user.findUnique({
      where: { email: testUser.email },
    });
    userId = user!.id;

    const loginResponse = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    authCookies = [loginResponse.headers['set-cookie']];

    // Create test property
    testProperty = await prisma.property.create({
      data: {
        name: 'Audit Test Property',
        street: '123 Audit Street',
        city: 'London',
        county: 'Greater London',
        postcode: 'SW1A 1AA',
        propertyType: 'Flat',
        status: 'Available',
      },
    });
  });

  afterAll(async () => {
    // Clean up after all tests
    await prisma.transactionAuditLog.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.lease.deleteMany({});
    await prisma.tenant.deleteMany({});
    await prisma.property.deleteMany({});
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean audit logs and transactions before each test
    await prisma.transactionAuditLog.deleteMany({});
    await prisma.transaction.deleteMany({});

    // Create a fresh test transaction for each test
    testTransaction = await prisma.transaction.create({
      data: {
        propertyId: testProperty.id,
        type: 'Income',
        category: 'Rent',
        amount: 1200,
        transactionDate: new Date('2024-01-15'),
        description: 'Monthly rent payment',
      },
    });
  });

  describe('PUT /api/transactions/:id - Audit Log Creation', () => {
    it('should create audit log when updating category', async () => {
      const response = await request(app)
        .put(`/api/transactions/${testTransaction.id}`)
        .set('Cookie', authCookies)
        .send({ category: 'Late Fee' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Check audit log was created
      const auditLogs = await prisma.transactionAuditLog.findMany({
        where: { transactionId: testTransaction.id },
      });

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        transactionId: testTransaction.id,
        userId: userId,
        field: 'category',
        oldValue: 'Rent',
        newValue: 'Late Fee',
      });
      expect(auditLogs[0].changedAt).toBeDefined();
    });

    it('should create audit log when updating type and category together', async () => {
      const response = await request(app)
        .put(`/api/transactions/${testTransaction.id}`)
        .set('Cookie', authCookies)
        .send({
          type: 'Expense',
          category: 'Maintenance',
        });

      expect(response.status).toBe(200);

      // Check audit logs were created
      const auditLogs = await prisma.transactionAuditLog.findMany({
        where: { transactionId: testTransaction.id },
        orderBy: { field: 'asc' },
      });

      expect(auditLogs).toHaveLength(2);

      // Check category audit log
      const categoryLog = auditLogs.find(log => log.field === 'category');
      expect(categoryLog).toMatchObject({
        field: 'category',
        oldValue: 'Rent',
        newValue: 'Maintenance',
        userId: userId,
      });

      // Check type audit log
      const typeLog = auditLogs.find(log => log.field === 'type');
      expect(typeLog).toMatchObject({
        field: 'type',
        oldValue: 'Income',
        newValue: 'Expense',
        userId: userId,
      });
    });

    it('should create audit log when updating amount', async () => {
      const response = await request(app)
        .put(`/api/transactions/${testTransaction.id}`)
        .set('Cookie', authCookies)
        .send({ amount: 1500 });

      expect(response.status).toBe(200);

      const auditLogs = await prisma.transactionAuditLog.findMany({
        where: { transactionId: testTransaction.id },
      });

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        field: 'amount',
        oldValue: '1200',
        newValue: '1500',
        userId: userId,
      });
    });

    it('should create audit log when updating description', async () => {
      const response = await request(app)
        .put(`/api/transactions/${testTransaction.id}`)
        .set('Cookie', authCookies)
        .send({ description: 'Updated rent payment' });

      expect(response.status).toBe(200);

      const auditLogs = await prisma.transactionAuditLog.findMany({
        where: { transactionId: testTransaction.id },
      });

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        field: 'description',
        oldValue: 'Monthly rent payment',
        newValue: 'Updated rent payment',
        userId: userId,
      });
    });

    it('should create audit log when updating transactionDate', async () => {
      const newDate = new Date('2024-01-20');
      const response = await request(app)
        .put(`/api/transactions/${testTransaction.id}`)
        .set('Cookie', authCookies)
        .send({ transactionDate: newDate });

      expect(response.status).toBe(200);

      const auditLogs = await prisma.transactionAuditLog.findMany({
        where: { transactionId: testTransaction.id },
      });

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        field: 'transactionDate',
        oldValue: new Date('2024-01-15').toISOString(),
        newValue: newDate.toISOString(),
        userId: userId,
      });
    });

    it('should create audit log when updating propertyId', async () => {
      // Create another property
      const anotherProperty = await prisma.property.create({
        data: {
          name: 'Another Property',
          street: '456 Test Street',
          city: 'London',
          county: 'Greater London',
          postcode: 'SW1A 2BB',
          propertyType: 'House',
          status: 'Available',
        },
      });

      const response = await request(app)
        .put(`/api/transactions/${testTransaction.id}`)
        .set('Cookie', authCookies)
        .send({ propertyId: anotherProperty.id });

      expect(response.status).toBe(200);

      const auditLogs = await prisma.transactionAuditLog.findMany({
        where: { transactionId: testTransaction.id },
      });

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        field: 'propertyId',
        oldValue: testProperty.id,
        newValue: anotherProperty.id,
        userId: userId,
      });
    });

    it('should create audit log when updating leaseId from null to a value', async () => {
      // Create a lease
      const tenant = await prisma.tenant.create({
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          phone: '07700900456',
          status: 'Active',
        },
      });

      const lease = await prisma.lease.create({
        data: {
          propertyId: testProperty.id,
          tenantId: tenant.id,
          startDate: new Date('2024-01-01'),
          monthlyRent: 1200,
          securityDepositAmount: 1200,
          status: 'Active',
        },
      });

      const response = await request(app)
        .put(`/api/transactions/${testTransaction.id}`)
        .set('Cookie', authCookies)
        .send({ leaseId: lease.id });

      expect(response.status).toBe(200);

      const auditLogs = await prisma.transactionAuditLog.findMany({
        where: { transactionId: testTransaction.id },
      });

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        field: 'leaseId',
        oldValue: null,
        newValue: lease.id,
        userId: userId,
      });
    });

    it('should create audit log when updating leaseId from a value to null', async () => {
      // Create a transaction with a lease
      const tenant = await prisma.tenant.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '07700900123',
          status: 'Active',
        },
      });

      const lease = await prisma.lease.create({
        data: {
          propertyId: testProperty.id,
          tenantId: tenant.id,
          startDate: new Date('2024-01-01'),
          monthlyRent: 1200,
          securityDepositAmount: 1200,
          status: 'Active',
        },
      });

      const transactionWithLease = await prisma.transaction.create({
        data: {
          propertyId: testProperty.id,
          leaseId: lease.id,
          type: 'Income',
          category: 'Rent',
          amount: 1200,
          transactionDate: new Date('2024-01-15'),
          description: 'Monthly rent payment',
        },
      });

      const response = await request(app)
        .put(`/api/transactions/${transactionWithLease.id}`)
        .set('Cookie', authCookies)
        .send({ leaseId: null });

      expect(response.status).toBe(200);

      const auditLogs = await prisma.transactionAuditLog.findMany({
        where: { transactionId: transactionWithLease.id },
      });

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        field: 'leaseId',
        oldValue: lease.id,
        newValue: null,
        userId: userId,
      });
    });

    it('should create multiple audit logs for multiple field changes', async () => {
      const response = await request(app)
        .put(`/api/transactions/${testTransaction.id}`)
        .set('Cookie', authCookies)
        .send({
          amount: 1500,
          description: 'Updated description',
          category: 'Late Fee',
        });

      expect(response.status).toBe(200);

      const auditLogs = await prisma.transactionAuditLog.findMany({
        where: { transactionId: testTransaction.id },
        orderBy: { field: 'asc' },
      });

      expect(auditLogs).toHaveLength(3);

      const fields = auditLogs.map(log => log.field).sort();
      expect(fields).toEqual(['amount', 'category', 'description']);
    });

    it('should not create audit logs when no fields change', async () => {
      const response = await request(app)
        .put(`/api/transactions/${testTransaction.id}`)
        .set('Cookie', authCookies)
        .send({
          category: 'Rent', // Same as current value
        });

      expect(response.status).toBe(200);

      const auditLogs = await prisma.transactionAuditLog.findMany({
        where: { transactionId: testTransaction.id },
      });

      expect(auditLogs).toHaveLength(0);
    });

    it('should not create audit logs for non-audited fields', async () => {
      // The updatedAt field should be automatically updated by Prisma but not audited
      const response = await request(app)
        .put(`/api/transactions/${testTransaction.id}`)
        .set('Cookie', authCookies)
        .send({
          category: 'Late Fee',
        });

      expect(response.status).toBe(200);

      const auditLogs = await prisma.transactionAuditLog.findMany({
        where: { transactionId: testTransaction.id },
      });

      // Should only have 1 log for category, not for updatedAt
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].field).toBe('category');
    });
  });

  describe('GET /api/transactions/:id/audit-log', () => {
    it('should return empty array when no audit logs exist', async () => {
      const response = await request(app)
        .get(`/api/transactions/${testTransaction.id}/audit-log`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.auditLogs).toEqual([]);
    });

    it('should return audit logs for a transaction', async () => {
      // Create some audit logs manually for testing
      await prisma.transactionAuditLog.createMany({
        data: [
          {
            transactionId: testTransaction.id,
            userId: userId,
            field: 'category',
            oldValue: 'Rent',
            newValue: 'Late Fee',
          },
          {
            transactionId: testTransaction.id,
            userId: userId,
            field: 'amount',
            oldValue: '1200',
            newValue: '1500',
          },
        ],
      });

      const response = await request(app)
        .get(`/api/transactions/${testTransaction.id}/audit-log`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.auditLogs).toHaveLength(2);

      // Verify the structure of returned audit logs
      response.body.auditLogs.forEach((log: any) => {
        expect(log).toHaveProperty('id');
        expect(log).toHaveProperty('transactionId');
        expect(log).toHaveProperty('userId');
        expect(log).toHaveProperty('field');
        expect(log).toHaveProperty('oldValue');
        expect(log).toHaveProperty('newValue');
        expect(log).toHaveProperty('changedAt');
      });
    });

    it('should return audit logs ordered by changedAt DESC (newest first)', async () => {
      // Create audit logs with different timestamps
      const firstLog = await prisma.transactionAuditLog.create({
        data: {
          transactionId: testTransaction.id,
          userId: userId,
          field: 'category',
          oldValue: 'Rent',
          newValue: 'Late Fee',
        },
      });

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      const secondLog = await prisma.transactionAuditLog.create({
        data: {
          transactionId: testTransaction.id,
          userId: userId,
          field: 'amount',
          oldValue: '1200',
          newValue: '1500',
        },
      });

      const response = await request(app)
        .get(`/api/transactions/${testTransaction.id}/audit-log`);

      expect(response.status).toBe(200);
      expect(response.body.auditLogs).toHaveLength(2);

      // First item should be the most recent (secondLog)
      expect(response.body.auditLogs[0].id).toBe(secondLog.id);
      expect(response.body.auditLogs[1].id).toBe(firstLog.id);
    });

    it('should return 400 for invalid transaction ID format', async () => {
      const response = await request(app)
        .get('/api/transactions/invalid-id/audit-log');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid transaction ID format');
    });

    it('should return empty array for non-existent transaction', async () => {
      // Using a valid UUID that doesn't exist
      const response = await request(app)
        .get('/api/transactions/00000000-0000-0000-0000-000000000000/audit-log');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.auditLogs).toEqual([]);
    });

    it('should preserve audit logs even after transaction is deleted', async () => {
      // Create audit logs
      await prisma.transactionAuditLog.create({
        data: {
          transactionId: testTransaction.id,
          userId: userId,
          field: 'category',
          oldValue: 'Rent',
          newValue: 'Late Fee',
        },
      });

      const transactionId = testTransaction.id;

      // Delete the transaction
      await prisma.transaction.delete({
        where: { id: transactionId },
      });

      // Audit logs should still exist
      const response = await request(app)
        .get(`/api/transactions/${transactionId}/audit-log`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.auditLogs).toHaveLength(1);
      expect(response.body.auditLogs[0]).toMatchObject({
        transactionId: transactionId,
        field: 'category',
        oldValue: 'Rent',
        newValue: 'Late Fee',
      });
    });
  });
});
