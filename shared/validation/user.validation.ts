import { z } from 'zod';

/**
 * Role validation schema
 * Ensures role is one of the valid options
 */
export const RoleSchema = z.enum(['ADMIN', 'LANDLORD', 'VIEWER'], {
  message: 'Role must be ADMIN, LANDLORD, or VIEWER',
});

/**
 * Schema for creating a new user
 * Role defaults to VIEWER if not specified (least privilege principle)
 */
export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: RoleSchema.optional().default('VIEWER'),
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

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'New password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'New password must contain at least one number'),
});

// Type exports
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
export type UpdateUserRole = z.infer<typeof UpdateUserRoleSchema>;
export type Login = z.infer<typeof LoginSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type ChangePassword = z.infer<typeof ChangePasswordSchema>;
