import { z } from 'zod';
const ukPhoneRegex = /^(\+44\s?|0)?(\d\s?){9,10}$/;
export const TenantStatusSchema = z.enum(['Prospective', 'Active', 'Former']);
const baseTenantSchema = {
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email format'),
    phone: z.string().regex(ukPhoneRegex, 'Invalid UK phone number format'),
    emergencyContactName: z.string().optional().nullable(),
    emergencyContactPhone: z
        .string()
        .regex(ukPhoneRegex, 'Invalid UK phone number format')
        .optional()
        .nullable(),
    status: TenantStatusSchema,
    notes: z.string().optional().nullable(),
};
export const CreateTenantSchema = z.object(baseTenantSchema);
export const UpdateTenantSchema = z.object({
    id: z.string().uuid(),
    firstName: z.string().min(1, 'First name is required').optional(),
    lastName: z.string().min(1, 'Last name is required').optional(),
    email: z.string().email('Invalid email format').optional(),
    phone: z.string().regex(ukPhoneRegex, 'Invalid UK phone number format').optional(),
    emergencyContactName: z.string().optional().nullable(),
    emergencyContactPhone: z
        .string()
        .regex(ukPhoneRegex, 'Invalid UK phone number format')
        .optional()
        .nullable(),
    status: TenantStatusSchema.optional(),
    notes: z.string().optional().nullable(),
});
export const TenantSchema = z.object({
    id: z.string().uuid(),
    ...baseTenantSchema,
    createdAt: z.date(),
    updatedAt: z.date(),
});
export const TenantQueryParamsSchema = z.object({
    status: TenantStatusSchema.optional(),
    search: z.string().optional(),
});
export const LeaseHistoryQueryParamsSchema = z.object({
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
});
