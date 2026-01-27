import { api } from '../api';

export interface PropertyOwnership {
  id: string;
  userId: string;
  propertyId: string;
  ownershipPercentage: number;
  user: {
    id: string;
    email: string;
    role: 'ADMIN' | 'LANDLORD' | 'VIEWER';
  };
}

export interface PropertyOwnershipCreate {
  userId: string;
  propertyId: string;
  ownershipPercentage: number;
}

export interface PropertyOwnershipUpdate {
  ownershipPercentage: number;
}

interface PropertyOwnershipsResponse {
  success: boolean;
  ownerships: PropertyOwnership[];
}

interface PropertyOwnershipResponse {
  success: boolean;
  ownership: PropertyOwnership;
}

interface MessageResponse {
  success: boolean;
  message?: string;
}

export const propertyOwnershipService = {
  /**
   * List all owners of a property
   * @param propertyId - Property ID
   * @returns Array of property ownerships
   */
  async listOwners(propertyId: string): Promise<PropertyOwnership[]> {
    const response = await api.get<PropertyOwnershipsResponse>(`/properties/${propertyId}/owners`);
    return response.data.ownerships;
  },

  /**
   * Add an owner to a property
   * @param propertyId - Property ID
   * @param data - Ownership data
   * @returns Created ownership
   */
  async addOwner(propertyId: string, data: PropertyOwnershipCreate): Promise<PropertyOwnership> {
    const response = await api.post<PropertyOwnershipResponse>(`/properties/${propertyId}/owners`, data);
    return response.data.ownership;
  },

  /**
   * Update an owner's percentage
   * @param propertyId - Property ID
   * @param userId - User ID
   * @param data - Updated ownership data
   * @returns Updated ownership
   */
  async updateOwner(propertyId: string, userId: string, data: PropertyOwnershipUpdate): Promise<PropertyOwnership> {
    const response = await api.put<PropertyOwnershipResponse>(`/properties/${propertyId}/owners/${userId}`, data);
    return response.data.ownership;
  },

  /**
   * Remove an owner from a property
   * @param propertyId - Property ID
   * @param userId - User ID
   */
  async removeOwner(propertyId: string, userId: string): Promise<void> {
    await api.delete<MessageResponse>(`/properties/${propertyId}/owners/${userId}`);
  },
};
