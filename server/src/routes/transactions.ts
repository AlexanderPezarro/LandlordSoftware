import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import prisma from '../db/client.js';
import {
  CreateTransactionSchema,
  UpdateTransactionSchema,
  TransactionQueryParamsSchema,
} from '../../../shared/validation/transaction.validation.js';
import { z } from 'zod';

const router = Router();

// Helper function to validate type/category match
function validateTypeCategoryMatch(type: string, category: string): boolean {
  const incomeCategories = ['Rent', 'Security Deposit', 'Late Fee', 'Lease Fee'];
  const expenseCategories = [
    'Maintenance',
    'Repair',
    'Utilities',
    'Insurance',
    'Property Tax',
    'Management Fee',
    'Legal Fee',
    'Other',
  ];

  if (type === 'Income') {
    return incomeCategories.includes(category);
  } else if (type === 'Expense') {
    return expenseCategories.includes(category);
  }
  return false;
}

// GET /api/transactions - List transactions with filtering
router.get('/', async (req, res) => {
  try {
    // Validate query parameters
    const validationResult = TransactionQueryParamsSchema.safeParse(req.query);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.issues[0].message,
      });
    }

    const { property_id, type, category, from_date, to_date } = validationResult.data;

    // Build filter object
    const where: any = {};

    if (property_id) {
      where.propertyId = property_id;
    }

    if (type) {
      where.type = type;
    }

    if (category) {
      where.category = category;
    }

    if (from_date || to_date) {
      where.transactionDate = {};
      if (from_date) {
        where.transactionDate.gte = from_date;
      }
      if (to_date) {
        where.transactionDate.lte = to_date;
      }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        property: true,
        lease: true,
      },
      orderBy: { transactionDate: 'desc' },
    });

    return res.json({
      success: true,
      transactions,
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while fetching transactions',
    });
  }
});

// GET /api/transactions/summary - Financial summary with filtering
router.get('/summary', async (req, res) => {
  try {
    // Validate query parameters (same as list endpoint)
    const validationResult = TransactionQueryParamsSchema.safeParse(req.query);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.issues[0].message,
      });
    }

    const { property_id, type, category, from_date, to_date } = validationResult.data;

    // Build filter object
    const where: any = {};

    if (property_id) {
      where.propertyId = property_id;
    }

    if (type) {
      where.type = type;
    }

    if (category) {
      where.category = category;
    }

    if (from_date || to_date) {
      where.transactionDate = {};
      if (from_date) {
        where.transactionDate.gte = from_date;
      }
      if (to_date) {
        where.transactionDate.lte = to_date;
      }
    }

    // Get all matching transactions
    const transactions = await prisma.transaction.findMany({
      where,
    });

    // Calculate summary
    let total_income = 0;
    let total_expense = 0;

    transactions.forEach((transaction) => {
      if (transaction.type === 'Income') {
        total_income += transaction.amount;
      } else if (transaction.type === 'Expense') {
        total_expense += transaction.amount;
      }
    });

    const net = total_income - total_expense;
    const transaction_count = transactions.length;

    return res.json({
      success: true,
      summary: {
        total_income,
        total_expense,
        net,
        transaction_count,
      },
    });
  } catch (error) {
    console.error('Get transactions summary error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while fetching transactions summary',
    });
  }
});

// GET /api/transactions/:id - Get single transaction
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction ID format',
      });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        property: true,
        lease: true,
      },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
      });
    }

    return res.json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while fetching transaction',
    });
  }
});

// POST /api/transactions - Create transaction (requires auth)
router.post('/', requireAuth, async (req, res) => {
  try {
    // Validate request body
    const validationResult = CreateTransactionSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.issues[0].message,
      });
    }

    const transactionData = validationResult.data;

    // Check property exists and status is NOT 'For Sale'
    const property = await prisma.property.findUnique({
      where: { id: transactionData.propertyId },
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
        error: 'Property is not available for transactions',
      });
    }

    // If leaseId provided, check lease exists
    if (transactionData.leaseId) {
      const lease = await prisma.lease.findUnique({
        where: { id: transactionData.leaseId },
      });

      if (!lease) {
        return res.status(404).json({
          success: false,
          error: 'Lease not found',
        });
      }
    }

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: transactionData,
    });

    return res.status(201).json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while creating transaction',
    });
  }
});

// PUT /api/transactions/:id - Update transaction (requires auth)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction ID format',
      });
    }

    // Validate request body with id
    const validationResult = UpdateTransactionSchema.safeParse({
      id,
      ...req.body,
    });

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.issues[0].message,
      });
    }

    // Check if transaction exists
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!existingTransaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
      });
    }

    // Extract id from validated data and use rest for update
    const { id: _, ...updateData } = validationResult.data;

    // Validate type/category match when only one is updated
    if (updateData.type && !updateData.category) {
      // Only type is being updated, validate against existing category
      if (!validateTypeCategoryMatch(updateData.type, existingTransaction.category)) {
        return res.status(400).json({
          success: false,
          error: 'Category must match the transaction type',
        });
      }
    } else if (updateData.category && !updateData.type) {
      // Only category is being updated, validate against existing type
      if (!validateTypeCategoryMatch(existingTransaction.type, updateData.category)) {
        return res.status(400).json({
          success: false,
          error: 'Category must match the transaction type',
        });
      }
    }

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
          error: 'Property is not available for transactions',
        });
      }
    }

    // If leaseId changed (including null), validate lease exists if not null
    if (updateData.leaseId !== undefined && updateData.leaseId !== null) {
      const lease = await prisma.lease.findUnique({
        where: { id: updateData.leaseId },
      });

      if (!lease) {
        return res.status(404).json({
          success: false,
          error: 'Lease not found',
        });
      }
    }

    // Update transaction
    const transaction = await prisma.transaction.update({
      where: { id },
      data: updateData,
    });

    return res.json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while updating transaction',
    });
  }
});

// DELETE /api/transactions/:id - Hard delete transaction (requires auth)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction ID format',
      });
    }

    // Check if transaction exists
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!existingTransaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
      });
    }

    // Hard delete
    await prisma.transaction.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: 'Transaction deleted successfully',
    });
  } catch (error) {
    console.error('Delete transaction error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while deleting transaction',
    });
  }
});

export default router;
