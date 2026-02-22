import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireWrite } from '../middleware/permissions.js';
import prisma from '../db/client.js';
import {
  TransactionQueryParamsSchema,
  TransactionWithSplitsSchema,
  UpdateTransactionWithSplitsSchema,
} from '../../../shared/validation/transaction.validation.js';
import { z } from 'zod';
import transactionService from '../services/transaction.service.js';
import transactionAuditService from '../services/transactionAudit.service.js';

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
        splits: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        paidBy: {
          select: {
            id: true,
            email: true,
          },
        },
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

    // If type filter is specified, only query that type; otherwise query both
    let total_income = 0;
    let total_expense = 0;
    let income_count = 0;
    let expense_count = 0;

    if (!type || type === 'Income') {
      const incomeResult = await prisma.transaction.aggregate({
        where: { ...where, type: 'Income' },
        _sum: { amount: true },
        _count: true,
      });
      total_income = incomeResult._sum.amount || 0;
      income_count = incomeResult._count;
    }

    if (!type || type === 'Expense') {
      const expenseResult = await prisma.transaction.aggregate({
        where: { ...where, type: 'Expense' },
        _sum: { amount: true },
        _count: true,
      });
      total_expense = expenseResult._sum.amount || 0;
      expense_count = expenseResult._count;
    }

    const transaction_count = income_count + expense_count;
    const net = total_income - total_expense;

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

// GET /api/transactions/reports/profit-loss - P&L Report with monthly breakdown
router.get('/reports/profit-loss', async (req, res) => {
  try {
    const validationResult = TransactionQueryParamsSchema.safeParse(req.query);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.issues[0].message,
      });
    }

    const { property_id, from_date, to_date } = validationResult.data;

    // Build filter object
    const where: any = {};

    if (property_id) {
      where.propertyId = property_id;
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

    // Get all transactions in the date range
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { transactionDate: 'asc' },
    });

    // Group by month and category
    const monthlyData: any = {};

    transactions.forEach(t => {
      const date = new Date(t.transactionDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          income: {},
          expense: {},
        };
      }

      const categoryGroup = t.type === 'Income' ? 'income' : 'expense';

      if (!monthlyData[monthKey][categoryGroup][t.category]) {
        monthlyData[monthKey][categoryGroup][t.category] = 0;
      }

      monthlyData[monthKey][categoryGroup][t.category] += Number(t.amount);
    });

    return res.json({
      success: true,
      data: monthlyData,
    });
  } catch (error) {
    console.error('Get P&L report error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while fetching P&L report',
    });
  }
});

// GET /api/transactions/reports/category-breakdown - Category breakdown for charts
router.get('/reports/category-breakdown', async (req, res) => {
  try {
    const validationResult = TransactionQueryParamsSchema.safeParse(req.query);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.issues[0].message,
      });
    }

    const { property_id, from_date, to_date } = validationResult.data;

    // Build filter object
    const where: any = {};

    if (property_id) {
      where.propertyId = property_id;
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

    // Get all transactions and group by type and category
    const transactions = await prisma.transaction.findMany({
      where,
    });

    const incomeByCategory: Record<string, number> = {};
    const expenseByCategory: Record<string, number> = {};

    transactions.forEach(t => {
      const amount = Number(t.amount);
      if (t.type === 'Income') {
        incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + amount;
      } else {
        expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + amount;
      }
    });

    return res.json({
      success: true,
      data: {
        income: incomeByCategory,
        expense: expenseByCategory,
      },
    });
  } catch (error) {
    console.error('Get category breakdown error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while fetching category breakdown',
    });
  }
});

// GET /api/transactions/reports/property-performance - Property performance metrics
router.get('/reports/property-performance', async (req, res) => {
  try {
    const validationResult = TransactionQueryParamsSchema.safeParse(req.query);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.issues[0].message,
      });
    }

    const { from_date, to_date } = validationResult.data;

    // Build filter object
    const where: any = {};

    if (from_date || to_date) {
      where.transactionDate = {};
      if (from_date) {
        where.transactionDate.gte = from_date;
      }
      if (to_date) {
        where.transactionDate.lte = to_date;
      }
    }

    // Get all transactions with property info
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        property: true,
      },
    });

    // Group by property
    const propertyData: Record<string, any> = {};

    transactions.forEach(t => {
      if (!propertyData[t.propertyId]) {
        propertyData[t.propertyId] = {
          propertyId: t.propertyId,
          propertyName: t.property.name,
          totalRevenue: 0,
          totalExpenses: 0,
        };
      }

      const amount = Number(t.amount);
      if (t.type === 'Income') {
        propertyData[t.propertyId].totalRevenue += amount;
      } else {
        propertyData[t.propertyId].totalExpenses += amount;
      }
    });

    // Calculate net income for each property
    const result = Object.values(propertyData).map((p: any) => ({
      ...p,
      netIncome: p.totalRevenue - p.totalExpenses,
    }));

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get property performance error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while fetching property performance',
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
        splits: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        paidBy: {
          select: {
            id: true,
            email: true,
          },
        },
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

// POST /api/transactions - Create transaction (requires auth + write permission)
router.post('/', requireAuth, requireWrite, async (req, res) => {
  try {
    // Try to validate with TransactionWithSplitsSchema first (supports paidByUserId and splits)
    const validationResult = TransactionWithSplitsSchema.safeParse(req.body);

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

    // Create transaction using service (handles splits and paidByUserId)
    const transaction = await transactionService.createTransaction(transactionData);

    return res.status(201).json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error('Create transaction error:', error);

    // Handle specific error messages from service
    if (error instanceof Error &&
        (error.message.includes('not a property owner') ||
         error.message.includes('paidByUserId must be a property owner'))) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'An error occurred while creating transaction',
    });
  }
});

// PUT /api/transactions/:id - Update transaction (requires auth + write permission)
router.put('/:id', requireAuth, requireWrite, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction ID format',
      });
    }

    // Use UpdateTransactionWithSplitsSchema for updates
    const validationResult = UpdateTransactionWithSplitsSchema.safeParse(req.body);

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

    const updateData = validationResult.data;

    // Validate type/category match
    if (updateData.type && updateData.category) {
      // Both type and category are being updated, validate they match
      if (!validateTypeCategoryMatch(updateData.type, updateData.category)) {
        return res.status(400).json({
          success: false,
          error: 'Category must match the transaction type',
        });
      }
    } else if (updateData.type && !updateData.category) {
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

    // Create audit logs before updating
    await transactionAuditService.createAuditLogs(
      id,
      (req as any).session.userId,
      existingTransaction,
      updateData
    );

    // Update transaction using service (handles splits and paidByUserId)
    const transaction = await transactionService.updateTransaction(id, updateData);

    return res.json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error('Update transaction error:', error);

    // Handle specific error messages from service
    if (error instanceof Error &&
        (error.message.includes('not a property owner') ||
         error.message.includes('paidByUserId must be a property owner'))) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'An error occurred while updating transaction',
    });
  }
});

// DELETE /api/transactions/:id - Hard delete transaction (requires auth + write permission)
router.delete('/:id', requireAuth, requireWrite, async (req, res) => {
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

// GET /api/transactions/:id/audit-log - Get audit log for a transaction
router.get('/:id/audit-log', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction ID format',
      });
    }

    // Get audit logs (no need to check if transaction exists - audit logs may exist after deletion)
    const auditLogs = await transactionAuditService.getAuditLogs(id);

    return res.json({
      success: true,
      auditLogs,
    });
  } catch (error) {
    console.error('Get audit log error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while fetching audit log',
    });
  }
});

export default router;
