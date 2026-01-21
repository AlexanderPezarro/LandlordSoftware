import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/permissions.js';
import prisma from '../db/client.js';
import { UpdateBankAccountSchema } from '../../../shared/validation/bankAccount.validation.js';
import { z } from 'zod';
import { syncNewTransactions } from '../services/monzo.service.js';

const router = Router();

// Helper function to exclude sensitive fields from bank account response
function sanitizeBankAccount(account: any) {
  const { accessToken, refreshToken, ...sanitized } = account;
  return sanitized;
}

// GET /api/bank/accounts - List all bank accounts
router.get('/', requireAuth, requireAdmin(), async (_req, res) => {
  try {
    const accounts = await prisma.bankAccount.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Remove sensitive tokens from response
    const sanitizedAccounts = accounts.map(sanitizeBankAccount);

    return res.json({
      success: true,
      accounts: sanitizedAccounts,
    });
  } catch (error) {
    console.error('Get bank accounts error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while fetching bank accounts',
    });
  }
});

// GET /api/bank/accounts/:id - Get single bank account
router.get('/:id', requireAuth, requireAdmin(), async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bank account ID format',
      });
    }

    const account = await prisma.bankAccount.findUnique({
      where: { id },
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Bank account not found',
      });
    }

    // Remove sensitive tokens from response
    const sanitizedAccount = sanitizeBankAccount(account);

    return res.json({
      success: true,
      account: sanitizedAccount,
    });
  } catch (error) {
    console.error('Get bank account error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while fetching bank account',
    });
  }
});

// PATCH /api/bank/accounts/:id - Update bank account
router.patch('/:id', requireAuth, requireAdmin(), async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bank account ID format',
      });
    }

    // Validate request body with id
    const validationResult = UpdateBankAccountSchema.safeParse({
      id,
      ...req.body,
    });

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.issues[0].message,
      });
    }

    // Check if bank account exists
    const existingAccount = await prisma.bankAccount.findUnique({
      where: { id },
    });

    if (!existingAccount) {
      return res.status(404).json({
        success: false,
        error: 'Bank account not found',
      });
    }

    // Extract id from validated data and use rest for update
    const { id: _, ...updateData } = validationResult.data;

    // Update bank account
    const account = await prisma.bankAccount.update({
      where: { id },
      data: updateData,
    });

    // Remove sensitive tokens from response
    const sanitizedAccount = sanitizeBankAccount(account);

    return res.json({
      success: true,
      account: sanitizedAccount,
    });
  } catch (error) {
    console.error('Update bank account error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while updating bank account',
    });
  }
});

// DELETE /api/bank/accounts/:id - Delete bank account
router.delete('/:id', requireAuth, requireAdmin(), async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bank account ID format',
      });
    }

    // Check if bank account exists
    const existingAccount = await prisma.bankAccount.findUnique({
      where: { id },
    });

    if (!existingAccount) {
      return res.status(404).json({
        success: false,
        error: 'Bank account not found',
      });
    }

    // Hard delete the account (cascade will remove related records)
    await prisma.bankAccount.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: 'Bank account deleted successfully',
    });
  } catch (error) {
    console.error('Delete bank account error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while deleting bank account',
    });
  }
});

// POST /api/bank/accounts/:id/sync - Manually trigger transaction sync
router.post('/:id/sync', requireAuth, requireAdmin(), async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bank account ID format',
      });
    }

    // Check if bank account exists
    const existingAccount = await prisma.bankAccount.findUnique({
      where: { id },
    });

    if (!existingAccount) {
      return res.status(404).json({
        success: false,
        error: 'Bank account not found',
      });
    }

    // Trigger manual sync
    const syncResult = await syncNewTransactions(id);

    // Handle sync result
    if (!syncResult.success) {
      // Check for specific error types
      if (syncResult.error === 'Sync already in progress') {
        return res.status(409).json({
          success: false,
          error: syncResult.error,
        });
      }

      if (syncResult.error === 'Access token has expired. Please reconnect your bank account.') {
        return res.status(401).json({
          success: false,
          error: syncResult.error,
        });
      }

      // Generic error
      return res.status(500).json({
        success: false,
        error: syncResult.error,
      });
    }

    // Return successful sync result
    return res.json({
      success: true,
      result: {
        transactionsFetched: syncResult.transactionsFetched,
        lastSyncAt: syncResult.lastSyncAt,
        lastSyncStatus: syncResult.lastSyncStatus,
      },
    });
  } catch (error) {
    console.error('Manual sync endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while syncing transactions',
    });
  }
});

export default router;
