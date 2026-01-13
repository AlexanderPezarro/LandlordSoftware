import { z } from 'zod';

// Lease Status Enum
export const LeaseStatusSchema = z.enum(['Draft', 'Active', 'Expired', 'Terminated']);

// Base Lease Schema (common fields)
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

// Create Lease Schema (without id, timestamps) with date validation
export const CreateLeaseSchema = z
  .object(baseLeaseSchema)
  .refine(
    (data) => {
      // If endDate exists, ensure startDate <= endDate
      if (data.endDate) {
        return data.startDate <= data.endDate;
      }
      return true;
    },
    {
      message: 'Start date must be before or equal to end date',
      path: ['endDate'],
    }
  );

// Update Lease Schema (all fields optional except id) with date validation
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
  .refine(
    (data) => {
      // If both dates exist, ensure startDate <= endDate
      if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate;
      }
      return true;
    },
    {
      message: 'Start date must be before or equal to end date',
      path: ['endDate'],
    }
  );

// Full Lease Schema (with all fields including timestamps)
export const LeaseSchema = z
  .object({
    id: z.string().uuid(),
    ...baseLeaseSchema,
    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .refine(
    (data) => {
      // If endDate exists, ensure startDate <= endDate
      if (data.endDate) {
        return data.startDate <= data.endDate;
      }
      return true;
    },
    {
      message: 'Start date must be before or equal to end date',
      path: ['endDate'],
    }
  );

// Inferred TypeScript types
export type LeaseStatus = z.infer<typeof LeaseStatusSchema>;
export type CreateLease = z.infer<typeof CreateLeaseSchema>;
export type UpdateLease = z.infer<typeof UpdateLeaseSchema>;
export type Lease = z.infer<typeof LeaseSchema>;
