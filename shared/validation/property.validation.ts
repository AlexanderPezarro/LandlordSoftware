import { z } from 'zod';

// UK Postcode validation regex
// Supports formats: AA9A 9AA, A9A 9AA, A9 9AA, A99 9AA, AA9 9AA, AA99 9AA
const ukPostcodeRegex = /^([A-Z]{1,2}\d{1,2}[A-Z]?)\s*(\d[A-Z]{2})$/i;

// Property Type Enum
export const PropertyTypeSchema = z.enum([
  'House',
  'Flat',
  'Studio',
  'Bungalow',
  'Terraced',
  'Semi-Detached',
  'Detached',
  'Maisonette',
  'Commercial',
]);

// Property Status Enum
export const PropertyStatusSchema = z.enum([
  'Available',
  'Occupied',
  'Under Maintenance',
  'For Sale',
]);

// Base Property Schema (common fields)
const basePropertySchema = {
  name: z.string().min(1, 'Property name is required'),
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  county: z.string().min(1, 'County is required'),
  postcode: z.string().regex(ukPostcodeRegex, 'Invalid UK postcode format'),
  propertyType: PropertyTypeSchema,
  purchaseDate: z.coerce.date().optional().nullable(),
  purchasePrice: z.number().positive('Purchase price must be positive').optional().nullable(),
  status: PropertyStatusSchema,
  notes: z.string().optional().nullable(),
};

// Create Property Schema (without id, timestamps)
export const CreatePropertySchema = z.object(basePropertySchema);

// Update Property Schema (all fields optional except id)
export const UpdatePropertySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Property name is required').optional(),
  street: z.string().min(1, 'Street address is required').optional(),
  city: z.string().min(1, 'City is required').optional(),
  county: z.string().min(1, 'County is required').optional(),
  postcode: z.string().regex(ukPostcodeRegex, 'Invalid UK postcode format').optional(),
  propertyType: PropertyTypeSchema.optional(),
  purchaseDate: z.coerce.date().optional().nullable(),
  purchasePrice: z.number().positive('Purchase price must be positive').optional().nullable(),
  status: PropertyStatusSchema.optional(),
  notes: z.string().optional().nullable(),
});

// Full Property Schema (with all fields including timestamps)
export const PropertySchema = z.object({
  id: z.string().uuid(),
  ...basePropertySchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Inferred TypeScript types
export type PropertyType = z.infer<typeof PropertyTypeSchema>;
export type PropertyStatus = z.infer<typeof PropertyStatusSchema>;
export type CreateProperty = z.infer<typeof CreatePropertySchema>;
export type UpdateProperty = z.infer<typeof UpdatePropertySchema>;
export type Property = z.infer<typeof PropertySchema>;
