import { z } from 'zod';
const ukPostcodeRegex = /^([A-Z]{1,2}\d{1,2}[A-Z]?)\s*(\d[A-Z]{2})$/i;
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
export const PropertyStatusSchema = z.enum([
    'Available',
    'Occupied',
    'Under Maintenance',
    'For Sale',
]);
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
export const CreatePropertySchema = z.object(basePropertySchema);
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
export const PropertySchema = z.object({
    id: z.string().uuid(),
    ...basePropertySchema,
    createdAt: z.date(),
    updatedAt: z.date(),
});
export const PropertyQueryParamsSchema = z.object({
    status: PropertyStatusSchema.optional(),
    propertyType: PropertyTypeSchema.optional(),
    search: z.string().optional(),
});
