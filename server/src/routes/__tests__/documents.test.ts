import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../app.js';
import prisma from '../../db/client.js';
import authService from '../../services/auth.service.js';
import fs from 'fs/promises';
import path from 'path';

const app = createApp();

describe('Documents Routes', () => {
  // Test user credentials
  const testUser = {
    email: 'test@example.com',
    password: 'testPassword123',
  };

  let authCookies: string[];
  let testPropertyId: string;
  let testTenantId: string;
  const testUploadDir = 'uploads';

  // Create test files
  const createTestFile = (filename: string, _mimeType: string): Buffer => {
    const content = `Test file content for ${filename}`;
    return Buffer.from(content);
  };

  beforeAll(async () => {
    // Clean database
    await prisma.document.deleteMany({});
    await prisma.event.deleteMany({});
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

    // Create test property for document association
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

    // Create test tenant for document association
    const tenant = await prisma.tenant.create({
      data: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '07700900000',
        status: 'Active',
      },
    });
    testTenantId = tenant.id;
  });

  afterAll(async () => {
    // Clean up database
    await prisma.document.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.lease.deleteMany({});
    await prisma.tenant.deleteMany({});
    await prisma.property.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();

    // Clean up test uploads directory
    try {
      await fs.rm(testUploadDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore errors if directory doesn't exist
    }
  });

  beforeEach(async () => {
    // Clean documents before each test
    await prisma.document.deleteMany({});

    // Clean up test uploads directory
    try {
      await fs.rm(testUploadDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore errors if directory doesn't exist
    }
  });

  describe('POST /api/documents', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/documents')
        .field('entityType', 'Property')
        .field('entityId', testPropertyId)
        .attach('file', createTestFile('test.jpg', 'image/jpeg'), 'test.jpg');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should upload a valid JPEG file', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Cookie', authCookies)
        .field('entityType', 'Property')
        .field('entityId', testPropertyId)
        .attach('file', createTestFile('test.jpg', 'image/jpeg'), 'test.jpg');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.document).toMatchObject({
        entityType: 'Property',
        entityId: testPropertyId,
        fileName: 'test.jpg',
        fileType: 'image/jpeg',
      });
      expect(response.body.document.id).toBeDefined();
      expect(response.body.document.filePath).toBeDefined();
      expect(response.body.document.fileSize).toBeGreaterThan(0);
      expect(response.body.document.uploadedAt).toBeDefined();
    });

    it('should upload a valid PNG file', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Cookie', authCookies)
        .field('entityType', 'Property')
        .field('entityId', testPropertyId)
        .attach('file', createTestFile('test.png', 'image/png'), 'test.png');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.document.fileType).toBe('image/png');
    });

    it('should upload a valid PDF file', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Cookie', authCookies)
        .field('entityType', 'Property')
        .field('entityId', testPropertyId)
        .attach('file', createTestFile('test.pdf', 'application/pdf'), 'test.pdf');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.document.fileType).toBe('application/pdf');
    });

    it('should associate document with Property', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Cookie', authCookies)
        .field('entityType', 'Property')
        .field('entityId', testPropertyId)
        .attach('file', createTestFile('property-doc.jpg', 'image/jpeg'), 'property-doc.jpg');

      expect(response.status).toBe(201);
      expect(response.body.document.entityType).toBe('Property');
      expect(response.body.document.entityId).toBe(testPropertyId);
    });

    it('should associate document with Tenant', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Cookie', authCookies)
        .field('entityType', 'Tenant')
        .field('entityId', testTenantId)
        .attach('file', createTestFile('tenant-doc.jpg', 'image/jpeg'), 'tenant-doc.jpg');

      expect(response.status).toBe(201);
      expect(response.body.document.entityType).toBe('Tenant');
      expect(response.body.document.entityId).toBe(testTenantId);
    });

    it('should reject upload without file', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Cookie', authCookies)
        .field('entityType', 'Property')
        .field('entityId', testPropertyId);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No file uploaded');
    });

    it('should reject upload without entityType', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Cookie', authCookies)
        .field('entityId', testPropertyId)
        .attach('file', createTestFile('test.jpg', 'image/jpeg'), 'test.jpg');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('entityType is required');
    });

    it('should reject upload without entityId', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Cookie', authCookies)
        .field('entityType', 'Property')
        .attach('file', createTestFile('test.jpg', 'image/jpeg'), 'test.jpg');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('entityId is required');
    });

    it('should reject invalid entityType', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Cookie', authCookies)
        .field('entityType', 'InvalidType')
        .field('entityId', testPropertyId)
        .attach('file', createTestFile('test.jpg', 'image/jpeg'), 'test.jpg');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid entityType');
    });

    it('should reject invalid entityId format', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Cookie', authCookies)
        .field('entityType', 'Property')
        .field('entityId', 'invalid-uuid')
        .attach('file', createTestFile('test.jpg', 'image/jpeg'), 'test.jpg');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid entityId format');
    });

    it('should reject non-existent entity', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .post('/api/documents')
        .set('Cookie', authCookies)
        .field('entityType', 'Property')
        .field('entityId', nonExistentId)
        .attach('file', createTestFile('test.jpg', 'image/jpeg'), 'test.jpg');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should reject invalid file type', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Cookie', authCookies)
        .field('entityType', 'Property')
        .field('entityId', testPropertyId)
        .attach('file', createTestFile('test.txt', 'text/plain'), 'test.txt');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid file type');
    });

    it('should reject file exceeding size limit', async () => {
      // Create a large buffer (11MB)
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);

      const response = await request(app)
        .post('/api/documents')
        .set('Cookie', authCookies)
        .field('entityType', 'Property')
        .field('entityId', testPropertyId)
        .attach('file', largeBuffer, 'large.jpg');

      expect(response.status).toBe(413);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('File too large');
    });

    it('should store file on disk', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Cookie', authCookies)
        .field('entityType', 'Property')
        .field('entityId', testPropertyId)
        .attach('file', createTestFile('test.jpg', 'image/jpeg'), 'test.jpg');

      expect(response.status).toBe(201);

      // Verify file exists on disk
      const filePath = response.body.document.filePath;
      const fullPath = path.join(process.cwd(), testUploadDir, filePath);
      const fileExists = await fs
        .access(fullPath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);
    });
  });

  describe('GET /api/documents', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/documents');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return empty array when no documents exist', async () => {
      const response = await request(app).get('/api/documents').set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.documents).toEqual([]);
    });

    it('should return all documents', async () => {
      // Create test documents
      const doc1 = await prisma.document.create({
        data: {
          entityType: 'Property',
          entityId: testPropertyId,
          fileName: 'doc1.jpg',
          filePath: '2026/01/doc1.jpg',
          fileType: 'image/jpeg',
          fileSize: 1024,
        },
      });

      const doc2 = await prisma.document.create({
        data: {
          entityType: 'Tenant',
          entityId: testTenantId,
          fileName: 'doc2.pdf',
          filePath: '2026/01/doc2.pdf',
          fileType: 'application/pdf',
          fileSize: 2048,
        },
      });

      const response = await request(app).get('/api/documents').set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.documents).toHaveLength(2);

      // Check ordered by uploadedAt desc (newest first)
      expect(response.body.documents[0].id).toBe(doc2.id);
      expect(response.body.documents[1].id).toBe(doc1.id);
    });

    it('should filter documents by entityType', async () => {
      await prisma.document.create({
        data: {
          entityType: 'Property',
          entityId: testPropertyId,
          fileName: 'property-doc.jpg',
          filePath: '2026/01/property-doc.jpg',
          fileType: 'image/jpeg',
          fileSize: 1024,
        },
      });

      await prisma.document.create({
        data: {
          entityType: 'Tenant',
          entityId: testTenantId,
          fileName: 'tenant-doc.pdf',
          filePath: '2026/01/tenant-doc.pdf',
          fileType: 'application/pdf',
          fileSize: 2048,
        },
      });

      const response = await request(app)
        .get('/api/documents')
        .set('Cookie', authCookies)
        .query({ entityType: 'Property' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.documents).toHaveLength(1);
      expect(response.body.documents[0].entityType).toBe('Property');
    });

    it('should filter documents by entityId', async () => {
      await prisma.document.create({
        data: {
          entityType: 'Property',
          entityId: testPropertyId,
          fileName: 'property-doc.jpg',
          filePath: '2026/01/property-doc.jpg',
          fileType: 'image/jpeg',
          fileSize: 1024,
        },
      });

      await prisma.document.create({
        data: {
          entityType: 'Tenant',
          entityId: testTenantId,
          fileName: 'tenant-doc.pdf',
          filePath: '2026/01/tenant-doc.pdf',
          fileType: 'application/pdf',
          fileSize: 2048,
        },
      });

      const response = await request(app)
        .get('/api/documents')
        .set('Cookie', authCookies)
        .query({ entityId: testTenantId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.documents).toHaveLength(1);
      expect(response.body.documents[0].entityId).toBe(testTenantId);
    });

    it('should filter documents by both entityType and entityId', async () => {
      await prisma.document.create({
        data: {
          entityType: 'Property',
          entityId: testPropertyId,
          fileName: 'property-doc.jpg',
          filePath: '2026/01/property-doc.jpg',
          fileType: 'image/jpeg',
          fileSize: 1024,
        },
      });

      await prisma.document.create({
        data: {
          entityType: 'Tenant',
          entityId: testTenantId,
          fileName: 'tenant-doc.pdf',
          filePath: '2026/01/tenant-doc.pdf',
          fileType: 'application/pdf',
          fileSize: 2048,
        },
      });

      const response = await request(app)
        .get('/api/documents')
        .set('Cookie', authCookies)
        .query({ entityType: 'Property', entityId: testPropertyId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.documents).toHaveLength(1);
      expect(response.body.documents[0].entityType).toBe('Property');
      expect(response.body.documents[0].entityId).toBe(testPropertyId);
    });

    it('should reject invalid entityType in query', async () => {
      const response = await request(app)
        .get('/api/documents')
        .set('Cookie', authCookies)
        .query({ entityType: 'InvalidType' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid entityType');
    });

    it('should reject invalid entityId format in query', async () => {
      const response = await request(app)
        .get('/api/documents')
        .set('Cookie', authCookies)
        .query({ entityId: 'invalid-uuid' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid entityId format');
    });
  });

  describe('GET /api/documents/:id', () => {
    it('should require authentication', async () => {
      const document = await prisma.document.create({
        data: {
          entityType: 'Property',
          entityId: testPropertyId,
          fileName: 'test.jpg',
          filePath: '2026/01/test.jpg',
          fileType: 'image/jpeg',
          fileSize: 1024,
        },
      });

      const response = await request(app).get(`/api/documents/${document.id}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return document metadata by id', async () => {
      const document = await prisma.document.create({
        data: {
          entityType: 'Property',
          entityId: testPropertyId,
          fileName: 'test.jpg',
          filePath: '2026/01/test.jpg',
          fileType: 'image/jpeg',
          fileSize: 1024,
        },
      });

      const response = await request(app)
        .get(`/api/documents/${document.id}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.document).toMatchObject({
        id: document.id,
        entityType: 'Property',
        entityId: testPropertyId,
        fileName: 'test.jpg',
        filePath: '2026/01/test.jpg',
        fileType: 'image/jpeg',
        fileSize: 1024,
      });
    });

    it('should return 404 for non-existent document', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/documents/${nonExistentId}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Document not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/documents/invalid-id')
        .set('Cookie', authCookies);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid document ID format');
    });
  });

  describe('GET /api/documents/:id/download', () => {
    it('should require authentication', async () => {
      const document = await prisma.document.create({
        data: {
          entityType: 'Property',
          entityId: testPropertyId,
          fileName: 'test.jpg',
          filePath: '2026/01/test.jpg',
          fileType: 'image/jpeg',
          fileSize: 1024,
        },
      });

      const response = await request(app).get(`/api/documents/${document.id}/download`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should download file', async () => {
      // First upload a file
      const uploadResponse = await request(app)
        .post('/api/documents')
        .set('Cookie', authCookies)
        .field('entityType', 'Property')
        .field('entityId', testPropertyId)
        .attach('file', createTestFile('download-test.jpg', 'image/jpeg'), 'download-test.jpg');

      expect(uploadResponse.status).toBe(201);
      const documentId = uploadResponse.body.document.id;

      // Download the file
      const downloadResponse = await request(app)
        .get(`/api/documents/${documentId}/download`)
        .set('Cookie', authCookies);

      expect(downloadResponse.status).toBe(200);
      expect(downloadResponse.headers['content-type']).toBe('image/jpeg');
      expect(downloadResponse.headers['content-disposition']).toContain('download-test.jpg');
      expect(downloadResponse.body).toBeDefined();
    });

    it('should return 404 for non-existent document', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/documents/${nonExistentId}/download`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Document not found');
    });

    it('should return 404 if file does not exist on disk', async () => {
      // Create document record without actual file
      const document = await prisma.document.create({
        data: {
          entityType: 'Property',
          entityId: testPropertyId,
          fileName: 'missing.jpg',
          filePath: '2026/01/missing-file.jpg',
          fileType: 'image/jpeg',
          fileSize: 1024,
        },
      });

      const response = await request(app)
        .get(`/api/documents/${document.id}/download`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('File not found on server');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/documents/invalid-id/download')
        .set('Cookie', authCookies);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid document ID format');
    });
  });

  describe('DELETE /api/documents/:id', () => {
    it('should require authentication', async () => {
      const document = await prisma.document.create({
        data: {
          entityType: 'Property',
          entityId: testPropertyId,
          fileName: 'test.jpg',
          filePath: '2026/01/test.jpg',
          fileType: 'image/jpeg',
          fileSize: 1024,
        },
      });

      const response = await request(app).delete(`/api/documents/${document.id}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should delete document and file', async () => {
      // First upload a file
      const uploadResponse = await request(app)
        .post('/api/documents')
        .set('Cookie', authCookies)
        .field('entityType', 'Property')
        .field('entityId', testPropertyId)
        .attach('file', createTestFile('to-delete.jpg', 'image/jpeg'), 'to-delete.jpg');

      expect(uploadResponse.status).toBe(201);
      const documentId = uploadResponse.body.document.id;
      const filePath = uploadResponse.body.document.filePath;

      // Verify file exists
      const fullPath = path.join(process.cwd(), testUploadDir, filePath);
      let fileExists = await fs
        .access(fullPath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);

      // Delete the document
      const deleteResponse = await request(app)
        .delete(`/api/documents/${documentId}`)
        .set('Cookie', authCookies);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);
      expect(deleteResponse.body.document.id).toBe(documentId);

      // Verify document is deleted from database
      const deletedDoc = await prisma.document.findUnique({
        where: { id: documentId },
      });
      expect(deletedDoc).toBeNull();

      // Verify file is deleted from disk
      fileExists = await fs
        .access(fullPath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(false);
    });

    it('should return 404 for non-existent document', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .delete(`/api/documents/${nonExistentId}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Document not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .delete('/api/documents/invalid-id')
        .set('Cookie', authCookies);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid document ID format');
    });

    it('should handle deletion when file is already missing', async () => {
      // Create document record without actual file
      const document = await prisma.document.create({
        data: {
          entityType: 'Property',
          entityId: testPropertyId,
          fileName: 'missing.jpg',
          filePath: '2026/01/missing-file.jpg',
          fileType: 'image/jpeg',
          fileSize: 1024,
        },
      });

      const response = await request(app)
        .delete(`/api/documents/${document.id}`)
        .set('Cookie', authCookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify document is deleted from database
      const deletedDoc = await prisma.document.findUnique({
        where: { id: document.id },
      });
      expect(deletedDoc).toBeNull();
    });
  });

  describe('Integration scenarios', () => {
    it('should upload, list, get, download, and delete a document', async () => {
      // Upload
      const uploadResponse = await request(app)
        .post('/api/documents')
        .set('Cookie', authCookies)
        .field('entityType', 'Property')
        .field('entityId', testPropertyId)
        .attach('file', createTestFile('integration-test.jpg', 'image/jpeg'), 'integration-test.jpg');

      expect(uploadResponse.status).toBe(201);
      const documentId = uploadResponse.body.document.id;

      // List
      const listResponse = await request(app).get('/api/documents').set('Cookie', authCookies);

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.documents).toHaveLength(1);
      expect(listResponse.body.documents[0].id).toBe(documentId);

      // Get metadata
      const getResponse = await request(app)
        .get(`/api/documents/${documentId}`)
        .set('Cookie', authCookies);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.document.id).toBe(documentId);

      // Download
      const downloadResponse = await request(app)
        .get(`/api/documents/${documentId}/download`)
        .set('Cookie', authCookies);

      expect(downloadResponse.status).toBe(200);
      expect(downloadResponse.headers['content-type']).toBe('image/jpeg');

      // Delete
      const deleteResponse = await request(app)
        .delete(`/api/documents/${documentId}`)
        .set('Cookie', authCookies);

      expect(deleteResponse.status).toBe(200);

      // Verify deleted
      const finalListResponse = await request(app).get('/api/documents').set('Cookie', authCookies);
      expect(finalListResponse.body.documents).toHaveLength(0);
    });

    it('should handle multiple documents for same entity', async () => {
      // Upload multiple documents
      const responses = [];
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/documents')
          .set('Cookie', authCookies)
          .field('entityType', 'Property')
          .field('entityId', testPropertyId)
          .attach('file', createTestFile(`doc${i}.jpg`, 'image/jpeg'), `doc${i}.jpg`);
        responses.push(response);
      }

      // All uploads should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(201);
      });

      // List all documents for this property
      const listResponse = await request(app)
        .get('/api/documents')
        .set('Cookie', authCookies)
        .query({ entityType: 'Property', entityId: testPropertyId });

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.documents).toHaveLength(3);
    });

    it('should handle documents for different entities', async () => {
      // Upload document for property
      const propertyDocResponse = await request(app)
        .post('/api/documents')
        .set('Cookie', authCookies)
        .field('entityType', 'Property')
        .field('entityId', testPropertyId)
        .attach('file', createTestFile('property.jpg', 'image/jpeg'), 'property.jpg');

      expect(propertyDocResponse.status).toBe(201);

      // Upload document for tenant
      const tenantDocResponse = await request(app)
        .post('/api/documents')
        .set('Cookie', authCookies)
        .field('entityType', 'Tenant')
        .field('entityId', testTenantId)
        .attach('file', createTestFile('tenant.jpg', 'image/jpeg'), 'tenant.jpg');

      expect(tenantDocResponse.status).toBe(201);

      // List all documents
      const allDocsResponse = await request(app).get('/api/documents').set('Cookie', authCookies);

      expect(allDocsResponse.status).toBe(200);
      expect(allDocsResponse.body.documents).toHaveLength(2);

      // Filter by property
      const propertyDocsResponse = await request(app)
        .get('/api/documents')
        .set('Cookie', authCookies)
        .query({ entityType: 'Property' });

      expect(propertyDocsResponse.status).toBe(200);
      expect(propertyDocsResponse.body.documents).toHaveLength(1);
      expect(propertyDocsResponse.body.documents[0].entityType).toBe('Property');

      // Filter by tenant
      const tenantDocsResponse = await request(app)
        .get('/api/documents')
        .set('Cookie', authCookies)
        .query({ entityType: 'Tenant' });

      expect(tenantDocsResponse.status).toBe(200);
      expect(tenantDocsResponse.body.documents).toHaveLength(1);
      expect(tenantDocsResponse.body.documents[0].entityType).toBe('Tenant');
    });
  });

  describe('Security', () => {
    it('should reject path traversal in filename', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Cookie', authCookies)
        .field('entityType', 'Property')
        .field('entityId', testPropertyId)
        .attach('file', createTestFile('../../../etc/passwd', 'image/jpeg'), '../../../etc/passwd');

      // Should either reject or sanitize the filename
      // The storage service should handle this securely
      if (response.status === 201) {
        // If upload succeeded, verify the path doesn't contain traversal
        expect(response.body.document.filePath).not.toContain('..');
      } else {
        // Or it should reject the upload
        expect(response.status).toBe(400);
      }
    });

    it('should reject uploading more than one file', async () => {
      const agent = request(app);
      const req = agent
        .post('/api/documents')
        .set('Cookie', authCookies)
        .field('entityType', 'Property')
        .field('entityId', testPropertyId);

      // Attach multiple files
      req.attach('file', createTestFile('file1.jpg', 'image/jpeg'), 'file1.jpg');
      req.attach('file', createTestFile('file2.jpg', 'image/jpeg'), 'file2.jpg');

      const response = await req;

      // Should only process the first file or reject
      expect([201, 400]).toContain(response.status);
    });
  });
});
