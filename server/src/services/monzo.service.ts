import crypto from 'crypto';
import prisma from '../db/client.js';
import { decryptToken } from './encryption.js';
import { processTransactions } from './transactionProcessor.js';
import type { MonzoTransaction, MonzoTransactionsResponse } from './monzo/types.js';
import { importProgressTracker } from './importProgressTracker.js';
import { fetchTransactionsWithRetry, getMonzoErrorMessage } from '../utils/monzoApiWrapper.js';

// Re-export types for backwards compatibility
export type { MonzoTransaction, MonzoTransactionsResponse };

// In-memory state storage (in production, use Redis or database)
// Maps state -> { syncFromDate: Date, createdAt: Date }
const stateStore = new Map<string, { syncFromDate: Date; createdAt: Date }>();

// Clean up expired states every 10 minutes
setInterval(() => {
  const now = Date.now();
  const expiryMs = 10 * 60 * 1000; // 10 minutes

  for (const [state, data] of stateStore.entries()) {
    if (now - data.createdAt.getTime() > expiryMs) {
      stateStore.delete(state);
    }
  }
}, 10 * 60 * 1000);

// Pending connections awaiting SCA approval in the Monzo app.
// After OAuth token exchange, Monzo requires the user to approve access in their app
// before API calls will work. Tokens are stored here until the user confirms approval.
export interface PendingConnection {
  accessToken: string;
  refreshToken: string | undefined;
  expiresIn: number;
  syncFromDate: Date;
}

const pendingConnectionStore = new Map<string, PendingConnection>();

export function storePendingConnection(
  accessToken: string,
  refreshToken: string | undefined,
  expiresIn: number,
  syncFromDate: Date
): string {
  const pendingId = crypto.randomBytes(32).toString('hex');
  pendingConnectionStore.set(pendingId, {
    accessToken,
    refreshToken,
    expiresIn,
    syncFromDate,
  });
  return pendingId;
}

export function getPendingConnection(pendingId: string): PendingConnection {
  const pending = pendingConnectionStore.get(pendingId);
  if (!pending) {
    throw new Error('Pending connection not found or expired');
  }
  return pending;
}

export function deletePendingConnection(pendingId: string): void {
  pendingConnectionStore.delete(pendingId);
}

/**
 * Generates the Monzo OAuth authorization URL
 * @param syncFromDays - Number of days to sync transaction history from
 * @returns Authorization URL to redirect user to
 */
export function generateAuthUrl(syncFromDays: number): string {
  const clientId = process.env.MONZO_CLIENT_ID;
  const redirectUri = process.env.MONZO_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error('Monzo OAuth configuration missing');
  }

  // Calculate syncFromDate
  const syncFromDate = new Date();
  syncFromDate.setDate(syncFromDate.getDate() - syncFromDays);

  // Generate secure random state for CSRF protection
  const state = crypto.randomBytes(32).toString('hex');

  // Store state with syncFromDate for later validation
  stateStore.set(state, {
    syncFromDate,
    createdAt: new Date(),
  });

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
  });

  return `https://auth.monzo.com/?${params.toString()}`;
}

/**
 * Validates the OAuth state parameter and returns associated data
 * @param state - State parameter from OAuth callback
 * @returns syncFromDate associated with the state
 * @throws Error if state is invalid or expired
 */
export function validateState(state: string): Date {
  const stateData = stateStore.get(state);

  if (!stateData) {
    throw new Error('Invalid or expired state parameter');
  }

  // Check if state has expired (10 minutes)
  const now = Date.now();
  const expiryMs = 10 * 60 * 1000;

  if (now - stateData.createdAt.getTime() > expiryMs) {
    stateStore.delete(state);
    throw new Error('State parameter has expired');
  }

  // Delete state after successful validation (one-time use)
  stateStore.delete(state);

  return stateData.syncFromDate;
}

/**
 * Exchange authorization code for access tokens
 * @param code - Authorization code from OAuth callback
 * @returns Token response with access_token, refresh_token, and expires_in
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}> {
  const clientId = process.env.MONZO_CLIENT_ID;
  const clientSecret = process.env.MONZO_CLIENT_SECRET;
  const redirectUri = process.env.MONZO_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Monzo OAuth configuration missing');
  }

  const response = await fetch('https://api.monzo.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Monzo token exchange error:', errorText);
    throw new Error('Failed to exchange authorization code for tokens');
  }

  const data = await response.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  };
}

/**
 * Get account information from Monzo API
 * @param accessToken - Monzo access token
 * @returns Account information (accountId, accountName, accountType)
 */
export async function getAccountInfo(accessToken: string): Promise<{
  accountId: string;
  accountName: string;
  accountType: string;
}> {
  const response = await fetch('https://api.monzo.com/accounts', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Monzo get accounts error:', errorText);
    throw new Error('Failed to fetch account information');
  }

  const data = await response.json() as {
    accounts: Array<{
      id: string;
      description?: string;
      type?: string;
    }>;
  };

  if (!data.accounts || data.accounts.length === 0) {
    throw new Error('No accounts found');
  }

  // Use first account (or primary if multiple)
  const account = data.accounts[0];

  return {
    accountId: account.id,
    accountName: account.description || account.type || 'Monzo Account',
    accountType: account.type || 'current',
  };
}

/**
 * Import full transaction history from Monzo API
 * This function runs asynchronously in the background and must complete within 5 minutes
 * of OAuth completion (Monzo API restriction).
 *
 * @param bankAccountId - Database ID of the bank account to import transactions for
 * @returns The sync log ID for tracking progress
 */
export async function importFullHistory(bankAccountId: string): Promise<string> {
  let syncLogId: string | undefined;
  let transactionsFetched = 0;
  let duplicatesSkipped = 0;
  const TIMEOUT_MS = 270000; // 4 minutes 30 seconds (safety buffer for 5-minute window)
  let timedOut = false;

  try {
    // Get bank account
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!bankAccount) {
      throw new Error('Bank account not found');
    }

    // Create sync log
    const syncLog = await prisma.syncLog.create({
      data: {
        bankAccountId,
        syncType: 'initial',
        status: 'in_progress',
      },
    });
    syncLogId = syncLog.id;

    // Emit initial progress
    importProgressTracker.emitProgress({
      syncLogId,
      status: 'fetching',
      transactionsFetched: 0,
      transactionsProcessed: 0,
      duplicatesSkipped: 0,
      message: 'Starting import...',
    });

    // Decrypt access token
    const accessToken = decryptToken(bankAccount.accessToken);

    // Set timeout for graceful shutdown
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      console.warn(`Import timeout approaching for bank account ${bankAccountId}, stopping gracefully`);
    }, TIMEOUT_MS);

    // Fetch transactions with pagination
    const allTransactions: MonzoTransaction[] = [];
    let beforeTimestamp: string | undefined;
    let hasMore = true;
    let batchNumber = 0;

    while (hasMore && !timedOut) {
      batchNumber++;
      // Build request URL
      const params = new URLSearchParams({
        account_id: bankAccount.accountId,
        since: bankAccount.syncFromDate.toISOString(),
        limit: '100',
      });

      if (beforeTimestamp) {
        params.append('before', beforeTimestamp);
      }

      const url = `https://api.monzo.com/transactions?${params.toString()}`;

      // Fetch transactions
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Monzo transactions fetch error:', errorText);
        throw new Error(`Failed to fetch transactions: ${errorText}`);
      }

      const data = await response.json() as MonzoTransactionsResponse;
      const transactions = data.transactions;

      allTransactions.push(...transactions);
      transactionsFetched += transactions.length;

      // Emit progress update after fetching batch
      importProgressTracker.emitProgress({
        syncLogId,
        status: 'fetching',
        transactionsFetched,
        transactionsProcessed: 0,
        duplicatesSkipped: 0,
        currentBatch: batchNumber,
        message: `Fetched ${transactionsFetched} transactions...`,
      });

      // Check if we need to paginate
      if (transactions.length < 100) {
        hasMore = false;
      } else {
        // Use the oldest transaction's created timestamp for next page
        const oldestTransaction = transactions[transactions.length - 1];
        beforeTimestamp = oldestTransaction.created;
      }
    }

    clearTimeout(timeoutHandle);

    // Emit progress update before processing
    importProgressTracker.emitProgress({
      syncLogId,
      status: 'processing',
      transactionsFetched,
      transactionsProcessed: 0,
      duplicatesSkipped: 0,
      message: 'Processing transactions...',
    });

    // Process transactions through unified pipeline
    let processedCount = 0;
    if (allTransactions.length > 0) {
      const processResult = await processTransactions(allTransactions, bankAccountId);
      processedCount = processResult.processed;
      duplicatesSkipped = processResult.duplicatesSkipped;

      // Log any processing errors
      if (processResult.errors.length > 0) {
        console.error(`Import encountered ${processResult.errors.length} errors:`, processResult.errors);
      }
    }

    // Determine final status
    const finalStatus = timedOut ? 'partial' : 'success';

    // Update sync log
    await prisma.syncLog.update({
      where: { id: syncLogId },
      data: {
        status: finalStatus,
        completedAt: new Date(),
        transactionsFetched,
        transactionsSkipped: duplicatesSkipped,
      },
    });

    // Update bank account
    await prisma.bankAccount.update({
      where: { id: bankAccountId },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: finalStatus,
      },
    });

    // Emit completion progress
    importProgressTracker.emitProgress({
      syncLogId,
      status: 'completed',
      transactionsFetched,
      transactionsProcessed: processedCount,
      duplicatesSkipped,
      message: `Import completed: ${processedCount} transactions processed`,
    });

    console.log(`Import completed for bank account ${bankAccountId}: ${transactionsFetched} transactions fetched (${processedCount} processed, ${duplicatesSkipped} duplicates skipped), status: ${finalStatus}`);

    return syncLogId;
  } catch (error) {
    console.error(`Import failed for bank account ${bankAccountId}:`, error);

    // Update sync log with error
    if (syncLogId) {
      await prisma.syncLog.update({
        where: { id: syncLogId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          transactionsFetched,
          transactionsSkipped: duplicatesSkipped,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorDetails: error instanceof Error ? error.stack : undefined,
        },
      });

      // Emit error progress
      importProgressTracker.emitProgress({
        syncLogId,
        status: 'failed',
        transactionsFetched,
        transactionsProcessed: 0,
        duplicatesSkipped,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Update bank account status
    await prisma.bankAccount.update({
      where: { id: bankAccountId },
      data: {
        lastSyncAt: transactionsFetched > 0 ? new Date() : undefined,
        lastSyncStatus: 'failed',
      },
    });

    throw error;
  }
}

/**
 * Sync result interface returned by syncNewTransactions
 */
export interface SyncResult {
  success: boolean;
  transactionsFetched?: number;
  lastSyncAt?: Date;
  lastSyncStatus?: string;
  error?: string;
}

/**
 * Webhook registration result
 */
export interface WebhookRegistrationResult {
  webhookId: string;
  webhookUrl: string;
}

/**
 * Sync new transactions from Monzo API since last sync
 * This is a synchronous operation with a 30-second timeout for manual sync triggers
 *
 * @param bankAccountId - Database ID of the bank account to sync transactions for
 * @returns SyncResult with status, counts, and timestamps
 */
export async function syncNewTransactions(bankAccountId: string): Promise<SyncResult> {
  let syncLogId: string | undefined;
  let transactionsFetched = 0;
  let duplicatesSkipped = 0;
  const TIMEOUT_MS = 30000; // 30 seconds for manual sync
  let timedOut = false;

  try {
    // Get bank account
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!bankAccount) {
      return {
        success: false,
        error: 'Bank account not found',
      };
    }

    // Check for concurrent sync
    const inProgressSync = await prisma.syncLog.findFirst({
      where: {
        bankAccountId,
        status: 'in_progress',
      },
    });

    if (inProgressSync) {
      return {
        success: false,
        error: 'Sync already in progress',
      };
    }

    // Create sync log
    const syncLog = await prisma.syncLog.create({
      data: {
        bankAccountId,
        syncType: 'manual',
        status: 'in_progress',
      },
    });
    syncLogId = syncLog.id;

    // Decrypt access token (may be refreshed during sync)
    let accessToken = decryptToken(bankAccount.accessToken);

    // Determine sync start date (lastSyncAt or syncFromDate)
    const sinceDate = bankAccount.lastSyncAt || bankAccount.syncFromDate;

    // Set timeout for graceful shutdown
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      console.warn(`Manual sync timeout approaching for bank account ${bankAccountId}, stopping gracefully`);
    }, TIMEOUT_MS);

    // Fetch transactions with pagination
    const allTransactions: MonzoTransaction[] = [];
    let beforeTimestamp: string | undefined;
    let hasMore = true;

    while (hasMore && !timedOut) {
      // Fetch transactions with automatic retry and token refresh
      const result = await fetchTransactionsWithRetry(
        bankAccountId,
        bankAccount.accountId,
        accessToken,
        sinceDate.toISOString(),
        beforeTimestamp,
        100
      );

      // Update access token if it was refreshed
      accessToken = result.accessToken;

      const transactions = result.response.transactions;
      allTransactions.push(...transactions);
      transactionsFetched += transactions.length;

      // Check if we need to paginate
      if (transactions.length < 100) {
        hasMore = false;
      } else {
        // Use the oldest transaction's created timestamp for next page
        const oldestTransaction = transactions[transactions.length - 1];
        beforeTimestamp = oldestTransaction.created;
      }
    }

    clearTimeout(timeoutHandle);

    // Process transactions through unified pipeline
    let processedCount = 0;
    if (allTransactions.length > 0) {
      const processResult = await processTransactions(allTransactions, bankAccountId);
      processedCount = processResult.processed;
      duplicatesSkipped = processResult.duplicatesSkipped;

      // Log any processing errors
      if (processResult.errors.length > 0) {
        console.error(`Manual sync encountered ${processResult.errors.length} errors:`, processResult.errors);
      }
    }

    // Determine final status
    const finalStatus = timedOut ? 'partial' : 'success';
    const now = new Date();

    // Update sync log
    await prisma.syncLog.update({
      where: { id: syncLogId },
      data: {
        status: finalStatus,
        completedAt: now,
        transactionsFetched,
        transactionsSkipped: duplicatesSkipped,
      },
    });

    // Update bank account (only update lastSyncAt on complete success)
    await prisma.bankAccount.update({
      where: { id: bankAccountId },
      data: {
        lastSyncAt: finalStatus === 'success' ? now : undefined,
        lastSyncStatus: finalStatus,
      },
    });

    console.log(`Manual sync completed for bank account ${bankAccountId}: ${transactionsFetched} transactions fetched (${processedCount} processed, ${duplicatesSkipped} duplicates skipped), status: ${finalStatus}`);

    return {
      success: true,
      transactionsFetched,
      lastSyncAt: finalStatus === 'success' ? now : bankAccount.lastSyncAt || undefined,
      lastSyncStatus: finalStatus,
    };
  } catch (error) {
    console.error(`Manual sync failed for bank account ${bankAccountId}:`, error);

    // Get user-friendly error message
    const errorMessage = getMonzoErrorMessage(error);

    // Update sync log with error
    if (syncLogId) {
      await prisma.syncLog.update({
        where: { id: syncLogId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          transactionsFetched,
          transactionsSkipped: duplicatesSkipped,
          errorMessage,
          errorDetails: error instanceof Error ? error.stack : undefined,
        },
      });
    }

    // Update bank account status (don't update lastSyncAt on failure)
    await prisma.bankAccount.update({
      where: { id: bankAccountId },
      data: {
        lastSyncStatus: 'failed',
      },
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Register a webhook with Monzo API
 * @param accessToken - Monzo access token
 * @param accountId - Monzo account ID
 * @param webhookUrl - The URL where Monzo will send webhook events
 * @returns Webhook ID and URL
 */
export async function registerWebhook(
  accessToken: string,
  accountId: string,
  webhookUrl: string
): Promise<WebhookRegistrationResult> {
  const response = await fetch('https://api.monzo.com/webhooks', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      account_id: accountId,
      url: webhookUrl,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Monzo webhook registration error:', errorText);
    throw new Error('Failed to register webhook with Monzo');
  }

  const data = await response.json() as {
    webhook: {
      id: string;
      account_id: string;
      url: string;
    };
  };

  return {
    webhookId: data.webhook.id,
    webhookUrl: data.webhook.url,
  };
}

/**
 * Delete a webhook from Monzo API
 * @param accessToken - Monzo access token
 * @param webhookId - The webhook ID to delete
 */
export async function deleteWebhook(
  accessToken: string,
  webhookId: string
): Promise<void> {
  const response = await fetch(`https://api.monzo.com/webhooks/${webhookId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Monzo webhook deletion error:', errorText);
    throw new Error('Failed to delete webhook from Monzo');
  }
}
