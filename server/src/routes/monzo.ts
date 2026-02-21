import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/permissions.js';
import prisma from '../db/client.js';
import { z } from 'zod';
import * as monzoService from '../services/monzo.service.js';
import { encryptToken } from '../services/encryption.js';
import { importProgressTracker, ImportProgressUpdate } from '../services/importProgressTracker.js';

const router = Router();

/**
 * Map SyncLog status to ImportProgressUpdate status
 * SyncLog uses: in_progress, success, partial, failed
 * ImportProgressUpdate uses: fetching, completed, failed
 */
function mapSyncLogStatusToProgressStatus(status: string): ImportProgressUpdate['status'] {
  switch (status) {
    case 'in_progress':
      return 'fetching';
    case 'success':
    case 'partial':
      return 'completed';
    case 'failed':
      return 'failed';
    default:
      console.error(`Unknown sync log status: ${status}`);
      return 'failed';
  }
}

// Validation schema for connect request
const ConnectRequestSchema = z.object({
  syncFromDays: z.number().int().min(1).max(1825).optional().default(90),
});

/**
 * POST /api/bank/monzo/connect
 * Initiate Monzo OAuth flow by generating authorization URL
 */
router.post('/connect', requireAuth, async (req, res) => {
  try {
    // Validate request body
    const validationResult = ConnectRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.issues[0].message,
      });
    }

    const { syncFromDays } = validationResult.data;

    // Generate authorization URL
    const authUrl = monzoService.generateAuthUrl(syncFromDays);

    return res.json({
      success: true,
      authUrl,
    });
  } catch (error) {
    console.error('Monzo connect error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate Monzo authorization URL',
    });
  }
});

/**
 * GET /api/bank/monzo/callback
 * OAuth callback endpoint - exchanges code for tokens and stores them pending SCA approval.
 * Monzo requires the user to approve access in their mobile app (Strong Customer Authentication)
 * before API calls will work, so we store the tokens and redirect to a "pending approval" state.
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    // Handle OAuth error response
    if (error) {
      console.error('Monzo OAuth error:', error);
      return res.redirect(`/settings?error=${error}`);
    }

    // Validate required parameters
    if (!code || typeof code !== 'string') {
      return res.redirect('/settings?error=missing_code');
    }

    if (!state || typeof state !== 'string') {
      return res.redirect('/settings?error=missing_state');
    }

    // Validate state and get syncFromDate
    const syncFromDate = monzoService.validateState(state);

    // Exchange code for tokens
    const tokenResponse = await monzoService.exchangeCodeForTokens(code);

    // Store tokens pending SCA approval
    const pendingId = monzoService.storePendingConnection(
      tokenResponse.access_token,
      tokenResponse.refresh_token,
      tokenResponse.expires_in,
      syncFromDate
    );

    return res.redirect(`/settings?pending_approval=monzo&pendingId=${pendingId}`);
  } catch (error) {
    console.error('Monzo callback error:', error);
    return res.redirect('/settings?error=oauth_failed');
  }
});

/**
 * POST /api/bank/monzo/complete-connection
 * Complete the Monzo connection after the user approves SCA in their Monzo app.
 * Retrieves stored tokens, fetches account info, creates BankAccount, registers webhook, starts import.
 */
router.post('/complete-connection', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { pendingId } = req.body;

    if (!pendingId || typeof pendingId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid pendingId',
      });
    }

    // Retrieve the pending connection (non-destructive, allows retries)
    let pending;
    try {
      pending = monzoService.getPendingConnection(pendingId);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Pending connection not found. Please restart the connection flow.',
      });
    }

    // Fetch account info (requires SCA approval to have been completed)
    const accountInfo = await monzoService.getAccountInfo(pending.accessToken);

    // SCA approved and account info retrieved - delete the pending connection
    monzoService.deletePendingConnection(pendingId);

    // Calculate token expiry date
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + pending.expiresIn);

    // Encrypt tokens before storing
    const encryptedAccessToken = encryptToken(pending.accessToken);
    const encryptedRefreshToken = pending.refreshToken
      ? encryptToken(pending.refreshToken)
      : null;

    // Check if bank account already exists (for re-authentication)
    const existingAccount = await prisma.bankAccount.findUnique({
      where: { accountId: accountInfo.accountId },
    });

    // Delete old webhook if re-authenticating
    if (existingAccount?.webhookId) {
      try {
        await monzoService.deleteWebhook(pending.accessToken, existingAccount.webhookId);
      } catch (error) {
        console.error('Failed to delete old webhook:', error);
      }
    }

    // Register new webhook
    let webhookId: string | null = null;
    let webhookUrl: string | null = null;

    const webhookSecret = process.env.MONZO_WEBHOOK_SECRET;
    if (webhookSecret) {
      try {
        const baseUrl = process.env.WEBHOOK_BASE_URL || 'http://localhost:3000';
        const webhookUrlToRegister = `${baseUrl}/api/bank/webhooks/monzo/${webhookSecret}`;
        const webhookResult = await monzoService.registerWebhook(
          pending.accessToken,
          accountInfo.accountId,
          webhookUrlToRegister
        );
        webhookId = webhookResult.webhookId;
        webhookUrl = webhookResult.webhookUrl;
      } catch (error) {
        console.error('Failed to register webhook:', error);
      }
    }

    // Save or update bank account
    const bankAccount = await prisma.bankAccount.upsert({
      where: { accountId: accountInfo.accountId },
      create: {
        accountId: accountInfo.accountId,
        accountName: accountInfo.accountName,
        accountType: accountInfo.accountType,
        provider: 'monzo',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt,
        syncFromDate: pending.syncFromDate,
        syncEnabled: true,
        lastSyncStatus: 'never_synced',
        webhookId,
        webhookUrl,
      },
      update: {
        accountName: accountInfo.accountName,
        accountType: accountInfo.accountType,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt,
        syncFromDate: pending.syncFromDate,
        syncEnabled: true,
        webhookId,
        webhookUrl,
      },
    });

    // Start background import (fire and forget)
    const importPromise = monzoService.importFullHistory(bankAccount.id);
    importPromise.catch((error) => {
      console.error('Background import failed:', error);
    });

    return res.json({
      success: true,
      bankAccountId: bankAccount.id,
    });
  } catch (error) {
    console.error('Monzo complete-connection error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isSCAError = errorMessage.includes('insufficient_permissions') ||
                       errorMessage.includes('Failed to fetch account information');

    return res.status(isSCAError ? 403 : 500).json({
      success: false,
      error: isSCAError
        ? 'Monzo access not yet approved. Please approve in your Monzo app and try again.'
        : 'Failed to complete Monzo connection',
    });
  }
});

/**
 * GET /api/bank/monzo/import-progress/:syncLogId
 * Server-Sent Events endpoint for streaming import progress updates
 */
router.get('/import-progress/:syncLogId', requireAuth, requireAdmin, async (req, res) => {
  const { syncLogId } = req.params;

  // Validate syncLogId format (UUID)
  if (!syncLogId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(syncLogId)) {
    res.status(400).json({
      success: false,
      error: 'Invalid sync log ID',
    });
    return;
  }

  // Verify sync log exists
  const syncLog = await prisma.syncLog.findUnique({
    where: { id: syncLogId },
  });

  if (!syncLog) {
    res.status(404).json({
      success: false,
      error: 'Sync log not found',
    });
    return;
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Send initial status based on current sync log state
  const initialStatus: ImportProgressUpdate = {
    syncLogId,
    status: mapSyncLogStatusToProgressStatus(syncLog.status),
    transactionsFetched: syncLog.transactionsFetched,
    transactionsProcessed: 0, // We don't track this separately yet
    duplicatesSkipped: syncLog.transactionsSkipped,
    message: syncLog.status === 'in_progress'
      ? 'Import in progress...'
      : syncLog.status === 'success' || syncLog.status === 'partial'
      ? 'Import completed'
      : syncLog.errorMessage || 'Import failed',
  };

  res.write(`data: ${JSON.stringify(initialStatus)}\n\n`);

  // If sync is already complete, send final status and close
  if (syncLog.status !== 'in_progress') {
    res.end();
    return;
  }

  // Set up progress listener
  const progressHandler = (update: ImportProgressUpdate) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(update)}\n\n`);

      // Close connection when import is complete or failed
      if (update.status === 'completed' || update.status === 'failed') {
        res.end();
      }
    }
  };

  importProgressTracker.onProgress(syncLogId, progressHandler);

  // Timeout after 5 minutes (max import time)
  const timeoutId = setTimeout(() => {
    importProgressTracker.offProgress(syncLogId, progressHandler);
    if (!res.writableEnded) {
      res.end();
    }
  }, 300000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearTimeout(timeoutId);
    importProgressTracker.offProgress(syncLogId, progressHandler);
    if (!res.writableEnded) {
      res.end();
    }
  });
});

export default router;
