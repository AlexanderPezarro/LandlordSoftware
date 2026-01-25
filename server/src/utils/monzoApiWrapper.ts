/**
 * Monzo API wrapper with retry logic and automatic token refresh
 *
 * This wrapper handles:
 * - Exponential backoff retry on network errors
 * - Rate limiting (429) with Retry-After header support
 * - Automatic token refresh on 401 errors
 * - Comprehensive error logging
 */

import { retryWithBackoff } from './retry.js';
import { refreshBankAccountToken } from './tokenRefresh.js';
import { getTransactions as monzoGetTransactions } from '../services/monzo/client.js';
import type { MonzoTransactionsResponse } from '../services/monzo/types.js';

/**
 * Fetch transactions from Monzo API with retry logic and token refresh
 *
 * @param bankAccountId - Database ID of the bank account
 * @param accountId - Monzo account ID
 * @param accessToken - Current access token (will be refreshed if expired)
 * @param since - RFC3339 timestamp to fetch transactions from
 * @param before - RFC3339 timestamp to fetch transactions before (optional, for pagination)
 * @param limit - Maximum number of transactions to return
 * @returns Transactions response and potentially refreshed access token
 */
export async function fetchTransactionsWithRetry(
  bankAccountId: string,
  accountId: string,
  accessToken: string,
  since: string,
  before?: string,
  limit: number = 100
): Promise<{ response: MonzoTransactionsResponse; accessToken: string }> {
  let currentAccessToken = accessToken;
  let tokenRefreshed = false;

  const fetchFn = async (): Promise<{ response: MonzoTransactionsResponse; accessToken: string }> => {
    try {
      const response = await monzoGetTransactions(
        currentAccessToken,
        accountId,
        since,
        before,
        limit
      );

      return { response, accessToken: currentAccessToken };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      // Check if it's a 401 error (token expired)
      if (error.response?.status === 401 && !tokenRefreshed) {
        console.log(`Access token expired for bank account ${bankAccountId}, refreshing...`);

        // Refresh the token
        currentAccessToken = await refreshBankAccountToken(bankAccountId);
        tokenRefreshed = true;

        // Retry with new token
        const response = await monzoGetTransactions(
          currentAccessToken,
          accountId,
          since,
          before,
          limit
        );

        return { response, accessToken: currentAccessToken };
      }

      // Re-throw other errors for retry logic to handle
      throw error;
    }
  };

  return await retryWithBackoff(fetchFn, {
    maxAttempts: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    onRetry: (error: Error, attempt: number, delay: number) => {
      console.log(
        `Retrying Monzo API call (attempt ${attempt}/3) after ${delay}ms due to error: ${error.message}`
      );
    },
  });
}

/**
 * Interface for Monzo API errors
 */
interface MonzoApiError extends Error {
  response?: {
    status: number;
    statusText?: string;
    headers?: Record<string, string>;
  };
  code?: string;
}

/**
 * Get a user-friendly error message from a Monzo API error
 *
 * @param error - The error from Monzo API
 * @returns User-friendly error message
 */
export function getMonzoErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'An unknown error occurred';
  }

  const monzoError = error as MonzoApiError;

  // Check for specific error types
  if (monzoError.response) {
    const status = monzoError.response.status;

    if (status === 401) {
      return 'Access token has expired. Please reconnect your bank account.';
    }

    if (status === 403) {
      return 'Access denied. Please reconnect your bank account.';
    }

    if (status === 404) {
      return 'Resource not found. The account or transaction may have been deleted.';
    }

    if (status === 429) {
      return 'Rate limit exceeded. Please try again later.';
    }

    if (status >= 500) {
      return 'Monzo service is temporarily unavailable. Please try again later.';
    }

    return `Request failed with status ${status}`;
  }

  // Network errors
  if (monzoError.code) {
    if (monzoError.code === 'ECONNREFUSED') {
      return 'Could not connect to Monzo. Please check your internet connection.';
    }

    if (monzoError.code === 'ETIMEDOUT') {
      return 'Request timed out. Please try again.';
    }

    if (monzoError.code === 'ECONNRESET') {
      return 'Connection was reset. Please try again.';
    }
  }

  return error.message || 'An error occurred while syncing transactions';
}
