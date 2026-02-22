import { api } from '../api';

export interface PendingTransactionFilters {
  bankAccountId?: string;
  reviewStatus?: 'pending' | 'reviewed' | 'all';
  search?: string;
}

export interface BankAccount {
  id: string;
  accountName: string;
  accountType: string;
  provider: string;
}

export interface BankTransactionDetail {
  id: string;
  externalId: string;
  amount: number;
  currency: string;
  description: string;
  counterpartyName: string | null;
  reference: string | null;
  merchant: string | null;
  category: string | null;
  transactionDate: string;
  settledDate: string | null;
}

export interface PendingTransaction {
  id: string;
  bankTransactionId: string;
  propertyId: string | null;
  leaseId: string | null;
  type: 'Income' | 'Expense' | null;
  category: string | null;
  transactionDate: string;
  description: string;
  amount: number;
  currency: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
  bankAccount: BankAccount;
  bankTransaction: BankTransactionDetail;
}

export interface PendingTransactionsResponse {
  success: boolean;
  pendingTransactions: PendingTransaction[];
}

export interface PendingTransactionResponse {
  success: boolean;
  pendingTransaction: PendingTransaction;
}

export interface UpdatePendingTransactionRequest {
  propertyId?: string | null;
  leaseId?: string | null;
  type?: 'Income' | 'Expense' | null;
  category?: string | null;
}

export interface ApprovePendingTransactionResponse {
  success: boolean;
  transaction: any;
  message: string;
}

export interface PendingCountResponse {
  success: boolean;
  count: number;
}

export interface BulkApproveResponse {
  success: boolean;
  count: number;
  transactions: any[];
  message: string;
}

export interface BulkUpdateResponse {
  success: boolean;
  count: number;
  message: string;
}

export interface BulkRejectResponse {
  success: boolean;
  count: number;
  message: string;
}

export const pendingTransactionsService = {
  /**
   * Get all pending transactions with optional filters
   * @param filters - Optional filters for bankAccountId, reviewStatus, and search
   * @returns List of pending transactions
   */
  async getPendingTransactions(filters?: PendingTransactionFilters): Promise<PendingTransaction[]> {
    const params: Record<string, string> = {};
    if (filters?.bankAccountId) params.bank_account_id = filters.bankAccountId;
    if (filters?.reviewStatus) params.review_status = filters.reviewStatus;
    if (filters?.search) params.search = filters.search;

    const response = await api.get<PendingTransactionsResponse>('/pending-transactions', { params });
    return response.data.pendingTransactions;
  },

  /**
   * Update a pending transaction's fields (inline editing)
   * @param id - Pending transaction ID
   * @param data - Updated fields
   * @returns Updated pending transaction
   */
  async updatePendingTransaction(
    id: string,
    data: UpdatePendingTransactionRequest
  ): Promise<PendingTransaction> {
    const response = await api.patch<PendingTransactionResponse>(
      `/pending-transactions/${id}`,
      data
    );
    return response.data.pendingTransaction;
  },

  /**
   * Approve a pending transaction and create a Transaction
   * @param id - Pending transaction ID
   * @returns Created transaction
   */
  async approvePendingTransaction(id: string): Promise<ApprovePendingTransactionResponse> {
    const response = await api.post<ApprovePendingTransactionResponse>(
      `/pending-transactions/${id}/approve`
    );
    return response.data;
  },

  /**
   * Get count of unreviewed pending transactions
   * @returns Count of pending transactions
   */
  async getPendingCount(): Promise<number> {
    const response = await api.get<PendingCountResponse>('/pending-transactions/count');
    return response.data.count;
  },

  /**
   * Bulk approve pending transactions
   * @param ids - Array of pending transaction IDs
   * @returns Bulk approve response with count and transactions
   */
  async bulkApprovePendingTransactions(ids: string[]): Promise<BulkApproveResponse> {
    const response = await api.post<BulkApproveResponse>(
      '/pending-transactions/bulk/approve',
      { ids }
    );
    return response.data;
  },

  /**
   * Bulk update pending transactions
   * @param ids - Array of pending transaction IDs
   * @param updates - Fields to update
   * @returns Bulk update response with count
   */
  async bulkUpdatePendingTransactions(
    ids: string[],
    updates: UpdatePendingTransactionRequest
  ): Promise<BulkUpdateResponse> {
    const response = await api.post<BulkUpdateResponse>(
      '/pending-transactions/bulk/update',
      { ids, updates }
    );
    return response.data;
  },

  /**
   * Bulk reject (delete) pending transactions
   * @param ids - Array of pending transaction IDs
   * @returns Bulk reject response with count
   */
  async bulkRejectPendingTransactions(ids: string[]): Promise<BulkRejectResponse> {
    const response = await api.post<BulkRejectResponse>('/pending-transactions/bulk/reject', {
      ids,
    });
    return response.data;
  },
};
