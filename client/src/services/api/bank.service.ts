import { api } from '../api';

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
  createdAt: string;
  updatedAt: string;
}

export interface GetBankAccountsResponse {
  success: boolean;
  accounts: BankAccount[];
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
};
