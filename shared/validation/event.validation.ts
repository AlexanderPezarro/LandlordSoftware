import { z } from 'zod';

// Event Type Enum
export const EventTypeSchema = z.enum([
  'Inspection',
  'Maintenance',
  'Repair',
  'Meeting',
  'Rent Due Date',
  'Lease Renewal',
  'Viewing',
]);

// Base Event Schema (common fields)
const baseEventSchema = {
  propertyId: z.string().uuid('Invalid property ID'),
  eventType: EventTypeSchema,
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  scheduledDate: z.coerce.date(),
  completed: z.boolean().default(false),
  completedDate: z.coerce.date().optional().nullable(),
};

// Create Event Schema (without id, timestamps)
export const CreateEventSchema = z.object({
  propertyId: baseEventSchema.propertyId,
  eventType: baseEventSchema.eventType,
  title: baseEventSchema.title,
  description: baseEventSchema.description,
  scheduledDate: baseEventSchema.scheduledDate,
  completed: baseEventSchema.completed.optional(),
  completedDate: baseEventSchema.completedDate,
});

// Update Event Schema (all fields optional except id)
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

// Full Event Schema (with all fields including timestamps)
export const EventSchema = z.object({
  id: z.string().uuid(),
  ...baseEventSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Inferred TypeScript types
export type EventType = z.infer<typeof EventTypeSchema>;
export type CreateEvent = z.infer<typeof CreateEventSchema>;
export type UpdateEvent = z.infer<typeof UpdateEventSchema>;
export type Event = z.infer<typeof EventSchema>;
