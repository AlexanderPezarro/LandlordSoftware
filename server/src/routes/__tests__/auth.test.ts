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
});
