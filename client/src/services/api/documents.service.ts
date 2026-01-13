import { api } from '../api';
import apiClient from '../api';
import type {
  Document,
  DocumentsResponse,
  DocumentResponse,
} from '../../types/api.types';

export const documentsService = {
  /**
   * Upload a document file
   * @param file - File to upload
   * @param entity_type - Entity type (Property, Tenant, Lease, Transaction)
   * @param entity_id - Entity ID to associate document with
   * @returns Uploaded document metadata
   */
  async uploadDocument(
    file: File,
    entity_type: 'Property' | 'Tenant' | 'Lease' | 'Transaction',
    entity_id: string
  ): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', entity_type);
    formData.append('entityId', entity_id);

    const response = await apiClient.post<DocumentResponse>('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.document;
  },

  /**
   * Download a document file
   * @param id - Document ID
   * @returns Blob of the file content
   */
  async downloadDocument(id: string): Promise<Blob> {
    const response = await apiClient.get(`/documents/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Delete a document
   * @param id - Document ID
   */
  async deleteDocument(id: string): Promise<void> {
    await api.delete(`/documents/${id}`);
  },

  /**
   * Get all documents with optional filters
   * @param entityType - Optional entity type filter
   * @param entityId - Optional entity ID filter
   * @returns Array of documents
   */
  async getDocuments(entityType?: string, entityId?: string): Promise<Document[]> {
    const params: any = {};
    if (entityType) params.entityType = entityType;
    if (entityId) params.entityId = entityId;

    const response = await api.get<DocumentsResponse>('/documents', { params });
    return response.data.documents;
  },

  /**
   * Get a single document metadata by ID
   * @param id - Document ID
   * @returns Document metadata
   */
  async getDocument(id: string): Promise<Document> {
    const response = await api.get<DocumentResponse>(`/documents/${id}`);
    return response.data.document;
  },
};
