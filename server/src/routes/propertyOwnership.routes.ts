import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireWrite } from '../middleware/permissions.js';
import propertyOwnershipService from '../services/propertyOwnership.service.js';
import {
  PropertyOwnershipCreateSchema,
  PropertyOwnershipUpdateSchema,
} from '../../../shared/validation/index.js';
import { z } from 'zod';

const router = Router();

// POST /api/properties/:id/owners - Add owner to property
router.post('/:id/owners', requireAuth, requireWrite, async (req, res) => {
  try {
    const { id: propertyId } = req.params;

    // Validate propertyId format
    if (!z.string().uuid().safeParse(propertyId).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid property ID format',
      });
    }

    // Validate request body
    const validationResult = PropertyOwnershipCreateSchema.safeParse({
      ...req.body,
      propertyId,
    });

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.issues[0].message,
      });
    }

    const ownership = await propertyOwnershipService.addOwner(validationResult.data);

    return res.status(201).json({
      success: true,
      ownership,
    });
  } catch (error) {
    console.error('Add owner error:', error);

    if (error instanceof Error) {
      if (
        error.message === 'Property not found' ||
        error.message === 'User not found'
      ) {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }

      if (
        error.message === 'User already owns this property' ||
        error.message.includes('Total ownership must equal 100%')
      ) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }
    }

    return res.status(500).json({
      success: false,
      error: 'An error occurred while adding owner',
    });
  }
});

// PUT /api/properties/:id/owners/:userId - Update ownership percentage
router.put('/:id/owners/:userId', requireAuth, requireWrite, async (req, res) => {
  try {
    const { id: propertyId, userId } = req.params;

    // Validate UUIDs
    if (!z.string().uuid().safeParse(propertyId).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid property ID format',
      });
    }

    if (!z.string().uuid().safeParse(userId).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format',
      });
    }

    // Validate request body
    const validationResult = PropertyOwnershipUpdateSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.issues[0].message,
      });
    }

    const ownership = await propertyOwnershipService.updateOwnership(
      propertyId,
      userId,
      validationResult.data
    );

    return res.json({
      success: true,
      ownership,
    });
  } catch (error) {
    console.error('Update ownership error:', error);

    if (error instanceof Error) {
      if (error.message === 'Ownership not found') {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }

      if (error.message.includes('Total ownership must equal 100%')) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }
    }

    return res.status(500).json({
      success: false,
      error: 'An error occurred while updating ownership',
    });
  }
});

// DELETE /api/properties/:id/owners/:userId - Remove owner
router.delete('/:id/owners/:userId', requireAuth, requireWrite, async (req, res) => {
  try {
    const { id: propertyId, userId } = req.params;

    // Validate UUIDs
    if (!z.string().uuid().safeParse(propertyId).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid property ID format',
      });
    }

    if (!z.string().uuid().safeParse(userId).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format',
      });
    }

    await propertyOwnershipService.removeOwner(propertyId, userId);

    return res.json({
      success: true,
      message: 'Owner removed successfully',
    });
  } catch (error) {
    console.error('Remove owner error:', error);

    if (error instanceof Error) {
      if (error.message === 'Ownership not found') {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }

      if (
        error.message.includes('Cannot remove owner with existing transaction splits') ||
        error.message.includes('Cannot remove owner with existing settlements')
      ) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }
    }

    return res.status(500).json({
      success: false,
      error: 'An error occurred while removing owner',
    });
  }
});

// GET /api/properties/:id/owners - List property owners
router.get('/:id/owners', requireAuth, async (req, res) => {
  try {
    const { id: propertyId } = req.params;

    // Validate propertyId format
    if (!z.string().uuid().safeParse(propertyId).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid property ID format',
      });
    }

    const ownerships = await propertyOwnershipService.listOwners(propertyId);

    return res.json({
      success: true,
      ownerships,
    });
  } catch (error) {
    console.error('List owners error:', error);

    if (error instanceof Error && error.message === 'Property not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'An error occurred while fetching owners',
    });
  }
});

export default router;
