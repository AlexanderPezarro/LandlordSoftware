import { z } from 'zod';

export const SettlementCreateSchema = z
  .object({
    fromUserId: z.string().uuid('Invalid from user ID'),
    toUserId: z.string().uuid('Invalid to user ID'),
    propertyId: z.string().uuid('Invalid property ID'),
    amount: z.number().positive('Amount must be positive'),
    settlementDate: z.coerce.date(),
    notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
  })
  .refine((data) => data.fromUserId !== data.toUserId, {
    message: 'Cannot settle with yourself',
    path: ['toUserId'],
  });

export const SettlementUpdateSchema = z.object({
  amount: z.number().positive('Amount must be positive').optional(),
  settlementDate: z.coerce.date().optional(),
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
});

export type SettlementCreate = z.infer<typeof SettlementCreateSchema>;
export type SettlementUpdate = z.infer<typeof SettlementUpdateSchema>;
