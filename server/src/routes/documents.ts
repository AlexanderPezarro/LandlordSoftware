import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { upload, handleUploadError } from '../middleware/upload.js';
import prisma from '../db/client.js';
import { LocalStorageService } from '../services/storage/LocalStorageService.js';
import { EntityTypeSchema } from '../../../shared/validation/document.validation.js';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

const router = Router();
const storageService = new LocalStorageService();

// Helper function to validate entity exists
async function validateEntity(entityType: string, entityId: string): Promise<boolean> {
  const modelMap: { [key: string]: any } = {
    Property: prisma.property,
    Tenant: prisma.tenant,
    Lease: prisma.lease,
    Transaction: prisma.transaction,
  };

  const model = modelMap[entityType];
  if (!model) {
    return false;
  }

  const entity = await model.findUnique({ where: { id: entityId } });
  return entity !== null;
}

// POST /api/documents - Upload document (requires auth)
router.post(
  '/',
  requireAuth,
  upload.single('file'),
  handleUploadError,
  async (req: Request, res: Response) => {
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
      }

      // Validate entityType and entityId from request body
      const { entityType, entityId } = req.body;

      if (!entityType) {
        return res.status(400).json({
          success: false,
          error: 'entityType is required',
        });
      }

      if (!entityId) {
        return res.status(400).json({
          success: false,
          error: 'entityId is required',
        });
      }

      // Validate entityType
      const entityTypeValidation = EntityTypeSchema.safeParse(entityType);
      if (!entityTypeValidation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid entityType. Must be Property, Tenant, Lease, or Transaction',
        });
      }

      // Validate entityId format
      if (!z.string().uuid().safeParse(entityId).success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid entityId format',
        });
      }

      // Validate entity exists
      const entityExists = await validateEntity(entityType, entityId);
      if (!entityExists) {
        return res.status(404).json({
          success: false,
          error: `${entityType} with ID ${entityId} not found`,
        });
      }

      // Save file using LocalStorageService
      const fileMetadata = {
        originalFilename: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      };

      const saveResult = await storageService.saveFile(req.file.buffer, fileMetadata);

      // Create document record in database
      const document = await prisma.document.create({
        data: {
          entityType,
          entityId,
          fileName: req.file.originalname,
          filePath: saveResult.filePath,
          fileType: req.file.mimetype,
          fileSize: req.file.size,
        },
      });

      return res.status(201).json({
        success: true,
        document,
      });
    } catch (error: any) {
      console.error('Upload document error:', error);

      // Handle storage service errors
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'An error occurred while uploading document',
      });
    }
  }
);

// GET /api/documents - List documents with filtering
router.get('/', requireAuth, async (req, res) => {
  try {
    const { entityType, entityId } = req.query;

    // Build filter object
    const where: any = {};

    if (entityType) {
      // Validate entityType
      const entityTypeValidation = EntityTypeSchema.safeParse(entityType);
      if (!entityTypeValidation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid entityType. Must be Property, Tenant, Lease, or Transaction',
        });
      }
      where.entityType = entityType;
    }

    if (entityId) {
      // Validate entityId format
      if (!z.string().uuid().safeParse(entityId).success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid entityId format',
        });
      }
      where.entityId = entityId;
    }

    const documents = await prisma.document.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
    });

    return res.json({
      success: true,
      documents,
    });
  } catch (error) {
    console.error('Get documents error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while fetching documents',
    });
  }
});

// GET /api/documents/:id - Get document metadata
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid document ID format',
      });
    }

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }

    return res.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error('Get document error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while fetching document',
    });
  }
});

// GET /api/documents/:id/download - Download file
router.get('/:id/download', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid document ID format',
      });
    }

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }

    // Construct full file path
    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
    const fullFilePath = path.join(process.cwd(), uploadDir, document.filePath);

    // Check if file exists
    try {
      await fs.access(fullFilePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'File not found on server',
      });
    }

    // Set headers for file download
    res.setHeader('Content-Type', document.fileType);
    res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
    res.setHeader('Content-Length', document.fileSize);

    // Stream the file
    const fileStream = await fs.readFile(fullFilePath);
    return res.send(fileStream);
  } catch (error) {
    console.error('Download document error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while downloading document',
    });
  }
});

// DELETE /api/documents/:id - Delete document (requires auth)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid document ID format',
      });
    }

    // Check if document exists
    const existingDocument = await prisma.document.findUnique({
      where: { id },
    });

    if (!existingDocument) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }

    // Delete file from storage
    await storageService.deleteFile(existingDocument.filePath);

    // Delete document record from database
    const document = await prisma.document.delete({
      where: { id },
    });

    return res.json({
      success: true,
      document,
    });
  } catch (error: any) {
    console.error('Delete document error:', error);

    // Handle storage service errors
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'An error occurred while deleting document',
    });
  }
});

export default router;
