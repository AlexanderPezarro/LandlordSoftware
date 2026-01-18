import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../app.js';
import prisma from '../../db/client.js';
import authService from '../../services/auth.service.js';

const app = createApp();

describe('Auth Routes', () => {
  // Test user credentials
  const testUser = {
    email: 'test@example.com',
    password: 'testPassword123',
  };

  beforeAll(async () => {
    // Ensure database is clean before tests
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    // Clean up after all tests
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
    // Give some time for cleanup
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  beforeEach(async () => {
    // Clean up before each test
    await prisma.user.deleteMany({});
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 if email is missing', async () => {
      const response = await request(app).post('/api/auth/login').send({
        password: testUser.password,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Email and password required');
    });

    it('should return 400 if password is missing', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: testUser.email,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Email and password required');
    });

    it('should return 401 if user does not exist', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'anyPassword',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid email or password');
    });

    it('should return 401 if password is incorrect', async () => {
      // Create a user first
      await authService.createUser(testUser.email, testUser.password);

      const response = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: 'wrongPassword',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid email or password');
    });

    it('should return 200 and user data with valid credentials', async () => {
      // Create a user first
      const createdUser = await authService.createUser(testUser.email, testUser.password);

      const response = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toEqual({
        id: createdUser.id,
        email: createdUser.email,
        role: createdUser.role,
      });
    });

    it('should set session cookie on successful login', async () => {
      // Create a user first
      await authService.createUser(testUser.email, testUser.password);

      const response = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(200);
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('connect.sid');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return 200 and destroy session', async () => {
      // Create a user and login first
      await authService.createUser(testUser.email, testUser.password);

      const loginResponse = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      const cookies = loginResponse.headers['set-cookie'];

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should work even without authentication', async () => {
      const response = await request(app).post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Not authenticated');
    });

    it('should return current user if authenticated', async () => {
      // Create a user and login first
      const createdUser = await authService.createUser(testUser.email, testUser.password);

      const loginResponse = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      const cookies = loginResponse.headers['set-cookie'];

      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toEqual({
        id: createdUser.id,
        email: createdUser.email,
        role: createdUser.role,
      });
    });

    it('should return user with role in /me endpoint', async () => {
      // Create a user with ADMIN role and login
      const createdUser = await authService.createUser(testUser.email, testUser.password, 'ADMIN');

      const loginResponse = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      const cookies = loginResponse.headers['set-cookie'];

      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toEqual({
        id: createdUser.id,
        email: createdUser.email,
        role: 'ADMIN',
      });
    });

    it('should return 401 if user no longer exists', async () => {
      // Create a user and login first
      const createdUser = await authService.createUser(testUser.email, testUser.password);

      const loginResponse = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      const cookies = loginResponse.headers['set-cookie'];

      // Delete the user
      await prisma.user.delete({ where: { id: createdUser.id } });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookies);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User no longer exists');
    });
  });

  describe('Session persistence', () => {
    it('should maintain session across multiple requests', async () => {
      // Create a user and login
      const createdUser = await authService.createUser(testUser.email, testUser.password);

      const loginResponse = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      const cookies = loginResponse.headers['set-cookie'];

      // Make multiple requests with the same session
      const response1 = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookies);

      expect(response1.status).toBe(200);
      expect(response1.body.user.id).toBe(createdUser.id);

      const response2 = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookies);

      expect(response2.status).toBe(200);
      expect(response2.body.user.id).toBe(createdUser.id);
    });

    it('should clear session after logout', async () => {
      // Create a user and login
      await authService.createUser(testUser.email, testUser.password);

      const loginResponse = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      const cookies = loginResponse.headers['set-cookie'];

      // Verify authenticated
      const beforeLogout = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookies);

      expect(beforeLogout.status).toBe(200);

      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookies);

      // Try to access protected route
      const afterLogout = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookies);

      expect(afterLogout.status).toBe(401);
    });
  });

  describe('GET /api/auth/setup-required', () => {
    it('should return true when no users exist', async () => {
      // Database is already cleaned in beforeEach
      const response = await request(app).get('/api/auth/setup-required');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.setupRequired).toBe(true);
    });

    it('should return false when users exist', async () => {
      // Create a user first
      await authService.createUser(testUser.email, testUser.password);

      const response = await request(app).get('/api/auth/setup-required');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.setupRequired).toBe(false);
    });
  });

  describe('POST /api/auth/register', () => {
    it('should assign ADMIN role to first user', async () => {
      const response = await request(app).post('/api/auth/register').send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.role).toBe('ADMIN');

      // Verify user was created with ADMIN role
      const user = await prisma.user.findUnique({ where: { email: testUser.email } });
      expect(user?.role).toBe('ADMIN');
    });

    it('should assign VIEWER role to subsequent users', async () => {
      // Create first user
      await authService.createUser('first@example.com', 'password123', 'ADMIN');

      // Register second user
      const response = await request(app).post('/api/auth/register').send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.role).toBe('VIEWER');

      // Verify user was created with VIEWER role
      const user = await prisma.user.findUnique({ where: { email: testUser.email } });
      expect(user?.role).toBe('VIEWER');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app).post('/api/auth/register').send({
        email: 'invalid-email',
        password: testUser.password,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for password too short', async () => {
      const response = await request(app).post('/api/auth/register').send({
        email: testUser.email,
        password: 'short',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 if email is missing', async () => {
      const response = await request(app).post('/api/auth/register').send({
        password: testUser.password,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 if password is missing', async () => {
      const response = await request(app).post('/api/auth/register').send({
        email: testUser.email,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/setup', () => {
    it('should successfully create first user with valid data', async () => {
      const response = await request(app).post('/api/auth/setup').send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.id).toBeDefined();

      // Verify user was created in database
      const userCount = await prisma.user.count();
      expect(userCount).toBe(1);
    });

    it('should automatically log in user after setup', async () => {
      const response = await request(app).post('/api/auth/setup').send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(201);
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('connect.sid');

      // Verify session works by accessing protected route
      const cookies = response.headers['set-cookie'];
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookies);

      expect(meResponse.status).toBe(200);
      expect(meResponse.body.user.email).toBe(testUser.email);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app).post('/api/auth/setup').send({
        email: 'invalid-email',
        password: testUser.password,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for password too short', async () => {
      const response = await request(app).post('/api/auth/setup').send({
        email: testUser.email,
        password: 'short',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 403 if users already exist', async () => {
      // Create a user first
      await authService.createUser(testUser.email, testUser.password);

      // Try to setup again with different email
      const response = await request(app).post('/api/auth/setup').send({
        email: 'another@example.com',
        password: 'anotherPassword123',
      });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Setup has already been completed');
    });

    it('should return 400 if email is missing', async () => {
      const response = await request(app).post('/api/auth/setup').send({
        password: testUser.password,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 if password is missing', async () => {
      const response = await request(app).post('/api/auth/setup').send({
        email: testUser.email,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
