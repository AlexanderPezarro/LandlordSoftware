import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../app.js';
import prisma from '../../db/client.js';
import authService from '../../services/auth.service.js';

const app = createApp();

describe('Leases Routes', () => {
  // Test user credentials
  const testUser = {
    email: 'test@example.com',
    password: 'testPassword123',
  };

  let authCookies: string[];
  let testProperty: any;
  let testTenant: any;

  // Valid lease data
  const validLease = {
    propertyId: '', // Will be set in beforeAll
    tenantId: '', // Will be set in beforeAll
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    monthlyRent: 1200,
    securityDepositAmount: 1200,
    securityDepositPaidDate: new Date('2023-12-15'),
    status: 'Active',
  };

  beforeAll(async () => {
    // Clean database
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

    // Create test tenant
    testTenant = await prisma.tenant.create({
      data: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '07700900123',
        status: 'Active',
      },
    });

    // Update validLease with actual IDs
    validLease.propertyId = testProperty.id;
    validLease.tenantId = testTenant.id;
  });

  afterAll(async () => {
    // Clean up after all tests
    await prisma.lease.deleteMany({});
    await prisma.tenant.deleteMany({});
    await prisma.property.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean leases before each test
    await prisma.lease.deleteMany({});
  });

  describe('POST /api/leases', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/leases')
        .send(validLease);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should create a lease with valid data', async () => {
      const response = await request(app)
        .post('/api/leases')
        .set('Cookie', authCookies)
        .send(validLease);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.lease).toMatchObject({
        propertyId: validLease.propertyId,
        tenantId: validLease.tenantId,
        monthlyRent: validLease.monthlyRent,
        securityDepositAmount: validLease.securityDepositAmount,
        status: validLease.status,
      });
      expect(response.body.lease.id).toBeDefined();
      expect(response.body.lease.createdAt).toBeDefined();
      expect(response.body.lease.updatedAt).toBeDefined();
    });

    it('should reject lease with non-existent property', async () => {
      const invalidLease = {
        ...validLease,
        propertyId: '00000000-0000-0000-0000-000000000000',
      };

      const response = await request(app)
        .post('/api/leases')
        .set('Cookie', authCookies)
        .send(invalidLease);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Property not found');
    });

    it('should reject lease with property status "For Sale"', async () => {
      const forSaleProperty = await prisma.property.create({
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

      const invalidLease = {
        ...validLease,
        propertyId: forSaleProperty.id,
      };

      const response = await request(app)
        .post('/api/leases')
        .set('Cookie', authCookies)
        .send(invalidLease);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Property is not available');

      await prisma.property.delete({ where: { id: forSaleProperty.id } });
    });

    it('should reject lease with non-existent tenant', async () => {
      const invalidLease = {
        ...validLease,
        tenantId: '00000000-0000-0000-0000-000000000000',
      };

      const response = await request(app)
        .post('/api/leases')
        .set('Cookie', authCookies)
        .send(invalidLease);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Tenant not found');
    });

    it('should reject lease with tenant status "Former"', async () => {
      const formerTenant = await prisma.tenant.create({
        data: {
          firstName: 'Former',
          lastName: 'Tenant',
          email: 'former@example.com',
          phone: '07700900999',
          status: 'Former',
        },
      });

      const invalidLease = {
        ...validLease,
        tenantId: formerTenant.id,
      };

      const response = await request(app)
        .post('/api/leases')
        .set('Cookie', authCookies)
        .send(invalidLease);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Tenant is not active');

      await prisma.tenant.delete({ where: { id: formerTenant.id } });
    });

    it('should reject lease without required propertyId', async () => {
      const invalidLease = { ...validLease };
      delete (invalidLease as any).propertyId;

      const response = await request(app)
        .post('/api/leases')
        .set('Cookie', authCookies)
        .send(invalidLease);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject lease without required tenantId', async () => {
      const invalidLease = { ...validLease };
      delete (invalidLease as any).tenantId;

      const response = await request(app)
        .post('/api/leases')
        .set('Cookie', authCookies)
        .send(invalidLease);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject lease with startDate after endDate', async () => {
      const invalidLease = {
        ...validLease,
        startDate: new Date('2024-12-31'),
        endDate: new Date('2024-01-01'),
      };

      const response = await request(app)
        .post('/api/leases')
        .set('Cookie', authCookies)
        .send(invalidLease);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Start date must be before or equal to end date');
    });

    it('should reject lease with negative monthlyRent', async () => {
      const invalidLease = { ...validLease, monthlyRent: -1000 };

      const response = await request(app)
        .post('/api/leases')
        .set('Cookie', authCookies)
        .send(invalidLease);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('positive');
    });

    it('should prevent overlapping ACTIVE leases for same property', async () => {
      // Create first active lease
      await prisma.lease.create({
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

      // Try to create overlapping active lease
      const overlappingLease = {
        ...validLease,
        startDate: new Date('2024-06-01'),
        endDate: new Date('2025-06-01'),
      };

      const response = await request(app)
        .post('/api/leases')
        .set('Cookie', authCookies)
        .send(overlappingLease);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Cannot create lease: overlapping active lease exists for this property');
    });

    it('should allow Draft lease even if Active lease exists on same property', async () => {
      // Create active lease
      await prisma.lease.create({
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

      // Create overlapping Draft lease (should succeed)
      const draftLease = {
        ...validLease,
        startDate: new Date('2024-06-01'),
        endDate: new Date('2025-06-01'),
        status: 'Draft',
      };

      const response = await request(app)
        .post('/api/leases')
        .set('Cookie', authCookies)
        .send(draftLease);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.lease.status).toBe('Draft');
    });

    it('should allow Expired lease even if Active lease exists on same property', async () => {
      // Create active lease
      await prisma.lease.create({
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

      // Create overlapping Expired lease (should succeed)
      const expiredLease = {
        ...validLease,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
        status: 'Expired',
      };

      const response = await request(app)
        .post('/api/leases')
        .set('Cookie', authCookies)
        .send(expiredLease);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.lease.status).toBe('Expired');
    });

    it('should allow Terminated lease even if Active lease exists on same property', async () => {
      // Create active lease
      await prisma.lease.create({
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

      // Create overlapping Terminated lease (should succeed)
      const terminatedLease = {
        ...validLease,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-09-01'),
        status: 'Terminated',
      };

      const response = await request(app)
        .post('/api/leases')
        .set('Cookie', authCookies)
        .send(terminatedLease);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.lease.status).toBe('Terminated');
    });

    it('should create lease with optional endDate as null', async () => {
      const leaseWithoutEndDate = {
        ...validLease,
        endDate: null,
      };

      const response = await request(app)
        .post('/api/leases')
        .set('Cookie', authCookies)
        .send(leaseWithoutEndDate);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.lease.endDate).toBeNull();
    });

    it('should handle overlapping logic with null endDate', async () => {
      // Create active lease with no end date
      await prisma.lease.create({
        data: {
          propertyId: testProperty.id,
          tenantId: testTenant.id,
          startDate: new Date('2024-01-01'),
          endDate: null,
          monthlyRent: 1200,
          securityDepositAmount: 1200,
          status: 'Active',
        },
      });

      // Try to create another active lease (should fail due to overlap)
      const overlappingLease = {
        ...validLease,
        startDate: new Date('2024-06-01'),
        endDate: new Date('2025-06-01'),
      };

      const response = await request(app)
        .post('/api/leases')
        .set('Cookie', authCookies)
        .send(overlappingLease);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Cannot create lease: overlapping active lease exists for this property');
    });
  });

  describe('GET /api/leases', () => {
    it('should return empty array when no leases exist', async () => {
      const response = await request(app).get('/api/leases');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.leases).toEqual([]);
    });

    it('should return all leases with property and tenant relations', async () => {
      // Create leases
      const lease1 = await prisma.lease.create({
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

      const lease2 = await prisma.lease.create({
        data: {
          propertyId: testProperty.id,
          tenantId: testTenant.id,
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-12-31'),
          monthlyRent: 1100,
          securityDepositAmount: 1100,
          status: 'Expired',
        },
      });

      const response = await request(app).get('/api/leases');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.leases).toHaveLength(2);

      // Check relations are included
      expect(response.body.leases[0].property).toBeDefined();
      expect(response.body.leases[0].tenant).toBeDefined();

      // Check ordered by startDate desc (newest first)
      expect(response.body.leases[0].id).toBe(lease1.id);
      expect(response.body.leases[1].id).toBe(lease2.id);
    });

    it('should filter leases by property_id', async () => {
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

      await prisma.lease.create({
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

      await prisma.lease.create({
        data: {
          propertyId: otherProperty.id,
          tenantId: testTenant.id,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          monthlyRent: 1500,
          securityDepositAmount: 1500,
          status: 'Active',
        },
      });

      const response = await request(app)
        .get('/api/leases')
        .query({ property_id: testProperty.id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.leases).toHaveLength(1);
      expect(response.body.leases[0].propertyId).toBe(testProperty.id);

      await prisma.property.delete({ where: { id: otherProperty.id } });
    });

    it('should filter leases by multiple property_ids (array)', async () => {
      const property2 = await prisma.property.create({
        data: {
          name: 'Property 2',
          street: '456 Test Street',
          city: 'London',
          county: 'Greater London',
          postcode: 'SW1A 2BB',
          propertyType: 'Flat',
          status: 'Available',
        },
      });

      const property3 = await prisma.property.create({
        data: {
          name: 'Property 3',
          street: '789 Test Street',
          city: 'London',
          county: 'Greater London',
          postcode: 'SW1A 3CC',
          propertyType: 'House',
          status: 'Available',
        },
      });

      // Create leases for all three properties
      await prisma.lease.create({
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

      await prisma.lease.create({
        data: {
          propertyId: property2.id,
          tenantId: testTenant.id,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          monthlyRent: 1500,
          securityDepositAmount: 1500,
          status: 'Active',
        },
      });

      await prisma.lease.create({
        data: {
          propertyId: property3.id,
          tenantId: testTenant.id,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          monthlyRent: 1800,
          securityDepositAmount: 1800,
          status: 'Active',
        },
      });

      // Query with multiple property IDs
      const response = await request(app)
        .get('/api/leases')
        .query({ property_id: [testProperty.id, property2.id] });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.leases).toHaveLength(2);

      const propertyIds = response.body.leases.map((lease: any) => lease.propertyId);
      expect(propertyIds).toContain(testProperty.id);
      expect(propertyIds).toContain(property2.id);
      expect(propertyIds).not.toContain(property3.id);

      await prisma.property.delete({ where: { id: property2.id } });
      await prisma.property.delete({ where: { id: property3.id } });
    });

    it('should return 400 for invalid UUID in property_id array', async () => {
      const response = await request(app)
        .get('/api/leases')
        .query({ property_id: [testProperty.id, 'invalid-uuid'] });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should filter leases by tenant_id', async () => {
      const otherTenant = await prisma.tenant.create({
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          phone: '07700900456',
          status: 'Active',
        },
      });

      await prisma.lease.create({
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

      await prisma.lease.create({
        data: {
          propertyId: testProperty.id,
          tenantId: otherTenant.id,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          monthlyRent: 1200,
          securityDepositAmount: 1200,
          status: 'Active',
        },
      });

      const response = await request(app)
        .get('/api/leases')
        .query({ tenant_id: testTenant.id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.leases).toHaveLength(1);
      expect(response.body.leases[0].tenantId).toBe(testTenant.id);

      await prisma.tenant.delete({ where: { id: otherTenant.id } });
    });

    it('should filter leases by status', async () => {
      await prisma.lease.create({
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

      await prisma.lease.create({
        data: {
          propertyId: testProperty.id,
          tenantId: testTenant.id,
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-12-31'),
          monthlyRent: 1100,
          securityDepositAmount: 1100,
          status: 'Expired',
        },
      });

      const response = await request(app)
        .get('/api/leases')
        .query({ status: 'Active' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.leases).toHaveLength(1);
      expect(response.body.leases[0].status).toBe('Active');
    });

    it('should combine multiple filters', async () => {
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

      await prisma.lease.create({
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

      await prisma.lease.create({
        data: {
          propertyId: testProperty.id,
          tenantId: testTenant.id,
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-12-31'),
          monthlyRent: 1100,
          securityDepositAmount: 1100,
          status: 'Expired',
        },
      });

      await prisma.lease.create({
        data: {
          propertyId: otherProperty.id,
          tenantId: testTenant.id,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          monthlyRent: 1500,
          securityDepositAmount: 1500,
          status: 'Active',
        },
      });

      const response = await request(app)
        .get('/api/leases')
        .query({ property_id: testProperty.id, status: 'Active' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.leases).toHaveLength(1);
      expect(response.body.leases[0].propertyId).toBe(testProperty.id);
      expect(response.body.leases[0].status).toBe('Active');

      await prisma.property.delete({ where: { id: otherProperty.id } });
    });

    it('should reject invalid query parameters - invalid property_id', async () => {
      const response = await request(app)
        .get('/api/leases')
        .query({ property_id: 'invalid-id' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject invalid query parameters - invalid tenant_id', async () => {
      const response = await request(app)
        .get('/api/leases')
        .query({ tenant_id: 'invalid-id' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject invalid query parameters - invalid status', async () => {
      const response = await request(app)
        .get('/api/leases')
        .query({ status: 'InvalidStatus' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/leases/:id', () => {
    it('should return lease by id with relations', async () => {
      const lease = await prisma.lease.create({
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

      const response = await request(app).get(`/api/leases/${lease.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.lease.id).toBe(lease.id);
      expect(response.body.lease.property).toBeDefined();
      expect(response.body.lease.tenant).toBeDefined();
      expect(response.body.lease.property.id).toBe(testProperty.id);
      expect(response.body.lease.tenant.id).toBe(testTenant.id);
    });

    it('should return 404 for non-existent lease', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app).get(`/api/leases/${nonExistentId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Lease not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app).get('/api/leases/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid lease ID format');
    });
  });

  describe('PUT /api/leases/:id', () => {
    it('should require authentication', async () => {
      const lease = await prisma.lease.create({
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

      const response = await request(app)
        .put(`/api/leases/${lease.id}`)
        .send({ monthlyRent: 1300 });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should update lease with valid data', async () => {
      const lease = await prisma.lease.create({
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

      const updateData = {
        monthlyRent: 1300,
        status: 'Draft',
      };

      const response = await request(app)
        .put(`/api/leases/${lease.id}`)
        .set('Cookie', authCookies)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.lease.monthlyRent).toBe(1300);
      expect(response.body.lease.status).toBe('Draft');
      expect(response.body.lease.propertyId).toBe(testProperty.id); // Unchanged
    });

    it('should return 404 for non-existent lease', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .put(`/api/leases/${nonExistentId}`)
        .set('Cookie', authCookies)
        .send({ monthlyRent: 1300 });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Lease not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .put('/api/leases/invalid-id')
        .set('Cookie', authCookies)
        .send({ monthlyRent: 1300 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid lease ID format');
    });

    it('should validate new property exists if property is changed', async () => {
      const lease = await prisma.lease.create({
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

      const response = await request(app)
        .put(`/api/leases/${lease.id}`)
        .set('Cookie', authCookies)
        .send({ propertyId: '00000000-0000-0000-0000-000000000000' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Property not found');
    });

    it('should reject update if new property status is "For Sale"', async () => {
      const forSaleProperty = await prisma.property.create({
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

      const lease = await prisma.lease.create({
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

      const response = await request(app)
        .put(`/api/leases/${lease.id}`)
        .set('Cookie', authCookies)
        .send({ propertyId: forSaleProperty.id });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Property is not available');

      await prisma.property.delete({ where: { id: forSaleProperty.id } });
    });

    it('should validate new tenant exists if tenant is changed', async () => {
      const lease = await prisma.lease.create({
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

      const response = await request(app)
        .put(`/api/leases/${lease.id}`)
        .set('Cookie', authCookies)
        .send({ tenantId: '00000000-0000-0000-0000-000000000000' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Tenant not found');
    });

    it('should reject update if new tenant status is "Former"', async () => {
      const formerTenant = await prisma.tenant.create({
        data: {
          firstName: 'Former',
          lastName: 'Tenant',
          email: 'former@example.com',
          phone: '07700900999',
          status: 'Former',
        },
      });

      const lease = await prisma.lease.create({
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

      const response = await request(app)
        .put(`/api/leases/${lease.id}`)
        .set('Cookie', authCookies)
        .send({ tenantId: formerTenant.id });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Tenant is not active');

      await prisma.tenant.delete({ where: { id: formerTenant.id } });
    });

    it('should prevent overlapping ACTIVE leases when dates are changed', async () => {
      await prisma.lease.create({
        data: {
          propertyId: testProperty.id,
          tenantId: testTenant.id,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-06-30'),
          monthlyRent: 1200,
          securityDepositAmount: 1200,
          status: 'Active',
        },
      });

      const lease2 = await prisma.lease.create({
        data: {
          propertyId: testProperty.id,
          tenantId: testTenant.id,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          monthlyRent: 1200,
          securityDepositAmount: 1200,
          status: 'Active',
        },
      });

      // Try to extend lease2 start date to overlap with lease1
      const response = await request(app)
        .put(`/api/leases/${lease2.id}`)
        .set('Cookie', authCookies)
        .send({ startDate: new Date('2024-05-01') });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Cannot update lease: overlapping active lease exists for this property');
    });

    it('should allow updating dates if no overlap exists', async () => {
      const lease = await prisma.lease.create({
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

      const response = await request(app)
        .put(`/api/leases/${lease.id}`)
        .set('Cookie', authCookies)
        .send({ endDate: new Date('2025-06-30') });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(new Date(response.body.lease.endDate).toISOString()).toBe(new Date('2025-06-30').toISOString());
    });

    it('should allow partial updates', async () => {
      const lease = await prisma.lease.create({
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

      const response = await request(app)
        .put(`/api/leases/${lease.id}`)
        .set('Cookie', authCookies)
        .send({ monthlyRent: 1250 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.lease.monthlyRent).toBe(1250);
      expect(response.body.lease.status).toBe('Active'); // Unchanged
    });
  });

  describe('DELETE /api/leases/:id', () => {
    it('should require authentication', async () => {
      const lease = await prisma.lease.create({
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

      const response = await request(app).delete(`/api/leases/${lease.id}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should soft delete lease by changing status to Terminated', async () => {
      const lease = await prisma.lease.create({
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

      const response = await request(app)
        .delete(`/api/leases/${lease.id}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.lease.status).toBe('Terminated');
      expect(response.body.lease.id).toBe(lease.id);

      // Verify lease still exists in database
      const stillExists = await prisma.lease.findUnique({
        where: { id: lease.id },
      });
      expect(stillExists).not.toBeNull();
      expect(stillExists!.status).toBe('Terminated');
    });

    it('should return 404 for non-existent lease', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .delete(`/api/leases/${nonExistentId}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Lease not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .delete('/api/leases/invalid-id')
        .set('Cookie', authCookies);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid lease ID format');
    });

    it('should allow deleting already terminated lease', async () => {
      const lease = await prisma.lease.create({
        data: {
          propertyId: testProperty.id,
          tenantId: testTenant.id,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          monthlyRent: 1200,
          securityDepositAmount: 1200,
          status: 'Terminated',
        },
      });

      const response = await request(app)
        .delete(`/api/leases/${lease.id}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.lease.status).toBe('Terminated');
    });
  });

  describe('Integration scenarios', () => {
    it('should create, read, update, and delete a lease', async () => {
      // Create
      const createResponse = await request(app)
        .post('/api/leases')
        .set('Cookie', authCookies)
        .send(validLease);

      expect(createResponse.status).toBe(201);
      const leaseId = createResponse.body.lease.id;

      // Read single
      const readResponse = await request(app).get(`/api/leases/${leaseId}`);

      expect(readResponse.status).toBe(200);
      expect(readResponse.body.lease.id).toBe(leaseId);

      // Update
      const updateResponse = await request(app)
        .put(`/api/leases/${leaseId}`)
        .set('Cookie', authCookies)
        .send({ monthlyRent: 1400 });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.lease.monthlyRent).toBe(1400);

      // Delete
      const deleteResponse = await request(app)
        .delete(`/api/leases/${leaseId}`)
        .set('Cookie', authCookies);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.lease.status).toBe('Terminated');

      // Verify still accessible
      const finalReadResponse = await request(app).get(`/api/leases/${leaseId}`);
      expect(finalReadResponse.status).toBe(200);
      expect(finalReadResponse.body.lease.status).toBe('Terminated');
    });

    it('should handle multiple leases in list', async () => {
      // Create 3 leases
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/leases')
          .set('Cookie', authCookies)
          .send({
            ...validLease,
            startDate: new Date(`202${i + 2}-01-01`),
            endDate: new Date(`202${i + 2}-12-31`),
            status: i === 0 ? 'Active' : 'Expired',
          });
      }

      // List all
      const listResponse = await request(app).get('/api/leases');
      expect(listResponse.status).toBe(200);
      expect(listResponse.body.leases).toHaveLength(3);

      // Verify ordered by startDate desc (newest first)
      for (let i = 0; i < 2; i++) {
        const current = new Date(listResponse.body.leases[i].startDate);
        const next = new Date(listResponse.body.leases[i + 1].startDate);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });
  });
});
