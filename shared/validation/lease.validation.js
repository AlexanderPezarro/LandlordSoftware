import { z } from 'zod';
export const LeaseStatusSchema = z.enum(['Draft', 'Active', 'Expired', 'Terminated']);
const baseLeaseSchema = {
    propertyId: z.string().uuid('Invalid property ID'),
    tenantId: z.string().uuid('Invalid tenant ID'),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional().nullable(),
    monthlyRent: z.number().positive('Monthly rent must be positive'),
    securityDepositAmount: z.number().positive('Security deposit must be positive'),
    securityDepositPaidDate: z.coerce.date().optional().nullable(),
    status: LeaseStatusSchema,
};
export const CreateLeaseSchema = z
    .object(baseLeaseSchema)
    .refine((data) => {
    if (data.endDate) {
        return data.startDate <= data.endDate;
    }
    return true;
}, {
    message: 'Start date must be before or equal to end date',
    path: ['endDate'],
});
export const UpdateLeaseSchema = z
    .object({
    id: z.string().uuid(),
    propertyId: z.string().uuid('Invalid property ID').optional(),
    tenantId: z.string().uuid('Invalid tenant ID').optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional().nullable(),
    monthlyRent: z.number().positive('Monthly rent must be positive').optional(),
    securityDepositAmount: z.number().positive('Security deposit must be positive').optional(),
    securityDepositPaidDate: z.coerce.date().optional().nullable(),
    status: LeaseStatusSchema.optional(),
})
    .refine((data) => {
    if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate;
    }
    return true;
}, {
    message: 'Start date must be before or equal to end date',
    path: ['endDate'],
});
export const LeaseSchema = z
    .object({
    id: z.string().uuid(),
    ...baseLeaseSchema,
    createdAt: z.date(),
    updatedAt: z.date(),
})
    .refine((data) => {
    if (data.endDate) {
        return data.startDate <= data.endDate;
    }
    return true;
}, {
    message: 'Start date must be before or equal to end date',
    path: ['endDate'],
});
export const LeaseQueryParamsSchema = z.object({
    property_id: z.union([
        z.string().uuid('Invalid property ID'),
        z.array(z.string().uuid('Invalid property ID'))
    ]).optional(),
    tenant_id: z.string().uuid('Invalid tenant ID').optional(),
    status: LeaseStatusSchema.optional(),
});
