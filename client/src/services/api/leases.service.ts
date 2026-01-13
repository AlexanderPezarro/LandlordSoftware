import { api } from '../api';
import type {
  Lease,
  CreateLeaseRequest,
  UpdateLeaseRequest,
  LeaseFilters,
  LeasesResponse,
  LeaseResponse,
} from '../../types/api.types';

export const leasesService = {
  /**
   * Get all leases with optional filters
   * @param filters - Optional filters for property_id, tenant_id, and status
   * @returns Array of leases
   */
  async getLeases(filters?: LeaseFilters): Promise<Lease[]> {
    const response = await api.get<LeasesResponse>('/leases', {
      params: filters,
    });
    return response.data.leases;
  },

  /**
   * Get a single lease by ID with property and tenant details
   * @param id - Lease ID
   * @returns Lease details with property and tenant
   */
  async getLease(id: string): Promise<Lease> {
    const response = await api.get<LeaseResponse>(`/leases/${id}`);
    return response.data.lease;
  },

  /**
   * Create a new lease
   * @param data - Lease data
   * @returns Created lease
   */
  async createLease(data: CreateLeaseRequest): Promise<Lease> {
    const response = await api.post<LeaseResponse>('/leases', data);
    return response.data.lease;
  },

  /**
   * Update an existing lease
   * @param id - Lease ID
   * @param data - Updated lease data
   * @returns Updated lease
   */
  async updateLease(id: string, data: UpdateLeaseRequest): Promise<Lease> {
    const response = await api.put<LeaseResponse>(`/leases/${id}`, data);
    return response.data.lease;
  },

  /**
   * Delete a lease (soft delete - sets status to 'Terminated')
   * @param id - Lease ID
   * @returns Deleted lease
   */
  async deleteLease(id: string): Promise<Lease> {
    const response = await api.delete<LeaseResponse>(`/leases/${id}`);
    return response.data.lease;
  },
};
