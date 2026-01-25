import { z } from 'zod';
import { TransactionTypeSchema, TransactionCategorySchema } from './transaction.validation.js';

// Bulk IDs Schema - for bulk approve and reject operations
export const bulkIdsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one ID is required'),
});

// Bulk Update Schema - for bulk update operations
export const bulkUpdateSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one ID is required'),
  updates: z
    .object({
      propertyId: z.string().uuid().optional().nullable(),
      leaseId: z.string().uuid().optional().nullable(),
      type: TransactionTypeSchema.optional().nullable(),
      category: TransactionCategorySchema.optional().nullable(),
    })
    .refine((data) => Object.values(data).some((v) => v !== undefined), {
      message: 'At least one field must be provided for update',
    }),
});

// Inferred TypeScript types
export type BulkIds = z.infer<typeof bulkIdsSchema>;
export type BulkUpdate = z.infer<typeof bulkUpdateSchema>;
