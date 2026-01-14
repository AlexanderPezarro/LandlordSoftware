import { z } from 'zod';
export const EventTypeSchema = z.enum([
    'Inspection',
    'Maintenance',
    'Repair',
    'Meeting',
    'Rent Due Date',
    'Lease Renewal',
    'Viewing',
]);
const baseEventSchema = {
    propertyId: z.string().uuid('Invalid property ID'),
    eventType: EventTypeSchema,
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional().nullable(),
    scheduledDate: z.coerce.date(),
    completed: z.boolean().default(false),
    completedDate: z.coerce.date().optional().nullable(),
};
export const CreateEventSchema = z.object({
    propertyId: baseEventSchema.propertyId,
    eventType: baseEventSchema.eventType,
    title: baseEventSchema.title,
    description: baseEventSchema.description,
    scheduledDate: baseEventSchema.scheduledDate,
    completed: baseEventSchema.completed.optional(),
    completedDate: baseEventSchema.completedDate,
});
export const UpdateEventSchema = z.object({
    id: z.string().uuid(),
    propertyId: z.string().uuid('Invalid property ID').optional(),
    eventType: EventTypeSchema.optional(),
    title: z.string().min(1, 'Title is required').optional(),
    description: z.string().optional().nullable(),
    scheduledDate: z.coerce.date().optional(),
    completed: z.boolean().optional(),
    completedDate: z.coerce.date().optional().nullable(),
});
export const EventSchema = z.object({
    id: z.string().uuid(),
    ...baseEventSchema,
    createdAt: z.date(),
    updatedAt: z.date(),
});
export const EventQueryParamsSchema = z.object({
    propertyId: z.string().uuid('Invalid property ID').optional(),
    eventType: EventTypeSchema.optional(),
    completed: z
        .string()
        .transform((val) => val === 'true')
        .pipe(z.boolean())
        .optional(),
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
});
