import { z } from 'zod';

/**
 * Role validation schema
 * Ensures role is one of the valid options
 */
export const RoleSchema = z.enum(['ADMIN', 'LANDLORD', 'VIEWER']);

/**
 * Schema for creating a new user
 * Role defaults to LANDLORD if not specified
 */
export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: RoleSchema.optional().default('LANDLORD'),
});

/**
 * Schema for updating user information
 */
export const UpdateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .optional(),
}).strict();

/**
 * Schema for updating user role (admin-only operation)
 */
export const UpdateUserRoleSchema = z.object({
  role: RoleSchema,
});

/**
 * Schema for user login
 */
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Schema for changing password
 */
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// Type exports
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
export type UpdateUserRole = z.infer<typeof UpdateUserRoleSchema>;
export type Login = z.infer<typeof LoginSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type ChangePassword = z.infer<typeof ChangePasswordSchema>;
