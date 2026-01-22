import prisma from '../db/client.js';
import { checkForDuplicate } from './duplicateDetection.js';
import { convertPenceToPounds } from '../utils/monzo.js';
import type { MonzoTransaction } from './monzo/types.js';

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
 * 4. If duplicate: skip and count it
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
      await prisma.bankTransaction.create({
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
