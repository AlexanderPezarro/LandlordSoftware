# Validation Schemas

This directory contains comprehensive Zod validation schemas for all entities in the landlord management system. These schemas are shared between the frontend and backend to ensure consistent validation across the application.

## Structure

- `property.validation.ts` - Property entity schemas
- `tenant.validation.ts` - Tenant entity schemas
- `lease.validation.ts` - Lease entity schemas
- `transaction.validation.ts` - Transaction entity schemas
- `event.validation.ts` - Event entity schemas
- `document.validation.ts` - Document entity schemas
- `index.ts` - Barrel export file for convenient imports
- `validation.test.ts` - Test file for validation verification

## Schema Variants

Each entity has three schema variants:

1. **Create Schema** - For creating new entities (excludes id and timestamps)
2. **Update Schema** - For updating entities (all fields optional except id)
3. **Full/Response Schema** - Complete entity with all fields including timestamps

## Validation Rules

### Format Validations

#### UK Postcode
Supports these formats:
- AA9A 9AA (e.g., EC1A 1BB)
- A9A 9AA (e.g., W1A 0AX)
- A9 9AA (e.g., M1 1AE)
- A99 9AA (e.g., B33 8TH)
- AA9 9AA (e.g., CR2 6XH)
- AA99 9AA (e.g., DN55 1PT)

#### Email
Standard email format validation

#### UK Phone Numbers
Lenient validation accepting:
- Mobile: 07123456789, +447123456789, +44 7123 456789
- Landline: 02012345678, +442012345678, +44 20 1234 5678
- With or without spaces
- With or without +44 country code

### Business Logic Validations

#### Date Ranges
- Leases: `startDate` must be <= `endDate`
- Validated using Zod's `.refine()` method

#### Positive Decimals
- Financial amounts (rent, deposit, transaction amount) must be positive numbers

### Enum Values

#### Property Types
`House`, `Flat`, `Studio`, `Bungalow`, `Terraced`, `Semi-Detached`, `Detached`, `Maisonette`, `Commercial`

#### Status Enums
- **Property**: `Available`, `Occupied`, `Under Maintenance`, `For Sale`
- **Tenant**: `Prospective`, `Active`, `Former`
- **Lease**: `Draft`, `Active`, `Expired`, `Terminated`

#### Transaction Types & Categories
- **Types**: `Income`, `Expense`
- **Income Categories**: `Rent`, `Security Deposit`, `Late Fee`, `Lease Fee`
- **Expense Categories**: `Maintenance`, `Repair`, `Utilities`, `Insurance`, `Property Tax`, `Management Fee`, `Legal Fee`, `Other`
- Note: Category validation ensures income categories are only used with Income type and expense categories with Expense type

#### Event Types
`Inspection`, `Maintenance`, `Repair`, `Meeting`, `Rent Due Date`, `Lease Renewal`, `Viewing`

### File Validation

#### Allowed MIME Types
- `image/jpeg` - JPG images
- `image/png` - PNG images
- `application/pdf` - PDF documents

#### Size Limit
Maximum file size: 10MB (10,485,760 bytes)

## Usage Examples

### Backend (Express Middleware)

```typescript
import { CreatePropertySchema } from '../shared/validation/index.js';
import { Request, Response, NextFunction } from 'express';

// Validation middleware
export const validateProperty = (req: Request, res: Response, next: NextFunction) => {
  try {
    CreatePropertySchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    next(error);
  }
};

// Route handler
app.post('/api/properties', validateProperty, async (req, res) => {
  const validatedData = CreatePropertySchema.parse(req.body);
  // ... create property
});
```

### Frontend (React Hook Form with Zod Resolver)

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreatePropertySchema, CreateProperty } from '../../shared/validation/index.js';

function PropertyForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateProperty>({
    resolver: zodResolver(CreatePropertySchema),
  });

  const onSubmit = (data: CreateProperty) => {
    // Data is already validated
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}
      {/* ... other fields */}
    </form>
  );
}
```

### Type Inference

All schemas export inferred TypeScript types:

```typescript
import {
  CreateProperty,
  UpdateProperty,
  Property,
  PropertyType,
  PropertyStatus
} from '../../shared/validation/index.js';

// Use types in function signatures
function createProperty(data: CreateProperty): Promise<Property> {
  // ...
}

// Use enum types
const propertyType: PropertyType = 'Flat';
const status: PropertyStatus = 'Available';
```

## Testing

Run the validation tests:

```bash
npx tsx shared/validation/validation.test.ts
```

The test file covers:
- Valid data passes validation
- Invalid data is correctly rejected
- Format validations (postcode, email, phone)
- Business logic validations (date ranges, positive amounts)
- Enum validations
- Custom refinements (transaction category matching, lease date ranges)

## Adding New Validations

When adding new validation rules:

1. Update the appropriate schema file
2. Add tests in `validation.test.ts`
3. Update this README with the new rules
4. Run `npx tsc --noEmit` to check for TypeScript errors
5. Run the tests to verify everything works

## Dependencies

- `zod` - Schema validation library
- Compatible with React Hook Form via `@hookform/resolvers`
