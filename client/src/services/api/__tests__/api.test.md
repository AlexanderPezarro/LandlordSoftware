# API Client Manual Test Plan

This document outlines the manual testing steps for the API client services.

## Prerequisites
- Backend server running on expected port
- Database seeded with test data
- User account created for authentication testing

## Test Scenarios

### 1. Auth Service Tests

#### Test: Login
```typescript
import { authService } from '../services/api';

// Test successful login
const result = await authService.login('test@example.com', 'password');
// Expected: { success: true, user: { id: '...', email: 'test@example.com' } }

// Test failed login
try {
  await authService.login('test@example.com', 'wrong-password');
} catch (error) {
  // Expected: ApiError with status 401
}
```

#### Test: Get Me
```typescript
// After successful login
const user = await authService.getMe();
// Expected: { id: '...', email: 'test@example.com' }

// Without authentication
try {
  await authService.getMe();
} catch (error) {
  // Expected: ApiError with status 401
}
```

#### Test: Logout
```typescript
await authService.logout();
// Expected: Success, no errors
```

### 2. Properties Service Tests

#### Test: Get Properties (no filters)
```typescript
import { propertiesService } from '../services/api';

const properties = await propertiesService.getProperties();
// Expected: Array of Property objects
```

#### Test: Get Properties (with filters)
```typescript
const filtered = await propertiesService.getProperties({
  status: 'Vacant',
  search: 'Main',
});
// Expected: Filtered array of properties
```

#### Test: Get Single Property
```typescript
const property = await propertiesService.getProperty('valid-uuid');
// Expected: Property object

try {
  await propertiesService.getProperty('invalid-id');
} catch (error) {
  // Expected: ApiError with status 400 or 404
}
```

#### Test: Create Property
```typescript
const newProperty = await propertiesService.createProperty({
  name: 'Test Property',
  street: '123 Main St',
  city: 'Test City',
  state: 'CA',
  zipCode: '12345',
  propertyType: 'Single Family',
  numberOfUnits: 1,
  numberOfBedrooms: 3,
  numberOfBathrooms: 2,
  status: 'Vacant',
});
// Expected: Created Property object
```

#### Test: Update Property
```typescript
const updated = await propertiesService.updateProperty('property-id', {
  status: 'Occupied',
});
// Expected: Updated Property object
```

#### Test: Delete Property
```typescript
const deleted = await propertiesService.deleteProperty('property-id');
// Expected: Property with status 'For Sale'
```

### 3. Tenants Service Tests

#### Test: Get Tenants
```typescript
import { tenantsService } from '../services/api';

const tenants = await tenantsService.getTenants();
// Expected: Array of Tenant objects
```

#### Test: Get Tenant Lease History
```typescript
const history = await tenantsService.getTenantLeaseHistory('tenant-id', {
  fromDate: '2024-01-01',
  toDate: '2024-12-31',
});
// Expected: Array of Lease objects with property details
```

### 4. Leases Service Tests

#### Test: Get Leases with filters
```typescript
import { leasesService } from '../services/api';

const leases = await leasesService.getLeases({
  property_id: 'property-id',
  status: 'Active',
});
// Expected: Filtered array of Lease objects
```

#### Test: Create Lease (overlap detection)
```typescript
try {
  await leasesService.createLease({
    propertyId: 'property-id',
    tenantId: 'tenant-id',
    startDate: '2024-01-01',
    rentAmount: 1500,
    status: 'Active',
  });
} catch (error) {
  // Expected: ApiError if overlapping lease exists
}
```

### 5. Transactions Service Tests

#### Test: Get Transaction Summary
```typescript
import { transactionsService } from '../services/api';

const summary = await transactionsService.getTransactionSummary({
  property_id: 'property-id',
  start_date: '2024-01-01',
  end_date: '2024-12-31',
});
// Expected: { total_income: number, total_expense: number, net: number, transaction_count: number }
```

#### Test: Create Transaction
```typescript
const transaction = await transactionsService.createTransaction({
  propertyId: 'property-id',
  type: 'Income',
  category: 'Rent',
  amount: 1500,
  transactionDate: '2024-01-01',
});
// Expected: Created Transaction object
```

### 6. Events Service Tests

#### Test: Mark Event Complete
```typescript
import { eventsService } from '../services/api';

const completed = await eventsService.markEventComplete('event-id');
// Expected: Event object with completed: true and completedDate set
```

### 7. Documents Service Tests

#### Test: Upload Document
```typescript
import { documentsService } from '../services/api';

const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
const document = await documentsService.uploadDocument(file, 'Property', 'property-id');
// Expected: Document object with file metadata
```

#### Test: Download Document
```typescript
const blob = await documentsService.downloadDocument('document-id');
// Expected: Blob object
// Can be used to create download link: URL.createObjectURL(blob)
```

### 8. Error Handling Tests

#### Test: Network Error
```typescript
// Disconnect network or stop backend
try {
  await propertiesService.getProperties();
} catch (error) {
  // Expected: ApiError with status 0 and network error message
}
```

#### Test: 500 Error with Retry
```typescript
// Backend should log retry attempt
try {
  await propertiesService.getProperties();
} catch (error) {
  // Expected: One retry attempt, then ApiError with status 500
}
```

#### Test: 401 Unauthorized Event
```typescript
window.addEventListener('api:unauthorized', () => {
  console.log('Unauthorized event fired');
});

// Make request without authentication
try {
  await propertiesService.createProperty({...});
} catch (error) {
  // Expected: Custom event 'api:unauthorized' fired, ApiError with status 401
}
```

## Testing in Development Mode

When `import.meta.env.DEV` is true, the API client logs:
- Request details (method, URL, params, data)
- Response details (status, data)
- Error details (URL, method, status, message)
- Retry attempts

Check browser console for these logs during testing.

## Integration Testing

The API client is designed to work with the AuthContext. Test the integration:

1. Login via AuthContext
2. Make authenticated requests
3. Logout
4. Verify 401 errors redirect to login

## Notes

- All dates should be in ISO 8601 format
- All IDs should be valid UUIDs
- File uploads use multipart/form-data
- All other requests use application/json
- Session cookies are included automatically via withCredentials
