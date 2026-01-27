import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../app.js';
import prisma from '../../db/client.js';
import authService from '../../services/auth.service.js';

const app = createApp();

describe('Transactions Routes', () => {
  // Test user credentials
  const testUser = {
    email: 'test@example.com',
    password: 'testPassword123',
  };

  let authCookies: string[];
  let testProperty: any;
  let forSaleProperty: any;
  let testLease: any;

  // Valid transaction data
  const validIncomeTransaction = {
    propertyId: '', // Will be set in beforeAll
    leaseId: null,
    type: 'Income',
    category: 'Rent',
    amount: 1200,
    transactionDate: new Date('2024-01-15'),
    description: 'Monthly rent payment',
  };

  const validExpenseTransaction = {
    propertyId: '', // Will be set in beforeAll
    leaseId: null,
    type: 'Expense',
    category: 'Maintenance',
    amount: 350,
    transactionDate: new Date('2024-01-20'),
    description: 'Plumbing repair',
  };

  beforeAll(async () => {
    // Clean database
    await prisma.transaction.deleteMany({});
    await prisma.lease.deleteMany({});
    await prisma.tenant.deleteMany({});
    await prisma.property.deleteMany({});
    await prisma.user.deleteMany({});

    // Create test user and login
    await authService.createUser(testUser.email, testUser.password);

    const loginResponse = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    authCookies = [loginResponse.headers['set-cookie']];

    // Create test property
    testProperty = await prisma.property.create({
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

    // Create property with For Sale status
    forSaleProperty = await prisma.property.create({
      data: {
        name: 'For Sale Property',
        street: '456 Test Street',
        city: 'London',
        county: 'Greater London',
        postcode: 'SW1A 2BB',
        propertyType: 'House',
        status: 'For Sale',
      },
    });

    // Create test tenant and lease
    const testTenant = await prisma.tenant.create({
      data: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '07700900123',
        status: 'Active',
      },
    });

    testLease = await prisma.lease.create({
      data: {
        propertyId: testProperty.id,
        tenantId: testTenant.id,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        monthlyRent: 1200,
        securityDepositAmount: 1200,
        status: 'Active',
      },
    });

    // Update valid transaction data with actual IDs
    validIncomeTransaction.propertyId = testProperty.id;
    validExpenseTransaction.propertyId = testProperty.id;
  });

  afterAll(async () => {
    // Clean up after all tests
    await prisma.transaction.deleteMany({});
    await prisma.lease.deleteMany({});
    await prisma.tenant.deleteMany({});
    await prisma.property.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean transactions before each test
    await prisma.transaction.deleteMany({});
  });

  describe('POST /api/transactions', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .send(validIncomeTransaction);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should create an income transaction with valid data', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Cookie', authCookies)
        .send(validIncomeTransaction);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.transaction).toMatchObject({
        propertyId: validIncomeTransaction.propertyId,
        type: validIncomeTransaction.type,
        category: validIncomeTransaction.category,
        amount: validIncomeTransaction.amount,
        description: validIncomeTransaction.description,
      });
      expect(response.body.transaction.id).toBeDefined();
      expect(response.body.transaction.createdAt).toBeDefined();
      expect(response.body.transaction.updatedAt).toBeDefined();
    });

    it('should create an expense transaction with valid data', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Cookie', authCookies)
        .send(validExpenseTransaction);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.transaction).toMatchObject({
        propertyId: validExpenseTransaction.propertyId,
        type: validExpenseTransaction.type,
        category: validExpenseTransaction.category,
        amount: validExpenseTransaction.amount,
        description: validExpenseTransaction.description,
      });
    });

    it('should create transaction with leaseId', async () => {
      const transactionWithLease = {
        ...validIncomeTransaction,
        leaseId: testLease.id,
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Cookie', authCookies)
        .send(transactionWithLease);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.transaction.leaseId).toBe(testLease.id);
    });

    it('should reject transaction with non-existent property', async () => {
      const invalidTransaction = {
        ...validIncomeTransaction,
        propertyId: '00000000-0000-0000-0000-000000000000',
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Cookie', authCookies)
        .send(invalidTransaction);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Property not found');
    });

    it('should reject transaction with property status "For Sale"', async () => {
      const invalidTransaction = {
        ...validIncomeTransaction,
        propertyId: forSaleProperty.id,
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Cookie', authCookies)
        .send(invalidTransaction);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Property is not available');
    });

    it('should reject transaction with non-existent lease', async () => {
      const invalidTransaction = {
        ...validIncomeTransaction,
        leaseId: '00000000-0000-0000-0000-000000000000',
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Cookie', authCookies)
        .send(invalidTransaction);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Lease not found');
    });

    it('should reject Income transaction with Expense category', async () => {
      const invalidTransaction = {
        ...validIncomeTransaction,
        type: 'Income',
        category: 'Maintenance', // Expense category
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Cookie', authCookies)
        .send(invalidTransaction);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Category must match the transaction type');
    });

    it('should reject Expense transaction with Income category', async () => {
      const invalidTransaction = {
        ...validExpenseTransaction,
        type: 'Expense',
        category: 'Rent', // Income category
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Cookie', authCookies)
        .send(invalidTransaction);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Category must match the transaction type');
    });

    it('should reject transaction without required propertyId', async () => {
      const invalidTransaction = { ...validIncomeTransaction };
      delete (invalidTransaction as any).propertyId;

      const response = await request(app)
        .post('/api/transactions')
        .set('Cookie', authCookies)
        .send(invalidTransaction);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject transaction with negative amount', async () => {
      const invalidTransaction = { ...validIncomeTransaction, amount: -100 };

      const response = await request(app)
        .post('/api/transactions')
        .set('Cookie', authCookies)
        .send(invalidTransaction);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('positive');
    });

    it('should reject transaction with zero amount', async () => {
      const invalidTransaction = { ...validIncomeTransaction, amount: 0 };

      const response = await request(app)
        .post('/api/transactions')
        .set('Cookie', authCookies)
        .send(invalidTransaction);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('positive');
    });
  });

  describe('GET /api/transactions', () => {
    it('should return empty array when no transactions exist', async () => {
      const response = await request(app).get('/api/transactions');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.transactions).toEqual([]);
    });

    it('should return all transactions with property and lease relations', async () => {
      const transaction1 = await prisma.transaction.create({
        data: {
          ...validIncomeTransaction,
          transactionDate: new Date('2024-02-15'),
        },
      });

      const transaction2 = await prisma.transaction.create({
        data: {
          ...validExpenseTransaction,
          transactionDate: new Date('2024-01-20'),
        },
      });

      const response = await request(app).get('/api/transactions');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.transactions).toHaveLength(2);

      // Check relations are included
      expect(response.body.transactions[0].property).toBeDefined();
      expect(response.body.transactions[0].lease).toBeDefined();

      // Check ordered by transactionDate desc (newest first)
      expect(response.body.transactions[0].id).toBe(transaction1.id);
      expect(response.body.transactions[1].id).toBe(transaction2.id);
    });

    it('should filter transactions by property_id', async () => {
      const otherProperty = await prisma.property.create({
        data: {
          name: 'Other Property',
          street: '789 Test Street',
          city: 'London',
          county: 'Greater London',
          postcode: 'SW1A 3CC',
          propertyType: 'House',
          status: 'Available',
        },
      });

      await prisma.transaction.create({
        data: validIncomeTransaction,
      });

      await prisma.transaction.create({
        data: {
          ...validExpenseTransaction,
          propertyId: otherProperty.id,
        },
      });

      const response = await request(app)
        .get('/api/transactions')
        .query({ property_id: testProperty.id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.transactions).toHaveLength(1);
      expect(response.body.transactions[0].propertyId).toBe(testProperty.id);

      await prisma.property.delete({ where: { id: otherProperty.id } });
    });

    it('should filter transactions by type', async () => {
      await prisma.transaction.create({
        data: validIncomeTransaction,
      });

      await prisma.transaction.create({
        data: validExpenseTransaction,
      });

      const response = await request(app)
        .get('/api/transactions')
        .query({ type: 'Income' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.transactions).toHaveLength(1);
      expect(response.body.transactions[0].type).toBe('Income');
    });

    it('should filter transactions by category', async () => {
      await prisma.transaction.create({
        data: validIncomeTransaction,
      });

      await prisma.transaction.create({
        data: {
          ...validExpenseTransaction,
          category: 'Repair',
        },
      });

      const response = await request(app)
        .get('/api/transactions')
        .query({ category: 'Rent' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.transactions).toHaveLength(1);
      expect(response.body.transactions[0].category).toBe('Rent');
    });

    it('should filter transactions by from_date', async () => {
      await prisma.transaction.create({
        data: {
          ...validIncomeTransaction,
          transactionDate: new Date('2024-01-10'),
        },
      });

      await prisma.transaction.create({
        data: {
          ...validExpenseTransaction,
          transactionDate: new Date('2024-01-25'),
        },
      });

      const response = await request(app)
        .get('/api/transactions')
        .query({ from_date: '2024-01-20' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.transactions).toHaveLength(1);
      expect(new Date(response.body.transactions[0].transactionDate).toISOString()).toBe(
        new Date('2024-01-25').toISOString()
      );
    });

    it('should filter transactions by to_date', async () => {
      await prisma.transaction.create({
        data: {
          ...validIncomeTransaction,
          transactionDate: new Date('2024-01-10'),
        },
      });

      await prisma.transaction.create({
        data: {
          ...validExpenseTransaction,
          transactionDate: new Date('2024-01-25'),
        },
      });

      const response = await request(app)
        .get('/api/transactions')
        .query({ to_date: '2024-01-20' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.transactions).toHaveLength(1);
      expect(new Date(response.body.transactions[0].transactionDate).toISOString()).toBe(
        new Date('2024-01-10').toISOString()
      );
    });

    it('should filter transactions by date range', async () => {
      await prisma.transaction.create({
        data: {
          ...validIncomeTransaction,
          transactionDate: new Date('2024-01-05'),
        },
      });

      await prisma.transaction.create({
        data: {
          ...validExpenseTransaction,
          transactionDate: new Date('2024-01-15'),
        },
      });

      await prisma.transaction.create({
        data: {
          ...validIncomeTransaction,
          transactionDate: new Date('2024-01-25'),
        },
      });

      const response = await request(app)
        .get('/api/transactions')
        .query({ from_date: '2024-01-10', to_date: '2024-01-20' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.transactions).toHaveLength(1);
      expect(new Date(response.body.transactions[0].transactionDate).toISOString()).toBe(
        new Date('2024-01-15').toISOString()
      );
    });

    it('should combine multiple filters', async () => {
      await prisma.transaction.create({
        data: {
          ...validIncomeTransaction,
          transactionDate: new Date('2024-01-15'),
        },
      });

      await prisma.transaction.create({
        data: {
          ...validExpenseTransaction,
          transactionDate: new Date('2024-01-15'),
        },
      });

      await prisma.transaction.create({
        data: {
          ...validIncomeTransaction,
          transactionDate: new Date('2024-02-15'),
        },
      });

      const response = await request(app)
        .get('/api/transactions')
        .query({
          property_id: testProperty.id,
          type: 'Income',
          from_date: '2024-01-10',
          to_date: '2024-01-20',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.transactions).toHaveLength(1);
      expect(response.body.transactions[0].type).toBe('Income');
      expect(new Date(response.body.transactions[0].transactionDate).toISOString()).toBe(
        new Date('2024-01-15').toISOString()
      );
    });

    it('should reject invalid query parameters - invalid property_id', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .query({ property_id: 'invalid-id' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject invalid query parameters - invalid type', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .query({ type: 'InvalidType' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject invalid query parameters - invalid category', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .query({ category: 'InvalidCategory' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/transactions/summary', () => {
    it('should return summary with zero values when no transactions exist', async () => {
      const response = await request(app).get('/api/transactions/summary');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.summary).toEqual({
        total_income: 0,
        total_expense: 0,
        net: 0,
        transaction_count: 0,
      });
    });

    it('should calculate correct financial summary', async () => {
      await prisma.transaction.create({
        data: {
          ...validIncomeTransaction,
          amount: 1200,
        },
      });

      await prisma.transaction.create({
        data: {
          ...validIncomeTransaction,
          amount: 100,
          category: 'Late Fee',
        },
      });

      await prisma.transaction.create({
        data: {
          ...validExpenseTransaction,
          amount: 350,
        },
      });

      const response = await request(app).get('/api/transactions/summary');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.summary).toEqual({
        total_income: 1300,
        total_expense: 350,
        net: 950,
        transaction_count: 3,
      });
    });

    it('should filter summary by property_id', async () => {
      const otherProperty = await prisma.property.create({
        data: {
          name: 'Other Property',
          street: '789 Test Street',
          city: 'London',
          county: 'Greater London',
          postcode: 'SW1A 3CC',
          propertyType: 'House',
          status: 'Available',
        },
      });

      await prisma.transaction.create({
        data: {
          ...validIncomeTransaction,
          amount: 1000,
        },
      });

      await prisma.transaction.create({
        data: {
          ...validIncomeTransaction,
          propertyId: otherProperty.id,
          amount: 500,
        },
      });

      const response = await request(app)
        .get('/api/transactions/summary')
        .query({ property_id: testProperty.id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.summary).toEqual({
        total_income: 1000,
        total_expense: 0,
        net: 1000,
        transaction_count: 1,
      });

      await prisma.property.delete({ where: { id: otherProperty.id } });
    });

    it('should filter summary by type', async () => {
      await prisma.transaction.create({
        data: {
          ...validIncomeTransaction,
          amount: 1200,
        },
      });

      await prisma.transaction.create({
        data: {
          ...validExpenseTransaction,
          amount: 350,
        },
      });

      const response = await request(app)
        .get('/api/transactions/summary')
        .query({ type: 'Income' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.summary).toEqual({
        total_income: 1200,
        total_expense: 0,
        net: 1200,
        transaction_count: 1,
      });
    });

    it('should filter summary by date range', async () => {
      await prisma.transaction.create({
        data: {
          ...validIncomeTransaction,
          amount: 1000,
          transactionDate: new Date('2024-01-10'),
        },
      });

      await prisma.transaction.create({
        data: {
          ...validExpenseTransaction,
          amount: 200,
          transactionDate: new Date('2024-01-15'),
        },
      });

      await prisma.transaction.create({
        data: {
          ...validIncomeTransaction,
          amount: 500,
          transactionDate: new Date('2024-02-10'),
        },
      });

      const response = await request(app)
        .get('/api/transactions/summary')
        .query({ from_date: '2024-01-12', to_date: '2024-01-20' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.summary).toEqual({
        total_income: 0,
        total_expense: 200,
        net: -200,
        transaction_count: 1,
      });
    });

    it('should handle negative net when expenses exceed income', async () => {
      await prisma.transaction.create({
        data: {
          ...validIncomeTransaction,
          amount: 500,
        },
      });

      await prisma.transaction.create({
        data: {
          ...validExpenseTransaction,
          amount: 800,
        },
      });

      const response = await request(app).get('/api/transactions/summary');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.summary).toEqual({
        total_income: 500,
        total_expense: 800,
        net: -300,
        transaction_count: 2,
      });
    });
  });

  describe('GET /api/transactions/:id', () => {
    it('should return transaction by id with relations', async () => {
      const transaction = await prisma.transaction.create({
        data: validIncomeTransaction,
      });

      const response = await request(app).get(`/api/transactions/${transaction.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.transaction.id).toBe(transaction.id);
      expect(response.body.transaction.property).toBeDefined();
      expect(response.body.transaction.lease).toBeDefined();
      expect(response.body.transaction.property.id).toBe(testProperty.id);
    });

    it('should return 404 for non-existent transaction', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app).get(`/api/transactions/${nonExistentId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Transaction not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app).get('/api/transactions/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid transaction ID format');
    });
  });

  describe('PUT /api/transactions/:id', () => {
    it('should require authentication', async () => {
      const transaction = await prisma.transaction.create({
        data: validIncomeTransaction,
      });

      const response = await request(app)
        .put(`/api/transactions/${transaction.id}`)
        .send({ amount: 1300 });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should update transaction with valid data', async () => {
      const transaction = await prisma.transaction.create({
        data: validIncomeTransaction,
      });

      const updateData = {
        amount: 1300,
        description: 'Updated description',
      };

      const response = await request(app)
        .put(`/api/transactions/${transaction.id}`)
        .set('Cookie', authCookies)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.transaction.amount).toBe(1300);
      expect(response.body.transaction.description).toBe('Updated description');
      expect(response.body.transaction.propertyId).toBe(testProperty.id); // Unchanged
    });

    it('should return 404 for non-existent transaction', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .put(`/api/transactions/${nonExistentId}`)
        .set('Cookie', authCookies)
        .send({ amount: 1300 });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Transaction not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .put('/api/transactions/invalid-id')
        .set('Cookie', authCookies)
        .send({ amount: 1300 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid transaction ID format');
    });

    it('should validate new property exists if property is changed', async () => {
      const transaction = await prisma.transaction.create({
        data: validIncomeTransaction,
      });

      const response = await request(app)
        .put(`/api/transactions/${transaction.id}`)
        .set('Cookie', authCookies)
        .send({ propertyId: '00000000-0000-0000-0000-000000000000' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Property not found');
    });

    it('should reject update if new property status is "For Sale"', async () => {
      const transaction = await prisma.transaction.create({
        data: validIncomeTransaction,
      });

      const response = await request(app)
        .put(`/api/transactions/${transaction.id}`)
        .set('Cookie', authCookies)
        .send({ propertyId: forSaleProperty.id });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Property is not available');
    });

    it('should validate new lease exists if lease is changed', async () => {
      const transaction = await prisma.transaction.create({
        data: validIncomeTransaction,
      });

      const response = await request(app)
        .put(`/api/transactions/${transaction.id}`)
        .set('Cookie', authCookies)
        .send({ leaseId: '00000000-0000-0000-0000-000000000000' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Lease not found');
    });

    it('should allow setting leaseId to null', async () => {
      const transaction = await prisma.transaction.create({
        data: {
          ...validIncomeTransaction,
          leaseId: testLease.id,
        },
      });

      const response = await request(app)
        .put(`/api/transactions/${transaction.id}`)
        .set('Cookie', authCookies)
        .send({ leaseId: null });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.transaction.leaseId).toBeNull();
    });

    it('should validate type/category match when both are updated', async () => {
      const transaction = await prisma.transaction.create({
        data: validIncomeTransaction,
      });

      const response = await request(app)
        .put(`/api/transactions/${transaction.id}`)
        .set('Cookie', authCookies)
        .send({ type: 'Income', category: 'Maintenance' }); // Income with Expense category

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Category must match the transaction type');
    });

    it('should validate when updating only type (check against existing category)', async () => {
      const transaction = await prisma.transaction.create({
        data: {
          ...validIncomeTransaction,
          type: 'Income',
          category: 'Rent',
        },
      });

      const response = await request(app)
        .put(`/api/transactions/${transaction.id}`)
        .set('Cookie', authCookies)
        .send({ type: 'Expense' }); // Changing to Expense but category is still Rent (Income category)

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Category must match the transaction type');
    });

    it('should validate when updating only category (check against existing type)', async () => {
      const transaction = await prisma.transaction.create({
        data: {
          ...validIncomeTransaction,
          type: 'Income',
          category: 'Rent',
        },
      });

      const response = await request(app)
        .put(`/api/transactions/${transaction.id}`)
        .set('Cookie', authCookies)
        .send({ category: 'Maintenance' }); // Expense category but type is Income

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Category must match the transaction type');
    });

    it('should allow updating only type when it matches existing category', async () => {
      const transaction = await prisma.transaction.create({
        data: {
          ...validIncomeTransaction,
          type: 'Income',
          category: 'Rent',
        },
      });

      const response = await request(app)
        .put(`/api/transactions/${transaction.id}`)
        .set('Cookie', authCookies)
        .send({ type: 'Income', category: 'Late Fee' }); // Both Income

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.transaction.type).toBe('Income');
      expect(response.body.transaction.category).toBe('Late Fee');
    });

    it('should allow partial updates without type or category', async () => {
      const transaction = await prisma.transaction.create({
        data: validIncomeTransaction,
      });

      const response = await request(app)
        .put(`/api/transactions/${transaction.id}`)
        .set('Cookie', authCookies)
        .send({ amount: 1250 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.transaction.amount).toBe(1250);
      expect(response.body.transaction.type).toBe('Income'); // Unchanged
      expect(response.body.transaction.category).toBe('Rent'); // Unchanged
    });
  });

  describe('DELETE /api/transactions/:id', () => {
    it('should require authentication', async () => {
      const transaction = await prisma.transaction.create({
        data: validIncomeTransaction,
      });

      const response = await request(app).delete(`/api/transactions/${transaction.id}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should hard delete transaction', async () => {
      const transaction = await prisma.transaction.create({
        data: validIncomeTransaction,
      });

      const response = await request(app)
        .delete(`/api/transactions/${transaction.id}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Transaction deleted successfully');

      // Verify transaction is actually deleted from database
      const notExists = await prisma.transaction.findUnique({
        where: { id: transaction.id },
      });
      expect(notExists).toBeNull();
    });

    it('should return 404 for non-existent transaction', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .delete(`/api/transactions/${nonExistentId}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Transaction not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .delete('/api/transactions/invalid-id')
        .set('Cookie', authCookies);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid transaction ID format');
    });
  });

  describe('Transaction with splits', () => {
    let userA: any;
    let userB: any;
    let propertyWithOwners: any;
    let authCookiesUserA: string[];

    beforeEach(async () => {
      // Create two users (owners) using authService
      userA = await authService.createUser('usera@test.com', 'password123');
      userB = await authService.createUser('userb@test.com', 'password123');

      // Login as userA
      const loginResponse = await request(app).post('/api/auth/login').send({
        email: 'usera@test.com',
        password: 'password123',
      });
      authCookiesUserA = [loginResponse.headers['set-cookie']];

      // Create property with two owners
      propertyWithOwners = await prisma.property.create({
        data: {
          name: 'Multi-Owner Property',
          street: '999 Owner Street',
          city: 'London',
          county: 'Greater London',
          postcode: 'SW1A 9XX',
          propertyType: 'House',
          status: 'Available',
        },
      });

      // Add ownership splits: User A (60%), User B (40%)
      await prisma.propertyOwnership.create({
        data: {
          userId: userA.id,
          propertyId: propertyWithOwners.id,
          ownershipPercentage: 60,
        },
      });

      await prisma.propertyOwnership.create({
        data: {
          userId: userB.id,
          propertyId: propertyWithOwners.id,
          ownershipPercentage: 40,
        },
      });
    });

    afterEach(async () => {
      // Clean up
      await prisma.propertyOwnership.deleteMany({
        where: { propertyId: propertyWithOwners.id },
      });
      await prisma.property.delete({
        where: { id: propertyWithOwners.id },
      });
      await prisma.user.deleteMany({
        where: {
          email: {
            in: ['usera@test.com', 'userb@test.com'],
          },
        },
      });
    });

    it('should create transaction with auto-generated splits from property ownership', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Cookie', authCookiesUserA)
        .send({
          propertyId: propertyWithOwners.id,
          type: 'Expense',
          category: 'Repair',
          amount: 1000,
          transactionDate: new Date().toISOString(),
          description: 'Repair work',
          paidByUserId: userA.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.transaction.paidByUserId).toBe(userA.id);
      expect(response.body.transaction.paidBy.email).toBe('usera@test.com');
      expect(response.body.transaction.splits).toHaveLength(2);

      // Check splits are auto-generated correctly
      const splitA = response.body.transaction.splits.find((s: any) => s.userId === userA.id);
      const splitB = response.body.transaction.splits.find((s: any) => s.userId === userB.id);

      expect(splitA.percentage).toBe(60);
      expect(splitA.amount).toBe(600);
      expect(splitA.user.email).toBe('usera@test.com');

      expect(splitB.percentage).toBe(40);
      expect(splitB.amount).toBe(400);
      expect(splitB.user.email).toBe('userb@test.com');
    });

    it('should create transaction with custom splits', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Cookie', authCookiesUserA)
        .send({
          propertyId: propertyWithOwners.id,
          type: 'Expense',
          category: 'Maintenance',
          amount: 1000,
          transactionDate: new Date().toISOString(),
          description: 'Special repair - custom split',
          paidByUserId: userA.id,
          splits: [
            { userId: userA.id, percentage: 70, amount: 700 },
            { userId: userB.id, percentage: 30, amount: 300 },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.transaction.splits).toHaveLength(2);

      const splitA = response.body.transaction.splits.find((s: any) => s.userId === userA.id);
      const splitB = response.body.transaction.splits.find((s: any) => s.userId === userB.id);

      expect(splitA.percentage).toBe(70);
      expect(splitA.amount).toBe(700);

      expect(splitB.percentage).toBe(30);
      expect(splitB.amount).toBe(300);
    });

    it('should reject transaction when paidByUserId is not a property owner', async () => {
      const nonOwner = await authService.createUser('nonowner@test.com', 'password');

      const response = await request(app)
        .post('/api/transactions')
        .set('Cookie', authCookiesUserA)
        .send({
          propertyId: propertyWithOwners.id,
          type: 'Expense',
          category: 'Repair',
          amount: 1000,
          transactionDate: new Date().toISOString(),
          description: 'Repair',
          paidByUserId: nonOwner.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('paidByUserId must be a property owner');

      await prisma.user.delete({ where: { id: nonOwner.id } });
    });

    it('should reject transaction when split user is not a property owner', async () => {
      const nonOwner = await authService.createUser('nonowner2@test.com', 'password');

      const response = await request(app)
        .post('/api/transactions')
        .set('Cookie', authCookiesUserA)
        .send({
          propertyId: propertyWithOwners.id,
          type: 'Expense',
          category: 'Repair',
          amount: 1000,
          transactionDate: new Date().toISOString(),
          description: 'Repair',
          paidByUserId: userA.id,
          splits: [
            { userId: userA.id, percentage: 50, amount: 500 },
            { userId: nonOwner.id, percentage: 50, amount: 500 },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('is not a property owner');

      await prisma.user.delete({ where: { id: nonOwner.id } });
    });

    it('should reject transaction with invalid splits (not summing to 100%)', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Cookie', authCookiesUserA)
        .send({
          propertyId: propertyWithOwners.id,
          type: 'Expense',
          category: 'Repair',
          amount: 1000,
          transactionDate: new Date().toISOString(),
          description: 'Repair',
          paidByUserId: userA.id,
          splits: [
            { userId: userA.id, percentage: 60, amount: 600 },
            { userId: userB.id, percentage: 30, amount: 300 }, // Only 90% total
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('must sum to 100%');
    });

    it('should create income transaction without paidByUserId', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Cookie', authCookiesUserA)
        .send({
          propertyId: propertyWithOwners.id,
          type: 'Income',
          category: 'Rent',
          amount: 2000,
          transactionDate: new Date().toISOString(),
          description: 'Monthly rent',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.transaction.paidByUserId).toBeNull();
      expect(response.body.transaction.splits).toHaveLength(2);
    });

    it('should support paidByUserId being null explicitly', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Cookie', authCookiesUserA)
        .send({
          propertyId: propertyWithOwners.id,
          type: 'Income',
          category: 'Rent',
          amount: 2000,
          transactionDate: new Date().toISOString(),
          description: 'Monthly rent',
          paidByUserId: null,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.transaction.paidByUserId).toBeNull();
    });

    it('should allow transaction for property without owners (backward compatible)', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Cookie', authCookies)
        .send({
          propertyId: testProperty.id, // Original test property with no owners
          type: 'Expense',
          category: 'Repair',
          amount: 1000,
          transactionDate: new Date().toISOString(),
          description: 'Repair work',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.transaction.splits).toBeUndefined();
    });

    it('should update transaction splits', async () => {
      // Create transaction with auto-generated splits
      const createResponse = await request(app)
        .post('/api/transactions')
        .set('Cookie', authCookiesUserA)
        .send({
          propertyId: propertyWithOwners.id,
          type: 'Expense',
          category: 'Repair',
          amount: 1000,
          transactionDate: new Date().toISOString(),
          description: 'Repair work',
          paidByUserId: userA.id,
        });

      const transactionId = createResponse.body.transaction.id;

      // Update with custom splits
      const updateResponse = await request(app)
        .put(`/api/transactions/${transactionId}`)
        .set('Cookie', authCookiesUserA)
        .send({
          splits: [
            { userId: userA.id, percentage: 80, amount: 800 },
            { userId: userB.id, percentage: 20, amount: 200 },
          ],
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.transaction.splits).toHaveLength(2);

      const splitA = updateResponse.body.transaction.splits.find((s: any) => s.userId === userA.id);
      const splitB = updateResponse.body.transaction.splits.find((s: any) => s.userId === userB.id);

      expect(splitA.percentage).toBe(80);
      expect(splitB.percentage).toBe(20);
    });

    it('should update paidByUserId', async () => {
      // Create transaction
      const createResponse = await request(app)
        .post('/api/transactions')
        .set('Cookie', authCookiesUserA)
        .send({
          propertyId: propertyWithOwners.id,
          type: 'Expense',
          category: 'Repair',
          amount: 1000,
          transactionDate: new Date().toISOString(),
          description: 'Repair work',
          paidByUserId: userA.id,
        });

      const transactionId = createResponse.body.transaction.id;

      // Update paidByUserId
      const updateResponse = await request(app)
        .put(`/api/transactions/${transactionId}`)
        .set('Cookie', authCookiesUserA)
        .send({
          paidByUserId: userB.id,
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.transaction.paidByUserId).toBe(userB.id);
      expect(updateResponse.body.transaction.paidBy.email).toBe('userb@test.com');
    });

    it('should fetch transaction with splits', async () => {
      // Create transaction
      const createResponse = await request(app)
        .post('/api/transactions')
        .set('Cookie', authCookiesUserA)
        .send({
          propertyId: propertyWithOwners.id,
          type: 'Expense',
          category: 'Repair',
          amount: 1000,
          transactionDate: new Date().toISOString(),
          description: 'Repair work',
          paidByUserId: userA.id,
        });

      const transactionId = createResponse.body.transaction.id;

      // Fetch transaction
      const getResponse = await request(app).get(`/api/transactions/${transactionId}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.transaction.splits).toHaveLength(2);
      expect(getResponse.body.transaction.paidBy).toBeDefined();
      expect(getResponse.body.transaction.paidBy.email).toBe('usera@test.com');
    });

    it('should list transactions with splits', async () => {
      // Create transaction with splits
      await request(app)
        .post('/api/transactions')
        .set('Cookie', authCookiesUserA)
        .send({
          propertyId: propertyWithOwners.id,
          type: 'Expense',
          category: 'Repair',
          amount: 1000,
          transactionDate: new Date().toISOString(),
          description: 'Repair work',
          paidByUserId: userA.id,
        });

      // List transactions
      const listResponse = await request(app)
        .get('/api/transactions')
        .query({ property_id: propertyWithOwners.id });

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.success).toBe(true);
      expect(listResponse.body.transactions.length).toBeGreaterThan(0);

      const txWithSplits = listResponse.body.transactions[0];
      expect(txWithSplits.splits).toBeDefined();
      expect(txWithSplits.splits).toHaveLength(2);
      expect(txWithSplits.paidBy).toBeDefined();
    });
  });

  describe('Integration scenarios', () => {
    it('should create, read, update, and delete a transaction', async () => {
      // Create
      const createResponse = await request(app)
        .post('/api/transactions')
        .set('Cookie', authCookies)
        .send(validIncomeTransaction);

      expect(createResponse.status).toBe(201);
      const transactionId = createResponse.body.transaction.id;

      // Read single
      const readResponse = await request(app).get(`/api/transactions/${transactionId}`);

      expect(readResponse.status).toBe(200);
      expect(readResponse.body.transaction.id).toBe(transactionId);

      // Update
      const updateResponse = await request(app)
        .put(`/api/transactions/${transactionId}`)
        .set('Cookie', authCookies)
        .send({ amount: 1400 });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.transaction.amount).toBe(1400);

      // Delete (hard delete)
      const deleteResponse = await request(app)
        .delete(`/api/transactions/${transactionId}`)
        .set('Cookie', authCookies);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.message).toBe('Transaction deleted successfully');

      // Verify actually deleted
      const finalReadResponse = await request(app).get(`/api/transactions/${transactionId}`);
      expect(finalReadResponse.status).toBe(404);
    });

    it('should handle multiple transactions in list with filters', async () => {
      // Create income transactions
      await request(app)
        .post('/api/transactions')
        .set('Cookie', authCookies)
        .send({
          ...validIncomeTransaction,
          amount: 1200,
          transactionDate: new Date('2024-01-15'),
        });

      await request(app)
        .post('/api/transactions')
        .set('Cookie', authCookies)
        .send({
          ...validIncomeTransaction,
          amount: 100,
          category: 'Late Fee',
          transactionDate: new Date('2024-02-15'),
        });

      // Create expense transaction
      await request(app)
        .post('/api/transactions')
        .set('Cookie', authCookies)
        .send({
          ...validExpenseTransaction,
          amount: 350,
          transactionDate: new Date('2024-01-20'),
        });

      // List all
      const listResponse = await request(app).get('/api/transactions');
      expect(listResponse.status).toBe(200);
      expect(listResponse.body.transactions).toHaveLength(3);

      // Verify ordered by transactionDate desc (newest first)
      for (let i = 0; i < 2; i++) {
        const current = new Date(listResponse.body.transactions[i].transactionDate);
        const next = new Date(listResponse.body.transactions[i + 1].transactionDate);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }

      // Filter by type
      const incomeResponse = await request(app).get('/api/transactions').query({ type: 'Income' });
      expect(incomeResponse.body.transactions).toHaveLength(2);
      expect(incomeResponse.body.transactions.every((t: any) => t.type === 'Income')).toBe(true);

      // Get summary
      const summaryResponse = await request(app).get('/api/transactions/summary');
      expect(summaryResponse.status).toBe(200);
      expect(summaryResponse.body.summary).toEqual({
        total_income: 1300,
        total_expense: 350,
        net: 950,
        transaction_count: 3,
      });
    });
  });
});
