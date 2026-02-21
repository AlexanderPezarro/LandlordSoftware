import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import prisma from '../../db/client.js';
import transactionAuditService from '../transactionAudit.service.js';

describe('TransactionAudit Service', () => {
  let testUserId: string;
  let testTransactionId: string;

  beforeAll(async () => {
    // Clean database
    await prisma.transactionAuditLog.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.property.deleteMany({});
    await prisma.user.deleteMany({});

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'audit-service-test@example.com',
        password: 'testPassword123',
        role: 'LANDLORD',
      },
    });
    testUserId = user.id;

    // Create test property
    const property = await prisma.property.create({
      data: {
        name: 'Test Property',
        street: '123 Test Street',
        city: 'London',
        county: 'Greater London',
        postcode: 'SW1A 1AA',
        propertyType: 'Flat',
        status: 'Available',
      },
    });

    // Create test transaction
    const transaction = await prisma.transaction.create({
      data: {
        propertyId: property.id,
        type: 'Income',
        category: 'Rent',
        amount: 1200,
        transactionDate: new Date('2024-01-15'),
        description: 'Monthly rent payment',
      },
    });
    testTransactionId = transaction.id;
  });

  afterAll(async () => {
    await prisma.transactionAuditLog.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.property.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean audit logs before each test
    await prisma.transactionAuditLog.deleteMany({});
  });

  describe('createAuditLogs', () => {
    it('should create audit log for single field change', async () => {
      const oldTransaction = {
        id: testTransactionId,
        category: 'Rent',
      };

      const newData = {
        category: 'Late Fee',
      };

      await transactionAuditService.createAuditLogs(
        testTransactionId,
        testUserId,
        oldTransaction,
        newData
      );

      const auditLogs = await prisma.transactionAuditLog.findMany({
        where: { transactionId: testTransactionId },
      });

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        transactionId: testTransactionId,
        userId: testUserId,
        field: 'category',
        oldValue: 'Rent',
        newValue: 'Late Fee',
      });
    });

    it('should create audit logs for multiple field changes', async () => {
      const oldTransaction = {
        id: testTransactionId,
        category: 'Rent',
        amount: 1200,
        description: 'Old description',
      };

      const newData = {
        category: 'Late Fee',
        amount: 1500,
        description: 'New description',
      };

      await transactionAuditService.createAuditLogs(
        testTransactionId,
        testUserId,
        oldTransaction,
        newData
      );

      const auditLogs = await prisma.transactionAuditLog.findMany({
        where: { transactionId: testTransactionId },
        orderBy: { field: 'asc' },
      });

      expect(auditLogs).toHaveLength(3);

      const fields = auditLogs.map(log => log.field);
      expect(fields).toEqual(['amount', 'category', 'description']);
    });

    it('should not create audit log when value does not change', async () => {
      const oldTransaction = {
        id: testTransactionId,
        category: 'Rent',
      };

      const newData = {
        category: 'Rent', // Same value
      };

      await transactionAuditService.createAuditLogs(
        testTransactionId,
        testUserId,
        oldTransaction,
        newData
      );

      const auditLogs = await prisma.transactionAuditLog.findMany({
        where: { transactionId: testTransactionId },
      });

      expect(auditLogs).toHaveLength(0);
    });

    it('should handle null to value changes', async () => {
      const oldTransaction = {
        id: testTransactionId,
        leaseId: null,
      };

      const newData = {
        leaseId: 'lease-id-123',
      };

      await transactionAuditService.createAuditLogs(
        testTransactionId,
        testUserId,
        oldTransaction,
        newData
      );

      const auditLogs = await prisma.transactionAuditLog.findMany({
        where: { transactionId: testTransactionId },
      });

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        field: 'leaseId',
        oldValue: null,
        newValue: 'lease-id-123',
      });
    });

    it('should handle value to null changes', async () => {
      const oldTransaction = {
        id: testTransactionId,
        leaseId: 'lease-id-123',
      };

      const newData = {
        leaseId: null,
      };

      await transactionAuditService.createAuditLogs(
        testTransactionId,
        testUserId,
        oldTransaction,
        newData
      );

      const auditLogs = await prisma.transactionAuditLog.findMany({
        where: { transactionId: testTransactionId },
      });

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        field: 'leaseId',
        oldValue: 'lease-id-123',
        newValue: null,
      });
    });

    it('should handle Date fields correctly', async () => {
      const oldDate = new Date('2024-01-15');
      const newDate = new Date('2024-01-20');

      const oldTransaction = {
        id: testTransactionId,
        transactionDate: oldDate,
      };

      const newData = {
        transactionDate: newDate,
      };

      await transactionAuditService.createAuditLogs(
        testTransactionId,
        testUserId,
        oldTransaction,
        newData
      );

      const auditLogs = await prisma.transactionAuditLog.findMany({
        where: { transactionId: testTransactionId },
      });

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        field: 'transactionDate',
        oldValue: oldDate.toISOString(),
        newValue: newDate.toISOString(),
      });
    });

    it('should handle numeric fields correctly', async () => {
      const oldTransaction = {
        id: testTransactionId,
        amount: 1200,
      };

      const newData = {
        amount: 1500,
      };

      await transactionAuditService.createAuditLogs(
        testTransactionId,
        testUserId,
        oldTransaction,
        newData
      );

      const auditLogs = await prisma.transactionAuditLog.findMany({
        where: { transactionId: testTransactionId },
      });

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        field: 'amount',
        oldValue: '1200',
        newValue: '1500',
      });
    });

    it('should skip fields not in newData', async () => {
      const oldTransaction = {
        id: testTransactionId,
        category: 'Rent',
        amount: 1200,
        description: 'Old description',
      };

      const newData = {
        category: 'Late Fee', // Only category is being updated
      };

      await transactionAuditService.createAuditLogs(
        testTransactionId,
        testUserId,
        oldTransaction,
        newData
      );

      const auditLogs = await prisma.transactionAuditLog.findMany({
        where: { transactionId: testTransactionId },
      });

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].field).toBe('category');
    });

    it('should only audit allowed fields', async () => {
      const oldTransaction = {
        id: testTransactionId,
        category: 'Rent',
        updatedAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
        isImported: false,
      };

      const newData = {
        category: 'Late Fee',
        // These fields should not be audited even if they change
        updatedAt: new Date('2024-01-02'),
        createdAt: new Date('2024-01-02'),
        isImported: true,
      };

      await transactionAuditService.createAuditLogs(
        testTransactionId,
        testUserId,
        oldTransaction,
        newData
      );

      const auditLogs = await prisma.transactionAuditLog.findMany({
        where: { transactionId: testTransactionId },
      });

      // Should only log category change, not updatedAt, createdAt, or isImported
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].field).toBe('category');
    });
  });

  describe('getAuditLogs', () => {
    it('should return empty array when no audit logs exist', async () => {
      const auditLogs = await transactionAuditService.getAuditLogs(testTransactionId);
      expect(auditLogs).toEqual([]);
    });

    it('should return audit logs for a transaction', async () => {
      // Create some audit logs
      await prisma.transactionAuditLog.createMany({
        data: [
          {
            transactionId: testTransactionId,
            userId: testUserId,
            field: 'category',
            oldValue: 'Rent',
            newValue: 'Late Fee',
          },
          {
            transactionId: testTransactionId,
            userId: testUserId,
            field: 'amount',
            oldValue: '1200',
            newValue: '1500',
          },
        ],
      });

      const auditLogs = await transactionAuditService.getAuditLogs(testTransactionId);

      expect(auditLogs).toHaveLength(2);
      auditLogs.forEach(log => {
        expect(log).toHaveProperty('id');
        expect(log).toHaveProperty('transactionId');
        expect(log).toHaveProperty('userId');
        expect(log).toHaveProperty('field');
        expect(log).toHaveProperty('oldValue');
        expect(log).toHaveProperty('newValue');
        expect(log).toHaveProperty('changedAt');
      });
    });

    it('should return audit logs ordered by changedAt DESC', async () => {
      // Create first audit log
      const firstLog = await prisma.transactionAuditLog.create({
        data: {
          transactionId: testTransactionId,
          userId: testUserId,
          field: 'category',
          oldValue: 'Rent',
          newValue: 'Late Fee',
        },
      });

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      // Create second audit log
      const secondLog = await prisma.transactionAuditLog.create({
        data: {
          transactionId: testTransactionId,
          userId: testUserId,
          field: 'amount',
          oldValue: '1200',
          newValue: '1500',
        },
      });

      const auditLogs = await transactionAuditService.getAuditLogs(testTransactionId);

      expect(auditLogs).toHaveLength(2);
      // Most recent should be first
      expect(auditLogs[0].id).toBe(secondLog.id);
      expect(auditLogs[1].id).toBe(firstLog.id);
    });

    it('should only return logs for the specified transaction', async () => {
      // Create another transaction
      const property = await prisma.property.findFirst();
      const anotherTransaction = await prisma.transaction.create({
        data: {
          propertyId: property!.id,
          type: 'Expense',
          category: 'Maintenance',
          amount: 500,
          transactionDate: new Date('2024-01-20'),
          description: 'Plumbing repair',
        },
      });

      // Create audit logs for both transactions
      await prisma.transactionAuditLog.createMany({
        data: [
          {
            transactionId: testTransactionId,
            userId: testUserId,
            field: 'category',
            oldValue: 'Rent',
            newValue: 'Late Fee',
          },
          {
            transactionId: anotherTransaction.id,
            userId: testUserId,
            field: 'amount',
            oldValue: '500',
            newValue: '600',
          },
        ],
      });

      const auditLogs = await transactionAuditService.getAuditLogs(testTransactionId);

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].transactionId).toBe(testTransactionId);
    });
  });
});
