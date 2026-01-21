import { Router } from 'express';
import prisma from '../db/client.js';
import type { MonzoTransaction } from '../services/monzo.service.js';

const router = Router();

/**
 * Monzo webhook payload interface for transaction.created events
 */
interface MonzoWebhookPayload {
  type: 'transaction.created';
  data: MonzoTransaction;
}

/**
 * POST /api/bank/webhooks/monzo
 *
 * Webhook endpoint for Monzo transaction.created events.
 * This is a public endpoint (no authentication) as it receives webhooks from Monzo servers.
 *
 * Process:
 * 1. Receive webhook payload
 * 2. TODO: Implement HMAC signature verification (Task-7im)
 * 3. Find bank account by account_id from transaction
 * 4. Create SyncLog with syncType="webhook"
 * 5. Create BankTransaction record (with duplicate detection via upsert)
 * 6. Update SyncLog with success/failure status
 *
 * Response:
 * - 200: Successfully processed webhook
 * - 400: Malformed payload
 * - 500: Processing error
 */
router.post('/monzo', async (req, res) => {
  let syncLogId: string | undefined;

  try {
    // TODO: Implement HMAC signature verification (Task-7im)
    // This will validate that the webhook actually came from Monzo
    // For now, we accept all requests

    // Validate payload structure
    const payload = req.body as MonzoWebhookPayload;

    if (!payload || payload.type !== 'transaction.created' || !payload.data) {
      console.error('Invalid webhook payload:', payload);
      return res.status(400).json({
        success: false,
        error: 'Invalid webhook payload',
      });
    }

    const transaction = payload.data;

    // Validate required transaction fields
    if (!transaction.account_id || !transaction.id || transaction.amount === undefined) {
      console.error('Missing required transaction fields:', transaction);
      return res.status(400).json({
        success: false,
        error: 'Missing required transaction fields',
      });
    }

    // Find bank account by Monzo account_id
    // Note: In the Monzo API, this comes from the transaction data
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { accountId: transaction.account_id },
    });

    if (!bankAccount) {
      // This is not necessarily an error - could be a webhook for an account
      // that was disconnected or hasn't been connected yet
      console.warn(`Webhook received for unknown account: ${transaction.account_id}`);
      return res.status(200).json({
        success: true,
        message: 'Webhook received but account not found',
      });
    }

    // Create SyncLog for webhook event
    const syncLog = await prisma.syncLog.create({
      data: {
        bankAccountId: bankAccount.id,
        syncType: 'webhook',
        status: 'in_progress',
        webhookEventId: transaction.id, // Use transaction ID as event identifier
      },
    });
    syncLogId = syncLog.id;

    // Create or update BankTransaction record (upsert for duplicate detection)
    await prisma.bankTransaction.upsert({
      where: {
        bankAccountId_externalId: {
          bankAccountId: bankAccount.id,
          externalId: transaction.id,
        },
      },
      create: {
        bankAccountId: bankAccount.id,
        externalId: transaction.id,
        amount: transaction.amount / 100, // Convert pence to pounds
        currency: transaction.currency,
        description: transaction.description,
        counterpartyName: transaction.counterparty?.name || null,
        reference: transaction.notes || null,
        merchant: transaction.merchant?.name || null,
        category: transaction.category || null,
        transactionDate: new Date(transaction.created),
        settledDate: transaction.settled ? new Date(transaction.settled) : null,
      },
      update: {}, // Don't update if already exists (idempotency)
    });

    // Update SyncLog with success
    await prisma.syncLog.update({
      where: { id: syncLogId },
      data: {
        status: 'success',
        completedAt: new Date(),
        transactionsFetched: 1,
      },
    });

    // Update bank account last sync status
    await prisma.bankAccount.update({
      where: { id: bankAccount.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: 'success',
      },
    });

    console.log(`Webhook processed successfully for transaction ${transaction.id}`);

    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error) {
    console.error('Webhook processing error:', error);

    // Update SyncLog with error if it was created
    if (syncLogId) {
      try {
        await prisma.syncLog.update({
          where: { id: syncLogId },
          data: {
            status: 'failed',
            completedAt: new Date(),
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorDetails: error instanceof Error ? error.stack : undefined,
          },
        });
      } catch (updateError) {
        console.error('Failed to update SyncLog with error:', updateError);
      }
    }

    return res.status(500).json({
      success: false,
      error: 'An error occurred while processing webhook',
    });
  }
});

export default router;
