// shared/types/user.types.ts

/**
 * User roles for role-based access control
 * - ADMIN: Full system access, can manage all properties and users
 * - LANDLORD: Can manage own properties, tenants, and related data
 * - VIEWER: Read-only access to assigned properties
 */
export type Role = 'ADMIN' | 'LANDLORD' | 'VIEWER';

/**
 * User entity interface
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User without sensitive data (for API responses)
 */
export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}
