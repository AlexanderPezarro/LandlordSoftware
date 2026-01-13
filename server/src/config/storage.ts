import { ALLOWED_MIME_TYPES, MAX_DOCUMENT_SIZE } from '../../../shared/validation/document.validation.js';

/**
 * Storage configuration
 */
export const storageConfig = {
  /**
   * Upload directory path
   */
  uploadDir: process.env.UPLOAD_DIR || 'uploads',

  /**
   * Maximum file size in bytes (10MB)
   */
  maxFileSize: MAX_DOCUMENT_SIZE,

  /**
   * Allowed MIME types for uploads
   */
  allowedMimeTypes: ALLOWED_MIME_TYPES,
} as const;
