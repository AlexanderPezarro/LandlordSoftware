import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireWrite } from '../middleware/permissions.js';
import prisma from '../db/client.js';
import { balanceService } from '../services/balance.service.js';
import { SettlementCreateSchema } from '../../../shared/validation/index.js';

const router = express.Router();

// Record a settlement
router.post('/settlements', requireAuth, requireWrite, async (req, res) => {
  try {
    const validated = SettlementCreateSchema.parse(req.body);

    // Verify both users are owners of the property
    const ownerships = await prisma.propertyOwnership.findMany({
      where: {
        propertyId: validated.propertyId,
        userId: { in: [validated.fromUserId, validated.toUserId] },
      },
    });

    if (ownerships.length !== 2) {
      return res.status(400).json({
        success: false,
        error: 'Both users must be property owners',
      });
    }

    // Calculate current balance
    const currentBalance = await balanceService.calculatePairwiseBalance(
      validated.propertyId,
      validated.toUserId,
      validated.fromUserId
    );

    // Warn if settling more than owed (but allow it)
    let warning = undefined;
    if (validated.amount > currentBalance + 0.01) {
      warning = `Settling £${validated.amount} but only £${currentBalance.toFixed(2)} is owed`;
    }

    // Create settlement
    const settlement = await prisma.settlement.create({
      data: validated,
      include: {
        fromUser: {
          select: { id: true, email: true },
        },
        toUser: {
          select: { id: true, email: true },
        },
        property: {
          select: { id: true, name: true },
        },
      },
    });

    return res.status(201).json({ success: true, settlement, warning });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ success: false, error: error.message });
    } else {
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
});

// Get balances for a property
router.get('/properties/:id/balances', requireAuth, async (req, res) => {
  try {
    const propertyId = req.params.id;

    const balances = await balanceService.getPropertyBalances(propertyId);

    // Enrich with user details
    const enrichedBalances = await Promise.all(
      balances.map(async (b) => {
        const users = await prisma.user.findMany({
          where: { id: { in: [b.userA, b.userB] } },
          select: { id: true, email: true },
        });

        return {
          ...b,
          userADetails: users.find((u) => u.id === b.userA),
          userBDetails: users.find((u) => u.id === b.userB),
        };
      })
    );

    return res.json({ success: true, balances: enrichedBalances });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get settlements for a property
router.get('/properties/:id/settlements', requireAuth, async (req, res) => {
  try {
    const propertyId = req.params.id;

    const settlements = await prisma.settlement.findMany({
      where: { propertyId },
      include: {
        fromUser: {
          select: { id: true, email: true },
        },
        toUser: {
          select: { id: true, email: true },
        },
      },
      orderBy: { settlementDate: 'desc' },
    });

    return res.json({ success: true, settlements });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get user's balances across all properties
router.get('/users/:userId/balances', requireAuth, async (req, res) => {
  try {
    const userId = req.params.userId;

    // Only allow users to view their own balances (unless ADMIN role)
    if (req.user?.id !== userId && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const balances = await balanceService.getUserBalances(userId);

    return res.json({ success: true, balances });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
