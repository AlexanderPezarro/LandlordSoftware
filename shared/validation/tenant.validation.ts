import { z } from 'zod';

// UK Phone validation - lenient to accept various formats
// Accepts: +44 formats, 0 formats, with/without spaces
const ukPhoneRegex = /^(\+44\s?|0)?(\d\s?){9,10}$/;

// Tenant Status Enum
export const TenantStatusSchema = z.enum(['Prospective', 'Active', 'Former']);

// Base Tenant Schema (common fields)
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

// Create Tenant Schema (without id, timestamps)
export const CreateTenantSchema = z.object(baseTenantSchema);

// Update Tenant Schema (all fields optional except id)
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

// Full Tenant Schema (with all fields including timestamps)
export const TenantSchema = z.object({
  id: z.string().uuid(),
  ...baseTenantSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Inferred TypeScript types
export type TenantStatus = z.infer<typeof TenantStatusSchema>;
export type CreateTenant = z.infer<typeof CreateTenantSchema>;
export type UpdateTenant = z.infer<typeof UpdateTenantSchema>;
export type Tenant = z.infer<typeof TenantSchema>;
