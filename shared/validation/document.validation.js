import { z } from 'zod';
export const AllowedMimeTypesSchema = z.enum(['image/jpeg', 'image/png', 'application/pdf']);
const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const EntityTypeSchema = z.enum(['Property', 'Tenant', 'Lease', 'Transaction']);
const baseDocumentSchema = {
    entityType: EntityTypeSchema,
    entityId: z.string().uuid('Invalid entity ID'),
    fileName: z.string().min(1, 'File name is required'),
    filePath: z.string().min(1, 'File path is required'),
    fileType: AllowedMimeTypesSchema,
    fileSize: z.number().int().positive().max(MAX_FILE_SIZE, 'File size must not exceed 10MB'),
};
export const CreateDocumentSchema = z.object(baseDocumentSchema);
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
export const DocumentSchema = z.object({
    id: z.string().uuid(),
    ...baseDocumentSchema,
    uploadedAt: z.date(),
});
export const FileUploadSchema = z.object({
    file: z.custom((file) => {
        if (!(file instanceof File))
            return false;
        if (file.size > MAX_FILE_SIZE)
            return false;
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!allowedTypes.includes(file.type))
            return false;
        return true;
    }, 'File must be a valid JPG, PNG, or PDF and not exceed 10MB'),
});
export const MAX_DOCUMENT_SIZE = MAX_FILE_SIZE;
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
