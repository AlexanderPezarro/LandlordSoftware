# AuthContext.canWrite() Test Specification

## Purpose
The `canWrite()` method in AuthContext determines whether the current user has permission to perform write operations (create, update, delete) on properties and other entities.

## Implementation
```typescript
const canWrite = useCallback(() => {
  return user?.role === 'ADMIN' || user?.role === 'LANDLORD';
}, [user]);
```

## Expected Behavior

### ADMIN Role
- **Should return**: `true`
- **Reason**: ADMIN users have full write permissions

### LANDLORD Role
- **Should return**: `true`
- **Reason**: LANDLORD users can manage their properties

### VIEWER Role
- **Should return**: `false`
- **Reason**: VIEWER users have read-only access

### Unauthenticated Users
- **Should return**: `false`
- **Reason**: user is null, so user?.role is undefined

## UI Integration

### Properties Page Conditional Rendering
When `canWrite()` returns `false` (VIEWER role):
- ✗ "Add Property" button is hidden
- ✗ "Add First Property" button is hidden
- ✗ Edit icon button on PropertyCard is hidden
- ✗ Delete icon button on PropertyCard is hidden
- ✓ Property list and details remain visible (read-only)
- ✓ Search and filter functionality remains available

When `canWrite()` returns `true` (ADMIN or LANDLORD role):
- ✓ All buttons and edit functionality are visible and functional

## Server-Side Alignment
The `canWrite()` logic aligns with the server's `requireWrite()` middleware:
```typescript
export const requireWrite = () => requireRole(Roles.LANDLORD);
```

This ensures consistent permissions between client UI and server API.

## Test Cases (Manual Verification)

### Test Case 1: ADMIN User
- Login as ADMIN
- Navigate to Properties page
- Verify "Add Property" button is visible
- Verify Edit/Delete buttons appear on property cards

### Test Case 2: LANDLORD User
- Login as LANDLORD
- Navigate to Properties page
- Verify "Add Property" button is visible
- Verify Edit/Delete buttons appear on property cards

### Test Case 3: VIEWER User
- Login as VIEWER
- Navigate to Properties page
- Verify "Add Property" button is NOT visible
- Verify Edit/Delete buttons do NOT appear on property cards
- Verify properties are still visible and clickable for viewing

### Test Case 4: Unauthenticated
- Logout or access without authentication
- Should be redirected to login (handled by route protection)
