import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/permissions.js';
import prisma from '../db/client.js';
import {
  CreateMatchingRuleSchema,
  UpdateMatchingRuleSchema,
  ReorderRulesSchema,
  TestRuleSchema,
} from '../../../shared/validation/matchingRule.validation.js';
import { z } from 'zod';
import { evaluateRules } from '../services/ruleEvaluationEngine.js';
import { reprocessPendingTransactions } from '../services/ruleReprocessing.js';
import type { BankTransaction } from '@prisma/client';

const router = Router();

// GET /api/bank/accounts/:accountId/rules - List all rules for a bank account
router.get('/accounts/:accountId/rules', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { accountId } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(accountId).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bank account ID format',
      });
    }

    // Check if bank account exists
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: accountId },
    });

    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        error: 'Bank account not found',
      });
    }

    // Get both account-specific and global rules, ordered by priority
    const rules = await prisma.matchingRule.findMany({
      where: {
        OR: [{ bankAccountId: accountId }, { bankAccountId: null }],
      },
      orderBy: { priority: 'asc' },
    });

    return res.json({
      success: true,
      rules,
    });
  } catch (error) {
    console.error('Get matching rules error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while fetching matching rules',
    });
  }
});

// POST /api/bank/accounts/:accountId/rules - Create a new rule for a bank account
router.post('/accounts/:accountId/rules', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { accountId } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(accountId).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bank account ID format',
      });
    }

    // Check if bank account exists
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: accountId },
    });

    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        error: 'Bank account not found',
      });
    }

    // Validate request body
    const validationResult = CreateMatchingRuleSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.issues[0].message,
      });
    }

    // Get max priority for this account
    const maxPriorityRule = await prisma.matchingRule.findFirst({
      where: { bankAccountId: accountId },
      orderBy: { priority: 'desc' },
    });

    const newPriority = maxPriorityRule ? maxPriorityRule.priority + 1 : 0;

    // Create the rule
    const rule = await prisma.matchingRule.create({
      data: {
        bankAccountId: accountId,
        priority: newPriority,
        ...validationResult.data,
      },
    });

    // Reprocess pending transactions for this account
    const reprocessingResult = await reprocessPendingTransactions(accountId);

    return res.status(201).json({
      success: true,
      rule,
      reprocessing: {
        processed: reprocessingResult.processed,
        approved: reprocessingResult.approved,
        failed: reprocessingResult.failed,
      },
    });
  } catch (error) {
    console.error('Create matching rule error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while creating matching rule',
    });
  }
});

// GET /api/bank/rules/:id - Get a single rule by ID
router.get('/rules/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid rule ID format',
      });
    }

    const rule = await prisma.matchingRule.findUnique({
      where: { id },
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Matching rule not found',
      });
    }

    return res.json({
      success: true,
      rule,
    });
  } catch (error) {
    console.error('Get matching rule error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while fetching matching rule',
    });
  }
});

// PUT /api/bank/rules/:id - Update a rule
router.put('/rules/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid rule ID format',
      });
    }

    // Check if rule exists
    const existingRule = await prisma.matchingRule.findUnique({
      where: { id },
    });

    if (!existingRule) {
      return res.status(404).json({
        success: false,
        error: 'Matching rule not found',
      });
    }

    // Cannot modify global rules
    if (existingRule.bankAccountId === null) {
      return res.status(403).json({
        success: false,
        error: 'Cannot modify global rules',
      });
    }

    // Validate request body
    const validationResult = UpdateMatchingRuleSchema.safeParse({
      id,
      ...req.body,
    });

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.issues[0].message,
      });
    }

    // Extract id from validated data and use rest for update
    const { id: _, ...updateData } = validationResult.data;

    // Update the rule
    const rule = await prisma.matchingRule.update({
      where: { id },
      data: updateData,
    });

    // Reprocess pending transactions for this account
    const reprocessingResult = await reprocessPendingTransactions(existingRule.bankAccountId);

    return res.json({
      success: true,
      rule,
      reprocessing: {
        processed: reprocessingResult.processed,
        approved: reprocessingResult.approved,
        failed: reprocessingResult.failed,
      },
    });
  } catch (error) {
    console.error('Update matching rule error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while updating matching rule',
    });
  }
});

// DELETE /api/bank/rules/:id - Delete a rule
router.delete('/rules/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid rule ID format',
      });
    }

    // Check if rule exists
    const existingRule = await prisma.matchingRule.findUnique({
      where: { id },
    });

    if (!existingRule) {
      return res.status(404).json({
        success: false,
        error: 'Matching rule not found',
      });
    }

    // Cannot delete global rules
    if (existingRule.bankAccountId === null) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete global rules',
      });
    }

    // Delete the rule
    await prisma.matchingRule.delete({
      where: { id },
    });

    // Reprocess pending transactions for this account
    const reprocessingResult = await reprocessPendingTransactions(existingRule.bankAccountId);

    return res.json({
      success: true,
      message: 'Matching rule deleted successfully',
      reprocessing: {
        processed: reprocessingResult.processed,
        approved: reprocessingResult.approved,
        failed: reprocessingResult.failed,
      },
    });
  } catch (error) {
    console.error('Delete matching rule error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while deleting matching rule',
    });
  }
});

// POST /api/bank/rules/reorder - Reorder rules
router.post('/rules/reorder', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Validate request body
    const validationResult = ReorderRulesSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.issues[0].message,
      });
    }

    const { ruleIds } = validationResult.data;

    // Fetch all rules
    const rules = await prisma.matchingRule.findMany({
      where: { id: { in: ruleIds } },
    });

    // Check if all rules exist
    if (rules.length !== ruleIds.length) {
      return res.status(404).json({
        success: false,
        error: 'One or more rules not found',
      });
    }

    // Check if any rule is global
    const hasGlobalRule = rules.some((rule) => rule.bankAccountId === null);
    if (hasGlobalRule) {
      return res.status(403).json({
        success: false,
        error: 'Cannot reorder global rules',
      });
    }

    // Update priorities based on array position
    await prisma.$transaction(
      ruleIds.map((ruleId, index) =>
        prisma.matchingRule.update({
          where: { id: ruleId },
          data: { priority: index },
        })
      )
    );

    return res.json({
      success: true,
      message: 'Rules reordered successfully',
    });
  } catch (error) {
    console.error('Reorder matching rules error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while reordering matching rules',
    });
  }
});

// POST /api/bank/rules/:id/test - Test a rule against sample transaction
router.post('/rules/:id/test', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid rule ID format',
      });
    }

    // Check if rule exists
    const rule = await prisma.matchingRule.findUnique({
      where: { id },
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Matching rule not found',
      });
    }

    // Validate request body
    const validationResult = TestRuleSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.issues[0].message,
      });
    }

    // Create a mock bank transaction object
    const mockTransaction: Partial<BankTransaction> = {
      id: 'test',
      bankAccountId: rule.bankAccountId || 'test',
      externalId: 'test',
      description: validationResult.data.description,
      amount: validationResult.data.amount,
      counterpartyName: validationResult.data.counterpartyName || null,
      merchant: validationResult.data.merchant || null,
      reference: validationResult.data.reference || null,
      currency: 'GBP',
      transactionDate: new Date(),
      settledDate: null,
      importedAt: new Date(),
      category: null,
      transactionId: null,
      pendingTransactionId: null,
    };

    // Evaluate the rule
    const result = evaluateRules(mockTransaction as BankTransaction, [rule]);

    // Check if the rule matched
    const matches = result.matchedRules.includes(rule.id);

    return res.json({
      success: true,
      matches,
      result,
    });
  } catch (error) {
    console.error('Test matching rule error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while testing matching rule',
    });
  }
});

export default router;
