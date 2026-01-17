# API Call Optimization Design

**Date**: 2026-01-17
**Status**: Approved
**Author**: Claude Code

## Problem Statement

The frontend makes excessive API calls, specifically:

1. **N+1 Issue on Properties Page**: Fetches all properties (1 call), then fetches active leases for each property individually (N calls). For 10 properties = 11 total calls.

2. **Duplicate PropertySelector Calls**: PropertySelector component used in multiple places independently fetches properties list, causing duplicate API calls when multiple selectors exist.

## Solution Overview

### 1. Backend: Enhance Leases Endpoint for Batch Queries

**File**: `server/src/routes/leases.ts`

**Change**: Accept multiple property IDs via repeated query parameters

**API Examples:**
```
Single property (existing):
GET /api/leases?property_id=abc123

Multiple properties (new):
GET /api/leases?property_id=abc123&property_id=def456&property_id=ghi789
```

**Implementation:**
- Update `shared/validation/lease.validation.js`:
  - Modify `LeaseQueryParamsSchema` to accept `property_id` as `string | string[]`
- In route handler:
  - Normalize to array: `const propertyIds = Array.isArray(property_id) ? property_id : [property_id]`
  - Always use Prisma's `in` operator: `where: { propertyId: { in: propertyIds } }`
  - Works for both single (array of 1) and multiple property IDs

**Benefits:**
- Backward compatible - existing single property_id calls work as array of 1
- Simpler code - one code path instead of conditional logic
- Enables batching from frontend

---

### 2. Frontend: Optimize Properties Page

**File**: `client/src/pages/Properties.tsx`

**Current Flow (N+1):**
```typescript
const fetchedProperties = await propertiesService.getProperties(); // 1 call
const propertiesWithLeases = await Promise.all(
  fetchedProperties.map(async (property) => {
    const leases = await leasesService.getLeases({
      propertyId: property.id
    }); // N calls
    // ...
  })
);
```

**New Optimized Flow (2 calls):**
```typescript
// 1. Fetch all properties
const fetchedProperties = await propertiesService.getProperties();

// 2. Fetch all active leases for all properties in ONE call
const propertyIds = fetchedProperties.map(p => p.id);
const allLeases = await leasesService.getLeases({
  propertyId: propertyIds, // Pass array of IDs
  status: 'Active',
});

// 3. Match leases to properties client-side
const propertiesWithLeases = fetchedProperties.map(property => {
  const activeLease = allLeases.find(lease =>
    lease.propertyId === property.id && lease.status === 'Active'
  );
  return { ...property, activeLease: activeLease || null };
});
```

**Service Layer Changes:**

**File**: `client/src/services/api/leases.service.ts`

- Update `getLeases()` to handle `propertyId` as `string | string[]`
- When building query params, handle arrays:
  ```typescript
  if (Array.isArray(filters.propertyId)) {
    filters.propertyId.forEach(id => {
      params.append('property_id', id);
    });
  } else {
    params.append('property_id', filters.propertyId);
  }
  ```

**Impact:**
- 10 properties: 11 calls → 2 calls (82% reduction)
- 50 properties: 51 calls → 2 calls (96% reduction)

---

### 3. Frontend: PropertiesContext for Shared Caching

**New File**: `client/src/contexts/PropertiesContext.tsx`

**Purpose**: Cache properties data and share across all PropertySelector instances

**Interface:**
```typescript
interface PropertiesContextValue {
  properties: Property[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
```

**Implementation:**
- Fetches properties once on provider mount
- Provides shared state to all consumers
- `refetch()` method to refresh after mutations

**Integration Points:**

1. **`client/src/App.tsx`**
   - Add `<PropertiesProvider>` wrapper around routes

2. **`client/src/components/shared/PropertySelector.tsx`**
   - Replace internal `useEffect` + API call with `useProperties()` hook
   - Remove local state for properties/loading/error

3. **`client/src/pages/Properties.tsx`**
   - Call `refetch()` after create/update/delete operations
   - Keeps context in sync with backend

4. **Other pages using PropertySelector**
   - Automatically benefit from cached data
   - No changes needed

**Benefits:**
- Eliminates duplicate API calls when multiple PropertySelectors render
- Consistent data across components
- Easy cache invalidation with `refetch()`

**Trade-offs:**
- ~50 lines of context code
- Properties loaded eagerly (minor - list is small)
- Must remember to call `refetch()` after mutations

---

## Additional Optimization Opportunities (Future)

Following the same pattern, these endpoints could also accept array parameters:

1. **Tenants endpoint** (`/api/tenants?tenant_id=...&tenant_id=...`)
   - Use case: Fetching details for multiple tenants at once

2. **Transactions endpoint** (`/api/transactions?property_id=...&property_id=...`)
   - Already supports single propertyId filter
   - Use case: Dashboard showing transactions for selected properties

3. **Events endpoint** (`/api/events?property_id=...&property_id=...`)
   - Already supports single propertyId filter
   - Use case: Calendar view across multiple properties

**Recommendation**: Implement as needed. Current pages already use `Promise.all()` effectively.

---

## Implementation Checklist

### Backend
- [ ] Update `shared/validation/lease.validation.js` - accept `property_id` as `string | string[]`
- [ ] Update `server/src/routes/leases.ts` - normalize to array and use `in` operator
- [ ] Test with single and multiple property IDs
- [ ] Verify backward compatibility

### Frontend - Service Layer
- [ ] Update `client/src/services/api/leases.service.ts` - handle array propertyId in query params
- [ ] Update TypeScript types for `LeaseFilters` interface

### Frontend - PropertiesContext
- [ ] Create `client/src/contexts/PropertiesContext.tsx`
- [ ] Create `useProperties()` hook
- [ ] Wrap app in `<PropertiesProvider>` in App.tsx
- [ ] Update PropertySelector to use context
- [ ] Add `refetch()` calls in Properties page after mutations

### Frontend - Properties Page
- [ ] Refactor `fetchProperties()` to batch lease fetching
- [ ] Test with 0, 1, and many properties
- [ ] Add `refetch()` call from PropertiesContext after create/update/delete

### Testing
- [ ] Test backend with single property_id parameter
- [ ] Test backend with multiple property_id parameters
- [ ] Test Properties page loads correctly with batched calls
- [ ] Test PropertySelector in multiple locations (Transactions, Events, etc.)
- [ ] Test cache invalidation when properties are created/updated/deleted

---

## Expected Results

**Before:**
- Properties page with 10 properties: 11 API calls
- Multiple PropertySelectors on page: 2-3 duplicate API calls

**After:**
- Properties page with 10 properties: 2 API calls (82% reduction)
- Multiple PropertySelectors on page: 1 shared API call from context

**Scalability:**
- As property count grows, calls remain constant (2 total)
- Better server performance and reduced database load
