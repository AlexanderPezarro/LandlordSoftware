import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../app.js';
import prisma from '../../db/client.js';
import authService from '../../services/auth.service.js';

const app = createApp();

describe('Tenants Routes', () => {
  // Test user credentials
  const testUser = {
    email: 'test@example.com',
    password: 'testPassword123',
  };

  let authCookies: string[];

  // Valid tenant data
  const validTenant = {
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@example.com',
    phone: '07700900123',
    status: 'Active',
    emergencyContactName: 'Jane Smith',
    emergencyContactPhone: '07700900456',
    notes: 'Excellent tenant',
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
    // Clean tenants and leases before each test
    await prisma.lease.deleteMany({});
    await prisma.tenant.deleteMany({});
    await prisma.property.deleteMany({});
  });

  describe('POST /api/tenants', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/tenants')
        .send(validTenant);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should create a tenant with valid data', async () => {
      const response = await request(app)
        .post('/api/tenants')
        .set('Cookie', authCookies)
        .send(validTenant);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.tenant).toMatchObject({
        firstName: validTenant.firstName,
        lastName: validTenant.lastName,
        email: validTenant.email,
        phone: validTenant.phone,
        status: validTenant.status,
        emergencyContactName: validTenant.emergencyContactName,
        emergencyContactPhone: validTenant.emergencyContactPhone,
        notes: validTenant.notes,
      });
      expect(response.body.tenant.id).toBeDefined();
      expect(response.body.tenant.createdAt).toBeDefined();
      expect(response.body.tenant.updatedAt).toBeDefined();
    });

    it('should reject tenant without required firstName', async () => {
      const invalidTenant = { ...validTenant };
      delete (invalidTenant as any).firstName;

      const response = await request(app)
        .post('/api/tenants')
        .set('Cookie', authCookies)
        .send(invalidTenant);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject tenant without required lastName', async () => {
      const invalidTenant = { ...validTenant };
      delete (invalidTenant as any).lastName;

      const response = await request(app)
        .post('/api/tenants')
        .set('Cookie', authCookies)
        .send(invalidTenant);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject tenant without required email', async () => {
      const invalidTenant = { ...validTenant };
      delete (invalidTenant as any).email;

      const response = await request(app)
        .post('/api/tenants')
        .set('Cookie', authCookies)
        .send(invalidTenant);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject tenant with invalid email format', async () => {
      const invalidTenant = { ...validTenant, email: 'invalid-email' };

      const response = await request(app)
        .post('/api/tenants')
        .set('Cookie', authCookies)
        .send(invalidTenant);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('email');
    });

    it('should reject tenant without required phone', async () => {
      const invalidTenant = { ...validTenant };
      delete (invalidTenant as any).phone;

      const response = await request(app)
        .post('/api/tenants')
        .set('Cookie', authCookies)
        .send(invalidTenant);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject tenant with invalid UK phone format', async () => {
      const invalidTenant = { ...validTenant, phone: '123' };

      const response = await request(app)
        .post('/api/tenants')
        .set('Cookie', authCookies)
        .send(invalidTenant);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('phone');
    });

    it('should reject tenant with invalid status', async () => {
      const invalidTenant = { ...validTenant, status: 'InvalidStatus' };

      const response = await request(app)
        .post('/api/tenants')
        .set('Cookie', authCookies)
        .send(invalidTenant);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should create tenant with optional fields as null', async () => {
      const minimalTenant = {
        firstName: validTenant.firstName,
        lastName: validTenant.lastName,
        email: validTenant.email,
        phone: validTenant.phone,
        status: validTenant.status,
      };

      const response = await request(app)
        .post('/api/tenants')
        .set('Cookie', authCookies)
        .send(minimalTenant);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.tenant.emergencyContactName).toBeNull();
      expect(response.body.tenant.emergencyContactPhone).toBeNull();
      expect(response.body.tenant.notes).toBeNull();
    });

    it('should accept various valid UK phone formats', async () => {
      const phones = ['07700900123', '+447700900123', '+44 7700900123', '07700 900123'];

      for (const phone of phones) {
        const tenantData = { ...validTenant, phone, email: `tenant${phone.replace(/\D/g, '')}@example.com` };
        const response = await request(app)
          .post('/api/tenants')
          .set('Cookie', authCookies)
          .send(tenantData);

        expect(response.status).toBe(201);
        expect(response.body.tenant.phone).toBe(phone);
      }
    });

    it('should accept all valid tenant statuses', async () => {
      const statuses = ['Prospective', 'Active', 'Former'];

      for (const status of statuses) {
        const tenantData = { ...validTenant, status, email: `tenant-${status}@example.com` };
        const response = await request(app)
          .post('/api/tenants')
          .set('Cookie', authCookies)
          .send(tenantData);

        expect(response.status).toBe(201);
        expect(response.body.tenant.status).toBe(status);
      }
    });
  });

  describe('GET /api/tenants', () => {
    it('should return empty array when no tenants exist', async () => {
      const response = await request(app).get('/api/tenants');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tenants).toEqual([]);
    });

    it('should return all tenants', async () => {
      // Create multiple tenants
      const tenant1 = await prisma.tenant.create({ data: validTenant });
      const tenant2 = await prisma.tenant.create({
        data: {
          ...validTenant,
          firstName: 'Jane',
          email: 'jane.doe@example.com',
        },
      });

      const response = await request(app).get('/api/tenants');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tenants).toHaveLength(2);

      // Check that tenants are ordered by createdAt desc (newest first)
      expect(response.body.tenants[0].id).toBe(tenant2.id);
      expect(response.body.tenants[1].id).toBe(tenant1.id);
    });

    it('should filter tenants by status', async () => {
      await prisma.tenant.create({ data: { ...validTenant, status: 'Active' } });
      await prisma.tenant.create({
        data: { ...validTenant, firstName: 'Jane', email: 'jane@example.com', status: 'Prospective' },
      });

      const response = await request(app)
        .get('/api/tenants')
        .query({ status: 'Active' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tenants).toHaveLength(1);
      expect(response.body.tenants[0].status).toBe('Active');
    });

    it('should search tenants by firstName', async () => {
      await prisma.tenant.create({ data: { ...validTenant, firstName: 'John' } });
      await prisma.tenant.create({
        data: { ...validTenant, firstName: 'Jane', email: 'jane@example.com' },
      });

      const response = await request(app)
        .get('/api/tenants')
        .query({ search: 'John' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tenants).toHaveLength(1);
      expect(response.body.tenants[0].firstName).toBe('John');
    });

    it('should search tenants by lastName', async () => {
      await prisma.tenant.create({ data: { ...validTenant, lastName: 'Smith' } });
      await prisma.tenant.create({
        data: { ...validTenant, lastName: 'Jones', email: 'jones@example.com' },
      });

      const response = await request(app)
        .get('/api/tenants')
        .query({ search: 'Jones' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tenants).toHaveLength(1);
      expect(response.body.tenants[0].lastName).toBe('Jones');
    });

    it('should search tenants by email', async () => {
      await prisma.tenant.create({ data: { ...validTenant, email: 'john@example.com' } });
      await prisma.tenant.create({
        data: { ...validTenant, email: 'jane@example.com', firstName: 'Jane' },
      });

      const response = await request(app)
        .get('/api/tenants')
        .query({ search: 'jane@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tenants).toHaveLength(1);
      expect(response.body.tenants[0].email).toBe('jane@example.com');
    });

    it('should combine status and search filters', async () => {
      await prisma.tenant.create({
        data: { ...validTenant, status: 'Active', firstName: 'John', email: 'john@example.com' },
      });
      await prisma.tenant.create({
        data: { ...validTenant, firstName: 'John', email: 'john2@example.com', status: 'Prospective' },
      });
      await prisma.tenant.create({
        data: { ...validTenant, firstName: 'Jane', email: 'jane@example.com', status: 'Active' },
      });

      const response = await request(app)
        .get('/api/tenants')
        .query({ status: 'Active', search: 'John' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tenants).toHaveLength(1);
      expect(response.body.tenants[0].firstName).toBe('John');
      expect(response.body.tenants[0].status).toBe('Active');
    });

    it('should reject invalid query parameters - invalid status', async () => {
      const response = await request(app)
        .get('/api/tenants')
        .query({ status: 'InvalidStatus' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/tenants/:id', () => {
    it('should return tenant by id', async () => {
      const tenant = await prisma.tenant.create({ data: validTenant });

      const response = await request(app).get(`/api/tenants/${tenant.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tenant.id).toBe(tenant.id);
      expect(response.body.tenant.firstName).toBe(tenant.firstName);
    });

    it('should return 404 for non-existent tenant', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app).get(`/api/tenants/${nonExistentId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Tenant not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app).get('/api/tenants/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid tenant ID format');
    });
  });

  describe('PUT /api/tenants/:id', () => {
    it('should require authentication', async () => {
      const tenant = await prisma.tenant.create({ data: validTenant });

      const response = await request(app)
        .put(`/api/tenants/${tenant.id}`)
        .send({ firstName: 'Updated Name' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should update tenant with valid data', async () => {
      const tenant = await prisma.tenant.create({ data: validTenant });

      const updateData = {
        firstName: 'Updated John',
        status: 'Former',
      };

      const response = await request(app)
        .put(`/api/tenants/${tenant.id}`)
        .set('Cookie', authCookies)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tenant.firstName).toBe('Updated John');
      expect(response.body.tenant.status).toBe('Former');
      expect(response.body.tenant.lastName).toBe(validTenant.lastName); // Unchanged
    });

    it('should return 404 for non-existent tenant', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .put(`/api/tenants/${nonExistentId}`)
        .set('Cookie', authCookies)
        .send({ firstName: 'Updated Name' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Tenant not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .put('/api/tenants/invalid-id')
        .set('Cookie', authCookies)
        .send({ firstName: 'Updated Name' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid tenant ID format');
    });

    it('should reject invalid email', async () => {
      const tenant = await prisma.tenant.create({ data: validTenant });

      const response = await request(app)
        .put(`/api/tenants/${tenant.id}`)
        .set('Cookie', authCookies)
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('email');
    });

    it('should reject invalid phone format', async () => {
      const tenant = await prisma.tenant.create({ data: validTenant });

      const response = await request(app)
        .put(`/api/tenants/${tenant.id}`)
        .set('Cookie', authCookies)
        .send({ phone: '123' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('phone');
    });

    it('should reject invalid status', async () => {
      const tenant = await prisma.tenant.create({ data: validTenant });

      const response = await request(app)
        .put(`/api/tenants/${tenant.id}`)
        .set('Cookie', authCookies)
        .send({ status: 'InvalidStatus' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should allow partial updates', async () => {
      const tenant = await prisma.tenant.create({ data: validTenant });

      const response = await request(app)
        .put(`/api/tenants/${tenant.id}`)
        .set('Cookie', authCookies)
        .send({ notes: 'Updated notes only' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tenant.notes).toBe('Updated notes only');
      expect(response.body.tenant.firstName).toBe(validTenant.firstName);
    });

    it('should update updatedAt timestamp', async () => {
      const tenant = await prisma.tenant.create({ data: validTenant });
      const originalUpdatedAt = tenant.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const response = await request(app)
        .put(`/api/tenants/${tenant.id}`)
        .set('Cookie', authCookies)
        .send({ firstName: 'Updated Name' });

      expect(response.status).toBe(200);
      const updatedAt = new Date(response.body.tenant.updatedAt);
      expect(updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('DELETE /api/tenants/:id', () => {
    it('should require authentication', async () => {
      const tenant = await prisma.tenant.create({ data: validTenant });

      const response = await request(app).delete(`/api/tenants/${tenant.id}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should archive tenant (soft delete) when archive=true query param is used', async () => {
      const tenant = await prisma.tenant.create({ data: validTenant });

      const response = await request(app)
        .delete(`/api/tenants/${tenant.id}?archive=true`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tenant.status).toBe('Former');
      expect(response.body.tenant.id).toBe(tenant.id);

      // Verify tenant still exists in database
      const stillExists = await prisma.tenant.findUnique({
        where: { id: tenant.id },
      });
      expect(stillExists).not.toBeNull();
      expect(stillExists!.status).toBe('Former');
    });

    it('should permanently delete tenant (hard delete) when no archive param', async () => {
      const tenant = await prisma.tenant.create({ data: validTenant });

      const response = await request(app)
        .delete(`/api/tenants/${tenant.id}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tenant.id).toBe(tenant.id);

      // Verify tenant no longer exists in database
      const stillExists = await prisma.tenant.findUnique({
        where: { id: tenant.id },
      });
      expect(stillExists).toBeNull();
    });

    it('should cascade delete tenant leases when permanently deleting', async () => {
      const tenant = await prisma.tenant.create({ data: validTenant });
      const property = await prisma.property.create({
        data: {
          name: 'Test Property',
          street: '123 Test St',
          city: 'London',
          county: 'Greater London',
          postcode: 'SW1A 1AA',
          propertyType: 'Flat',
          status: 'Available',
        },
      });

      // Create lease for tenant
      const lease = await prisma.lease.create({
        data: {
          propertyId: property.id,
          tenantId: tenant.id,
          startDate: new Date('2024-01-01'),
          monthlyRent: 1000,
          securityDepositAmount: 1500,
          status: 'Active',
        },
      });

      // Permanently delete tenant
      const response = await request(app)
        .delete(`/api/tenants/${tenant.id}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);

      // Verify tenant is deleted
      const tenantExists = await prisma.tenant.findUnique({
        where: { id: tenant.id },
      });
      expect(tenantExists).toBeNull();

      // Verify lease is also deleted (cascaded)
      const leaseExists = await prisma.lease.findUnique({
        where: { id: lease.id },
      });
      expect(leaseExists).toBeNull();
    });

    it('should delete tenant documents when permanently deleting', async () => {
      const tenant = await prisma.tenant.create({ data: validTenant });

      // Create document for tenant
      const document = await prisma.document.create({
        data: {
          entityType: 'tenant',
          entityId: tenant.id,
          fileName: 'test.pdf',
          filePath: '/uploads/test.pdf',
          fileType: 'application/pdf',
          fileSize: 1024,
        },
      });

      // Permanently delete tenant
      const response = await request(app)
        .delete(`/api/tenants/${tenant.id}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);

      // Verify tenant is deleted
      const tenantExists = await prisma.tenant.findUnique({
        where: { id: tenant.id },
      });
      expect(tenantExists).toBeNull();

      // Verify document is also deleted
      const documentExists = await prisma.document.findUnique({
        where: { id: document.id },
      });
      expect(documentExists).toBeNull();
    });

    it('should return 404 for non-existent tenant', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .delete(`/api/tenants/${nonExistentId}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Tenant not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .delete('/api/tenants/invalid-id')
        .set('Cookie', authCookies);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid tenant ID format');
    });

    it('should allow archiving already archived tenant', async () => {
      const tenant = await prisma.tenant.create({
        data: { ...validTenant, status: 'Former' },
      });

      const response = await request(app)
        .delete(`/api/tenants/${tenant.id}?archive=true`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tenant.status).toBe('Former');
    });
  });

  describe('GET /api/tenants/:id/lease-history', () => {
    let tenant: any;
    let property1: any;
    let property2: any;

    beforeEach(async () => {
      // Create test tenant
      tenant = await prisma.tenant.create({ data: validTenant });

      // Create test properties
      property1 = await prisma.property.create({
        data: {
          name: 'Property 1',
          street: '123 Main Street',
          city: 'London',
          county: 'Greater London',
          postcode: 'SW1A 1AA',
          propertyType: 'Flat',
          status: 'Available',
        },
      });

      property2 = await prisma.property.create({
        data: {
          name: 'Property 2',
          street: '456 Oak Avenue',
          city: 'Manchester',
          county: 'Greater Manchester',
          postcode: 'M1 1AE',
          propertyType: 'House',
          status: 'Occupied',
        },
      });
    });

    it('should return empty array when tenant has no leases', async () => {
      const response = await request(app).get(`/api/tenants/${tenant.id}/lease-history`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.leases).toEqual([]);
    });

    it('should return all leases with property details', async () => {
      // Create leases
      const lease1 = await prisma.lease.create({
        data: {
          propertyId: property1.id,
          tenantId: tenant.id,
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-12-31'),
          monthlyRent: 1000,
          securityDepositAmount: 1500,
          status: 'Expired',
        },
      });

      const lease2 = await prisma.lease.create({
        data: {
          propertyId: property2.id,
          tenantId: tenant.id,
          startDate: new Date('2024-01-01'),
          endDate: null,
          monthlyRent: 1200,
          securityDepositAmount: 1800,
          status: 'Active',
        },
      });

      const response = await request(app).get(`/api/tenants/${tenant.id}/lease-history`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.leases).toHaveLength(2);

      // Should be ordered by startDate desc (most recent first)
      expect(response.body.leases[0].id).toBe(lease2.id);
      expect(response.body.leases[1].id).toBe(lease1.id);

      // Should include full property details
      expect(response.body.leases[0].property).toMatchObject({
        id: property2.id,
        name: property2.name,
        street: property2.street,
        city: property2.city,
      });

      expect(response.body.leases[1].property).toMatchObject({
        id: property1.id,
        name: property1.name,
        street: property1.street,
        city: property1.city,
      });
    });

    it('should filter leases by date range - fromDate only', async () => {
      // Lease 1: 2023-01-01 to 2023-12-31 (should NOT be included)
      await prisma.lease.create({
        data: {
          propertyId: property1.id,
          tenantId: tenant.id,
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-12-31'),
          monthlyRent: 1000,
          securityDepositAmount: 1500,
          status: 'Expired',
        },
      });

      // Lease 2: 2024-01-01 to null (should be included)
      await prisma.lease.create({
        data: {
          propertyId: property2.id,
          tenantId: tenant.id,
          startDate: new Date('2024-01-01'),
          endDate: null,
          monthlyRent: 1200,
          securityDepositAmount: 1800,
          status: 'Active',
        },
      });

      const response = await request(app)
        .get(`/api/tenants/${tenant.id}/lease-history`)
        .query({ fromDate: '2024-01-01' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.leases).toHaveLength(1);
      expect(response.body.leases[0].startDate).toContain('2024-01-01');
    });

    it('should filter leases by date range - toDate only', async () => {
      // Lease 1: 2023-01-01 to 2023-12-31 (should be included)
      await prisma.lease.create({
        data: {
          propertyId: property1.id,
          tenantId: tenant.id,
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-12-31'),
          monthlyRent: 1000,
          securityDepositAmount: 1500,
          status: 'Expired',
        },
      });

      // Lease 2: 2024-01-01 to null (should NOT be included)
      await prisma.lease.create({
        data: {
          propertyId: property2.id,
          tenantId: tenant.id,
          startDate: new Date('2024-01-01'),
          endDate: null,
          monthlyRent: 1200,
          securityDepositAmount: 1800,
          status: 'Active',
        },
      });

      const response = await request(app)
        .get(`/api/tenants/${tenant.id}/lease-history`)
        .query({ toDate: '2023-12-31' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.leases).toHaveLength(1);
      expect(response.body.leases[0].startDate).toContain('2023-01-01');
    });

    it('should filter leases by date range - both fromDate and toDate', async () => {
      // Lease 1: 2023-01-01 to 2023-06-30 (should NOT be included)
      await prisma.lease.create({
        data: {
          propertyId: property1.id,
          tenantId: tenant.id,
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-06-30'),
          monthlyRent: 1000,
          securityDepositAmount: 1500,
          status: 'Expired',
        },
      });

      // Lease 2: 2023-06-01 to 2023-12-31 (should be included - overlaps)
      await prisma.lease.create({
        data: {
          propertyId: property2.id,
          tenantId: tenant.id,
          startDate: new Date('2023-06-01'),
          endDate: new Date('2023-12-31'),
          monthlyRent: 1200,
          securityDepositAmount: 1800,
          status: 'Expired',
        },
      });

      // Lease 3: 2024-01-01 to null (should NOT be included)
      await prisma.lease.create({
        data: {
          propertyId: property1.id,
          tenantId: tenant.id,
          startDate: new Date('2024-01-01'),
          endDate: null,
          monthlyRent: 1300,
          securityDepositAmount: 2000,
          status: 'Active',
        },
      });

      const response = await request(app)
        .get(`/api/tenants/${tenant.id}/lease-history`)
        .query({ fromDate: '2023-07-01', toDate: '2023-12-31' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.leases).toHaveLength(1);
      expect(response.body.leases[0].startDate).toContain('2023-06-01');
    });

    it('should include open-ended leases when filtering by fromDate', async () => {
      // Lease with no end date (open-ended)
      await prisma.lease.create({
        data: {
          propertyId: property1.id,
          tenantId: tenant.id,
          startDate: new Date('2023-01-01'),
          endDate: null,
          monthlyRent: 1000,
          securityDepositAmount: 1500,
          status: 'Active',
        },
      });

      const response = await request(app)
        .get(`/api/tenants/${tenant.id}/lease-history`)
        .query({ fromDate: '2024-01-01' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.leases).toHaveLength(1);
      expect(response.body.leases[0].endDate).toBeNull();
    });

    it('should return 404 for non-existent tenant', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app).get(`/api/tenants/${nonExistentId}/lease-history`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Tenant not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app).get('/api/tenants/invalid-id/lease-history');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid tenant ID format');
    });

    it('should reject invalid date format in query params', async () => {
      const response = await request(app)
        .get(`/api/tenants/${tenant.id}/lease-history`)
        .query({ fromDate: 'invalid-date' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Integration scenarios', () => {
    it('should create, read, update, and archive a tenant', async () => {
      // Create
      const createResponse = await request(app)
        .post('/api/tenants')
        .set('Cookie', authCookies)
        .send(validTenant);

      expect(createResponse.status).toBe(201);
      const tenantId = createResponse.body.tenant.id;

      // Read single
      const readResponse = await request(app).get(`/api/tenants/${tenantId}`);

      expect(readResponse.status).toBe(200);
      expect(readResponse.body.tenant.id).toBe(tenantId);

      // Update
      const updateResponse = await request(app)
        .put(`/api/tenants/${tenantId}`)
        .set('Cookie', authCookies)
        .send({ status: 'Prospective' });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.tenant.status).toBe('Prospective');

      // Archive (soft delete)
      const archiveResponse = await request(app)
        .delete(`/api/tenants/${tenantId}?archive=true`)
        .set('Cookie', authCookies);

      expect(archiveResponse.status).toBe(200);
      expect(archiveResponse.body.tenant.status).toBe('Former');

      // Verify still accessible
      const finalReadResponse = await request(app).get(`/api/tenants/${tenantId}`);
      expect(finalReadResponse.status).toBe(200);
      expect(finalReadResponse.body.tenant.status).toBe('Former');
    });

    it('should handle multiple tenants in list', async () => {
      // Create 5 tenants
      const tenants = [];
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/tenants')
          .set('Cookie', authCookies)
          .send({
            ...validTenant,
            email: `tenant${i + 1}@example.com`,
            firstName: `Tenant${i + 1}`,
          });
        tenants.push(response.body.tenant);
      }

      // List all
      const listResponse = await request(app).get('/api/tenants');
      expect(listResponse.status).toBe(200);
      expect(listResponse.body.tenants).toHaveLength(5);

      // Verify ordered by creation date desc (newest first)
      for (let i = 0; i < 4; i++) {
        const current = new Date(listResponse.body.tenants[i].createdAt);
        const next = new Date(listResponse.body.tenants[i + 1].createdAt);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });
  });

  describe('Edge cases', () => {
    it('should allow creating tenants with duplicate emails', async () => {
      // Create first tenant
      const response1 = await request(app)
        .post('/api/tenants')
        .set('Cookie', authCookies)
        .send(validTenant);

      expect(response1.status).toBe(201);
      expect(response1.body.success).toBe(true);

      // Create second tenant with identical email
      const response2 = await request(app)
        .post('/api/tenants')
        .set('Cookie', authCookies)
        .send(validTenant);

      expect(response2.status).toBe(201);
      expect(response2.body.success).toBe(true);
      expect(response2.body.tenant.email).toBe(validTenant.email);

      // Verify different IDs
      expect(response2.body.tenant.id).not.toBe(response1.body.tenant.id);

      // Verify both exist in database
      const listResponse = await request(app).get('/api/tenants');
      expect(listResponse.status).toBe(200);
      expect(listResponse.body.tenants).toHaveLength(2);
    });

    it('should protect against SQL injection in search parameter', async () => {
      // Create a test tenant
      await prisma.tenant.create({ data: validTenant });

      // Attempt SQL injection in search parameter
      const response = await request(app)
        .get('/api/tenants')
        .query({ search: "' OR '1'='1" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Should return empty array (Prisma protects against SQL injection)
      // The injection string should be treated as a literal search term
      expect(response.body.tenants).toHaveLength(0);
    });
  });
});
