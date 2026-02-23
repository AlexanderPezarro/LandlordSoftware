import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../app.js';
import prisma from '../../db/client.js';
import authService from '../../services/auth.service.js';

const app = createApp();

describe('Report API', () => {
  let authCookies: string[];
  let userAId: string;
  let userBId: string;
  let nonOwnerId: string;
  let propertyId: string;

  beforeAll(async () => {
    // Clean database
    await prisma.settlement.deleteMany({});
    await prisma.transactionSplit.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.propertyOwnership.deleteMany({});
    await prisma.property.deleteMany({});
    await prisma.user.deleteMany({});

    // Create test admin user and login
    await authService.createUser('admin@test.com', 'testPassword123', 'ADMIN');

    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'admin@test.com',
      password: 'testPassword123',
    });

    authCookies = [loginResponse.headers['set-cookie']];

    // Create users and property with ownerships
    const userA = await prisma.user.create({
      data: {
        email: 'usera@test.com',
        password: 'password',
        role: 'LANDLORD',
      },
    });
    userAId = userA.id;

    const userB = await prisma.user.create({
      data: {
        email: 'userb@test.com',
        password: 'password',
        role: 'LANDLORD',
      },
    });
    userBId = userB.id;

    const nonOwner = await prisma.user.create({
      data: {
        email: 'nonowner@test.com',
        password: 'password',
        role: 'VIEWER',
      },
    });
    nonOwnerId = nonOwner.id;

    const property = await prisma.property.create({
      data: {
        name: 'Test Property',
        street: '123 Test St',
        city: 'Test City',
        county: 'Test County',
        postcode: 'TS1 1ST',
        propertyType: 'HOUSE',
        status: 'OCCUPIED',
      },
    });
    propertyId = property.id;

    // Create ownerships (60/40 split)
    await prisma.propertyOwnership.createMany({
      data: [
        { userId: userAId, propertyId, ownershipPercentage: 60 },
        { userId: userBId, propertyId, ownershipPercentage: 40 },
      ],
    });
  });

  afterAll(async () => {
    await prisma.settlement.deleteMany({});
    await prisma.transactionSplit.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.propertyOwnership.deleteMany({});
    await prisma.property.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean transactions and settlements before each test
    await prisma.settlement.deleteMany({});
    await prisma.transactionSplit.deleteMany({});
    await prisma.transaction.deleteMany({});
  });

  describe('GET /api/reports/profit-loss/properties/:propertyId', () => {
    it('should require authentication', async () => {
      const response = await request(app).get(
        `/api/reports/profit-loss/properties/${propertyId}?startDate=2024-01-01&endDate=2024-12-31`
      );

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should generate P&L report for property owner', async () => {
      // Create income transactions
      const rentTransaction = await prisma.transaction.create({
        data: {
          propertyId,
          type: 'INCOME',
          category: 'RENT',
          amount: 1000,
          transactionDate: new Date('2024-06-01'),
          description: 'Monthly rent',
          paidByUserId: null,
        },
      });

      await prisma.transactionSplit.createMany({
        data: [
          { transactionId: rentTransaction.id, userId: userAId, percentage: 60, amount: 600 },
          { transactionId: rentTransaction.id, userId: userBId, percentage: 40, amount: 400 },
        ],
      });

      // Create expense transactions
      const repairTransaction = await prisma.transaction.create({
        data: {
          propertyId,
          type: 'EXPENSE',
          category: 'REPAIRS',
          amount: 500,
          transactionDate: new Date('2024-06-15'),
          description: 'Plumbing repair',
          paidByUserId: userAId,
        },
      });

      await prisma.transactionSplit.createMany({
        data: [
          { transactionId: repairTransaction.id, userId: userAId, percentage: 60, amount: 300 },
          { transactionId: repairTransaction.id, userId: userBId, percentage: 40, amount: 200 },
        ],
      });

      const response = await request(app)
        .get(`/api/reports/profit-loss/properties/${propertyId}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          userId: userAId,
        })
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();

      const report = response.body.report;

      // Check property details
      expect(report.property.id).toBe(propertyId);
      expect(report.property.name).toBe('Test Property');
      expect(report.property.address).toBe('123 Test St, Test City');

      // Check owner details
      expect(report.owner.id).toBe(userAId);
      expect(report.owner.email).toBe('usera@test.com');
      expect(report.owner.ownershipPercentage).toBe(60);

      // Check income
      expect(report.income.totalOwnerShare).toBe(600);
      expect(report.income.totalOverall).toBe(1000);
      expect(report.income.byCategory.RENT).toEqual({ ownerShare: 600, total: 1000 });

      // Check expenses
      expect(report.expenses.totalOwnerShare).toBe(300);
      expect(report.expenses.totalOverall).toBe(500);
      expect(report.expenses.byCategory.REPAIRS).toEqual({ ownerShare: 300, total: 500 });

      // Check net profit
      expect(report.netProfit).toBe(300); // 600 - 300

      // Check balances
      expect(Array.isArray(report.balances)).toBe(true);
    });

    it('should handle multiple transactions in same category', async () => {
      // Create multiple rent transactions
      const rent1 = await prisma.transaction.create({
        data: {
          propertyId,
          type: 'INCOME',
          category: 'RENT',
          amount: 1000,
          transactionDate: new Date('2024-01-01'),
          description: 'January rent',
          paidByUserId: null,
        },
      });

      await prisma.transactionSplit.createMany({
        data: [
          { transactionId: rent1.id, userId: userAId, percentage: 60, amount: 600 },
          { transactionId: rent1.id, userId: userBId, percentage: 40, amount: 400 },
        ],
      });

      const rent2 = await prisma.transaction.create({
        data: {
          propertyId,
          type: 'INCOME',
          category: 'RENT',
          amount: 1000,
          transactionDate: new Date('2024-02-01'),
          description: 'February rent',
          paidByUserId: null,
        },
      });

      await prisma.transactionSplit.createMany({
        data: [
          { transactionId: rent2.id, userId: userAId, percentage: 60, amount: 600 },
          { transactionId: rent2.id, userId: userBId, percentage: 40, amount: 400 },
        ],
      });

      const response = await request(app)
        .get(`/api/reports/profit-loss/properties/${propertyId}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          userId: userAId,
        })
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.report.income.totalOwnerShare).toBe(1200); // 600 + 600
      expect(response.body.report.income.totalOverall).toBe(2000); // 1000 + 1000
      expect(response.body.report.income.byCategory.RENT).toEqual({ ownerShare: 1200, total: 2000 });
    });

    it('should filter transactions by date range', async () => {
      // Create transaction outside date range
      const outsideRangeTransaction = await prisma.transaction.create({
        data: {
          propertyId,
          type: 'INCOME',
          category: 'RENT',
          amount: 1000,
          transactionDate: new Date('2023-12-01'),
          description: 'December rent',
          paidByUserId: null,
        },
      });

      await prisma.transactionSplit.createMany({
        data: [
          { transactionId: outsideRangeTransaction.id, userId: userAId, percentage: 60, amount: 600 },
          { transactionId: outsideRangeTransaction.id, userId: userBId, percentage: 40, amount: 400 },
        ],
      });

      // Create transaction inside date range
      const insideRangeTransaction = await prisma.transaction.create({
        data: {
          propertyId,
          type: 'INCOME',
          category: 'RENT',
          amount: 1000,
          transactionDate: new Date('2024-01-15'),
          description: 'January rent',
          paidByUserId: null,
        },
      });

      await prisma.transactionSplit.createMany({
        data: [
          { transactionId: insideRangeTransaction.id, userId: userAId, percentage: 60, amount: 600 },
          { transactionId: insideRangeTransaction.id, userId: userBId, percentage: 40, amount: 400 },
        ],
      });

      const response = await request(app)
        .get(`/api/reports/profit-loss/properties/${propertyId}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          userId: userAId,
        })
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.report.income.totalOwnerShare).toBe(600); // Only the one from 2024
    });

    it('should only include transactions with splits for the specified user', async () => {
      // Create transaction that only user B has a split in
      const userBOnlyTransaction = await prisma.transaction.create({
        data: {
          propertyId,
          type: 'INCOME',
          category: 'OTHER',
          amount: 500,
          transactionDate: new Date('2024-06-01'),
          description: 'User B only income',
          paidByUserId: null,
        },
      });

      await prisma.transactionSplit.create({
        data: {
          transactionId: userBOnlyTransaction.id,
          userId: userBId,
          percentage: 100,
          amount: 500,
        },
      });

      const response = await request(app)
        .get(`/api/reports/profit-loss/properties/${propertyId}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          userId: userAId,
        })
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      // User A should not see this transaction in their report
      expect(response.body.report.income.byCategory.OTHER).toBeUndefined();
      expect(response.body.report.income.totalOwnerShare).toBe(0);
    });

    it('should return error if user is not a property owner', async () => {
      const response = await request(app)
        .get(`/api/reports/profit-loss/properties/${propertyId}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          userId: nonOwnerId,
        })
        .set('Cookie', authCookies);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User is not an owner of this property');
    });

    it('should return error if property does not exist', async () => {
      const nonExistentPropertyId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/reports/profit-loss/properties/${nonExistentPropertyId}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          userId: userAId,
        })
        .set('Cookie', authCookies);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Property not found');
    });

    it('should include current balances with other owners', async () => {
      // Create a transaction where A pays, B owes
      const transaction = await prisma.transaction.create({
        data: {
          propertyId,
          type: 'EXPENSE',
          category: 'REPAIRS',
          amount: 1000,
          transactionDate: new Date('2024-06-01'),
          description: 'Repair work',
          paidByUserId: userAId,
        },
      });

      await prisma.transactionSplit.createMany({
        data: [
          { transactionId: transaction.id, userId: userAId, percentage: 60, amount: 600 },
          { transactionId: transaction.id, userId: userBId, percentage: 40, amount: 400 },
        ],
      });

      const response = await request(app)
        .get(`/api/reports/profit-loss/properties/${propertyId}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          userId: userAId,
        })
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.report.balances).toBeDefined();
      expect(Array.isArray(response.body.report.balances)).toBe(true);

      // User A should show that User B owes them
      if (response.body.report.balances.length > 0) {
        const balance = response.body.report.balances[0];
        expect(balance.userId).toBe(userBId);
        expect(balance.email).toBe('userb@test.com');
        expect(balance.amount).toBe(400); // B owes A £400
      }
    });

    it('should handle empty date range with no transactions', async () => {
      const response = await request(app)
        .get(`/api/reports/profit-loss/properties/${propertyId}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          userId: userAId,
        })
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.report.income.totalOwnerShare).toBe(0);
      expect(response.body.report.expenses.totalOwnerShare).toBe(0);
      expect(response.body.report.netProfit).toBe(0);
      expect(response.body.report.income.byCategory).toEqual({});
      expect(response.body.report.expenses.byCategory).toEqual({});
    });
  });

  describe('GET /api/reports/profit-loss/users/:userId', () => {
    it('should require authentication', async () => {
      const response = await request(app).get(
        `/api/reports/profit-loss/users/${userAId}?startDate=2024-01-01&endDate=2024-12-31`
      );

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should generate aggregated P&L report across all properties', async () => {
      // Create a second property for this test
      const property2 = await prisma.property.create({
        data: {
          name: 'Test Property 2',
          street: '456 Test Ave',
          city: 'Test City',
          county: 'Test County',
          postcode: 'TS2 2TS',
          propertyType: 'FLAT',
          status: 'OCCUPIED',
        },
      });
      const property2Id = property2.id;

      // Create ownership for user A only (100%)
      await prisma.propertyOwnership.create({
        data: { userId: userAId, propertyId: property2Id, ownershipPercentage: 100 },
      });

      // Property 1 transactions
      const prop1Income = await prisma.transaction.create({
        data: {
          propertyId,
          type: 'INCOME',
          category: 'RENT',
          amount: 1000,
          transactionDate: new Date('2024-06-01'),
          description: 'Property 1 rent',
          paidByUserId: null,
        },
      });

      await prisma.transactionSplit.createMany({
        data: [
          { transactionId: prop1Income.id, userId: userAId, percentage: 60, amount: 600 },
          { transactionId: prop1Income.id, userId: userBId, percentage: 40, amount: 400 },
        ],
      });

      const prop1Expense = await prisma.transaction.create({
        data: {
          propertyId,
          type: 'EXPENSE',
          category: 'REPAIRS',
          amount: 200,
          transactionDate: new Date('2024-06-15'),
          description: 'Property 1 repair',
          paidByUserId: userAId,
        },
      });

      await prisma.transactionSplit.createMany({
        data: [
          { transactionId: prop1Expense.id, userId: userAId, percentage: 60, amount: 120 },
          { transactionId: prop1Expense.id, userId: userBId, percentage: 40, amount: 80 },
        ],
      });

      // Property 2 transactions
      const prop2Income = await prisma.transaction.create({
        data: {
          propertyId: property2Id,
          type: 'INCOME',
          category: 'RENT',
          amount: 800,
          transactionDate: new Date('2024-06-01'),
          description: 'Property 2 rent',
          paidByUserId: null,
        },
      });

      await prisma.transactionSplit.create({
        data: {
          transactionId: prop2Income.id,
          userId: userAId,
          percentage: 100,
          amount: 800,
        },
      });

      const response = await request(app)
        .get(`/api/reports/profit-loss/users/${userAId}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        })
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();

      const report = response.body.report;

      // Check summary
      expect(report.summary.totalIncome).toBe(1400); // 600 + 800
      expect(report.summary.totalExpenses).toBe(120); // 120
      expect(report.summary.netProfit).toBe(1280); // 1400 - 120

      // Check properties array
      expect(Array.isArray(report.properties)).toBe(true);
      expect(report.properties.length).toBe(2);

      // Check individual property reports are included
      const prop1Report = report.properties.find((p: any) => p.property.id === propertyId);
      const prop2Report = report.properties.find((p: any) => p.property.id === property2Id);

      expect(prop1Report).toBeDefined();
      expect(prop1Report.income.totalOwnerShare).toBe(600);
      expect(prop1Report.expenses.totalOwnerShare).toBe(120);
      expect(prop1Report.netProfit).toBe(480);

      expect(prop2Report).toBeDefined();
      expect(prop2Report.income.totalOwnerShare).toBe(800);
      expect(prop2Report.expenses.totalOwnerShare).toBe(0);
      expect(prop2Report.netProfit).toBe(800);
    });

    it('should return error if user has no properties', async () => {
      const response = await request(app)
        .get(`/api/reports/profit-loss/users/${nonOwnerId}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        })
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.report.properties.length).toBe(0);
      expect(response.body.report.summary.totalIncome).toBe(0);
      expect(response.body.report.summary.totalExpenses).toBe(0);
      expect(response.body.report.summary.netProfit).toBe(0);
    });
  });
});
