import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../app.js';
import prisma from '../../db/client.js';
import authService from '../../services/auth.service.js';
import { Roles } from '../../../../shared/types/user.types.js';

const app = createApp();

describe('Events Routes', () => {
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
  let testPropertyId: string;

  // Valid event data
  const validEvent = {
    propertyId: '', // Will be set in beforeAll
    eventType: 'Inspection',
    title: 'Annual Property Inspection',
    description: 'Routine annual inspection',
    scheduledDate: new Date('2026-02-15T10:00:00.000Z'),
    completed: false,
  };

  beforeAll(async () => {
    // Clean database
    await prisma.event.deleteMany({});
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

    testPropertyId = property.id;
    validEvent.propertyId = testPropertyId;
  });

  afterAll(async () => {
    // Clean up after all tests
    await prisma.event.deleteMany({});
    await prisma.property.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean events before each test
    await prisma.event.deleteMany({});
  });

  describe('POST /api/events', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/events')
        .send(validEvent);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should create an event with valid data', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Cookie', authCookies)
        .send(validEvent);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.event).toMatchObject({
        propertyId: validEvent.propertyId,
        eventType: validEvent.eventType,
        title: validEvent.title,
        description: validEvent.description,
        completed: false,
        completedDate: null,
      });
      expect(response.body.event.id).toBeDefined();
      expect(response.body.event.createdAt).toBeDefined();
      expect(response.body.event.updatedAt).toBeDefined();
    });

    it('should reject event without required title', async () => {
      const invalidEvent = { ...validEvent };
      delete (invalidEvent as any).title;

      const response = await request(app)
        .post('/api/events')
        .set('Cookie', authCookies)
        .send(invalidEvent);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject event without required propertyId', async () => {
      const invalidEvent = { ...validEvent };
      delete (invalidEvent as any).propertyId;

      const response = await request(app)
        .post('/api/events')
        .set('Cookie', authCookies)
        .send(invalidEvent);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject event with invalid propertyId UUID', async () => {
      const invalidEvent = { ...validEvent, propertyId: 'invalid-uuid' };

      const response = await request(app)
        .post('/api/events')
        .set('Cookie', authCookies)
        .send(invalidEvent);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid property ID');
    });

    it('should reject event without required eventType', async () => {
      const invalidEvent = { ...validEvent };
      delete (invalidEvent as any).eventType;

      const response = await request(app)
        .post('/api/events')
        .set('Cookie', authCookies)
        .send(invalidEvent);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject event with invalid eventType', async () => {
      const invalidEvent = { ...validEvent, eventType: 'InvalidType' };

      const response = await request(app)
        .post('/api/events')
        .set('Cookie', authCookies)
        .send(invalidEvent);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should accept all valid event types', async () => {
      const eventTypes = [
        'Inspection',
        'Maintenance',
        'Repair',
        'Meeting',
        'Rent Due Date',
        'Lease Renewal',
        'Viewing',
      ];

      for (const eventType of eventTypes) {
        const eventData = { ...validEvent, eventType, title: `Event ${eventType}` };
        const response = await request(app)
          .post('/api/events')
          .set('Cookie', authCookies)
          .send(eventData);

        expect(response.status).toBe(201);
        expect(response.body.event.eventType).toBe(eventType);
      }
    });

    it('should reject event without required scheduledDate', async () => {
      const invalidEvent = { ...validEvent };
      delete (invalidEvent as any).scheduledDate;

      const response = await request(app)
        .post('/api/events')
        .set('Cookie', authCookies)
        .send(invalidEvent);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should create event with optional fields as null', async () => {
      const minimalEvent = {
        propertyId: validEvent.propertyId,
        eventType: validEvent.eventType,
        title: validEvent.title,
        scheduledDate: validEvent.scheduledDate,
      };

      const response = await request(app)
        .post('/api/events')
        .set('Cookie', authCookies)
        .send(minimalEvent);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.event.description).toBeNull();
      expect(response.body.event.completed).toBe(false);
      expect(response.body.event.completedDate).toBeNull();
    });

    it('should accept string date format for scheduledDate', async () => {
      const eventWithStringDate = {
        ...validEvent,
        scheduledDate: '2026-03-01T14:30:00.000Z',
      };

      const response = await request(app)
        .post('/api/events')
        .set('Cookie', authCookies)
        .send(eventWithStringDate);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should block VIEWER role from creating events', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Cookie', viewerCookies)
        .send(validEvent);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should allow LANDLORD role to create events', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Cookie', landlordCookies)
        .send(validEvent);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.event).toMatchObject({
        propertyId: validEvent.propertyId,
        eventType: validEvent.eventType,
        title: validEvent.title,
      });
    });

    it('should allow ADMIN role to create events', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Cookie', adminCookies)
        .send(validEvent);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.event).toMatchObject({
        propertyId: validEvent.propertyId,
        eventType: validEvent.eventType,
        title: validEvent.title,
      });
    });
  });

  describe('GET /api/events', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/events');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return empty array when no events exist', async () => {
      const response = await request(app)
        .get('/api/events')
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.events).toEqual([]);
    });

    it('should return all events', async () => {
      // Create multiple events
      const event1 = await prisma.event.create({
        data: {
          ...validEvent,
          title: 'Event 1',
        },
      });
      const event2 = await prisma.event.create({
        data: {
          ...validEvent,
          title: 'Event 2',
          eventType: 'Maintenance',
        },
      });

      const response = await request(app)
        .get('/api/events')
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.events).toHaveLength(2);

      // Check that events are ordered by scheduledDate asc (earliest first)
      expect(response.body.events[0].id).toBe(event1.id);
      expect(response.body.events[1].id).toBe(event2.id);
    });

    it('should filter events by propertyId', async () => {
      // Create another property
      const property2 = await prisma.property.create({
        data: {
          name: 'Second Property',
          street: '456 Test Street',
          city: 'London',
          county: 'Greater London',
          postcode: 'SW1A 2BB',
          propertyType: 'House',
          status: 'Available',
        },
      });

      await prisma.event.create({
        data: { ...validEvent, propertyId: testPropertyId },
      });
      await prisma.event.create({
        data: { ...validEvent, propertyId: property2.id, title: 'Property 2 Event' },
      });

      const response = await request(app)
        .get('/api/events')
        .set('Cookie', authCookies)
        .query({ propertyId: testPropertyId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.events).toHaveLength(1);
      expect(response.body.events[0].propertyId).toBe(testPropertyId);
    });

    it('should filter events by eventType', async () => {
      await prisma.event.create({
        data: { ...validEvent, eventType: 'Inspection' },
      });
      await prisma.event.create({
        data: { ...validEvent, eventType: 'Maintenance', title: 'Maintenance Event' },
      });
      await prisma.event.create({
        data: { ...validEvent, eventType: 'Repair', title: 'Repair Event' },
      });

      const response = await request(app)
        .get('/api/events')
        .set('Cookie', authCookies)
        .query({ eventType: 'Maintenance' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.events).toHaveLength(1);
      expect(response.body.events[0].eventType).toBe('Maintenance');
    });

    it('should filter events by completed status - false', async () => {
      await prisma.event.create({
        data: { ...validEvent, completed: false },
      });
      await prisma.event.create({
        data: {
          ...validEvent,
          title: 'Completed Event',
          completed: true,
          completedDate: new Date(),
        },
      });

      const response = await request(app)
        .get('/api/events')
        .set('Cookie', authCookies)
        .query({ completed: 'false' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.events).toHaveLength(1);
      expect(response.body.events[0].completed).toBe(false);
    });

    it('should filter events by completed status - true', async () => {
      await prisma.event.create({
        data: { ...validEvent, completed: false },
      });
      await prisma.event.create({
        data: {
          ...validEvent,
          title: 'Completed Event',
          completed: true,
          completedDate: new Date(),
        },
      });

      const response = await request(app)
        .get('/api/events')
        .set('Cookie', authCookies)
        .query({ completed: 'true' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.events).toHaveLength(1);
      expect(response.body.events[0].completed).toBe(true);
    });

    it('should filter events by fromDate', async () => {
      await prisma.event.create({
        data: {
          ...validEvent,
          title: 'Early Event',
          scheduledDate: new Date('2026-01-15T10:00:00.000Z'),
        },
      });
      await prisma.event.create({
        data: {
          ...validEvent,
          title: 'Later Event',
          scheduledDate: new Date('2026-03-15T10:00:00.000Z'),
        },
      });

      const response = await request(app)
        .get('/api/events')
        .set('Cookie', authCookies)
        .query({ fromDate: '2026-02-01T00:00:00.000Z' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.events).toHaveLength(1);
      expect(response.body.events[0].title).toBe('Later Event');
    });

    it('should filter events by toDate', async () => {
      await prisma.event.create({
        data: {
          ...validEvent,
          title: 'Early Event',
          scheduledDate: new Date('2026-01-15T10:00:00.000Z'),
        },
      });
      await prisma.event.create({
        data: {
          ...validEvent,
          title: 'Later Event',
          scheduledDate: new Date('2026-03-15T10:00:00.000Z'),
        },
      });

      const response = await request(app)
        .get('/api/events')
        .set('Cookie', authCookies)
        .query({ toDate: '2026-02-01T00:00:00.000Z' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.events).toHaveLength(1);
      expect(response.body.events[0].title).toBe('Early Event');
    });

    it('should filter events by date range (fromDate and toDate)', async () => {
      await prisma.event.create({
        data: {
          ...validEvent,
          title: 'Before Range',
          scheduledDate: new Date('2026-01-01T10:00:00.000Z'),
        },
      });
      await prisma.event.create({
        data: {
          ...validEvent,
          title: 'In Range',
          scheduledDate: new Date('2026-02-15T10:00:00.000Z'),
        },
      });
      await prisma.event.create({
        data: {
          ...validEvent,
          title: 'After Range',
          scheduledDate: new Date('2026-04-01T10:00:00.000Z'),
        },
      });

      const response = await request(app)
        .get('/api/events')
        .set('Cookie', authCookies)
        .query({
          fromDate: '2026-02-01T00:00:00.000Z',
          toDate: '2026-03-01T00:00:00.000Z',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.events).toHaveLength(1);
      expect(response.body.events[0].title).toBe('In Range');
    });

    it('should combine multiple filters', async () => {
      await prisma.event.create({
        data: {
          ...validEvent,
          eventType: 'Inspection',
          completed: false,
          scheduledDate: new Date('2026-02-15T10:00:00.000Z'),
        },
      });
      await prisma.event.create({
        data: {
          ...validEvent,
          title: 'Wrong Type',
          eventType: 'Maintenance',
          completed: false,
          scheduledDate: new Date('2026-02-15T10:00:00.000Z'),
        },
      });
      await prisma.event.create({
        data: {
          ...validEvent,
          title: 'Completed',
          eventType: 'Inspection',
          completed: true,
          completedDate: new Date(),
          scheduledDate: new Date('2026-02-15T10:00:00.000Z'),
        },
      });

      const response = await request(app)
        .get('/api/events')
        .set('Cookie', authCookies)
        .query({
          propertyId: testPropertyId,
          eventType: 'Inspection',
          completed: 'false',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.events).toHaveLength(1);
      expect(response.body.events[0].title).toBe('Annual Property Inspection');
    });

    it('should reject invalid query parameters - invalid propertyId', async () => {
      const response = await request(app)
        .get('/api/events')
        .set('Cookie', authCookies)
        .query({ propertyId: 'invalid-uuid' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid property ID');
    });

    it('should reject invalid query parameters - invalid eventType', async () => {
      const response = await request(app)
        .get('/api/events')
        .set('Cookie', authCookies)
        .query({ eventType: 'InvalidType' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/events/:id', () => {
    it('should require authentication', async () => {
      const event = await prisma.event.create({ data: validEvent });

      const response = await request(app).get(`/api/events/${event.id}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return event by id', async () => {
      const event = await prisma.event.create({ data: validEvent });

      const response = await request(app)
        .get(`/api/events/${event.id}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.event.id).toBe(event.id);
      expect(response.body.event.title).toBe(event.title);
    });

    it('should return 404 for non-existent event', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/events/${nonExistentId}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Event not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/events/invalid-id')
        .set('Cookie', authCookies);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid event ID format');
    });
  });

  describe('PUT /api/events/:id', () => {
    it('should require authentication', async () => {
      const event = await prisma.event.create({ data: validEvent });

      const response = await request(app)
        .put(`/api/events/${event.id}`)
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should update event with valid data', async () => {
      const event = await prisma.event.create({ data: validEvent });

      const updateData = {
        title: 'Updated Inspection',
        eventType: 'Maintenance',
        description: 'Updated description',
      };

      const response = await request(app)
        .put(`/api/events/${event.id}`)
        .set('Cookie', authCookies)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.event.title).toBe('Updated Inspection');
      expect(response.body.event.eventType).toBe('Maintenance');
      expect(response.body.event.description).toBe('Updated description');
      expect(response.body.event.propertyId).toBe(validEvent.propertyId); // Unchanged
    });

    it('should return 404 for non-existent event', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .put(`/api/events/${nonExistentId}`)
        .set('Cookie', authCookies)
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Event not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .put('/api/events/invalid-id')
        .set('Cookie', authCookies)
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid event ID format');
    });

    it('should reject invalid eventType', async () => {
      const event = await prisma.event.create({ data: validEvent });

      const response = await request(app)
        .put(`/api/events/${event.id}`)
        .set('Cookie', authCookies)
        .send({ eventType: 'InvalidType' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid propertyId', async () => {
      const event = await prisma.event.create({ data: validEvent });

      const response = await request(app)
        .put(`/api/events/${event.id}`)
        .set('Cookie', authCookies)
        .send({ propertyId: 'invalid-uuid' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid property ID');
    });

    it('should allow partial updates', async () => {
      const event = await prisma.event.create({ data: validEvent });

      const response = await request(app)
        .put(`/api/events/${event.id}`)
        .set('Cookie', authCookies)
        .send({ description: 'Updated description only' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.event.description).toBe('Updated description only');
      expect(response.body.event.title).toBe(validEvent.title);
    });

    it('should update updatedAt timestamp', async () => {
      const event = await prisma.event.create({ data: validEvent });
      const originalUpdatedAt = event.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const response = await request(app)
        .put(`/api/events/${event.id}`)
        .set('Cookie', authCookies)
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(200);
      const updatedAt = new Date(response.body.event.updatedAt);
      expect(updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should block VIEWER role from updating events', async () => {
      const event = await prisma.event.create({ data: validEvent });

      const response = await request(app)
        .put(`/api/events/${event.id}`)
        .set('Cookie', viewerCookies)
        .send({ title: 'Updated by Viewer' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should allow LANDLORD role to update events', async () => {
      const event = await prisma.event.create({ data: validEvent });

      const response = await request(app)
        .put(`/api/events/${event.id}`)
        .set('Cookie', landlordCookies)
        .send({ title: 'Updated by Landlord' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.event.title).toBe('Updated by Landlord');
    });

    it('should allow ADMIN role to update events', async () => {
      const event = await prisma.event.create({ data: validEvent });

      const response = await request(app)
        .put(`/api/events/${event.id}`)
        .set('Cookie', adminCookies)
        .send({ title: 'Updated by Admin' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.event.title).toBe('Updated by Admin');
    });
  });

  describe('PATCH /api/events/:id/complete', () => {
    it('should require authentication', async () => {
      const event = await prisma.event.create({ data: validEvent });

      const response = await request(app)
        .patch(`/api/events/${event.id}/complete`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should mark event as completed with current timestamp', async () => {
      const event = await prisma.event.create({ data: validEvent });
      const beforeComplete = new Date();

      const response = await request(app)
        .patch(`/api/events/${event.id}/complete`)
        .set('Cookie', authCookies);

      const afterComplete = new Date();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.event.completed).toBe(true);
      expect(response.body.event.completedDate).toBeDefined();

      const completedDate = new Date(response.body.event.completedDate);
      expect(completedDate.getTime()).toBeGreaterThanOrEqual(beforeComplete.getTime());
      expect(completedDate.getTime()).toBeLessThanOrEqual(afterComplete.getTime());
    });

    it('should return 404 for non-existent event', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .patch(`/api/events/${nonExistentId}/complete`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Event not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .patch('/api/events/invalid-id/complete')
        .set('Cookie', authCookies);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid event ID format');
    });

    it('should allow marking already completed event as completed again', async () => {
      const event = await prisma.event.create({
        data: {
          ...validEvent,
          completed: true,
          completedDate: new Date('2026-01-10T10:00:00.000Z'),
        },
      });

      const response = await request(app)
        .patch(`/api/events/${event.id}/complete`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.event.completed).toBe(true);
      // completedDate should be updated to current time
      const completedDate = new Date(response.body.event.completedDate);
      const originalDate = new Date('2026-01-10T10:00:00.000Z');
      expect(completedDate.getTime()).toBeGreaterThan(originalDate.getTime());
    });

    it('should block VIEWER role from completing events', async () => {
      const event = await prisma.event.create({ data: validEvent });

      const response = await request(app)
        .patch(`/api/events/${event.id}/complete`)
        .set('Cookie', viewerCookies);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should allow LANDLORD role to complete events', async () => {
      const event = await prisma.event.create({ data: validEvent });

      const response = await request(app)
        .patch(`/api/events/${event.id}/complete`)
        .set('Cookie', landlordCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.event.completed).toBe(true);
      expect(response.body.event.completedDate).toBeDefined();
    });

    it('should allow ADMIN role to complete events', async () => {
      const event = await prisma.event.create({ data: validEvent });

      const response = await request(app)
        .patch(`/api/events/${event.id}/complete`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.event.completed).toBe(true);
      expect(response.body.event.completedDate).toBeDefined();
    });
  });

  describe('DELETE /api/events/:id', () => {
    it('should require authentication', async () => {
      const event = await prisma.event.create({ data: validEvent });

      const response = await request(app).delete(`/api/events/${event.id}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should hard delete event', async () => {
      const event = await prisma.event.create({ data: validEvent });

      const response = await request(app)
        .delete(`/api/events/${event.id}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Event deleted successfully');

      // Verify event is deleted from database
      const deletedEvent = await prisma.event.findUnique({
        where: { id: event.id },
      });
      expect(deletedEvent).toBeNull();
    });

    it('should return 404 for non-existent event', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .delete(`/api/events/${nonExistentId}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Event not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .delete('/api/events/invalid-id')
        .set('Cookie', authCookies);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid event ID format');
    });

    it('should block VIEWER role from deleting events', async () => {
      const event = await prisma.event.create({ data: validEvent });

      const response = await request(app)
        .delete(`/api/events/${event.id}`)
        .set('Cookie', viewerCookies);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should allow LANDLORD role to delete events', async () => {
      const event = await prisma.event.create({ data: validEvent });

      const response = await request(app)
        .delete(`/api/events/${event.id}`)
        .set('Cookie', landlordCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Event deleted successfully');
    });

    it('should allow ADMIN role to delete events', async () => {
      const event = await prisma.event.create({ data: validEvent });

      const response = await request(app)
        .delete(`/api/events/${event.id}`)
        .set('Cookie', adminCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Event deleted successfully');
    });
  });

  describe('Integration scenarios', () => {
    it('should create, read, update, complete, and delete an event', async () => {
      // Create
      const createResponse = await request(app)
        .post('/api/events')
        .set('Cookie', authCookies)
        .send(validEvent);

      expect(createResponse.status).toBe(201);
      const eventId = createResponse.body.event.id;

      // Read single
      const readResponse = await request(app)
        .get(`/api/events/${eventId}`)
        .set('Cookie', authCookies);

      expect(readResponse.status).toBe(200);
      expect(readResponse.body.event.id).toBe(eventId);

      // Update
      const updateResponse = await request(app)
        .put(`/api/events/${eventId}`)
        .set('Cookie', authCookies)
        .send({ title: 'Updated Event' });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.event.title).toBe('Updated Event');

      // Complete
      const completeResponse = await request(app)
        .patch(`/api/events/${eventId}/complete`)
        .set('Cookie', authCookies);

      expect(completeResponse.status).toBe(200);
      expect(completeResponse.body.event.completed).toBe(true);
      expect(completeResponse.body.event.completedDate).toBeDefined();

      // Delete
      const deleteResponse = await request(app)
        .delete(`/api/events/${eventId}`)
        .set('Cookie', authCookies);

      expect(deleteResponse.status).toBe(200);

      // Verify deleted
      const finalReadResponse = await request(app)
        .get(`/api/events/${eventId}`)
        .set('Cookie', authCookies);
      expect(finalReadResponse.status).toBe(404);
    });

    it('should handle multiple events in list with filtering', async () => {
      // Create 5 events with different properties
      const events = [];
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/events')
          .set('Cookie', authCookies)
          .send({
            ...validEvent,
            title: `Event ${i + 1}`,
            eventType: i % 2 === 0 ? 'Inspection' : 'Maintenance',
            scheduledDate: new Date(`2026-0${i + 1}-15T10:00:00.000Z`),
          });
        events.push(response.body.event);
      }

      // List all
      const listResponse = await request(app)
        .get('/api/events')
        .set('Cookie', authCookies);
      expect(listResponse.status).toBe(200);
      expect(listResponse.body.events).toHaveLength(5);

      // Filter by eventType
      const filteredResponse = await request(app)
        .get('/api/events')
        .set('Cookie', authCookies)
        .query({ eventType: 'Inspection' });
      expect(filteredResponse.status).toBe(200);
      expect(filteredResponse.body.events).toHaveLength(3);

      // Verify ordered by scheduledDate asc (earliest first)
      for (let i = 0; i < listResponse.body.events.length - 1; i++) {
        const current = new Date(listResponse.body.events[i].scheduledDate);
        const next = new Date(listResponse.body.events[i + 1].scheduledDate);
        expect(current.getTime()).toBeLessThanOrEqual(next.getTime());
      }
    });

    it('should track event lifecycle from creation to completion', async () => {
      // Create incomplete event
      const createResponse = await request(app)
        .post('/api/events')
        .set('Cookie', authCookies)
        .send(validEvent);

      const eventId = createResponse.body.event.id;
      expect(createResponse.body.event.completed).toBe(false);
      expect(createResponse.body.event.completedDate).toBeNull();

      // Verify it shows in incomplete filter
      const incompleteResponse = await request(app)
        .get('/api/events')
        .set('Cookie', authCookies)
        .query({ completed: 'false' });

      expect(incompleteResponse.body.events).toHaveLength(1);
      expect(incompleteResponse.body.events[0].id).toBe(eventId);

      // Complete the event
      const completeResponse = await request(app)
        .patch(`/api/events/${eventId}/complete`)
        .set('Cookie', authCookies);

      expect(completeResponse.body.event.completed).toBe(true);
      expect(completeResponse.body.event.completedDate).toBeDefined();

      // Verify it shows in completed filter
      const completedResponse = await request(app)
        .get('/api/events')
        .set('Cookie', authCookies)
        .query({ completed: 'true' });

      expect(completedResponse.body.events).toHaveLength(1);
      expect(completedResponse.body.events[0].id).toBe(eventId);

      // Verify it doesn't show in incomplete filter
      const stillIncompleteResponse = await request(app)
        .get('/api/events')
        .set('Cookie', authCookies)
        .query({ completed: 'false' });

      expect(stillIncompleteResponse.body.events).toHaveLength(0);
    });
  });

  describe('Edge cases', () => {
    it('should allow creating events with same title and date', async () => {
      // Create first event
      const response1 = await request(app)
        .post('/api/events')
        .set('Cookie', authCookies)
        .send(validEvent);

      expect(response1.status).toBe(201);
      expect(response1.body.success).toBe(true);

      // Create second event with identical data
      const response2 = await request(app)
        .post('/api/events')
        .set('Cookie', authCookies)
        .send(validEvent);

      expect(response2.status).toBe(201);
      expect(response2.body.success).toBe(true);
      expect(response2.body.event.title).toBe(validEvent.title);
      expect(response2.body.event.scheduledDate).toBeDefined();

      // Verify different IDs
      expect(response2.body.event.id).not.toBe(response1.body.event.id);

      // Verify both exist in database
      const listResponse = await request(app)
        .get('/api/events')
        .set('Cookie', authCookies);
      expect(listResponse.status).toBe(200);
      expect(listResponse.body.events).toHaveLength(2);
    });

    it('should handle date range edge cases - equal fromDate and toDate', async () => {
      await prisma.event.create({
        data: {
          ...validEvent,
          scheduledDate: new Date('2026-02-15T10:00:00.000Z'),
        },
      });

      const response = await request(app)
        .get('/api/events')
        .set('Cookie', authCookies)
        .query({
          fromDate: '2026-02-15T00:00:00.000Z',
          toDate: '2026-02-15T23:59:59.999Z',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.events).toHaveLength(1);
    });

    it('should handle completion date preservation on update', async () => {
      const completedDate = new Date('2026-01-10T10:00:00.000Z');
      const event = await prisma.event.create({
        data: {
          ...validEvent,
          completed: true,
          completedDate,
        },
      });

      // Update other fields but not completion status
      const response = await request(app)
        .put(`/api/events/${event.id}`)
        .set('Cookie', authCookies)
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(200);
      expect(response.body.event.completed).toBe(true);
      expect(new Date(response.body.event.completedDate).toISOString()).toBe(
        completedDate.toISOString()
      );
    });
  });
});
