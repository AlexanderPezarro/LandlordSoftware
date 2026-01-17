import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import prisma from '../db/client.js';
import { CreateLeaseSchema, UpdateLeaseSchema, LeaseQueryParamsSchema } from '../../../shared/validation/lease.validation.js';
import { z } from 'zod';

const router = Router();

// GET /api/leases - List leases with filtering
router.get('/', async (req, res) => {
  try {
    // Validate query parameters
    const validationResult = LeaseQueryParamsSchema.safeParse(req.query);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.issues[0].message,
      });
    }

    const { property_id, tenant_id, status } = validationResult.data;

    // Build filter object
    const where: any = {};

    if (property_id) {
      const propertyIds = Array.isArray(property_id) ? property_id : [property_id];
      where.propertyId = { in: propertyIds };
    }

    if (tenant_id) {
      where.tenantId = tenant_id;
    }

    if (status) {
      where.status = status;
    }

    const leases = await prisma.lease.findMany({
      where,
      include: {
        property: true,
        tenant: true,
      },
      orderBy: { startDate: 'desc' },
    });

    return res.json({
      success: true,
      leases,
    });
  } catch (error) {
    console.error('Get leases error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while fetching leases',
    });
  }
});

// GET /api/leases/:id - Get single lease
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid lease ID format',
      });
    }

    const lease = await prisma.lease.findUnique({
      where: { id },
      include: {
        property: true,
        tenant: true,
      },
    });

    if (!lease) {
      return res.status(404).json({
        success: false,
        error: 'Lease not found',
      });
    }

    return res.json({
      success: true,
      lease,
    });
  } catch (error) {
    console.error('Get lease error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while fetching lease',
    });
  }
});

// POST /api/leases - Create lease (requires auth)
router.post('/', requireAuth, async (req, res) => {
  try {
    // Validate request body
    const validationResult = CreateLeaseSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.issues[0].message,
      });
    }

    const leaseData = validationResult.data;

    // Check property exists and status is NOT 'For Sale'
    const property = await prisma.property.findUnique({
      where: { id: leaseData.propertyId },
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found',
      });
    }

    if (property.status === 'For Sale') {
      return res.status(400).json({
        success: false,
        error: 'Property is not available for lease',
      });
    }

    // Check tenant exists and is not 'Former' status
    const tenant = await prisma.tenant.findUnique({
      where: { id: leaseData.tenantId },
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found',
      });
    }

    if (tenant.status === 'Former') {
      return res.status(400).json({
        success: false,
        error: 'Tenant is not active',
      });
    }

    // Validate no overlapping ACTIVE leases for the same property
    // Only check if the new lease is Active
    if (leaseData.status === 'Active') {
      const overlapWhere: any = {
        propertyId: leaseData.propertyId,
        status: 'Active',
        OR: [],
      };

      // Overlap condition: (new.startDate <= existing.endDate OR existing.endDate is null)
      //                AND (new.endDate >= existing.startDate OR new.endDate is null)

      // If new lease has endDate
      if (leaseData.endDate) {
        overlapWhere.OR.push({
          AND: [
            {
              OR: [
                { endDate: { gte: leaseData.startDate } },
                { endDate: null },
              ],
            },
            { startDate: { lte: leaseData.endDate } },
          ],
        });
      } else {
        // New lease has no endDate (ongoing)
        overlapWhere.OR.push({
          OR: [
            { endDate: { gte: leaseData.startDate } },
            { endDate: null },
          ],
        });
      }

      const overlappingLeases = await prisma.lease.findMany({
        where: overlapWhere,
      });

      if (overlappingLeases.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot create lease: overlapping active lease exists for this property',
        });
      }
    }

    // Create lease
    const lease = await prisma.lease.create({
      data: leaseData,
    });

    return res.status(201).json({
      success: true,
      lease,
    });
  } catch (error) {
    console.error('Create lease error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while creating lease',
    });
  }
});

// PUT /api/leases/:id - Update lease (requires auth)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid lease ID format',
      });
    }

    // Validate request body with id
    const validationResult = UpdateLeaseSchema.safeParse({
      id,
      ...req.body,
    });

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.issues[0].message,
      });
    }

    // Check if lease exists
    const existingLease = await prisma.lease.findUnique({
      where: { id },
    });

    if (!existingLease) {
      return res.status(404).json({
        success: false,
        error: 'Lease not found',
      });
    }

    // Extract id from validated data and use rest for update
    const { id: _, ...updateData } = validationResult.data;

    // If property changed, validate it exists and status is NOT 'For Sale'
    if (updateData.propertyId) {
      const property = await prisma.property.findUnique({
        where: { id: updateData.propertyId },
      });

      if (!property) {
        return res.status(404).json({
          success: false,
          error: 'Property not found',
        });
      }

      if (property.status === 'For Sale') {
        return res.status(400).json({
          success: false,
          error: 'Property is not available for lease',
        });
      }
    }

    // If tenant changed, validate they exist and are not 'Former' status
    if (updateData.tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: updateData.tenantId },
      });

      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: 'Tenant not found',
        });
      }

      if (tenant.status === 'Former') {
        return res.status(400).json({
          success: false,
          error: 'Tenant is not active',
        });
      }
    }

    // If dates or status changed, validate no overlapping ACTIVE leases
    const newStatus = updateData.status || existingLease.status;

    // Only check overlap if the resulting status will be Active
    if (newStatus === 'Active' && (updateData.startDate || updateData.endDate || updateData.status)) {
      const startDate = updateData.startDate || existingLease.startDate;
      const endDate = updateData.endDate !== undefined ? updateData.endDate : existingLease.endDate;
      const propertyId = updateData.propertyId || existingLease.propertyId;

      const overlapWhere: any = {
        propertyId: propertyId,
        status: 'Active',
        id: { not: id }, // Exclude current lease from overlap check
        OR: [],
      };

      // Overlap condition
      if (endDate) {
        overlapWhere.OR.push({
          AND: [
            {
              OR: [
                { endDate: { gte: startDate } },
                { endDate: null },
              ],
            },
            { startDate: { lte: endDate } },
          ],
        });
      } else {
        // Updated lease has no endDate (ongoing)
        overlapWhere.OR.push({
          OR: [
            { endDate: { gte: startDate } },
            { endDate: null },
          ],
        });
      }

      const overlappingLeases = await prisma.lease.findMany({
        where: overlapWhere,
      });

      if (overlappingLeases.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot update lease: overlapping active lease exists for this property',
        });
      }
    }

    // Update lease
    const lease = await prisma.lease.update({
      where: { id },
      data: updateData,
    });

    return res.json({
      success: true,
      lease,
    });
  } catch (error) {
    console.error('Update lease error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while updating lease',
    });
  }
});

// DELETE /api/leases/:id - Soft delete to 'Terminated' status (requires auth)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid lease ID format',
      });
    }

    // Check if lease exists
    const existingLease = await prisma.lease.findUnique({
      where: { id },
    });

    if (!existingLease) {
      return res.status(404).json({
        success: false,
        error: 'Lease not found',
      });
    }

    // Soft delete by setting status to 'Terminated'
    const lease = await prisma.lease.update({
      where: { id },
      data: { status: 'Terminated' },
    });

    return res.json({
      success: true,
      lease,
    });
  } catch (error) {
    console.error('Delete lease error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while deleting lease',
    });
  }
});

export default router;
