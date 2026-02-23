import { z } from 'zod';

export const TransactionSplitSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  percentage: z
    .number()
    .min(0.01, 'Split must be at least 0.01%')
    .max(100, 'Split cannot exceed 100%'),
  amount: z.number().positive('Amount must be positive'),
});

export const TransactionSplitsArraySchema = z
  .array(TransactionSplitSchema)
  .min(1, 'At least one split required')
  .refine(
    (splits) => {
      const sum = splits.reduce((acc, s) => acc + s.percentage, 0);
      return Math.abs(sum - 100) < 0.01;
    },
    { message: 'Split percentages must sum to 100%' }
  );

export type TransactionSplit = z.infer<typeof TransactionSplitSchema>;
