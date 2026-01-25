/**
 * Webhook-related type definitions
 * Shared between client and server for webhook status monitoring
 */

/**
 * Individual webhook event details
 */
export interface WebhookEvent {
  id: string;
  accountId: string;
  accountName: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  webhookEventId: string | null;
  transactionsFetched: number;
}

/**
 * Per-account webhook status summary
 */
export interface AccountWebhookStatus {
  accountId: string;
  accountName: string;
  lastWebhookAt: string | null;
  lastWebhookStatus: string | null;
  webhookId: string | null;
}

/**
 * Complete webhook status data
 */
export interface WebhookStatusData {
  lastEventTimestamp: string | null;
  recentEvents: WebhookEvent[];
  failedCount24h: number;
  failedCount1h: number;
  accountStatuses: AccountWebhookStatus[];
}
