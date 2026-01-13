# API Client Services

This directory contains the comprehensive Axios-based API client service for the landlord management system frontend.

## Structure

```
services/
├── api.ts                 # Main API client configuration with interceptors
├── api/                   # Service modules
│   ├── index.ts          # Barrel export for all services
│   ├── auth.service.ts   # Authentication services
│   ├── properties.service.ts
│   ├── tenants.service.ts
│   ├── leases.service.ts
│   ├── transactions.service.ts
│   ├── events.service.ts
│   └── documents.service.ts
└── README.md             # This file
```

## Features

### Core API Client (api.ts)

- **Base Configuration**: Base URL `/api`, 10-second timeout, credentials included
- **Request Interceptor**: Logs all requests in development mode
- **Response Interceptor**:
  - Logs all responses in development mode
  - Handles error responses with standardized ApiError class
  - Automatically retries 5xx errors once with 1-second delay
  - Emits `api:unauthorized` event on 401 errors for AuthContext integration
- **Error Handling**: Converts all errors to typed ApiError instances with status, message, and details

### Service Modules

Each service module provides typed methods for a specific entity:

#### Auth Service
- `login(email, password)` - Authenticate user
- `logout()` - End user session
- `getMe()` - Get current authenticated user

#### Properties Service
- `getProperties(filters?)` - List properties with optional filters
- `getProperty(id)` - Get single property
- `createProperty(data)` - Create new property
- `updateProperty(id, data)` - Update property
- `deleteProperty(id)` - Soft delete (sets status to 'For Sale')

#### Tenants Service
- `getTenants(filters?)` - List tenants with optional filters
- `getTenant(id)` - Get single tenant
- `getTenantLeaseHistory(id, filters?)` - Get tenant's lease history with property details
- `createTenant(data)` - Create new tenant
- `updateTenant(id, data)` - Update tenant
- `deleteTenant(id)` - Soft delete (sets status to 'Former')

#### Leases Service
- `getLeases(filters?)` - List leases with optional filters
- `getLease(id)` - Get single lease with property and tenant details
- `createLease(data)` - Create new lease
- `updateLease(id, data)` - Update lease
- `deleteLease(id)` - Soft delete (sets status to 'Terminated')

#### Transactions Service
- `getTransactions(filters?)` - List transactions with optional filters
- `getTransaction(id)` - Get single transaction with property and lease details
- `createTransaction(data)` - Create new transaction
- `updateTransaction(id, data)` - Update transaction
- `deleteTransaction(id)` - Hard delete transaction
- `getTransactionSummary(filters?)` - Get financial summary with totals

#### Events Service
- `getEvents(filters?)` - List events with optional filters
- `getEvent(id)` - Get single event
- `createEvent(data)` - Create new event
- `updateEvent(id, data)` - Update event
- `deleteEvent(id)` - Hard delete event
- `markEventComplete(id)` - Mark event as completed

#### Documents Service
- `uploadDocument(file, entity_type, entity_id)` - Upload document (multipart/form-data)
- `downloadDocument(id)` - Download document file as Blob
- `deleteDocument(id)` - Delete document
- `getDocuments(entityType?, entityId?)` - List documents with optional filters
- `getDocument(id)` - Get document metadata

## Usage Examples

### Basic Usage

```typescript
import { propertiesService } from './services/api';

// Get all properties
const properties = await propertiesService.getProperties();

// Get properties with filters
const vacantProperties = await propertiesService.getProperties({
  status: 'Vacant',
  search: 'Main Street',
});

// Create a property
const newProperty = await propertiesService.createProperty({
  name: 'Main Street Apartment',
  street: '123 Main St',
  city: 'Springfield',
  state: 'IL',
  zipCode: '62701',
  propertyType: 'Apartment',
  numberOfUnits: 1,
  numberOfBedrooms: 2,
  numberOfBathrooms: 1,
  status: 'Vacant',
});
```

### Error Handling

```typescript
import { propertiesService, ApiError } from './services/api';

try {
  const property = await propertiesService.getProperty(id);
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`API Error ${error.status}: ${error.message}`);

    // Handle specific error codes
    if (error.status === 404) {
      // Property not found
    } else if (error.status === 401) {
      // Not authenticated - AuthContext will handle this via event
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### File Upload

```typescript
import { documentsService } from './services/api';

const handleFileUpload = async (file: File, propertyId: string) => {
  try {
    const document = await documentsService.uploadDocument(
      file,
      'Property',
      propertyId
    );
    console.log('Document uploaded:', document);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

### File Download

```typescript
import { documentsService } from './services/api';

const handleDownload = async (documentId: string, fileName: string) => {
  try {
    const blob = await documentsService.downloadDocument(documentId);

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download failed:', error);
  }
};
```

### Transaction Summary

```typescript
import { transactionsService } from './services/api';

const getSummary = async () => {
  const summary = await transactionsService.getTransactionSummary({
    property_id: propertyId,
    from_date: '2024-01-01',
    to_date: '2024-12-31',
  });

  console.log(`Income: $${summary.total_income}`);
  console.log(`Expenses: $${summary.total_expense}`);
  console.log(`Net: $${summary.net}`);
};
```

## TypeScript Types

All request and response types are defined in `types/api.types.ts`:

- Request types: `Create*Request`, `Update*Request`
- Response types: Entity interfaces (`Property`, `Tenant`, `Lease`, etc.)
- Filter types: `PropertyFilters`, `TenantFilters`, etc.
- API response wrappers: `ApiSuccessResponse`, `ApiErrorResponse`
- Error class: `ApiError`

## Development Mode

When running in development mode (`import.meta.env.DEV`), the API client logs:

- All request details (method, URL, params, data)
- All response details (status, data)
- All error details (URL, method, status, message, data)
- Retry attempts for 5xx errors

Check the browser console for detailed API interaction logs.

## Integration with AuthContext

The API client integrates with the AuthContext through:

1. **Automatic credentials**: All requests include session cookies via `withCredentials: true`
2. **401 event emission**: On 401 errors, emits `api:unauthorized` event that AuthContext listens to
3. **Centralized auth**: AuthContext uses `authService` for login, logout, and getMe operations

## Error Handling Strategy

1. **Network errors**: Caught and wrapped in ApiError with status 0
2. **401 Unauthorized**: Emits event for AuthContext, throws ApiError
3. **403 Forbidden**: Throws ApiError with permission message
4. **404 Not Found**: Throws ApiError with specific error message from backend
5. **5xx Server errors**: Automatically retries once after 1-second delay, then throws ApiError
6. **Other 4xx errors**: Throws ApiError with backend error message

## Response Format

All API responses follow the backend format:

**Success:**
```typescript
{
  success: true,
  [entityName]: <entity> | <entity[]>,
  // or
  summary: <summary>,
  // or
  message: <string>
}
```

**Error:**
```typescript
{
  success: false,
  error: string | {
    code: string,
    message: string,
    details?: any
  }
}
```

## Testing

See `api/__tests__/api.test.md` for comprehensive manual test plan.

## Best Practices

1. **Always handle errors**: Wrap API calls in try-catch blocks
2. **Use TypeScript types**: Import and use provided types for type safety
3. **Check ApiError status**: Handle specific error codes appropriately
4. **Loading states**: Track loading state in components during API calls
5. **Optimistic updates**: Update UI optimistically, revert on error
6. **Debounce search**: Debounce search filters to avoid excessive API calls
