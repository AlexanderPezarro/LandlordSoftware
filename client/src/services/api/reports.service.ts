import { api } from '../api';
import type {
  TransactionFilters,
  PLReportResponse,
  CategoryBreakdownResponse,
  PropertyPerformanceResponse,
  MonthlyPLData,
  CategoryBreakdown,
  PropertyPerformance,
} from '../../types/api.types';

export const reportsService = {
  /**
   * Get P&L report with monthly breakdown
   * @param filters - Optional filters for propertyId and date range
   * @returns Monthly P&L data grouped by category
   */
  async getProfitLossReport(filters?: TransactionFilters): Promise<MonthlyPLData> {
    const params: Record<string, string> = {};
    if (filters?.propertyId) params.property_id = filters.propertyId;
    if (filters?.startDate) params.from_date = filters.startDate;
    if (filters?.endDate) params.to_date = filters.endDate;

    const response = await api.get<PLReportResponse>('/transactions/reports/profit-loss', { params });
    return response.data.data;
  },

  /**
   * Get category breakdown for charts
   * @param filters - Optional filters for propertyId and date range
   * @returns Category breakdown grouped by income/expense
   */
  async getCategoryBreakdown(filters?: TransactionFilters): Promise<CategoryBreakdown> {
    const params: Record<string, string> = {};
    if (filters?.propertyId) params.property_id = filters.propertyId;
    if (filters?.startDate) params.from_date = filters.startDate;
    if (filters?.endDate) params.to_date = filters.endDate;

    const response = await api.get<CategoryBreakdownResponse>('/transactions/reports/category-breakdown', { params });
    return response.data.data;
  },

  /**
   * Get property performance metrics
   * @param filters - Optional filters for date range
   * @returns Array of property performance data
   */
  async getPropertyPerformance(filters?: TransactionFilters): Promise<PropertyPerformance[]> {
    const params: Record<string, string> = {};
    if (filters?.startDate) params.from_date = filters.startDate;
    if (filters?.endDate) params.to_date = filters.endDate;

    const response = await api.get<PropertyPerformanceResponse>('/transactions/reports/property-performance', { params });
    return response.data.data;
  },
};
