import { z } from 'zod';
export const TransactionTypeSchema = z.enum(['Income', 'Expense']);
export const IncomeCategorySchema = z.enum(['Rent', 'Security Deposit', 'Late Fee', 'Lease Fee']);
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
export const TransactionCategorySchema = z.union([IncomeCategorySchema, ExpenseCategorySchema]);
const baseTransactionSchema = {
    propertyId: z.string().uuid('Invalid property ID'),
    leaseId: z.string().uuid('Invalid lease ID').optional().nullable(),
    type: TransactionTypeSchema,
    category: TransactionCategorySchema,
    amount: z.number().positive('Transaction amount must be positive'),
    transactionDate: z.coerce.date(),
    description: z.string().min(1, 'Description is required'),
};
export const CreateTransactionSchema = z
    .object(baseTransactionSchema)
    .refine((data) => {
    if (data.type === 'Income') {
        return ['Rent', 'Security Deposit', 'Late Fee', 'Lease Fee'].includes(data.category);
    }
    else if (data.type === 'Expense') {
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
}, {
    message: 'Category must match the transaction type',
    path: ['category'],
});
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
    .refine((data) => {
    if (data.type && data.category) {
        if (data.type === 'Income') {
            return ['Rent', 'Security Deposit', 'Late Fee', 'Lease Fee'].includes(data.category);
        }
        else if (data.type === 'Expense') {
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
}, {
    message: 'Category must match the transaction type',
    path: ['category'],
});
export const TransactionSchema = z
    .object({
    id: z.string().uuid(),
    ...baseTransactionSchema,
    createdAt: z.date(),
    updatedAt: z.date(),
})
    .refine((data) => {
    if (data.type === 'Income') {
        return ['Rent', 'Security Deposit', 'Late Fee', 'Lease Fee'].includes(data.category);
    }
    else if (data.type === 'Expense') {
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
}, {
    message: 'Category must match the transaction type',
    path: ['category'],
});
export const TransactionQueryParamsSchema = z.object({
    property_id: z.string().uuid('Invalid property ID').optional(),
    type: TransactionTypeSchema.optional(),
    category: TransactionCategorySchema.optional(),
    from_date: z.coerce.date().optional(),
    to_date: z.coerce.date().optional(),
});
