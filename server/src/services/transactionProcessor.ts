import prisma from '../db/client.js';
import { checkForDuplicate } from './duplicateDetection.js';
import { convertPenceToPounds } from '../utils/monzo.js';
import { evaluateRules, type RuleEvaluationResult } from './ruleEvaluationEngine.js';
import type { MonzoTransaction } from './monzo/types.js';
import type { BankTransaction } from '@prisma/client';

/**
 * Result of transaction processing operation
 */
export interface ProcessTransactionsResult {
  /** Number of transactions successfully processed and stored */
  processed: number;
  /** Number of duplicate transactions that were skipped */
  duplicatesSkipped: number;
  /** Array of errors that occurred during processing */
  errors: Array<{
    transactionId: string;
    error: string;
  }>;
}

/**
 * Process Monzo transactions and store them in the database
 *
 * This is a unified transaction processing pipeline that handles both:
 * - Single transactions from webhook payloads
 * - Multiple transactions from manual sync API responses
 *
 * Processing steps for each transaction:
 * 1. Convert amount from pence to pounds using convertPenceToPounds
 * 2. Check for duplicates using checkForDuplicate
 * 3. If not duplicate: create BankTransaction record with all fields
 * 4. Evaluate matching rules to determine propertyId, type, and category
 * 5. If fully matched and valid: create Transaction record
 * 6. If partially matched or unmatched: create PendingTransaction record
 * 7. If duplicate: skip and count it
 *
 * Error handling: Continue processing remaining transactions if one fails.
 * Each transaction is processed independently (partial success allowed).
 *
 * @param monzoTransactions - Array of Monzo transaction objects from API
 * @param bankAccountId - ID of the bank account these transactions belong to
 * @returns Processing result with counts and any errors encountered
 */
export async function processTransactions(
  monzoTransactions: MonzoTransaction[],
  bankAccountId: string
): Promise<ProcessTransactionsResult> {
  const result: ProcessTransactionsResult = {
    processed: 0,
    duplicatesSkipped: 0,
    errors: [],
  };

  // Fetch matching rules (account-specific + global) once for efficiency
  const matchingRules = await prisma.matchingRule.findMany({
    where: {
      OR: [
        { bankAccountId: bankAccountId },
        { bankAccountId: null }, // Global rules
      ],
    },
    orderBy: [
      // Account-specific rules should be evaluated before global rules
      { bankAccountId: 'desc' }, // Non-null (account-specific) comes before null (global)
      { priority: 'asc' },
    ],
  });

  // Process each transaction independently
  for (const monzoTx of monzoTransactions) {
    try {
      // Step 1: Convert amount from pence to pounds
      const amountInPounds = convertPenceToPounds(monzoTx.amount);

      // Step 2: Check for duplicates
      const duplicateCheck = await checkForDuplicate({
        bankAccountId,
        externalId: monzoTx.id,
        amount: amountInPounds,
        description: monzoTx.description,
        transactionDate: new Date(monzoTx.created),
      });

      // Step 3: Skip if duplicate
      if (duplicateCheck.isDuplicate) {
        result.duplicatesSkipped++;
        continue;
      }

      // Step 4: Create BankTransaction record
      const bankTransaction = await prisma.bankTransaction.create({
        data: {
          bankAccountId,
          externalId: monzoTx.id,
          amount: amountInPounds,
          currency: monzoTx.currency,
          description: monzoTx.description,
          counterpartyName: monzoTx.counterparty?.name ?? null,
          reference: monzoTx.notes || null,
          merchant: monzoTx.merchant?.name ?? null,
          category: monzoTx.category ?? null,
          transactionDate: new Date(monzoTx.created),
          settledDate: monzoTx.settled ? new Date(monzoTx.settled) : null,
        },
      });

      // Step 5: Evaluate matching rules
      const ruleResult = evaluateRules(bankTransaction, matchingRules);

      // Step 6: Create Transaction or PendingTransaction based on rule evaluation
      await createTransactionOrPending(bankTransaction, ruleResult);

      result.processed++;
    } catch (error) {
      // Record error but continue processing remaining transactions
      result.errors.push({
        transactionId: monzoTx.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return result;
}

/**
 * Create Transaction or PendingTransaction based on rule evaluation result
 *
 * Business logic:
 * - If fully matched (all 3 fields) AND valid: create Transaction
 * - Otherwise: create PendingTransaction
 *
 * Validation:
 * - Property must exist
 * - Type/category combination must be valid
 *
 * @param bankTransaction - The bank transaction to process
 * @param ruleResult - Result from rule evaluation engine
 */
async function createTransactionOrPending(
  bankTransaction: BankTransaction,
  ruleResult: RuleEvaluationResult
): Promise<void> {
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

  if (isFullyMatched && isValid && ruleResult.propertyId && transactionType && ruleResult.category) {
    // Create Transaction
    const transaction = await prisma.transaction.create({
      data: {
        propertyId: ruleResult.propertyId,
        type: transactionType,
        category: ruleResult.category,
        amount: bankTransaction.amount, // Preserve sign as-is
        transactionDate: bankTransaction.transactionDate,
        description: bankTransaction.description,
        isImported: true,
        importedAt: new Date(),
      },
    });

    // Link BankTransaction to Transaction
    await prisma.bankTransaction.update({
      where: { id: bankTransaction.id },
      data: { transactionId: transaction.id },
    });
  } else {
    // Create PendingTransaction with whatever fields were matched
    const pendingTransaction = await prisma.pendingTransaction.create({
      data: {
        bankTransactionId: bankTransaction.id,
        propertyId: ruleResult.propertyId ?? null,
        type: transactionType,
        category: ruleResult.category ?? null,
        transactionDate: bankTransaction.transactionDate,
        description: bankTransaction.description,
      },
    });

    // Link BankTransaction to PendingTransaction
    await prisma.bankTransaction.update({
      where: { id: bankTransaction.id },
      data: { pendingTransactionId: pendingTransaction.id },
    });
  }
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
