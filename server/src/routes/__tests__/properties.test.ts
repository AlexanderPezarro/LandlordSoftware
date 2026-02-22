import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../app.js';
import prisma from '../../db/client.js';
import authService from '../../services/auth.service.js';
import { Roles } from '../../../../shared/types/user.types.js';

const app = createApp();

describe('Properties Routes', () => {
  // Test user credentials
  const testUser = {
    email: 'test@example.com',
    password: 'testPassword123',
  };

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

  let authCookies: string[];
  let viewerCookies: string[];
  let landlordCookies: string[];
  let adminCookies: string[];

  // Valid property data
  const validProperty = {
    name: 'Sunny Apartment',
    street: '123 Main Street',
    city: 'London',
    county: 'Greater London',
    postcode: 'SW1A 1AA',
    propertyType: 'Flat',
    status: 'Available',
    purchaseDate: new Date('2023-01-15T00:00:00.000Z'),
    purchasePrice: 250000,
    notes: 'Great location',
  };

  beforeAll(async () => {
    // Clean database
    await prisma.property.deleteMany({});
    await prisma.user.deleteMany({});

    // Create test user and login (default LANDLORD role)
    await authService.createUser(testUser.email, testUser.password);

    const loginResponse = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    authCookies = [loginResponse.headers['set-cookie']];

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
    await prisma.property.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean properties before each test
    await prisma.property.deleteMany({});
  });

  describe('POST /api/properties', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/properties')
        .send(validProperty);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should create a property with valid data', async () => {
      const response = await request(app)
        .post('/api/properties')
        .set('Cookie', authCookies)
        .send(validProperty);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.property).toMatchObject({
        name: validProperty.name,
        street: validProperty.street,
        city: validProperty.city,
        county: validProperty.county,
        postcode: validProperty.postcode,
        propertyType: validProperty.propertyType,
        status: validProperty.status,
        purchasePrice: validProperty.purchasePrice,
        notes: validProperty.notes,
      });
      expect(response.body.property.id).toBeDefined();
      expect(response.body.property.createdAt).toBeDefined();
      expect(response.body.property.updatedAt).toBeDefined();
    });

    it('should reject property without required name', async () => {
      const invalidProperty = { ...validProperty };
      delete (invalidProperty as any).name;

      const response = await request(app)
        .post('/api/properties')
        .set('Cookie', authCookies)
        .send(invalidProperty);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject property without required street', async () => {
      const invalidProperty = { ...validProperty };
      delete (invalidProperty as any).street;

      const response = await request(app)
        .post('/api/properties')
        .set('Cookie', authCookies)
        .send(invalidProperty);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject property without required city', async () => {
      const invalidProperty = { ...validProperty };
      delete (invalidProperty as any).city;

      const response = await request(app)
        .post('/api/properties')
        .set('Cookie', authCookies)
        .send(invalidProperty);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject property without required county', async () => {
      const invalidProperty = { ...validProperty };
      delete (invalidProperty as any).county;

      const response = await request(app)
        .post('/api/properties')
        .set('Cookie', authCookies)
        .send(invalidProperty);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject property with invalid UK postcode', async () => {
      const invalidProperty = { ...validProperty, postcode: 'INVALID' };

      const response = await request(app)
        .post('/api/properties')
        .set('Cookie', authCookies)
        .send(invalidProperty);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('postcode');
    });

    it('should reject property with invalid propertyType', async () => {
      const invalidProperty = { ...validProperty, propertyType: 'InvalidType' };

      const response = await request(app)
        .post('/api/properties')
        .set('Cookie', authCookies)
        .send(invalidProperty);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject property with invalid status', async () => {
      const invalidProperty = { ...validProperty, status: 'InvalidStatus' };

      const response = await request(app)
        .post('/api/properties')
        .set('Cookie', authCookies)
        .send(invalidProperty);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject property with negative purchase price', async () => {
      const invalidProperty = { ...validProperty, purchasePrice: -1000 };

      const response = await request(app)
        .post('/api/properties')
        .set('Cookie', authCookies)
        .send(invalidProperty);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('positive');
    });

    it('should create property with optional fields as null', async () => {
      const minimalProperty = {
        name: validProperty.name,
        street: validProperty.street,
        city: validProperty.city,
        county: validProperty.county,
        postcode: validProperty.postcode,
        propertyType: validProperty.propertyType,
        status: validProperty.status,
      };

      const response = await request(app)
        .post('/api/properties')
        .set('Cookie', authCookies)
        .send(minimalProperty);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.property.purchaseDate).toBeNull();
      expect(response.body.property.purchasePrice).toBeNull();
      expect(response.body.property.notes).toBeNull();
    });

    it('should accept various valid UK postcode formats', async () => {
      const postcodes = ['SW1A 1AA', 'M1 1AE', 'B33 8TH', 'CR2 6XH', 'DN55 1PT'];

      for (const postcode of postcodes) {
        const propertyData = { ...validProperty, postcode, name: `Property ${postcode}` };
        const response = await request(app)
          .post('/api/properties')
          .set('Cookie', authCookies)
          .send(propertyData);

        expect(response.status).toBe(201);
        expect(response.body.property.postcode).toBe(postcode);
      }
    });

    it('should block VIEWER role from creating properties', async () => {
      const response = await request(app)
        .post('/api/properties')
        .set('Cookie', viewerCookies)
        .send(validProperty);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should allow LANDLORD role to create properties', async () => {
      const response = await request(app)
        .post('/api/properties')
        .set('Cookie', landlordCookies)
        .send(validProperty);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.property).toMatchObject({
        name: validProperty.name,
        street: validProperty.street,
      });
    });

    it('should allow ADMIN role to create properties', async () => {
      const response = await request(app)
        .post('/api/properties')
        .set('Cookie', adminCookies)
        .send(validProperty);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.property).toMatchObject({
        name: validProperty.name,
        street: validProperty.street,
      });
    });
  });

  describe('GET /api/properties', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/properties');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return empty array when no properties exist', async () => {
      const response = await request(app)
        .get('/api/properties')
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.properties).toEqual([]);
    });

    it('should return all properties', async () => {
      // Create multiple properties
      const property1 = await prisma.property.create({ data: validProperty });
      const property2 = await prisma.property.create({
        data: {
          ...validProperty,
          name: 'Another Property',
          street: '456 Oak Avenue',
        },
      });

      const response = await request(app)
        .get('/api/properties')
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.properties).toHaveLength(2);

      // Check that properties are ordered by createdAt desc (newest first)
      expect(response.body.properties[0].id).toBe(property2.id);
      expect(response.body.properties[1].id).toBe(property1.id);
    });

    it('should filter properties by status', async () => {
      await prisma.property.create({ data: { ...validProperty, status: 'Available' } });
      await prisma.property.create({
        data: { ...validProperty, name: 'Occupied Property', status: 'Occupied' },
      });

      const response = await request(app)
        .get('/api/properties')
        .set('Cookie', authCookies)
        .query({ status: 'Available' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.properties).toHaveLength(1);
      expect(response.body.properties[0].status).toBe('Available');
    });

    it('should filter properties by propertyType', async () => {
      await prisma.property.create({ data: { ...validProperty, propertyType: 'Flat' } });
      await prisma.property.create({
        data: { ...validProperty, name: 'House Property', propertyType: 'House' },
      });

      const response = await request(app)
        .get('/api/properties')
        .set('Cookie', authCookies)
        .query({ propertyType: 'House' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.properties).toHaveLength(1);
      expect(response.body.properties[0].propertyType).toBe('House');
    });

    it('should search properties by name', async () => {
      await prisma.property.create({ data: { ...validProperty, name: 'Sunny Apartment' } });
      await prisma.property.create({
        data: { ...validProperty, name: 'Dark Basement', street: '999 Dark Lane' },
      });

      const response = await request(app)
        .get('/api/properties')
        .set('Cookie', authCookies)
        .query({ search: 'Sunny' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.properties).toHaveLength(1);
      expect(response.body.properties[0].name).toBe('Sunny Apartment');
    });

    it('should search properties by street', async () => {
      await prisma.property.create({ data: { ...validProperty, street: '123 Main Street' } });
      await prisma.property.create({
        data: { ...validProperty, name: 'Other Property', street: '456 Oak Avenue' },
      });

      const response = await request(app)
        .get('/api/properties')
        .set('Cookie', authCookies)
        .query({ search: 'Oak' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.properties).toHaveLength(1);
      expect(response.body.properties[0].street).toBe('456 Oak Avenue');
    });

    it('should search properties by city', async () => {
      await prisma.property.create({ data: { ...validProperty, city: 'London' } });
      await prisma.property.create({
        data: { ...validProperty, name: 'Manchester Property', city: 'Manchester' },
      });

      const response = await request(app)
        .get('/api/properties')
        .set('Cookie', authCookies)
        .query({ search: 'Manchester' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.properties).toHaveLength(1);
      expect(response.body.properties[0].city).toBe('Manchester');
    });

    it('should combine multiple filters', async () => {
      await prisma.property.create({
        data: { ...validProperty, status: 'Available', propertyType: 'Flat', name: 'Sunny Flat' },
      });
      await prisma.property.create({
        data: {
          ...validProperty,
          name: 'Sunny House',
          status: 'Available',
          propertyType: 'House',
        },
      });
      await prisma.property.create({
        data: { ...validProperty, name: 'Dark Flat', status: 'Occupied', propertyType: 'Flat' },
      });

      const response = await request(app)
        .get('/api/properties')
        .set('Cookie', authCookies)
        .query({ status: 'Available', propertyType: 'Flat', search: 'Sunny' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.properties).toHaveLength(1);
      expect(response.body.properties[0].name).toBe('Sunny Flat');
    });

    it('should reject invalid query parameters - invalid status', async () => {
      const response = await request(app)
        .get('/api/properties')
        .set('Cookie', authCookies)
        .query({ status: 'InvalidStatus' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject invalid query parameters - invalid propertyType', async () => {
      const response = await request(app)
        .get('/api/properties')
        .set('Cookie', authCookies)
        .query({ propertyType: 'InvalidType' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/properties/:id', () => {
    it('should require authentication', async () => {
      const property = await prisma.property.create({ data: validProperty });

      const response = await request(app).get(`/api/properties/${property.id}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return property by id', async () => {
      const property = await prisma.property.create({ data: validProperty });

      const response = await request(app)
        .get(`/api/properties/${property.id}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.property.id).toBe(property.id);
      expect(response.body.property.name).toBe(property.name);
    });

    it('should return 404 for non-existent property', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/properties/${nonExistentId}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Property not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/properties/invalid-id')
        .set('Cookie', authCookies);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid property ID format');
    });
  });

  describe('PUT /api/properties/:id', () => {
    it('should require authentication', async () => {
      const property = await prisma.property.create({ data: validProperty });

      const response = await request(app)
        .put(`/api/properties/${property.id}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should update property with valid data', async () => {
      const property = await prisma.property.create({ data: validProperty });

      const updateData = {
        name: 'Updated Apartment',
        status: 'Occupied',
      };

      const response = await request(app)
        .put(`/api/properties/${property.id}`)
        .set('Cookie', authCookies)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.property.name).toBe('Updated Apartment');
      expect(response.body.property.status).toBe('Occupied');
      expect(response.body.property.street).toBe(validProperty.street); // Unchanged
    });

    it('should return 404 for non-existent property', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .put(`/api/properties/${nonExistentId}`)
        .set('Cookie', authCookies)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Property not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .put('/api/properties/invalid-id')
        .set('Cookie', authCookies)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid property ID format');
    });

    it('should reject invalid postcode', async () => {
      const property = await prisma.property.create({ data: validProperty });

      const response = await request(app)
        .put(`/api/properties/${property.id}`)
        .set('Cookie', authCookies)
        .send({ postcode: 'INVALID' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('postcode');
    });

    it('should reject invalid propertyType', async () => {
      const property = await prisma.property.create({ data: validProperty });

      const response = await request(app)
        .put(`/api/properties/${property.id}`)
        .set('Cookie', authCookies)
        .send({ propertyType: 'InvalidType' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid status', async () => {
      const property = await prisma.property.create({ data: validProperty });

      const response = await request(app)
        .put(`/api/properties/${property.id}`)
        .set('Cookie', authCookies)
        .send({ status: 'InvalidStatus' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject negative purchase price', async () => {
      const property = await prisma.property.create({ data: validProperty });

      const response = await request(app)
        .put(`/api/properties/${property.id}`)
        .set('Cookie', authCookies)
        .send({ purchasePrice: -5000 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('positive');
    });

    it('should allow partial updates', async () => {
      const property = await prisma.property.create({ data: validProperty });

      const response = await request(app)
        .put(`/api/properties/${property.id}`)
        .set('Cookie', authCookies)
        .send({ notes: 'Updated notes only' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.property.notes).toBe('Updated notes only');
      expect(response.body.property.name).toBe(validProperty.name);
    });

    it('should update updatedAt timestamp', async () => {
      const property = await prisma.property.create({ data: validProperty });
      const originalUpdatedAt = property.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const response = await request(app)
        .put(`/api/properties/${property.id}`)
        .set('Cookie', authCookies)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      const updatedAt = new Date(response.body.property.updatedAt);
      expect(updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should block VIEWER role from updating properties', async () => {
      const property = await prisma.property.create({ data: validProperty });

      const response = await request(app)
        .put(`/api/properties/${property.id}`)
        .set('Cookie', viewerCookies)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should allow LANDLORD role to update properties', async () => {
      const property = await prisma.property.create({ data: validProperty });

      const response = await request(app)
        .put(`/api/properties/${property.id}`)
        .set('Cookie', landlordCookies)
        .send({ name: 'Updated by Landlord' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.property.name).toBe('Updated by Landlord');
    });

    it('should allow ADMIN role to update properties', async () => {
      const property = await prisma.property.create({ data: validProperty });

      const response = await request(app)
        .put(`/api/properties/${property.id}`)
        .set('Cookie', adminCookies)
        .send({ name: 'Updated by Admin' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.property.name).toBe('Updated by Admin');
    });
  });

  describe('DELETE /api/properties/:id', () => {
    it('should require authentication', async () => {
      const property = await prisma.property.create({ data: validProperty });

      const response = await request(app).delete(`/api/properties/${property.id}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should archive property (soft delete) when archive=true query param is used', async () => {
      const property = await prisma.property.create({ data: validProperty });

      const response = await request(app)
        .delete(`/api/properties/${property.id}?archive=true`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.property.status).toBe('For Sale');
      expect(response.body.property.id).toBe(property.id);

      // Verify property still exists in database
      const stillExists = await prisma.property.findUnique({
        where: { id: property.id },
      });
      expect(stillExists).not.toBeNull();
      expect(stillExists!.status).toBe('For Sale');
    });

    it('should permanently delete property (hard delete) when no archive param', async () => {
      const property = await prisma.property.create({ data: validProperty });

      const response = await request(app)
        .delete(`/api/properties/${property.id}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.property.id).toBe(property.id);

      // Verify property no longer exists in database
      const stillExists = await prisma.property.findUnique({
        where: { id: property.id },
      });
      expect(stillExists).toBeNull();
    });

    it('should cascade delete property leases when permanently deleting', async () => {
      const property = await prisma.property.create({ data: validProperty });
      const tenant = await prisma.tenant.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '07700900123',
          status: 'Active',
        },
      });

      // Create lease for property
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

      // Permanently delete property
      const response = await request(app)
        .delete(`/api/properties/${property.id}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);

      // Verify property is deleted
      const propertyExists = await prisma.property.findUnique({
        where: { id: property.id },
      });
      expect(propertyExists).toBeNull();

      // Verify lease is also deleted (cascaded)
      const leaseExists = await prisma.lease.findUnique({
        where: { id: lease.id },
      });
      expect(leaseExists).toBeNull();
    });

    it('should cascade delete property transactions when permanently deleting', async () => {
      const property = await prisma.property.create({ data: validProperty });

      // Create transaction for property
      const transaction = await prisma.transaction.create({
        data: {
          propertyId: property.id,
          type: 'Income',
          category: 'Rent',
          amount: 1000,
          transactionDate: new Date('2024-01-01'),
          description: 'Monthly rent',
        },
      });

      // Permanently delete property
      const response = await request(app)
        .delete(`/api/properties/${property.id}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);

      // Verify property is deleted
      const propertyExists = await prisma.property.findUnique({
        where: { id: property.id },
      });
      expect(propertyExists).toBeNull();

      // Verify transaction is also deleted (cascaded)
      const transactionExists = await prisma.transaction.findUnique({
        where: { id: transaction.id },
      });
      expect(transactionExists).toBeNull();
    });

    it('should cascade delete property events when permanently deleting', async () => {
      const property = await prisma.property.create({ data: validProperty });

      // Create event for property
      const event = await prisma.event.create({
        data: {
          propertyId: property.id,
          eventType: 'Maintenance',
          title: 'Fix heating',
          scheduledDate: new Date('2024-02-01'),
        },
      });

      // Permanently delete property
      const response = await request(app)
        .delete(`/api/properties/${property.id}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);

      // Verify property is deleted
      const propertyExists = await prisma.property.findUnique({
        where: { id: property.id },
      });
      expect(propertyExists).toBeNull();

      // Verify event is also deleted (cascaded)
      const eventExists = await prisma.event.findUnique({
        where: { id: event.id },
      });
      expect(eventExists).toBeNull();
    });

    it('should delete property documents when permanently deleting', async () => {
      const property = await prisma.property.create({ data: validProperty });

      // Create document for property
      const document = await prisma.document.create({
        data: {
          entityType: 'property',
          entityId: property.id,
          fileName: 'test.pdf',
          filePath: '/uploads/test.pdf',
          fileType: 'application/pdf',
          fileSize: 1024,
        },
      });

      // Permanently delete property
      const response = await request(app)
        .delete(`/api/properties/${property.id}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);

      // Verify property is deleted
      const propertyExists = await prisma.property.findUnique({
        where: { id: property.id },
      });
      expect(propertyExists).toBeNull();

      // Verify document is also deleted
      const documentExists = await prisma.document.findUnique({
        where: { id: document.id },
      });
      expect(documentExists).toBeNull();
    });

    it('should return 404 for non-existent property', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .delete(`/api/properties/${nonExistentId}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Property not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .delete('/api/properties/invalid-id')
        .set('Cookie', authCookies);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid property ID format');
    });

    it('should allow archiving already archived property', async () => {
      const property = await prisma.property.create({
        data: { ...validProperty, status: 'For Sale' },
      });

      const response = await request(app)
        .delete(`/api/properties/${property.id}?archive=true`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.property.status).toBe('For Sale');
    });

    it('should block VIEWER role from deleting properties', async () => {
      const property = await prisma.property.create({ data: validProperty });

      const response = await request(app)
        .delete(`/api/properties/${property.id}`)
        .set('Cookie', viewerCookies);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should allow LANDLORD role to delete properties', async () => {
      const property = await prisma.property.create({ data: validProperty });

      const response = await request(app)
        .delete(`/api/properties/${property.id}`)
        .set('Cookie', landlordCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.property.status).toBe('For Sale');
    });

    it('should allow ADMIN role to delete properties', async () => {
      const property = await prisma.property.create({ data: validProperty });

      const response = await request(app)
        .delete(`/api/properties/${property.id}`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.property.status).toBe('For Sale');
    });
  });

  describe('Integration scenarios', () => {
    it('should create, read, update, and archive a property', async () => {
      // Create
      const createResponse = await request(app)
        .post('/api/properties')
        .set('Cookie', authCookies)
        .send(validProperty);

      expect(createResponse.status).toBe(201);
      const propertyId = createResponse.body.property.id;

      // Read single
      const readResponse = await request(app)
        .get(`/api/properties/${propertyId}`)
        .set('Cookie', authCookies);

      expect(readResponse.status).toBe(200);
      expect(readResponse.body.property.id).toBe(propertyId);

      // Update
      const updateResponse = await request(app)
        .put(`/api/properties/${propertyId}`)
        .set('Cookie', authCookies)
        .send({ status: 'Occupied' });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.property.status).toBe('Occupied');

      // Archive (soft delete)
      const archiveResponse = await request(app)
        .delete(`/api/properties/${propertyId}?archive=true`)
        .set('Cookie', authCookies);

      expect(archiveResponse.status).toBe(200);
      expect(archiveResponse.body.property.status).toBe('For Sale');

      // Verify still accessible
      const finalReadResponse = await request(app)
        .get(`/api/properties/${propertyId}`)
        .set('Cookie', authCookies);
      expect(finalReadResponse.status).toBe(200);
      expect(finalReadResponse.body.property.status).toBe('For Sale');
    });

    it('should handle multiple properties in list', async () => {
      // Create 5 properties
      const properties = [];
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/properties')
          .set('Cookie', authCookies)
          .send({
            ...validProperty,
            name: `Property ${i + 1}`,
          });
        properties.push(response.body.property);
      }

      // List all
      const listResponse = await request(app)
        .get('/api/properties')
        .set('Cookie', authCookies);
      expect(listResponse.status).toBe(200);
      expect(listResponse.body.properties).toHaveLength(5);

      // Verify ordered by creation date desc (newest first)
      for (let i = 0; i < 4; i++) {
        const current = new Date(listResponse.body.properties[i].createdAt);
        const next = new Date(listResponse.body.properties[i + 1].createdAt);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });
  });

  describe('Edge cases', () => {
    it('should allow creating properties with duplicate addresses', async () => {
      // Create first property
      const response1 = await request(app)
        .post('/api/properties')
        .set('Cookie', authCookies)
        .send(validProperty);

      expect(response1.status).toBe(201);
      expect(response1.body.success).toBe(true);

      // Create second property with identical address
      const response2 = await request(app)
        .post('/api/properties')
        .set('Cookie', authCookies)
        .send(validProperty);

      expect(response2.status).toBe(201);
      expect(response2.body.success).toBe(true);
      expect(response2.body.property.street).toBe(validProperty.street);
      expect(response2.body.property.postcode).toBe(validProperty.postcode);

      // Verify different IDs
      expect(response2.body.property.id).not.toBe(response1.body.property.id);

      // Verify both exist in database
      const listResponse = await request(app)
        .get('/api/properties')
        .set('Cookie', authCookies);
      expect(listResponse.status).toBe(200);
      expect(listResponse.body.properties).toHaveLength(2);
    });

    it('should protect against SQL injection in search parameter', async () => {
      // Create a test property
      await prisma.property.create({ data: validProperty });

      // Attempt SQL injection in search parameter
      const response = await request(app)
        .get('/api/properties')
        .set('Cookie', authCookies)
        .query({ search: "' OR '1'='1" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Should return empty array (Prisma protects against SQL injection)
      // The injection string should be treated as a literal search term
      expect(response.body.properties).toHaveLength(0);
    });
  });
});
