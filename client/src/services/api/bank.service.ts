import { api } from '../api';

export interface ConnectMonzoRequest {
  syncFromDays?: number;
}

export interface ConnectMonzoResponse {
  success: boolean;
  authUrl: string;
}

export const bankService = {
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
