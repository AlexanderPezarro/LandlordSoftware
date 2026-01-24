import { api } from '../api';
import type { WebhookStatusData } from '../../../../shared/types/index';

// Re-export shared types for use in components
export type { WebhookEvent, AccountWebhookStatus, WebhookStatusData } from '../../../../shared/types/index';

export interface ConnectMonzoRequest {
  syncFromDays?: number;
}

export interface ConnectMonzoResponse {
  success: boolean;
  authUrl: string;
}

export interface BankAccount {
  id: string;
  accountId: string;
  accountName: string;
  accountType: string;
  provider: string;
  syncEnabled: boolean;
  syncFromDate: string;
  lastSyncAt: string | null;
  lastSyncStatus: string;
  webhookId: string | null;
  webhookUrl: string | null;
  pendingCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GetBankAccountsResponse {
  success: boolean;
  accounts: BankAccount[];
}

export interface SyncLog {
  id: string;
  status: string;
  syncType: string;
  startedAt: string;
  completedAt: string | null;
  transactionsFetched: number;
  transactionsSkipped: number;
  errorMessage: string | null;
}

export interface GetActiveSyncResponse {
  success: boolean;
  syncLog: SyncLog;
}

export interface ImportProgressUpdate {
  syncLogId: string;
  status: 'fetching' | 'processing' | 'completed' | 'failed';
  transactionsFetched: number;
  transactionsProcessed: number;
  duplicatesSkipped: number;
  currentBatch?: number;
  totalBatches?: number;
  message?: string;
  error?: string;
}

export interface GetWebhookStatusResponse {
  success: boolean;
  data: WebhookStatusData;
}

export const bankService = {
  /**
   * Get all connected bank accounts
   * @returns List of bank accounts
   */
  async getBankAccounts(): Promise<BankAccount[]> {
    const response = await api.get<GetBankAccountsResponse>('/bank/accounts');
    return response.data.accounts;
  },

  /**
   * Initiate Monzo OAuth flow
   * @param syncFromDays - Number of days to sync transaction history from (default: 90)
   * @returns Authorization URL to redirect user to
   */
  async connectMonzo(syncFromDays?: number): Promise<ConnectMonzoResponse> {
    const response = await api.post<ConnectMonzoResponse>('/bank/monzo/connect', {
      syncFromDays,
    });
    return response.data;
  },

  /**
   * Get active or most recent sync log for a bank account
   * @param bankAccountId - Bank account ID
   * @returns Sync log information
   */
  async getActiveSyncLog(bankAccountId: string): Promise<SyncLog> {
    const response = await api.get<GetActiveSyncResponse>(`/bank/accounts/${bankAccountId}/active-sync`);
    return response.data.syncLog;
  },

  /**
   * Subscribe to import progress updates via Server-Sent Events
   * @param syncLogId - Sync log ID to track
   * @param onProgress - Callback for progress updates
   * @returns Cleanup function to close the connection
   */
  subscribeToImportProgress(
    syncLogId: string,
    onProgress: (update: ImportProgressUpdate) => void
  ): () => void {
    const eventSource = new EventSource(`/api/bank/monzo/import-progress/${syncLogId}`);

    eventSource.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data) as ImportProgressUpdate;
        onProgress(update);
      } catch (error) {
        console.error('Error parsing progress update:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      eventSource.close();
    };

    // Return cleanup function
    return () => {
      eventSource.close();
    };
  },

  /**
   * Get webhook health status across all bank accounts
   * @returns Webhook status data including recent events and failure counts
   */
  async getWebhookStatus(): Promise<WebhookStatusData> {
    const response = await api.get<GetWebhookStatusResponse>('/bank/webhooks/status');
    return response.data.data;
  },
};
