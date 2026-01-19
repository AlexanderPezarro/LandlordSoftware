// shared/types/user.types.ts

/**
 * User roles for role-based access control
 * - ADMIN: Full system access, can manage all properties and users
 * - LANDLORD: Can manage own properties, tenants, and related data
 * - VIEWER: Read-only access to assigned properties
 */
export type Role = 'ADMIN' | 'LANDLORD' | 'VIEWER';

/**
 * Role enum values for runtime use
 */
export const Roles = {
  ADMIN: 'ADMIN' as Role,
  LANDLORD: 'LANDLORD' as Role,
  VIEWER: 'VIEWER' as Role,
};

/**
 * User entity interface with role-based access control
 */
export interface UserWithRole {
  id: string;
  email: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User data safe for API responses (excludes password and internal fields)
 */
export interface PublicUser {
  id: string;
  email: string;
  role: Role;
}
