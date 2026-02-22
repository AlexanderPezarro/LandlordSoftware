import { api } from '../api';
import type {
  TransactionFilters,
  PLReportResponse,
  CategoryBreakdownResponse,
  PropertyPerformanceResponse,
  MonthlyPLData,
  CategoryBreakdown,
  PropertyPerformance,
  OwnerPLReport,
  OwnerPLReportResponse,
  ReportOwner,
  ReportOwnersResponse,
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

  /**
   * Get per-owner P&L report across all their properties
   * @param userId - Owner user ID
   * @param startDate - Start of report period
   * @param endDate - End of report period
   * @returns Owner P&L report with per-property breakdown
   */
  async getOwnerPLReport(userId: string, startDate: string, endDate: string): Promise<OwnerPLReport> {
    const params: Record<string, string> = { startDate, endDate };
    const response = await api.get<OwnerPLReportResponse>(`/reports/profit-loss/users/${userId}`, { params });
    return response.data.report;
  },

  /**
   * Get list of property owners for the owner selector
   * Admin users get all owners; non-admin users get only themselves
   * @returns Array of owner users
   */
  async getReportOwners(): Promise<ReportOwner[]> {
    const response = await api.get<ReportOwnersResponse>('/reports/owners');
    return response.data.owners;
  },
};
