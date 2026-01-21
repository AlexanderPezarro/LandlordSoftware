import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireWrite } from '../middleware/permissions.js';
import prisma from '../db/client.js';
import { CreatePropertySchema, UpdatePropertySchema, PropertyQueryParamsSchema } from '../../../shared/validation/property.validation.js';
import { z } from 'zod';

const router = Router();

// GET /api/properties - List properties with filtering
router.get('/', requireAuth, async (req, res) => {
  try {
    // Validate query parameters
    const validationResult = PropertyQueryParamsSchema.safeParse(req.query);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.issues[0].message,
      });
    }

    const { status, propertyType, search } = validationResult.data;

    // Build filter object
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (propertyType) {
      where.propertyType = propertyType;
    }

    if (search) {
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
router.get('/:id', requireAuth, async (req, res) => {
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

// POST /api/properties - Create property (requires auth and write permission)
router.post('/', requireAuth, requireWrite(), async (req, res) => {
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

// PUT /api/properties/:id - Update property (requires auth and write permission)
router.put('/:id', requireAuth, requireWrite(), async (req, res) => {
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

// DELETE /api/properties/:id - Soft delete via status change (requires auth and write permission)
router.delete('/:id', requireAuth, requireWrite(), async (req, res) => {
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
