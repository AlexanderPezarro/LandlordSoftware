import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { reportService } from '../services/report.service.js';
import prisma from '../db/client.js';
import { z } from 'zod';

const router = express.Router();

const ReportQuerySchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  userId: z.string().uuid().optional(),
});

// Get P&L report for specific property and owner
router.get('/reports/profit-loss/properties/:propertyId', requireAuth, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const query = ReportQuerySchema.parse(req.query);

    // Use provided userId or default to current user
    const userId = query.userId || req.user?.id;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }

    // Only allow users to view their own reports (unless ADMIN role)
    if (userId !== req.user?.id && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const report = await reportService.generateOwnerPLReport(
      propertyId,
      userId,
      query.startDate,
      query.endDate
    );

    return res.json({ success: true, report });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ success: false, error: error.message });
    } else {
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
});

// Get aggregated P&L report across all properties for an owner
router.get('/reports/profit-loss/users/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const query = ReportQuerySchema.parse(req.query);

    // Only allow users to view their own reports (unless ADMIN role)
    if (userId !== req.user?.id && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const report = await reportService.generateMultiPropertyPLReport(
      userId,
      query.startDate,
      query.endDate
    );

    return res.json({ success: true, report });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ success: false, error: error.message });
    } else {
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
});

// Get all unique property owners (for owner selector dropdown)
// Non-admin users only see themselves; admin users see all owners
router.get('/reports/owners', requireAuth, async (req, res) => {
  try {
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    if (currentUser.role === 'ADMIN') {
      // Admin can see all unique owners across all properties
      const ownerships = await prisma.propertyOwnership.findMany({
        include: {
          user: {
            select: { id: true, email: true, role: true },
          },
        },
        orderBy: { user: { email: 'asc' } },
      });

      // Deduplicate by userId
      const uniqueOwners = new Map<string, { id: string; email: string; role: string }>();
      for (const ownership of ownerships) {
        if (!uniqueOwners.has(ownership.user.id)) {
          uniqueOwners.set(ownership.user.id, ownership.user);
        }
      }

      return res.json({
        success: true,
        owners: Array.from(uniqueOwners.values()),
      });
    } else {
      // Non-admin users only see themselves
      const user = await prisma.user.findUnique({
        where: { id: currentUser.id },
        select: { id: true, email: true, role: true },
      });

      const owners = user ? [user] : [];

      return res.json({ success: true, owners });
    }
  } catch (error) {
    console.error('Get owners error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
