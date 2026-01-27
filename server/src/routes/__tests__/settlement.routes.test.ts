import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../app.js';
import prisma from '../../db/client.js';
import authService from '../../services/auth.service.js';

const app = createApp();

describe('Settlement API', () => {
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
    // Clean settlements and transactions before each test
    await prisma.settlement.deleteMany({});
    await prisma.transactionSplit.deleteMany({});
    await prisma.transaction.deleteMany({});
  });

  describe('POST /api/settlements', () => {
    it('should require authentication', async () => {
      const response = await request(app).post('/api/settlements').send({
        fromUserId: userBId,
        toUserId: userAId,
        propertyId,
        amount: 100,
        settlementDate: new Date().toISOString(),
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should record a settlement', async () => {
      const response = await request(app)
        .post('/api/settlements')
        .set('Cookie', authCookies)
        .send({
          fromUserId: userBId,
          toUserId: userAId,
          propertyId,
          amount: 100,
          settlementDate: new Date().toISOString(),
          notes: 'Test settlement',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.settlement.amount).toBe(100);
      expect(response.body.settlement.fromUser.id).toBe(userBId);
      expect(response.body.settlement.toUser.id).toBe(userAId);
      expect(response.body.settlement.notes).toBe('Test settlement');
    });

    it('should reject settlement between non-owners', async () => {
      const response = await request(app)
        .post('/api/settlements')
        .set('Cookie', authCookies)
        .send({
          fromUserId: nonOwnerId,
          toUserId: userAId,
          propertyId,
          amount: 100,
          settlementDate: new Date().toISOString(),
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Both users must be property owners');
    });

    it('should warn when settling more than owed', async () => {
      // Create a transaction where A pays £100, B owes £40
      const transaction = await prisma.transaction.create({
        data: {
          propertyId,
          type: 'EXPENSE',
          category: 'REPAIRS',
          amount: 100,
          transactionDate: new Date(),
          description: 'Repair work',
          paidByUserId: userAId,
        },
      });

      await prisma.transactionSplit.createMany({
        data: [
          { transactionId: transaction.id, userId: userAId, percentage: 60, amount: 60 },
          { transactionId: transaction.id, userId: userBId, percentage: 40, amount: 40 },
        ],
      });

      // Try to settle £100 when only £40 is owed
      const response = await request(app)
        .post('/api/settlements')
        .set('Cookie', authCookies)
        .send({
          fromUserId: userBId,
          toUserId: userAId,
          propertyId,
          amount: 100,
          settlementDate: new Date().toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.warning).toBeDefined();
      expect(response.body.warning).toContain('Settling £100');
      expect(response.body.warning).toContain('£40');
    });

    it('should reject settlement with same fromUser and toUser', async () => {
      const response = await request(app)
        .post('/api/settlements')
        .set('Cookie', authCookies)
        .send({
          fromUserId: userAId,
          toUserId: userAId,
          propertyId,
          amount: 100,
          settlementDate: new Date().toISOString(),
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cannot settle with yourself');
    });

    it('should reject negative amount', async () => {
      const response = await request(app)
        .post('/api/settlements')
        .set('Cookie', authCookies)
        .send({
          fromUserId: userBId,
          toUserId: userAId,
          propertyId,
          amount: -50,
          settlementDate: new Date().toISOString(),
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/properties/:id/balances', () => {
    it('should require authentication', async () => {
      const response = await request(app).get(`/api/properties/${propertyId}/balances`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should get property balances', async () => {
      // Create a transaction where A pays £1000, B owes £400
      const transaction = await prisma.transaction.create({
        data: {
          propertyId,
          type: 'EXPENSE',
          category: 'REPAIRS',
          amount: 1000,
          transactionDate: new Date(),
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
        .get(`/api/properties/${propertyId}/balances`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.balances)).toBe(true);
      expect(response.body.balances.length).toBe(1);
      expect(response.body.balances[0].userA).toBe(userAId);
      expect(response.body.balances[0].userB).toBe(userBId);
      expect(response.body.balances[0].amount).toBe(400);
      expect(response.body.balances[0].userADetails).toBeDefined();
      expect(response.body.balances[0].userBDetails).toBeDefined();
    });

    it('should return empty array when no balances exist', async () => {
      const response = await request(app)
        .get(`/api/properties/${propertyId}/balances`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.balances).toEqual([]);
    });

    it('should reflect settlements in balances', async () => {
      // Create a transaction where A pays £1000, B owes £400
      const transaction = await prisma.transaction.create({
        data: {
          propertyId,
          type: 'EXPENSE',
          category: 'REPAIRS',
          amount: 1000,
          transactionDate: new Date(),
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

      // Record a settlement of £200
      await prisma.settlement.create({
        data: {
          fromUserId: userBId,
          toUserId: userAId,
          propertyId,
          amount: 200,
          settlementDate: new Date(),
        },
      });

      const response = await request(app)
        .get(`/api/properties/${propertyId}/balances`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.balances.length).toBe(1);
      expect(response.body.balances[0].amount).toBe(200); // £400 - £200 settlement
    });
  });

  describe('GET /api/properties/:id/settlements', () => {
    it('should require authentication', async () => {
      const response = await request(app).get(`/api/properties/${propertyId}/settlements`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should get settlements for a property', async () => {
      // Create some settlements
      await prisma.settlement.createMany({
        data: [
          {
            fromUserId: userBId,
            toUserId: userAId,
            propertyId,
            amount: 100,
            settlementDate: new Date('2024-01-01'),
          },
          {
            fromUserId: userBId,
            toUserId: userAId,
            propertyId,
            amount: 50,
            settlementDate: new Date('2024-01-15'),
          },
        ],
      });

      const response = await request(app)
        .get(`/api/properties/${propertyId}/settlements`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.settlements)).toBe(true);
      expect(response.body.settlements.length).toBe(2);
      // Should be ordered by date descending
      expect(response.body.settlements[0].amount).toBe(50);
      expect(response.body.settlements[1].amount).toBe(100);
      expect(response.body.settlements[0].fromUser).toBeDefined();
      expect(response.body.settlements[0].toUser).toBeDefined();
    });

    it('should return empty array when no settlements exist', async () => {
      const response = await request(app)
        .get(`/api/properties/${propertyId}/settlements`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.settlements).toEqual([]);
    });
  });

  describe('GET /api/users/:userId/balances', () => {
    it('should require authentication', async () => {
      const response = await request(app).get(`/api/users/${userAId}/balances`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should get user balances across all properties', async () => {
      // Create a transaction where A pays £1000, B owes £400
      const transaction = await prisma.transaction.create({
        data: {
          propertyId,
          type: 'EXPENSE',
          category: 'REPAIRS',
          amount: 1000,
          transactionDate: new Date(),
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
        .get(`/api/users/${userAId}/balances`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.balances)).toBe(true);
      expect(response.body.balances.length).toBe(1);
      expect(response.body.balances[0].property).toBeDefined();
      expect(response.body.balances[0].property.id).toBe(propertyId);
      expect(response.body.balances[0].balances).toBeDefined();
      expect(response.body.balances[0].balances.length).toBe(1);
    });

    it('should return empty array when user has no balances', async () => {
      const response = await request(app)
        .get(`/api/users/${userAId}/balances`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.balances).toEqual([]);
    });
  });
});
