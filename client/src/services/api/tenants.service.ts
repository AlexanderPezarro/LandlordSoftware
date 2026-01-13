import { api } from '../api';
import type {
  Tenant,
  CreateTenantRequest,
  UpdateTenantRequest,
  TenantFilters,
  LeaseHistoryFilters,
  Lease,
  TenantsResponse,
  TenantResponse,
  LeasesResponse,
} from '../../types/api.types';

export const tenantsService = {
  /**
   * Get all tenants with optional filters
   * @param filters - Optional filters for status and search
   * @returns Array of tenants
   */
  async getTenants(filters?: TenantFilters): Promise<Tenant[]> {
    const response = await api.get<TenantsResponse>('/tenants', {
      params: filters,
    });
    return response.data.tenants;
  },

  /**
   * Get a single tenant by ID
   * @param id - Tenant ID
   * @returns Tenant details
   */
  async getTenant(id: string): Promise<Tenant> {
    const response = await api.get<TenantResponse>(`/tenants/${id}`);
    return response.data.tenant;
  },

  /**
   * Get tenant lease history with property details
   * @param id - Tenant ID
   * @param filters - Optional date range filters
   * @returns Array of leases with property details
   */
  async getTenantLeaseHistory(id: string, filters?: LeaseHistoryFilters): Promise<Lease[]> {
    const response = await api.get<LeasesResponse>(`/tenants/${id}/lease-history`, {
      params: filters,
    });
    return response.data.leases;
  },

  /**
   * Create a new tenant
   * @param data - Tenant data
   * @returns Created tenant
   */
  async createTenant(data: CreateTenantRequest): Promise<Tenant> {
    const response = await api.post<TenantResponse>('/tenants', data);
    return response.data.tenant;
  },

  /**
   * Update an existing tenant
   * @param id - Tenant ID
   * @param data - Updated tenant data
   * @returns Updated tenant
   */
  async updateTenant(id: string, data: UpdateTenantRequest): Promise<Tenant> {
    const response = await api.put<TenantResponse>(`/tenants/${id}`, data);
    return response.data.tenant;
  },

  /**
   * Delete a tenant (soft delete - sets status to 'Former')
   * @param id - Tenant ID
   * @returns Deleted tenant
   */
  async deleteTenant(id: string): Promise<Tenant> {
    const response = await api.delete<TenantResponse>(`/tenants/${id}`);
    return response.data.tenant;
  },
};
