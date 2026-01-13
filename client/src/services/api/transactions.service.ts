import { api } from '../api';
import type {
  Transaction,
  CreateTransactionRequest,
  UpdateTransactionRequest,
  TransactionFilters,
  TransactionSummary,
  TransactionsResponse,
  TransactionResponse,
  TransactionSummaryResponse,
} from '../../types/api.types';

export const transactionsService = {
  /**
   * Get all transactions with optional filters
   * @param filters - Optional filters for propertyId, type, category, and date range
   * @returns Array of transactions
   */
  async getTransactions(filters?: TransactionFilters): Promise<Transaction[]> {
    const params: Record<string, string> = {};
    if (filters?.propertyId) params.property_id = filters.propertyId;
    if (filters?.type) params.type = filters.type;
    if (filters?.category) params.category = filters.category;
    if (filters?.startDate) params.start_date = filters.startDate;
    if (filters?.endDate) params.end_date = filters.endDate;

    const response = await api.get<TransactionsResponse>('/transactions', { params });
    return response.data.transactions;
  },

  /**
   * Get a single transaction by ID with property and lease details
   * @param id - Transaction ID
   * @returns Transaction details
   */
  async getTransaction(id: string): Promise<Transaction> {
    const response = await api.get<TransactionResponse>(`/transactions/${id}`);
    return response.data.transaction;
  },

  /**
   * Create a new transaction
   * @param data - Transaction data
   * @returns Created transaction
   */
  async createTransaction(data: CreateTransactionRequest): Promise<Transaction> {
    const response = await api.post<TransactionResponse>('/transactions', data);
    return response.data.transaction;
  },

  /**
   * Update an existing transaction
   * @param id - Transaction ID
   * @param data - Updated transaction data
   * @returns Updated transaction
   */
  async updateTransaction(id: string, data: UpdateTransactionRequest): Promise<Transaction> {
    const response = await api.put<TransactionResponse>(`/transactions/${id}`, data);
    return response.data.transaction;
  },

  /**
   * Delete a transaction (hard delete)
   * @param id - Transaction ID
   */
  async deleteTransaction(id: string): Promise<void> {
    await api.delete(`/transactions/${id}`);
  },

  /**
   * Get financial summary with optional filters
   * @param filters - Optional filters for propertyId and date range
   * @returns Financial summary with totals
   */
  async getTransactionSummary(filters?: TransactionFilters): Promise<TransactionSummary> {
    const params: Record<string, string> = {};
    if (filters?.propertyId) params.property_id = filters.propertyId;
    if (filters?.type) params.type = filters.type;
    if (filters?.category) params.category = filters.category;
    if (filters?.startDate) params.start_date = filters.startDate;
    if (filters?.endDate) params.end_date = filters.endDate;

    const response = await api.get<TransactionSummaryResponse>('/transactions/summary', { params });
    return response.data.summary;
  },
};
