# Permissions System Implementation Tree

**Date:** 2026-01-17
**Branch:** feature/permissions-system
**Status:** Ready for Implementation

## Overview

This document outlines the implementation tree for the permissions system, broken down into 23 beads organized by dependencies. Each bead is a complete, testable unit of work.

## Bead Tree Structure

### Phase 1: Foundation (Priority 1)
**Ready to Start:**
- **Task-asm**: Add shared Role type and user types
- **Task-3vl**: Add 403 Forbidden error handling to API service

**Depends on Task-asm:**
- **Task-usd**: Update user validation schemas for roles
- **Task-g0x**: Add role field to User schema and migrate

### Phase 2: Core Infrastructure (Priority 1)
**Depends on Task-g0x:**
- **Task-drp**: Update seed script to create users with roles

**Depends on Task-asm + Task-g0x:**
- **Task-c8y**: Implement permissions middleware with role hierarchy

### Phase 3: Backend Routes (Priority 1)
**Depends on Task-usd + Task-g0x + Task-c8y:**
- **Task-0b8**: Add role to auth endpoints and registration flow
- **Task-cmd**: Add admin-only permission checks to users routes

### Phase 4: Entity Route Protection (Priority 2)
**Depends on Task-c8y:**
- **Task-wx4**: Add requireWrite middleware to properties routes
- **Task-fx5**: Add requireWrite middleware to tenants routes
- **Task-cpb**: Add requireWrite middleware to leases routes
- **Task-qyc**: Add requireWrite middleware to transactions routes
- **Task-u8t**: Add requireWrite middleware to events routes
- **Task-e3y**: Add requireWrite middleware to documents routes

### Phase 5: Frontend Foundation (Priority 1)
**Depends on Task-0b8:**
- **Task-onm**: Add role support and permission helpers to AuthContext

### Phase 6: Frontend Pages (Priority 2)
**Depends on Task-onm:**
- **Task-1kj**: Add role-based conditional rendering to Properties page
- **Task-es8**: Add role-based conditional rendering to Tenants page
- **Task-peo**: Add role-based conditional rendering to Leases page
- **Task-pde**: Add role-based conditional rendering to Transactions page
- **Task-qyw**: Add role-based conditional rendering to Events page
- **Task-8d8**: Add role-based conditional rendering to Documents page

### Phase 7: User Management (Priority 1-2)
**Depends on Task-cmd + Task-onm:**
- **Task-mom**: Create admin-only Users management page

**Depends on Task-mom:**
- **Task-s7o**: Add Users menu item and route configuration

## Dependency Graph

```
Task-asm (Foundation)
├── Task-usd (Validation)
│   ├── Task-0b8 (Auth routes)
│   │   └── Task-onm (AuthContext)
│   │       ├── Task-1kj (Properties page)
│   │       ├── Task-es8 (Tenants page)
│   │       ├── Task-peo (Leases page)
│   │       ├── Task-pde (Transactions page)
│   │       ├── Task-qyw (Events page)
│   │       ├── Task-8d8 (Documents page)
│   │       └── Task-mom (Users page)
│   │           └── Task-s7o (Navigation)
│   └── Task-cmd (Users routes)
│       └── Task-mom (Users page)
│           └── Task-s7o (Navigation)
├── Task-g0x (Database migration)
│   ├── Task-drp (Seed script)
│   ├── Task-c8y (Middleware)
│   │   ├── Task-0b8 (Auth routes)
│   │   ├── Task-cmd (Users routes)
│   │   ├── Task-wx4 (Properties routes)
│   │   ├── Task-fx5 (Tenants routes)
│   │   ├── Task-cpb (Leases routes)
│   │   ├── Task-qyc (Transactions routes)
│   │   ├── Task-u8t (Events routes)
│   │   └── Task-e3y (Documents routes)
│   ├── Task-0b8 (Auth routes)
│   └── Task-cmd (Users routes)

Task-3vl (403 error handling) - Independent
```

## Implementation Order

### Suggested Execution Path:

1. **Start with Foundation:**
   - Task-asm (types)
   - Task-3vl (403 handling - can be done in parallel)

2. **Database & Validation:**
   - Task-usd (validation)
   - Task-g0x (schema migration)
   - Task-drp (seed script)

3. **Middleware:**
   - Task-c8y (permissions middleware)

4. **Backend Routes (can be done in parallel):**
   - Task-0b8 (auth routes)
   - Task-cmd (users routes)
   - Task-wx4, Task-fx5, Task-cpb, Task-qyc, Task-u8t, Task-e3y (entity routes)

5. **Frontend Foundation:**
   - Task-onm (AuthContext)

6. **Frontend Pages (can be done in parallel):**
   - Task-1kj, Task-es8, Task-peo, Task-pde, Task-qyw, Task-8d8

7. **User Management:**
   - Task-mom (Users page)
   - Task-s7o (navigation)

## Verification Checklist

After all beads are complete:

### Backend
- [ ] All tests pass: `npm test`
- [ ] Coverage maintained at 80%+
- [ ] First user registration creates ADMIN
- [ ] Subsequent users default to VIEWER
- [ ] VIEWER blocked from write operations (403)
- [ ] Non-admins blocked from user management (403)

### Frontend
- [ ] Login as ADMIN: see all features + Users menu
- [ ] Login as LANDLORD: see all features except Users menu
- [ ] Login as VIEWER: see read-only views, no create/edit/delete buttons
- [ ] 403 errors show toast notification

### Database
- [ ] Migration applied successfully
- [ ] Seed creates users with correct roles
- [ ] Existing users have roles assigned

## Next Steps

To begin implementation:

```bash
# Check ready beads
bd ready

# Start with foundation
bd update Task-asm --status in_progress

# Or use subagent-driven-development skill for automated execution
```

## Notes

- Each bead contains complete implementation details in its description
- Use `bd show <task-id>` to see full bead specification
- Beads are designed to be executed independently
- All beads include test steps and verification procedures
- Frequent commits ensure progress is tracked
