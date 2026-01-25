/**
 * Monzo Service
 *
 * Entry point for Monzo API integration.
 * Exports types and client functions.
 */

// Export all types
export type {
  MonzoTransaction,
  MonzoTransactionsResponse,
  MonzoAccount,
  MonzoAccountsResponse,
  MonzoTokenResponse,
  MonzoWebhook,
  MonzoWebhookRegistrationResponse,
  MonzoWebhookPayload,
  MonzoErrorResponse,
} from './types.js';

// Export all client functions
export {
  exchangeCodeForTokens,
  refreshAccessToken,
  getAccounts,
  getTransactions,
  registerWebhook,
  deleteWebhook,
  generateAuthUrl,
} from './client.js';
