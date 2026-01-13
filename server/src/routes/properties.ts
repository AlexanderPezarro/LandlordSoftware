import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import prisma from '../db/client.js';
import { CreatePropertySchema, UpdatePropertySchema } from '../../../shared/validation/property.validation.js';
import { z } from 'zod';

const router = Router();

// GET /api/properties - List properties with filtering
router.get('/', async (req, res) => {
  try {
    const { status, propertyType, search } = req.query;

    // Build filter object
    const where: any = {};

    if (status && typeof status === 'string') {
      where.status = status;
    }

    if (propertyType && typeof propertyType === 'string') {
      where.propertyType = propertyType;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search } },
        { street: { contains: search } },
        { city: { contains: search } },
      ];
    }

    const properties = await prisma.property.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      properties,
    });
  } catch (error) {
    console.error('Get properties error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while fetching properties',
    });
  }
});

// GET /api/properties/:id - Get single property
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid property ID format',
      });
    }

    const property = await prisma.property.findUnique({
      where: { id },
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found',
      });
    }

    return res.json({
      success: true,
      property,
    });
  } catch (error) {
    console.error('Get property error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while fetching property',
    });
  }
});

// POST /api/properties - Create property (requires auth)
router.post('/', requireAuth, async (req, res) => {
  try {
    // Validate request body
    const validationResult = CreatePropertySchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.issues[0].message,
      });
    }

    const propertyData = validationResult.data;

    // Create property
    const property = await prisma.property.create({
      data: propertyData,
    });

    return res.status(201).json({
      success: true,
      property,
    });
  } catch (error) {
    console.error('Create property error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while creating property',
    });
  }
});

// PUT /api/properties/:id - Update property (requires auth)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid property ID format',
      });
    }

    // Validate request body with id
    const validationResult = UpdatePropertySchema.safeParse({
      id,
      ...req.body,
    });

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.issues[0].message,
      });
    }

    // Check if property exists
    const existingProperty = await prisma.property.findUnique({
      where: { id },
    });

    if (!existingProperty) {
      return res.status(404).json({
        success: false,
        error: 'Property not found',
      });
    }

    // Extract id from validated data and use rest for update
    const { id: _, ...updateData } = validationResult.data;

    // Update property
    const property = await prisma.property.update({
      where: { id },
      data: updateData,
    });

    return res.json({
      success: true,
      property,
    });
  } catch (error) {
    console.error('Update property error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while updating property',
    });
  }
});

// DELETE /api/properties/:id - Soft delete via status change (requires auth)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid property ID format',
      });
    }

    // Check if property exists
    const existingProperty = await prisma.property.findUnique({
      where: { id },
    });

    if (!existingProperty) {
      return res.status(404).json({
        success: false,
        error: 'Property not found',
      });
    }

    // Soft delete by setting status to 'For Sale' (inactive state)
    const property = await prisma.property.update({
      where: { id },
      data: { status: 'For Sale' },
    });

    return res.json({
      success: true,
      property,
    });
  } catch (error) {
    console.error('Delete property error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while deleting property',
    });
  }
});

export default router;
