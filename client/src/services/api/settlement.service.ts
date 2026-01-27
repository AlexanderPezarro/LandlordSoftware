import { api } from '../api';
import type { SettlementCreate } from '../../../../shared/validation';

export interface Balance {
  userA: string;
  userB: string;
  amount: number;
  userADetails: { id: string; email: string };
  userBDetails: { id: string; email: string };
}

export interface Settlement {
  id: string;
  fromUserId: string;
  toUserId: string;
  propertyId: string;
  amount: number;
  settlementDate: string;
  notes?: string;
  fromUser: { id: string; email: string };
  toUser: { id: string; email: string };
}

interface RecordSettlementResponse {
  success: boolean;
  settlement: Settlement;
  warning?: string;
}

interface BalancesResponse {
  success: boolean;
  balances: Balance[];
}

interface SettlementsResponse {
  success: boolean;
  settlements: Settlement[];
}

export const settlementService = {
  /**
   * Record a settlement between property owners
   * @param data - Settlement data
   * @returns Settlement record with optional warning
   */
  async recordSettlement(data: SettlementCreate): Promise<{ settlement: Settlement; warning?: string }> {
    const response = await api.post<RecordSettlementResponse>('/settlements', data);
    return {
      settlement: response.data.settlement,
      warning: response.data.warning,
    };
  },

  /**
   * Get current balances for a property
   * @param propertyId - Property ID
   * @returns Array of balances between owners
   */
  async getPropertyBalances(propertyId: string): Promise<Balance[]> {
    const response = await api.get<BalancesResponse>(`/properties/${propertyId}/balances`);
    return response.data.balances;
  },

  /**
   * Get settlement history for a property
   * @param propertyId - Property ID
   * @returns Array of settlements
   */
  async getPropertySettlements(propertyId: string): Promise<Settlement[]> {
    const response = await api.get<SettlementsResponse>(`/properties/${propertyId}/settlements`);
    return response.data.settlements;
  },

  /**
   * Get balances for a specific user across all properties
   * @param userId - User ID
   * @returns User's balance summary
   */
  async getUserBalances(userId: string) {
    const response = await api.get(`/users/${userId}/balances`);
    return response.data;
  },
};
