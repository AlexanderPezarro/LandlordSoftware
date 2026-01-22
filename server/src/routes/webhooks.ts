import { Router } from 'express';
import crypto from 'crypto';
import prisma from '../db/client.js';
import { processTransactions } from '../services/transactionProcessor.js';
import type { MonzoWebhookPayload } from '../services/monzo/types.js';

const router = Router();

/**
 * POST /api/bank/webhooks/monzo/:secret
 *
 * Webhook endpoint for Monzo transaction.created events.
 * This is a public endpoint (no authentication) as it receives webhooks from Monzo servers.
 *
 * Security:
 * - Monzo does not support HMAC signature verification for webhooks
 * - Security is provided via secret URL path parameter validation
 * - The webhook URL registered with Monzo should be:
 *   https://yourdomain.com/api/bank/webhooks/monzo/{MONZO_WEBHOOK_SECRET}
 *
 * Process:
 * 1. Receive webhook payload
 * 2. Validate secret parameter against MONZO_WEBHOOK_SECRET environment variable
 * 3. Find bank account by account_id from transaction
 * 4. Create SyncLog with syncType="webhook"
 * 5. Create BankTransaction record (with duplicate detection via upsert)
 * 6. Update SyncLog with success/failure status
 *
 * Response:
 * - 200: Successfully processed webhook
 * - 400: Malformed payload
 * - 403: Invalid or missing secret
 * - 500: Processing error or webhook not configured
 */
router.post('/monzo/:secret', async (req, res) => {
  let syncLogId: string | undefined;

  try {
    // Note: Monzo does not support HMAC signature verification for webhooks.
    // Security is provided via secret URL path parameter validation.
    // The webhook URL registered with Monzo should be:
    // https://yourdomain.com/api/bank/webhooks/monzo/{MONZO_WEBHOOK_SECRET}

    const secret = req.params.secret;
    const expectedSecret = process.env.MONZO_WEBHOOK_SECRET;

    // Validate that webhook secret is configured
    if (!expectedSecret) {
      console.error('MONZO_WEBHOOK_SECRET not configured');
      return res.status(500).json({
        success: false,
        error: 'Webhook not configured',
      });
    }

    // Timing-safe comparison to prevent timing attacks
    // Check length first (length check doesn't need to be timing-safe)
    if (secret.length !== expectedSecret.length) {
      console.warn('Invalid webhook secret attempt');
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
      });
    }

    // Use crypto.timingSafeEqual for the actual secret comparison
    const secretBuffer = Buffer.from(secret);
    const expectedBuffer = Buffer.from(expectedSecret);
    if (!crypto.timingSafeEqual(secretBuffer, expectedBuffer)) {
      console.warn('Invalid webhook secret attempt');
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
      });
    }

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

    // Check for duplicate webhook event (idempotency)
    // If this webhook event has already been processed, return success immediately
    const existingSyncLog = await prisma.syncLog.findFirst({
      where: {
        webhookEventId: transaction.id,
      },
    });

    if (existingSyncLog) {
      console.log(`Webhook event ${transaction.id} already processed, skipping`);
      return res.status(200).json({
        success: true,
        message: 'Webhook event already processed',
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

    // Process transaction through unified pipeline
    const processResult = await processTransactions([transaction], bankAccount.id);

    // Check if processing failed
    if (processResult.errors.length > 0) {
      // Update SyncLog with failure
      await prisma.syncLog.update({
        where: { id: syncLogId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          transactionsFetched: processResult.processed + processResult.duplicatesSkipped,
          errorMessage: processResult.errors[0].error,
        },
      });

      // Update bank account last sync status
      await prisma.bankAccount.update({
        where: { id: bankAccount.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: 'failed',
        },
      });

      console.error(`Webhook processing failed for transaction ${transaction.id}:`, processResult.errors[0].error);

      return res.status(500).json({
        success: false,
        error: 'An error occurred while processing webhook',
      });
    }

    // Update SyncLog with success
    await prisma.syncLog.update({
      where: { id: syncLogId },
      data: {
        status: 'success',
        completedAt: new Date(),
        transactionsFetched: processResult.processed + processResult.duplicatesSkipped,
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
