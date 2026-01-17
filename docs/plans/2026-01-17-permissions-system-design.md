# Permissions System Design

**Date:** 2026-01-17
**Status:** Approved
**Type:** Feature Enhancement

## Overview

Expand the user system to support role-based access control (RBAC) with three permission levels:
- **Admin**: Full read-write permissions + user management
- **Landlord**: Full read-write permissions on all entities
- **Viewer**: Read-only access to all entities

## Use Case

Single landlord operation with team members:
- Admin: Property owner/manager who controls everything
- Landlord: Assistant/property manager handling day-to-day operations
- Viewer: Family member, partner, or accountant with read-only access

All users see the same data (shared portfolio model, not multi-tenant).

## Design Decisions

### 1. Database Schema

**User Model Changes:**
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  role      String   @default("VIEWER") // ADMIN, LANDLORD, or VIEWER
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("users")
}
```

**Key Decisions:**
- Store as String (not enum) for SQLite compatibility and flexibility
- Default to VIEWER for security (explicit permission grants)
- Values: "ADMIN", "LANDLORD", "VIEWER" (uppercase)

**Migration Strategy:**
- Existing users default to VIEWER after migration
- Manual database update needed to promote existing user to ADMIN
- New installations: first registered user automatically becomes ADMIN

### 2. Permission Middleware

**New File:** `server/src/middleware/permissions.ts`

**Middleware Functions:**
```typescript
requireRole(role: Role)  // Check minimum role level
requireWrite()           // LANDLORD or ADMIN
requireAdmin()           // ADMIN only
```

**Permission Hierarchy:**
- ADMIN > LANDLORD > VIEWER
- Higher roles inherit lower role permissions

**Error Handling:**
- 401 Unauthorized: Not authenticated (existing `requireAuth`)
- 403 Forbidden: Authenticated but insufficient role
- Response: `{ success: false, error: 'Insufficient permissions' }`

### 3. Route Protection

**Properties, Tenants, Leases, Transactions, Events:**
- GET (list/detail): Any authenticated user
- POST (create): `requireWrite()` (LANDLORD/ADMIN)
- PUT (update): `requireWrite()` (LANDLORD/ADMIN)
- DELETE: `requireWrite()` (LANDLORD/ADMIN)

**Documents:**
- GET (list/download): Any authenticated user
- POST (upload): `requireWrite()`
- DELETE: `requireWrite()`

**Users:**
- GET (list): `requireAdmin()`
- POST (create): `requireAdmin()`
- PUT (change role): `requireAdmin()`
- DELETE: `requireAdmin()`

**Auth Routes:**
- POST /login, /register, /logout: Public/basic auth only
- GET /me: Add role field to response

### 4. Validation & Types

**Shared Types** (`shared/types/user.types.ts`):
```typescript
export type Role = 'ADMIN' | 'LANDLORD' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}
```

**Validation Schemas** (`shared/validation/user.validation.ts`):
- Update `CreateUserSchema`: optional role field (admin-only)
- New `UpdateUserRoleSchema`: validate role changes
- Enforce enum values

**Registration Flow:**
```
1. Check user count in database
2. If count = 0: role = ADMIN (first user)
3. If count > 0: role = VIEWER (or admin-specified role)
```

**Role Change Restrictions:**
- Users cannot change their own role (prevent lockout)
- Must maintain at least one ADMIN (prevent total lockout)

### 5. Testing Strategy

**New Test File:** `server/src/middleware/__tests__/permissions.test.ts`
- Test all three permission levels
- Test permission hierarchy
- Test 403 Forbidden responses
- Integration with existing `requireAuth`

**Update Existing Route Tests:**
- Add VIEWER blocking tests for all POST/PUT/DELETE operations
- Test ADMIN-only user management routes
- Test first-user-becomes-ADMIN flow

**Test Utilities:**
- Helper: create test users with specific roles
- Helper: generate authenticated sessions per role
- Reusable 403 assertions

**Coverage Goal:** Maintain 80% threshold

### 6. Frontend Changes

**AuthContext Updates** (`client/src/contexts/AuthContext.tsx`):
- Add `role` to user state
- Expose helpers: `isAdmin()`, `isLandlord()`, `canWrite()`
- Fetch role from `/api/auth/me`

**Conditional Rendering Pattern:**
```typescript
const { canWrite, isAdmin } = useAuth();

// Hide edit buttons for Viewers
{canWrite() && <Button>Add Property</Button>}
{canWrite() && <IconButton>Edit</IconButton>}
```

**New User Management Page** (Admin only):
- Route: `/users`
- List users with roles
- Create users with role selection
- Change user roles (dropdown)
- Delete users
- Visible only to ADMIN role

**Error Handling:**
- Catch 403 responses in API service
- Toast notification: "You don't have permission to perform this action"
- Graceful degradation (no crashes)

**Navigation:**
- Add "Users" menu item for ADMIN role only
- Conditional menu rendering based on `isAdmin()`

## Implementation Checklist

### Backend
- [ ] Update Prisma schema with role field
- [ ] Create and run migration
- [ ] Update existing user to ADMIN role
- [ ] Create permissions middleware
- [ ] Update all route files with permission checks
- [ ] Add role to auth/me response
- [ ] Create user role management endpoint
- [ ] Update shared types and validation schemas
- [ ] Write middleware tests
- [ ] Update route tests with role scenarios

### Frontend
- [ ] Update AuthContext with role support
- [ ] Add permission helper functions
- [ ] Update all pages with conditional rendering
- [ ] Create Users management page
- [ ] Add Users route and navigation
- [ ] Update API service error handling
- [ ] Add 403 error toast notifications

### Database
- [ ] Run migration
- [ ] Seed script: promote first user to ADMIN
- [ ] Update db:seed to create users with different roles

## Risks & Mitigations

**Risk:** Admin locks themselves out by changing own role
**Mitigation:** Block self-role-change in backend validation

**Risk:** All admins deleted/demoted
**Mitigation:** Require at least one ADMIN exists before role change

**Risk:** Existing users locked out after migration
**Mitigation:** Document manual promotion process; include in migration notes

## Future Considerations

This design supports future enhancements:
- Property-specific assignments (assign Viewer to specific properties)
- Custom roles with granular permissions
- Audit log for permission changes
- Multi-tenant support (separate landlord portfolios)

These would require refactoring to a more complex RBAC system, but the current design provides a clean foundation.
