import { z } from 'zod';

// BankAccount Sync Status Enum
export const SyncStatusSchema = z.enum([
  'never_synced',
  'syncing',
  'success',
  'error',
]);

// Update BankAccount Schema (only updatable fields)
export const UpdateBankAccountSchema = z.object({
  id: z.string().uuid(),
  accountName: z.string().min(1, 'Account name is required').optional(),
  syncEnabled: z.boolean().optional(),
  syncFromDate: z.coerce.date().optional(),
});

// Full BankAccount Schema (with all fields, excluding sensitive tokens)
// This is used for GET responses - tokens are excluded for security
export const BankAccountResponseSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string(),
  accountName: z.string(),
  accountType: z.string(),
  provider: z.string(),
  tokenExpiresAt: z.date().nullable(),
  syncEnabled: z.boolean(),
  syncFromDate: z.date(),
  lastSyncAt: z.date().nullable(),
  lastSyncStatus: SyncStatusSchema,
  webhookId: z.string().nullable(),
  webhookUrl: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Inferred TypeScript types
export type SyncStatus = z.infer<typeof SyncStatusSchema>;
export type UpdateBankAccount = z.infer<typeof UpdateBankAccountSchema>;
export type BankAccountResponse = z.infer<typeof BankAccountResponseSchema>;
