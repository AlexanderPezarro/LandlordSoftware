import { api } from '../api';
import type {
  Property,
  CreatePropertyRequest,
  UpdatePropertyRequest,
  PropertyFilters,
  PropertiesResponse,
  PropertyResponse,
} from '../../types/api.types';

export const propertiesService = {
  /**
   * Get all properties with optional filters
   * @param filters - Optional filters for status, propertyType, and search
   * @returns Array of properties
   */
  async getProperties(filters?: PropertyFilters): Promise<Property[]> {
    const response = await api.get<PropertiesResponse>('/properties', {
      params: filters,
    });
    return response.data.properties;
  },

  /**
   * Get a single property by ID
   * @param id - Property ID
   * @returns Property details
   */
  async getProperty(id: string): Promise<Property> {
    const response = await api.get<PropertyResponse>(`/properties/${id}`);
    return response.data.property;
  },

  /**
   * Create a new property
   * @param data - Property data
   * @returns Created property
   */
  async createProperty(data: CreatePropertyRequest): Promise<Property> {
    const response = await api.post<PropertyResponse>('/properties', data);
    return response.data.property;
  },

  /**
   * Update an existing property
   * @param id - Property ID
   * @param data - Updated property data
   * @returns Updated property
   */
  async updateProperty(id: string, data: UpdatePropertyRequest): Promise<Property> {
    const response = await api.put<PropertyResponse>(`/properties/${id}`, data);
    return response.data.property;
  },

  /**
   * Delete a property (soft delete - sets status to 'For Sale')
   * @param id - Property ID
   * @returns Deleted property
   */
  async deleteProperty(id: string): Promise<Property> {
    const response = await api.delete<PropertyResponse>(`/properties/${id}`);
    return response.data.property;
  },
};
