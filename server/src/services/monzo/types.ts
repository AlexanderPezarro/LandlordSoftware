/**
 * Monzo API Type Definitions
 *
 * This file contains TypeScript interfaces for Monzo API requests and responses.
 * See Monzo API documentation: https://docs.monzo.com/
 */

/**
 * Monzo transaction object as returned by the Monzo API
 */
export interface MonzoTransaction {
  /** Monzo account ID (e.g., "acc_00008gju41AHyfLUzBUk8A") */
  account_id: string;
  /** Unique transaction ID */
  id: string;
  /** RFC3339 timestamp when transaction was created */
  created: string;
  /** Transaction description */
  description: string;
  /** Amount in minor currency units (e.g., pence for GBP) */
  amount: number;
  /** Currency code (e.g., "GBP") */
  currency: string;
  /** User-added notes on the transaction */
  notes: string;
  /** Merchant information (if available) */
  merchant?: {
    id: string;
    name: string;
  } | null;
  /** Counterparty information (if available) */
  counterparty?: {
    name: string;
  } | null;
  /** Transaction category */
  category?: string;
  /** RFC3339 timestamp when transaction was settled */
  settled?: string;
}

/**
 * Response from Monzo transactions API endpoint
 */
export interface MonzoTransactionsResponse {
  transactions: MonzoTransaction[];
}

/**
 * Monzo account object as returned by the Monzo API
 */
export interface MonzoAccount {
  /** Unique account ID */
  id: string;
  /** Account description */
  description?: string;
  /** Account type (e.g., "uk_retail", "uk_retail_joint") */
  type?: string;
  /** Account creation timestamp */
  created?: string;
  /** Whether account is closed */
  closed?: boolean;
}

/**
 * Response from Monzo accounts API endpoint
 */
export interface MonzoAccountsResponse {
  accounts: MonzoAccount[];
}

/**
 * Monzo OAuth token response
 */
export interface MonzoTokenResponse {
  /** Access token for API requests */
  access_token: string;
  /** Refresh token for renewing access (optional) */
  refresh_token?: string;
  /** Token expiry time in seconds */
  expires_in: number;
  /** Token type (always "Bearer") */
  token_type: string;
  /** User ID associated with the token */
  user_id?: string;
  /** Client ID */
  client_id?: string;
}

/**
 * Monzo webhook object as returned by the Monzo API
 */
export interface MonzoWebhook {
  /** Unique webhook ID */
  id: string;
  /** Account ID associated with the webhook */
  account_id: string;
  /** Webhook URL */
  url: string;
}

/**
 * Response from Monzo webhook registration API endpoint
 */
export interface MonzoWebhookRegistrationResponse {
  webhook: MonzoWebhook;
}

/**
 * Monzo webhook payload for transaction.created events
 * This is what Monzo sends to our webhook endpoint when a transaction is created
 */
export interface MonzoWebhookPayload {
  /** Event type (always "transaction.created" for transaction webhooks) */
  type: 'transaction.created';
  /** Transaction data */
  data: MonzoTransaction;
}

/**
 * Monzo API error response
 */
export interface MonzoErrorResponse {
  /** Error code */
  code?: string;
  /** Error message */
  message: string;
  /** Additional error parameters */
  params?: Record<string, unknown>;
}
