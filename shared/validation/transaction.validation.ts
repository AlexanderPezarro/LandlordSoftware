import { z } from 'zod';

// Transaction Type Enum
export const TransactionTypeSchema = z.enum(['Income', 'Expense']);

// Income Categories Enum
export const IncomeCategorySchema = z.enum(['Rent', 'Security Deposit', 'Late Fee', 'Lease Fee']);

// Expense Categories Enum
export const ExpenseCategorySchema = z.enum([
  'Maintenance',
  'Repair',
  'Utilities',
  'Insurance',
  'Property Tax',
  'Management Fee',
  'Legal Fee',
  'Other',
]);

// Combined Category Schema (union of income and expense categories)
export const TransactionCategorySchema = z.union([IncomeCategorySchema, ExpenseCategorySchema]);

// Base Transaction Schema (common fields)
const baseTransactionSchema = {
  propertyId: z.string().uuid('Invalid property ID'),
  leaseId: z.string().uuid('Invalid lease ID').optional().nullable(),
  type: TransactionTypeSchema,
  category: TransactionCategorySchema,
  amount: z.number().positive('Transaction amount must be positive'),
  transactionDate: z.coerce.date(),
  description: z.string().min(1, 'Description is required'),
};

// Create Transaction Schema (without id, timestamps) with category validation
export const CreateTransactionSchema = z
  .object(baseTransactionSchema)
  .refine(
    (data) => {
      // Validate that category matches the transaction type
      if (data.type === 'Income') {
        return ['Rent', 'Security Deposit', 'Late Fee', 'Lease Fee'].includes(data.category);
      } else if (data.type === 'Expense') {
        return [
          'Maintenance',
          'Repair',
          'Utilities',
          'Insurance',
          'Property Tax',
          'Management Fee',
          'Legal Fee',
          'Other',
        ].includes(data.category);
      }
      return true;
    },
    {
      message: 'Category must match the transaction type',
      path: ['category'],
    }
  );

// Update Transaction Schema (all fields optional except id) with category validation
export const UpdateTransactionSchema = z
  .object({
    id: z.string().uuid(),
    propertyId: z.string().uuid('Invalid property ID').optional(),
    leaseId: z.string().uuid('Invalid lease ID').optional().nullable(),
    type: TransactionTypeSchema.optional(),
    category: TransactionCategorySchema.optional(),
    amount: z.number().positive('Transaction amount must be positive').optional(),
    transactionDate: z.coerce.date().optional(),
    description: z.string().min(1, 'Description is required').optional(),
  })
  .refine(
    (data) => {
      // Only validate if both type and category are provided
      if (data.type && data.category) {
        if (data.type === 'Income') {
          return ['Rent', 'Security Deposit', 'Late Fee', 'Lease Fee'].includes(data.category);
        } else if (data.type === 'Expense') {
          return [
            'Maintenance',
            'Repair',
            'Utilities',
            'Insurance',
            'Property Tax',
            'Management Fee',
            'Legal Fee',
            'Other',
          ].includes(data.category);
        }
      }
      return true;
    },
    {
      message: 'Category must match the transaction type',
      path: ['category'],
    }
  );

// Full Transaction Schema (with all fields including timestamps)
export const TransactionSchema = z
  .object({
    id: z.string().uuid(),
    ...baseTransactionSchema,
    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .refine(
    (data) => {
      // Validate that category matches the transaction type
      if (data.type === 'Income') {
        return ['Rent', 'Security Deposit', 'Late Fee', 'Lease Fee'].includes(data.category);
      } else if (data.type === 'Expense') {
        return [
          'Maintenance',
          'Repair',
          'Utilities',
          'Insurance',
          'Property Tax',
          'Management Fee',
          'Legal Fee',
          'Other',
        ].includes(data.category);
      }
      return true;
    },
    {
      message: 'Category must match the transaction type',
      path: ['category'],
    }
  );

// Inferred TypeScript types
export type TransactionType = z.infer<typeof TransactionTypeSchema>;
export type IncomeCategory = z.infer<typeof IncomeCategorySchema>;
export type ExpenseCategory = z.infer<typeof ExpenseCategorySchema>;
export type TransactionCategory = z.infer<typeof TransactionCategorySchema>;
export type CreateTransaction = z.infer<typeof CreateTransactionSchema>;
export type UpdateTransaction = z.infer<typeof UpdateTransactionSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
