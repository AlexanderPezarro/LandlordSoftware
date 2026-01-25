import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/permissions.js';
import prisma from '../db/client.js';
import { z } from 'zod';
import { bulkIdsSchema, bulkUpdateSchema } from '../../../shared/validation/index.js';

const router = Router();

// GET /api/pending-transactions/count - Get count of unreviewed pending transactions
router.get('/count', requireAuth, requireAdmin(), async (_req, res) => {
  try {
    const count = await prisma.pendingTransaction.count({
      where: {
        reviewedAt: null,
      },
    });

    return res.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error('Get pending transactions count error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while fetching pending transactions count',
    });
  }
});

// POST /api/pending-transactions/bulk/approve - Bulk approve pending transactions
router.post('/bulk/approve', requireAuth, requireAdmin(), async (req, res) => {
  try {
    // Validate input using Zod schema
    const validation = bulkIdsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.issues[0].message,
      });
    }

    const { ids } = validation.data;
    const userId = req.user!.id;

    // Fetch all pending transactions
    const pendingTransactions = await prisma.pendingTransaction.findMany({
      where: {
        id: { in: ids },
      },
      include: {
        bankTransaction: true,
      },
    });

    // Check all exist
    if (pendingTransactions.length !== ids.length) {
      return res.status(404).json({
        success: false,
        error: 'One or more pending transactions not found',
      });
    }

    // Validate all transactions are ready for approval
    const errors: string[] = [];
    for (const pt of pendingTransactions) {
      if (pt.reviewedAt) {
        errors.push(`Transaction ${pt.id} has already been reviewed`);
      }
      if (!pt.propertyId) {
        errors.push(`Transaction ${pt.id} is missing propertyId`);
      }
      if (!pt.type) {
        errors.push(`Transaction ${pt.id} is missing type`);
      }
      if (!pt.category) {
        errors.push(`Transaction ${pt.id} is missing category`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot approve transactions',
        details: errors,
      });
    }

    // Approve all in a transaction
    const results = await prisma.$transaction(async (tx) => {
      const transactions = [];

      for (const pt of pendingTransactions) {
        // Create the Transaction record
        const transaction = await tx.transaction.create({
          data: {
            propertyId: pt.propertyId!,
            leaseId: pt.leaseId,
            type: pt.type!,
            category: pt.category!,
            amount: pt.bankTransaction.amount,
            transactionDate: pt.transactionDate,
            description: pt.description,
            bankTransactionId: pt.bankTransactionId,
            isImported: true,
            importedAt: new Date(),
          },
        });

        // Update bank transaction to link to the new transaction
        await tx.bankTransaction.update({
          where: { id: pt.bankTransactionId },
          data: {
            transactionId: transaction.id,
          },
        });

        // Mark pending transaction as reviewed
        await tx.pendingTransaction.update({
          where: { id: pt.id },
          data: {
            reviewedAt: new Date(),
            reviewedBy: userId,
          },
        });

        transactions.push(transaction);
      }

      return transactions;
    });

    return res.json({
      success: true,
      count: results.length,
      transactions: results,
      message: `Successfully approved ${results.length} transaction(s)`,
    });
  } catch (error) {
    console.error('Bulk approve pending transactions error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while bulk approving pending transactions',
    });
  }
});

// POST /api/pending-transactions/bulk/update - Bulk update pending transactions
router.post('/bulk/update', requireAuth, requireAdmin(), async (req, res) => {
  try {
    // Validate input using Zod schema
    const validation = bulkUpdateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.issues[0].message,
      });
    }

    const { ids, updates } = validation.data;
    const { propertyId, leaseId, type, category } = updates;

    // Pre-validate that transactions haven't been reviewed
    const pendingTransactions = await prisma.pendingTransaction.findMany({
      where: { id: { in: ids } },
    });

    const alreadyReviewed = pendingTransactions.filter((pt) => pt.reviewedAt);
    if (alreadyReviewed.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot update ${alreadyReviewed.length} transaction(s) that have already been reviewed`,
      });
    }

    // Validate property exists if propertyId is provided
    if (propertyId !== undefined && propertyId !== null) {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
      });

      if (!property) {
        return res.status(400).json({
          success: false,
          error: 'Property not found',
        });
      }
    }

    // Validate lease exists if leaseId is provided
    if (leaseId !== undefined && leaseId !== null) {
      const lease = await prisma.lease.findUnique({
        where: { id: leaseId },
      });

      if (!lease) {
        return res.status(400).json({
          success: false,
          error: 'Lease not found',
        });
      }

      // If both leaseId and propertyId are provided, validate the relationship
      if (propertyId !== undefined && propertyId !== null) {
        if (lease.propertyId !== propertyId) {
          return res.status(400).json({
            success: false,
            error: 'Lease does not belong to the specified property',
          });
        }
      }
    }

    // Build update data
    const updateData: {
      propertyId?: string | null;
      leaseId?: string | null;
      type?: string | null;
      category?: string | null;
    } = {};
    if (propertyId !== undefined) updateData.propertyId = propertyId;
    if (leaseId !== undefined) updateData.leaseId = leaseId;
    if (type !== undefined) updateData.type = type;
    if (category !== undefined) updateData.category = category;

    // Update all pending transactions
    const result = await prisma.pendingTransaction.updateMany({
      where: {
        id: { in: ids },
        reviewedAt: null, // Only update unreviewed transactions
      },
      data: updateData,
    });

    return res.json({
      success: true,
      count: result.count,
      message: `Successfully updated ${result.count} transaction(s)`,
    });
  } catch (error) {
    console.error('Bulk update pending transactions error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while bulk updating pending transactions',
    });
  }
});

// POST /api/pending-transactions/bulk/reject - Bulk reject (delete) pending transactions
router.post('/bulk/reject', requireAuth, requireAdmin(), async (req, res) => {
  try {
    // Validate input using Zod schema
    const validation = bulkIdsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.issues[0].message,
      });
    }

    const { ids } = validation.data;

    // Pre-validate that transactions haven't been reviewed
    const pendingTransactions = await prisma.pendingTransaction.findMany({
      where: { id: { in: ids } },
    });

    const alreadyReviewed = pendingTransactions.filter((pt) => pt.reviewedAt);
    if (alreadyReviewed.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot reject ${alreadyReviewed.length} transaction(s) that have already been reviewed`,
      });
    }

    // Delete only unreviewed pending transactions
    const result = await prisma.pendingTransaction.deleteMany({
      where: {
        id: { in: ids },
        reviewedAt: null, // Only delete unreviewed transactions
      },
    });

    return res.json({
      success: true,
      count: result.count,
      message: `Successfully rejected ${result.count} transaction(s)`,
    });
  } catch (error) {
    console.error('Bulk reject pending transactions error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while bulk rejecting pending transactions',
    });
  }
});

// GET /api/pending-transactions - List all pending transactions with filters
router.get('/', requireAuth, requireAdmin(), async (req, res) => {
  try {
    const { bank_account_id, review_status, search } = req.query;

    // Build where clause
    const where: any = {};

    // Filter by review status
    if (review_status === 'pending') {
      where.reviewedAt = null;
    } else if (review_status === 'reviewed') {
      where.reviewedAt = { not: null };
    } else {
      // Default: show only pending (unreviewed)
      where.reviewedAt = null;
    }

    // Filter by bank account
    if (bank_account_id && typeof bank_account_id === 'string') {
      where.bankTransaction = {
        bankAccountId: bank_account_id,
      };
    }

    // Search by description (SQLite is case-insensitive by default for LIKE)
    if (search && typeof search === 'string') {
      where.description = {
        contains: search,
      };
    }

    const pendingTransactions = await prisma.pendingTransaction.findMany({
      where,
      include: {
        bankTransaction: {
          include: {
            bankAccount: {
              select: {
                id: true,
                accountName: true,
                accountType: true,
                provider: true,
              },
            },
          },
        },
      },
      orderBy: {
        transactionDate: 'desc',
      },
    });

    // Flatten the response for easier frontend consumption
    const formattedTransactions = pendingTransactions.map((pt) => ({
      id: pt.id,
      bankTransactionId: pt.bankTransactionId,
      propertyId: pt.propertyId,
      leaseId: pt.leaseId,
      type: pt.type,
      category: pt.category,
      transactionDate: pt.transactionDate,
      description: pt.description,
      amount: pt.bankTransaction.amount,
      currency: pt.bankTransaction.currency,
      reviewedAt: pt.reviewedAt,
      reviewedBy: pt.reviewedBy,
      createdAt: pt.createdAt,
      bankAccount: pt.bankTransaction.bankAccount,
      bankTransaction: {
        id: pt.bankTransaction.id,
        externalId: pt.bankTransaction.externalId,
        amount: pt.bankTransaction.amount,
        currency: pt.bankTransaction.currency,
        description: pt.bankTransaction.description,
        counterpartyName: pt.bankTransaction.counterpartyName,
        reference: pt.bankTransaction.reference,
        merchant: pt.bankTransaction.merchant,
        category: pt.bankTransaction.category,
        transactionDate: pt.bankTransaction.transactionDate,
        settledDate: pt.bankTransaction.settledDate,
      },
    }));

    return res.json({
      success: true,
      pendingTransactions: formattedTransactions,
    });
  } catch (error) {
    console.error('Get pending transactions error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while fetching pending transactions',
    });
  }
});

// PATCH /api/pending-transactions/:id - Update pending transaction fields
router.patch('/:id', requireAuth, requireAdmin(), async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid pending transaction ID format',
      });
    }

    // Check if pending transaction exists
    const existingPending = await prisma.pendingTransaction.findUnique({
      where: { id },
    });

    if (!existingPending) {
      return res.status(404).json({
        success: false,
        error: 'Pending transaction not found',
      });
    }

    // Extract updatable fields from request
    const { propertyId, leaseId, type, category } = req.body;

    // Validate property exists if propertyId is provided
    if (propertyId) {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
      });

      if (!property) {
        return res.status(400).json({
          success: false,
          error: 'Property not found',
        });
      }
    }

    // Validate lease exists if leaseId is provided
    if (leaseId) {
      const lease = await prisma.lease.findUnique({
        where: { id: leaseId },
      });

      if (!lease) {
        return res.status(400).json({
          success: false,
          error: 'Lease not found',
        });
      }
    }

    // Build update data
    const updateData: any = {};
    if (propertyId !== undefined) updateData.propertyId = propertyId;
    if (leaseId !== undefined) updateData.leaseId = leaseId;
    if (type !== undefined) updateData.type = type;
    if (category !== undefined) updateData.category = category;

    // Update pending transaction
    const updatedPending = await prisma.pendingTransaction.update({
      where: { id },
      data: updateData,
      include: {
        bankTransaction: {
          include: {
            bankAccount: {
              select: {
                id: true,
                accountName: true,
                accountType: true,
                provider: true,
              },
            },
          },
        },
      },
    });

    return res.json({
      success: true,
      pendingTransaction: {
        id: updatedPending.id,
        bankTransactionId: updatedPending.bankTransactionId,
        propertyId: updatedPending.propertyId,
        leaseId: updatedPending.leaseId,
        type: updatedPending.type,
        category: updatedPending.category,
        transactionDate: updatedPending.transactionDate,
        description: updatedPending.description,
        amount: updatedPending.bankTransaction.amount,
        currency: updatedPending.bankTransaction.currency,
        reviewedAt: updatedPending.reviewedAt,
        reviewedBy: updatedPending.reviewedBy,
        createdAt: updatedPending.createdAt,
        bankAccount: updatedPending.bankTransaction.bankAccount,
      },
    });
  } catch (error) {
    console.error('Update pending transaction error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while updating pending transaction',
    });
  }
});

// POST /api/pending-transactions/:id/approve - Approve and create transaction
router.post('/:id/approve', requireAuth, requireAdmin(), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid pending transaction ID format',
      });
    }

    // Check if pending transaction exists
    const pendingTx = await prisma.pendingTransaction.findUnique({
      where: { id },
      include: {
        bankTransaction: true,
      },
    });

    if (!pendingTx) {
      return res.status(404).json({
        success: false,
        error: 'Pending transaction not found',
      });
    }

    // Check if already reviewed
    if (pendingTx.reviewedAt) {
      return res.status(400).json({
        success: false,
        error: 'This pending transaction has already been reviewed',
      });
    }

    // Validate required fields are present
    if (!pendingTx.propertyId) {
      return res.status(400).json({
        success: false,
        error: 'propertyId is required before approval',
      });
    }

    if (!pendingTx.type) {
      return res.status(400).json({
        success: false,
        error: 'type is required before approval',
      });
    }

    if (!pendingTx.category) {
      return res.status(400).json({
        success: false,
        error: 'category is required before approval',
      });
    }

    // Create transaction in a transaction (database transaction)
    const result = await prisma.$transaction(async (tx) => {
      // Create the Transaction record
      const transaction = await tx.transaction.create({
        data: {
          propertyId: pendingTx.propertyId!,
          leaseId: pendingTx.leaseId,
          type: pendingTx.type!,
          category: pendingTx.category!,
          amount: pendingTx.bankTransaction.amount,
          transactionDate: pendingTx.transactionDate,
          description: pendingTx.description,
          bankTransactionId: pendingTx.bankTransactionId,
          isImported: true,
          importedAt: new Date(),
        },
        include: {
          property: true,
          lease: true,
        },
      });

      // Update bank transaction to link to the new transaction
      await tx.bankTransaction.update({
        where: { id: pendingTx.bankTransactionId },
        data: {
          transactionId: transaction.id,
        },
      });

      // Mark pending transaction as reviewed
      await tx.pendingTransaction.update({
        where: { id },
        data: {
          reviewedAt: new Date(),
          reviewedBy: userId,
        },
      });

      return transaction;
    });

    return res.json({
      success: true,
      transaction: result,
      message: 'Transaction approved and created successfully',
    });
  } catch (error) {
    console.error('Approve pending transaction error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while approving pending transaction',
    });
  }
});

export default router;
