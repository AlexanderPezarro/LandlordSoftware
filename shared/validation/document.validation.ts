import { z } from 'zod';

// Allowed MIME types for documents
export const AllowedMimeTypesSchema = z.enum(['image/jpeg', 'image/png', 'application/pdf']);

// File size limit: 10MB in bytes
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Entity types for document association
export const EntityTypeSchema = z.enum(['Property', 'Tenant', 'Lease', 'Transaction']);

// Base Document Schema (common fields)
const baseDocumentSchema = {
  entityType: EntityTypeSchema,
  entityId: z.string().uuid('Invalid entity ID'),
  fileName: z.string().min(1, 'File name is required'),
  filePath: z.string().min(1, 'File path is required'),
  fileType: AllowedMimeTypesSchema,
  fileSize: z.number().int().positive().max(MAX_FILE_SIZE, 'File size must not exceed 10MB'),
};

// Create Document Schema (without id, uploadedAt)
export const CreateDocumentSchema = z.object(baseDocumentSchema);

// Update Document Schema (all fields optional except id)
export const UpdateDocumentSchema = z.object({
  id: z.string().uuid(),
  entityType: EntityTypeSchema.optional(),
  entityId: z.string().uuid('Invalid entity ID').optional(),
  fileName: z.string().min(1, 'File name is required').optional(),
  filePath: z.string().min(1, 'File path is required').optional(),
  fileType: AllowedMimeTypesSchema.optional(),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(MAX_FILE_SIZE, 'File size must not exceed 10MB')
    .optional(),
});

// Full Document Schema (with all fields including uploadedAt)
export const DocumentSchema = z.object({
  id: z.string().uuid(),
  ...baseDocumentSchema,
  uploadedAt: z.date(),
});

// File Upload Validation Schema (for client-side file validation)
export const FileUploadSchema = z.object({
  file: z.custom<File>((file) => {
    if (!(file instanceof File)) return false;

    // Check file size
    if (file.size > MAX_FILE_SIZE) return false;

    // Check MIME type
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) return false;

    return true;
  }, 'File must be a valid JPG, PNG, or PDF and not exceed 10MB'),
});

// Inferred TypeScript types
export type AllowedMimeTypes = z.infer<typeof AllowedMimeTypesSchema>;
export type EntityType = z.infer<typeof EntityTypeSchema>;
export type CreateDocument = z.infer<typeof CreateDocumentSchema>;
export type UpdateDocument = z.infer<typeof UpdateDocumentSchema>;
export type Document = z.infer<typeof DocumentSchema>;
export type FileUpload = z.infer<typeof FileUploadSchema>;

// Export constants for use in other modules
export const MAX_DOCUMENT_SIZE = MAX_FILE_SIZE;
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const;
