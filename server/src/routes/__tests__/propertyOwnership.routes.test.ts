import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../app.js';
import prisma from '../../db/client.js';
import authService from '../../services/auth.service.js';

const app = createApp();

describe('Property Ownership Routes', () => {
  // Test user credentials
  const testUser = {
    email: 'test@example.com',
    password: 'testPassword123',
  };

  let authCookies: string[];
  let testProperty: any;
  let testUser1: any;
  let testUser2: any;
  let testUser3: any;

  beforeAll(async () => {
    // Clean database
    await prisma.propertyOwnership.deleteMany({});
    await prisma.property.deleteMany({});
    await prisma.user.deleteMany({});

    // Create test admin user and login
    await authService.createUser(testUser.email, testUser.password, 'ADMIN');

    const loginResponse = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    authCookies = [loginResponse.headers['set-cookie']];

    // Create test users for ownership
    testUser1 = await prisma.user.create({
      data: {
        email: 'owner1@example.com',
        password: 'password123',
        role: 'LANDLORD',
      },
    });

    testUser2 = await prisma.user.create({
      data: {
        email: 'owner2@example.com',
        password: 'password123',
        role: 'LANDLORD',
      },
    });

    testUser3 = await prisma.user.create({
      data: {
        email: 'owner3@example.com',
        password: 'password123',
        role: 'LANDLORD',
      },
    });

    // Create test property
    testProperty = await prisma.property.create({
      data: {
        name: 'Test Property',
        street: '123 Main St',
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
    await prisma.propertyOwnership.deleteMany({});
    await prisma.property.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean ownerships before each test
    await prisma.propertyOwnership.deleteMany({});
  });

  describe('POST /api/properties/:id/owners', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/properties/${testProperty.id}/owners`)
        .send({
          userId: testUser1.id,
          ownershipPercentage: 100,
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should add an owner with valid data', async () => {
      const response = await request(app)
        .post(`/api/properties/${testProperty.id}/owners`)
        .set('Cookie', authCookies)
        .send({
          userId: testUser1.id,
          ownershipPercentage: 100,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.ownership).toMatchObject({
        userId: testUser1.id,
        propertyId: testProperty.id,
        ownershipPercentage: 100,
      });
      expect(response.body.ownership.user).toMatchObject({
        id: testUser1.id,
        email: testUser1.email,
        role: testUser1.role,
      });
      expect(response.body.ownership.id).toBeDefined();
    });

    it('should reject duplicate ownership', async () => {
      // Add first ownership
      await request(app)
        .post(`/api/properties/${testProperty.id}/owners`)
        .set('Cookie', authCookies)
        .send({
          userId: testUser1.id,
          ownershipPercentage: 100,
        });

      // Try to add duplicate
      const response = await request(app)
        .post(`/api/properties/${testProperty.id}/owners`)
        .set('Cookie', authCookies)
        .send({
          userId: testUser1.id,
          ownershipPercentage: 50,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User already owns this property');
    });

    it('should reject if total ownership exceeds 100%', async () => {
      // Add first owner with 80%
      await request(app)
        .post(`/api/properties/${testProperty.id}/owners`)
        .set('Cookie', authCookies)
        .send({
          userId: testUser1.id,
          ownershipPercentage: 80,
        });

      // Try to add second owner with 30% (total = 110%)
      const response = await request(app)
        .post(`/api/properties/${testProperty.id}/owners`)
        .set('Cookie', authCookies)
        .send({
          userId: testUser2.id,
          ownershipPercentage: 30,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Total ownership must equal 100%');
      expect(response.body.error).toContain('110.00%');
    });

    it('should reject if total ownership is less than 100%', async () => {
      // Add first owner with 50%
      await request(app)
        .post(`/api/properties/${testProperty.id}/owners`)
        .set('Cookie', authCookies)
        .send({
          userId: testUser1.id,
          ownershipPercentage: 50,
        });

      // Try to add second owner with 30% (total = 80%)
      const response = await request(app)
        .post(`/api/properties/${testProperty.id}/owners`)
        .set('Cookie', authCookies)
        .send({
          userId: testUser2.id,
          ownershipPercentage: 30,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Total ownership must equal 100%');
      expect(response.body.error).toContain('80.00%');
    });

    it('should accept multiple owners totaling exactly 100%', async () => {
      // Add first owner with 50%
      await request(app)
        .post(`/api/properties/${testProperty.id}/owners`)
        .set('Cookie', authCookies)
        .send({
          userId: testUser1.id,
          ownershipPercentage: 50,
        });

      // Add second owner with 50% (total = 100%)
      const response = await request(app)
        .post(`/api/properties/${testProperty.id}/owners`)
        .set('Cookie', authCookies)
        .send({
          userId: testUser2.id,
          ownershipPercentage: 50,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.ownership.ownershipPercentage).toBe(50);
    });

    it('should reject invalid property ID format', async () => {
      const response = await request(app)
        .post('/api/properties/invalid-id/owners')
        .set('Cookie', authCookies)
        .send({
          userId: testUser1.id,
          ownershipPercentage: 100,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid property ID format');
    });

    it('should reject non-existent property', async () => {
      const fakePropertyId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post(`/api/properties/${fakePropertyId}/owners`)
        .set('Cookie', authCookies)
        .send({
          userId: testUser1.id,
          ownershipPercentage: 100,
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Property not found');
    });

    it('should reject non-existent user', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post(`/api/properties/${testProperty.id}/owners`)
        .set('Cookie', authCookies)
        .send({
          userId: fakeUserId,
          ownershipPercentage: 100,
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });

    it('should reject ownership percentage < 0.01', async () => {
      const response = await request(app)
        .post(`/api/properties/${testProperty.id}/owners`)
        .set('Cookie', authCookies)
        .send({
          userId: testUser1.id,
          ownershipPercentage: 0,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Ownership must be at least 0.01%');
    });

    it('should reject ownership percentage > 100', async () => {
      const response = await request(app)
        .post(`/api/properties/${testProperty.id}/owners`)
        .set('Cookie', authCookies)
        .send({
          userId: testUser1.id,
          ownershipPercentage: 101,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Ownership cannot exceed 100%');
    });

    it('should reject missing userId', async () => {
      const response = await request(app)
        .post(`/api/properties/${testProperty.id}/owners`)
        .set('Cookie', authCookies)
        .send({
          ownershipPercentage: 100,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject missing ownershipPercentage', async () => {
      const response = await request(app)
        .post(`/api/properties/${testProperty.id}/owners`)
        .set('Cookie', authCookies)
        .send({
          userId: testUser1.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/properties/:id/owners/:userId', () => {
    beforeEach(async () => {
      // Set up initial ownership
      await prisma.propertyOwnership.create({
        data: {
          userId: testUser1.id,
          propertyId: testProperty.id,
          ownershipPercentage: 100,
        },
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put(`/api/properties/${testProperty.id}/owners/${testUser1.id}`)
        .send({
          ownershipPercentage: 50,
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should update ownership percentage', async () => {
      // Add second owner
      await prisma.propertyOwnership.create({
        data: {
          userId: testUser2.id,
          propertyId: testProperty.id,
          ownershipPercentage: 0.01,
        },
      });

      // Update first owner to 99.99% (so total stays 100%)
      const response = await request(app)
        .put(`/api/properties/${testProperty.id}/owners/${testUser1.id}`)
        .set('Cookie', authCookies)
        .send({
          ownershipPercentage: 99.99,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.ownership.ownershipPercentage).toBe(99.99);
      expect(response.body.ownership.user).toMatchObject({
        id: testUser1.id,
        email: testUser1.email,
      });
    });

    it('should reject update if total ownership would exceed 100%', async () => {
      // Add second owner with 20%
      await prisma.propertyOwnership.create({
        data: {
          userId: testUser2.id,
          propertyId: testProperty.id,
          ownershipPercentage: 20,
        },
      });

      // Update database directly to make total != 100%
      await prisma.propertyOwnership.update({
        where: {
          userId_propertyId: {
            userId: testUser1.id,
            propertyId: testProperty.id,
          },
        },
        data: { ownershipPercentage: 80 },
      });

      // Try to update first owner to 90% (total would be 110%)
      const response = await request(app)
        .put(`/api/properties/${testProperty.id}/owners/${testUser1.id}`)
        .set('Cookie', authCookies)
        .send({
          ownershipPercentage: 90,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Total ownership must equal 100%');
      expect(response.body.error).toContain('110.00%');

      // Verify rollback - ownership should remain at 80%
      const ownership = await prisma.propertyOwnership.findUnique({
        where: {
          userId_propertyId: {
            userId: testUser1.id,
            propertyId: testProperty.id,
          },
        },
      });
      expect(ownership?.ownershipPercentage).toBe(80);
    });

    it('should reject update if total ownership would be less than 100%', async () => {
      // Add second owner with 50%
      await prisma.propertyOwnership.create({
        data: {
          userId: testUser2.id,
          propertyId: testProperty.id,
          ownershipPercentage: 50,
        },
      });

      // Update database directly to make total != 100%
      await prisma.propertyOwnership.update({
        where: {
          userId_propertyId: {
            userId: testUser1.id,
            propertyId: testProperty.id,
          },
        },
        data: { ownershipPercentage: 50 },
      });

      // Try to update first owner to 30% (total would be 80%)
      const response = await request(app)
        .put(`/api/properties/${testProperty.id}/owners/${testUser1.id}`)
        .set('Cookie', authCookies)
        .send({
          ownershipPercentage: 30,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Total ownership must equal 100%');
      expect(response.body.error).toContain('80.00%');
    });

    it('should reject invalid property ID format', async () => {
      const response = await request(app)
        .put(`/api/properties/invalid-id/owners/${testUser1.id}`)
        .set('Cookie', authCookies)
        .send({
          ownershipPercentage: 50,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid property ID format');
    });

    it('should reject invalid user ID format', async () => {
      const response = await request(app)
        .put(`/api/properties/${testProperty.id}/owners/invalid-id`)
        .set('Cookie', authCookies)
        .send({
          ownershipPercentage: 50,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid user ID format');
    });

    it('should reject non-existent ownership', async () => {
      const response = await request(app)
        .put(`/api/properties/${testProperty.id}/owners/${testUser3.id}`)
        .set('Cookie', authCookies)
        .send({
          ownershipPercentage: 50,
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Ownership not found');
    });

    it('should reject ownership percentage < 0.01', async () => {
      const response = await request(app)
        .put(`/api/properties/${testProperty.id}/owners/${testUser1.id}`)
        .set('Cookie', authCookies)
        .send({
          ownershipPercentage: 0,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Ownership must be at least 0.01%');
    });

    it('should reject ownership percentage > 100', async () => {
      const response = await request(app)
        .put(`/api/properties/${testProperty.id}/owners/${testUser1.id}`)
        .set('Cookie', authCookies)
        .send({
          ownershipPercentage: 150,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Ownership cannot exceed 100%');
    });
  });

  describe('DELETE /api/properties/:id/owners/:userId', () => {
    beforeEach(async () => {
      // Set up initial ownership
      await prisma.propertyOwnership.create({
        data: {
          userId: testUser1.id,
          propertyId: testProperty.id,
          ownershipPercentage: 100,
        },
      });
    });

    it('should require authentication', async () => {
      const response = await request(app).delete(
        `/api/properties/${testProperty.id}/owners/${testUser1.id}`
      );

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should delete ownership', async () => {
      const response = await request(app)
        .delete(`/api/properties/${testProperty.id}/owners/${testUser1.id}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(204);

      // Verify deletion
      const ownership = await prisma.propertyOwnership.findUnique({
        where: {
          userId_propertyId: {
            userId: testUser1.id,
            propertyId: testProperty.id,
          },
        },
      });
      expect(ownership).toBeNull();
    });

    it('should reject deletion if owner has transaction splits', async () => {
      // Create a transaction for the property
      const transaction = await prisma.transaction.create({
        data: {
          propertyId: testProperty.id,
          type: 'EXPENSE',
          category: 'Maintenance',
          amount: 1000,
          transactionDate: new Date(),
          description: 'Test expense',
        },
      });

      // Create a split for testUser1
      await prisma.transactionSplit.create({
        data: {
          transactionId: transaction.id,
          userId: testUser1.id,
          percentage: 100,
          amount: 1000,
        },
      });

      const response = await request(app)
        .delete(`/api/properties/${testProperty.id}/owners/${testUser1.id}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Cannot remove owner with existing transaction splits');

      // Clean up
      await prisma.transactionSplit.deleteMany({});
      await prisma.transaction.deleteMany({});
    });

    it('should reject deletion if owner has settlements (as fromUser)', async () => {
      // Create a settlement from testUser1
      await prisma.settlement.create({
        data: {
          fromUserId: testUser1.id,
          toUserId: testUser2.id,
          propertyId: testProperty.id,
          amount: 500,
          settlementDate: new Date(),
        },
      });

      const response = await request(app)
        .delete(`/api/properties/${testProperty.id}/owners/${testUser1.id}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Cannot remove owner with existing settlements');

      // Clean up
      await prisma.settlement.deleteMany({});
    });

    it('should reject deletion if owner has settlements (as toUser)', async () => {
      // Create a settlement to testUser1
      await prisma.settlement.create({
        data: {
          fromUserId: testUser2.id,
          toUserId: testUser1.id,
          propertyId: testProperty.id,
          amount: 500,
          settlementDate: new Date(),
        },
      });

      const response = await request(app)
        .delete(`/api/properties/${testProperty.id}/owners/${testUser1.id}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Cannot remove owner with existing settlements');

      // Clean up
      await prisma.settlement.deleteMany({});
    });

    it('should reject invalid property ID format', async () => {
      const response = await request(app)
        .delete(`/api/properties/invalid-id/owners/${testUser1.id}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid property ID format');
    });

    it('should reject invalid user ID format', async () => {
      const response = await request(app)
        .delete(`/api/properties/${testProperty.id}/owners/invalid-id`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid user ID format');
    });

    it('should reject non-existent ownership', async () => {
      const response = await request(app)
        .delete(`/api/properties/${testProperty.id}/owners/${testUser3.id}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Ownership not found');
    });

    it('should not validate ownership sum after deletion', async () => {
      // Add second owner
      await prisma.propertyOwnership.create({
        data: {
          userId: testUser2.id,
          propertyId: testProperty.id,
          ownershipPercentage: 50,
        },
      });

      // Delete first owner (total will be 50% which is not 100%)
      const response = await request(app)
        .delete(`/api/properties/${testProperty.id}/owners/${testUser1.id}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(204);

      // Verify only second owner remains
      const ownerships = await prisma.propertyOwnership.findMany({
        where: { propertyId: testProperty.id },
      });
      expect(ownerships).toHaveLength(1);
      expect(ownerships[0].userId).toBe(testUser2.id);
    });
  });

  describe('GET /api/properties/:id/owners', () => {
    it('should require authentication', async () => {
      const response = await request(app).get(`/api/properties/${testProperty.id}/owners`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should list property owners', async () => {
      // Add multiple owners
      await prisma.propertyOwnership.create({
        data: {
          userId: testUser1.id,
          propertyId: testProperty.id,
          ownershipPercentage: 60,
        },
      });

      await prisma.propertyOwnership.create({
        data: {
          userId: testUser2.id,
          propertyId: testProperty.id,
          ownershipPercentage: 40,
        },
      });

      const response = await request(app)
        .get(`/api/properties/${testProperty.id}/owners`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.ownerships).toHaveLength(2);

      // Should be ordered by ownership percentage descending
      expect(response.body.ownerships[0]).toMatchObject({
        userId: testUser1.id,
        propertyId: testProperty.id,
        ownershipPercentage: 60,
      });
      expect(response.body.ownerships[0].user).toMatchObject({
        id: testUser1.id,
        email: testUser1.email,
        role: testUser1.role,
      });

      expect(response.body.ownerships[1]).toMatchObject({
        userId: testUser2.id,
        propertyId: testProperty.id,
        ownershipPercentage: 40,
      });
    });

    it('should return empty array for property with no owners', async () => {
      const response = await request(app)
        .get(`/api/properties/${testProperty.id}/owners`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.ownerships).toEqual([]);
    });

    it('should reject invalid property ID format', async () => {
      const response = await request(app)
        .get('/api/properties/invalid-id/owners')
        .set('Cookie', authCookies);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid property ID format');
    });

    it('should reject non-existent property', async () => {
      const fakePropertyId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/properties/${fakePropertyId}/owners`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Property not found');
    });

    it('should order owners by percentage descending', async () => {
      // Add owners with different percentages
      await prisma.propertyOwnership.create({
        data: {
          userId: testUser1.id,
          propertyId: testProperty.id,
          ownershipPercentage: 25,
        },
      });

      await prisma.propertyOwnership.create({
        data: {
          userId: testUser2.id,
          propertyId: testProperty.id,
          ownershipPercentage: 50,
        },
      });

      await prisma.propertyOwnership.create({
        data: {
          userId: testUser3.id,
          propertyId: testProperty.id,
          ownershipPercentage: 25,
        },
      });

      const response = await request(app)
        .get(`/api/properties/${testProperty.id}/owners`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.ownerships).toHaveLength(3);
      expect(response.body.ownerships[0].ownershipPercentage).toBe(50);
      expect(response.body.ownerships[0].userId).toBe(testUser2.id);
      // The next two can be in any order as they have the same percentage
      expect(response.body.ownerships[1].ownershipPercentage).toBe(25);
      expect(response.body.ownerships[2].ownershipPercentage).toBe(25);
    });
  });
});
