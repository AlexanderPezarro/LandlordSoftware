// shared/types/user.types.ts

/**
 * User roles for role-based access control
 * - ADMIN: Full system access, can manage all properties and users
 * - LANDLORD: Can manage own properties, tenants, and related data
 * - VIEWER: Read-only access to assigned properties
 */
export type Role = 'ADMIN' | 'LANDLORD' | 'VIEWER';

/**
 * Extended user entity interface with role-based permissions
 * Note: This represents the future state after schema updates.
 * The 'name' and 'role' fields will be added to the Prisma User model in subsequent beads.
 */
export interface UserWithRole {
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
