# Bugfixes and Missing Features - Design Document

**Date:** 2026-01-15
**Status:** Draft

## Overview

This document covers fixes for several issues in the landlord management system:

1. Properties page crash (schema mismatch)
2. Leases page not implemented
3. Documents page not implemented
4. Dashboard showing £0 (seed data dates)
5. No user management page
6. Rate limiting too strict

---

## 1. Properties Page Fix (Schema Alignment)

### Problem

The frontend expects US-style address fields (`state`, `zipCode`) but the database uses UK-style (`county`, `postcode`). This causes the Properties page to crash when rendering PropertyCard.

### Solution

Align everything to UK format since this is a UK-based landlord system.

### Changes Required

**Frontend types** (`client/src/types/api.types.ts`):
- `state` → `county`
- `zipCode` → `postcode`
- Update `propertyType` values: `'House' | 'Apartment' | 'Studio' | 'Bungalow'` (match database)
- Update `status` values to include `'Under Maintenance'` (from seed data)

**Lease type alignment**:
- `rentAmount` → `monthlyRent`
- `securityDeposit` → `securityDepositAmount`
- Add `securityDepositPaidDate`
- Update `status` values: `'Active' | 'Expired' | 'Pending'`

**Component updates**:
- `PropertyCard.tsx`: Use `county`, `postcode`
- `Properties.tsx`: Update form fields, labels, and filter options

**Shared validation** (`shared/validation/`):
- Update property and lease schemas to match

---

## 2. Leases Page Implementation

### Features

1. **List view** with filtering:
   - Property dropdown
   - Status filter (Active, Expired, Pending)
   - Search by tenant name

2. **Create/Edit dialog**:
   - Property (required, dropdown)
   - Tenant (required, dropdown)
   - Start date, End date (optional)
   - Monthly rent, Security deposit amount
   - Security deposit paid date (optional)
   - Status

3. **Lease cards** displaying:
   - Property name
   - Tenant name (full name)
   - Monthly rent
   - Date range
   - Status badge

### Pattern

Follow existing Properties/Tenants page structure with MUI components.

---

## 3. Documents Page Implementation

### Features

1. **List view** with filtering:
   - Entity type (Property, Tenant, Lease, Transaction)
   - Specific entity dropdown
   - File type filter

2. **Upload functionality**:
   - Drag-and-drop or click to upload
   - Entity association (required)
   - Allowed types: PDF, JPG, PNG
   - Max size: 10MB

3. **Document list** showing:
   - File name
   - Associated entity name
   - File type icon
   - Upload date
   - File size
   - Download/delete actions

### Backend

Documents API routes already exist at `server/src/routes/documents.ts`.

---

## 4. Dashboard Fix & Seed Data Update

### Problem

Dashboard queries current month but seed data has transactions from 2023-2024.

### Solution

Update `prisma/seed.ts` to generate transactions relative to current date:

- Calculate dates dynamically using `new Date()`
- Generate rent payments for current month and previous 2-3 months
- Spread expenses across recent months
- Include upcoming events (future dates)

### Example

```typescript
const now = new Date();
const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
```

---

## 5. User Management Page

### Features

1. **Settings page** at `/settings`:
   - View current user email
   - Change password form

2. **User management section**:
   - List all users
   - Create new user (email, password)
   - Delete user (with confirmation, prevent self-delete)

### Backend Changes

New endpoints:
- `PUT /api/auth/password` - change password (requires current password)
- `GET /api/users` - list all users
- `POST /api/users` - create user
- `DELETE /api/users/:id` - delete user

### Navigation

- Add Settings link to sidebar or user menu in header
- Include user icon with dropdown

---

## 6. Rate Limiting Fix

### Problem

100 requests per 15 minutes is too restrictive for normal usage.

### Solution

Tiered rate limiting:

```typescript
// General API - generous
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: 'Too many requests, please try again later.',
});

// Login - strict to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many login attempts, please try again later.',
});

app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
```

---

## Implementation Order

1. **Schema alignment** (Properties fix) - unblocks testing other features
2. **Rate limiting fix** - unblocks development workflow
3. **Seed data update** - enables dashboard testing
4. **Leases page** - core functionality
5. **Documents page** - secondary functionality
6. **User management** - admin functionality

---

## Files to Modify

### Schema Alignment
- `client/src/types/api.types.ts`
- `client/src/types/component.types.ts`
- `client/src/components/shared/PropertyCard.tsx`
- `client/src/pages/Properties.tsx`
- `shared/validation/property.validation.ts`
- `shared/validation/lease.validation.ts`

### Rate Limiting
- `server/src/app.ts`

### Seed Data
- `prisma/seed.ts`

### Leases Page
- `client/src/pages/Leases.tsx` (rewrite)
- `client/src/services/api/leases.service.ts` (verify/update)

### Documents Page
- `client/src/pages/Documents.tsx` (rewrite)
- `client/src/services/api/documents.service.ts` (create if missing)

### User Management
- `client/src/pages/Settings.tsx` (new)
- `server/src/routes/users.ts` (new)
- `server/src/routes/auth.ts` (add password change)
- `client/src/App.tsx` (add route)
- Navigation component (add link)
