import prisma from '../db/client.js';
import { evaluateRules } from './ruleEvaluationEngine.js';

/**
 * Result of reprocessing pending transactions
 */
export interface ReprocessingResult {
  /** Number of pending transactions processed */
  processed: number;
  /** Number of pending transactions auto-approved and converted to transactions */
  approved: number;
  /** Number of failures during processing */
  failed: number;
}

/**
 * Reprocess pending transactions after rule changes
 *
 * This function re-evaluates all pending transactions against current matching rules.
 * If a pending transaction becomes fully matched and valid, it's auto-approved by:
 * 1. Creating a Transaction record
 * 2. Updating the BankTransaction (set transactionId, clear pendingTransactionId)
 * 3. Deleting the PendingTransaction
 *
 * Scope:
 * - If bankAccountId is provided: reprocess only pending transactions for that account
 * - If bankAccountId is null: reprocess all pending transactions (global rule changed)
 *
 * Error handling:
 * - Process each transaction independently
 * - Continue on errors, collect failures in result
 *
 * @param bankAccountId - Bank account ID to scope reprocessing, or null for global
 * @returns Processing result with counts
 */
export async function reprocessPendingTransactions(
  bankAccountId: string | null
): Promise<ReprocessingResult> {
  const result: ReprocessingResult = {
    processed: 0,
    approved: 0,
    failed: 0,
  };

  // Fetch pending transactions based on scope
  let pendingTransactions;
  if (bankAccountId) {
    // Account-specific: only pending transactions for this bank account
    pendingTransactions = await prisma.pendingTransaction.findMany({
      include: {
        bankTransaction: true,
      },
      where: {
        bankTransaction: {
          bankAccountId: bankAccountId,
        },
      },
    });
  } else {
    // Global: all pending transactions
    pendingTransactions = await prisma.pendingTransaction.findMany({
      include: {
        bankTransaction: true,
      },
    });
  }

  // Process each pending transaction independently
  for (const pending of pendingTransactions) {
    try {
      // Get the bank account ID for this transaction
      const txBankAccountId = pending.bankTransaction.bankAccountId;

      // Fetch matching rules (account-specific + global) for this transaction
      const matchingRules = await prisma.matchingRule.findMany({
        where: {
          OR: [
            { bankAccountId: txBankAccountId },
            { bankAccountId: null }, // Global rules
          ],
        },
        orderBy: [
          // Account-specific rules should be evaluated before global rules
          { bankAccountId: 'desc' }, // Non-null (account-specific) comes before null (global)
          { priority: 'asc' },
        ],
      });

      // Re-evaluate rules against the bank transaction
      const ruleResult = evaluateRules(pending.bankTransaction, matchingRules);

      result.processed++;

      // Convert type from rule format to database format
      const transactionType = ruleResult.type
        ? ruleResult.type === 'INCOME'
          ? 'Income'
          : 'Expense'
        : null;

      // Check if fully matched and valid
      const isFullyMatched = ruleResult.isFullyMatched;
      let isValid = false;

      if (isFullyMatched && ruleResult.propertyId && transactionType && ruleResult.category) {
        // Validate property exists
        const propertyExists = await prisma.property.findUnique({
          where: { id: ruleResult.propertyId },
          select: { id: true },
        });

        // Validate type/category combination
        const isValidCombination = validateTypeCategoryCombo(transactionType, ruleResult.category);

        isValid = !!propertyExists && isValidCombination;
      }

      // If fully matched and valid, auto-approve
      if (isFullyMatched && isValid && ruleResult.propertyId && transactionType && ruleResult.category) {
        // Create Transaction
        const transaction = await prisma.transaction.create({
          data: {
            propertyId: ruleResult.propertyId,
            type: transactionType,
            category: ruleResult.category,
            amount: pending.bankTransaction.amount, // Preserve sign as-is
            transactionDate: pending.bankTransaction.transactionDate,
            description: pending.bankTransaction.description,
            isImported: true,
            importedAt: new Date(),
          },
        });

        // Update BankTransaction to link to Transaction and clear pending
        await prisma.bankTransaction.update({
          where: { id: pending.bankTransactionId },
          data: {
            transactionId: transaction.id,
            pendingTransactionId: null,
          },
        });

        // Delete PendingTransaction
        await prisma.pendingTransaction.delete({
          where: { id: pending.id },
        });

        result.approved++;
      } else {
        // Update PendingTransaction with whatever fields were matched
        await prisma.pendingTransaction.update({
          where: { id: pending.id },
          data: {
            propertyId: ruleResult.propertyId ?? null,
            type: transactionType,
            category: ruleResult.category ?? null,
          },
        });
      }
    } catch (error) {
      // Record error but continue processing remaining transactions
      result.failed++;
      console.error(
        `Error reprocessing pending transaction ${pending.id}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  return result;
}

/**
 * Validate that a type/category combination is valid
 *
 * Income categories: Rent, Security Deposit, Late Fee, Lease Fee
 * Expense categories: Maintenance, Repair, Utilities, Insurance, Property Tax,
 *                     Management Fee, Legal Fee, Transport, Other
 *
 * @param type - Transaction type (Income or Expense)
 * @param category - Transaction category
 * @returns True if combination is valid
 */
function validateTypeCategoryCombo(type: string, category: string): boolean {
  const incomeCategories = ['Rent', 'Security Deposit', 'Late Fee', 'Lease Fee'];
  const expenseCategories = [
    'Maintenance',
    'Repair',
    'Utilities',
    'Insurance',
    'Property Tax',
    'Management Fee',
    'Legal Fee',
    'Transport',
    'Other',
  ];

  if (type === 'Income') {
    return incomeCategories.includes(category);
  } else if (type === 'Expense') {
    return expenseCategories.includes(category);
  }

  return false;
}
