import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import prisma from '../db/client.js';
import {
  CreateEventSchema,
  UpdateEventSchema,
  EventQueryParamsSchema,
} from '../../../shared/validation/event.validation.js';
import { z } from 'zod';

const router = Router();

// GET /api/events - List events with filtering
router.get('/', async (req, res) => {
  try {
    // Validate query parameters
    const validationResult = EventQueryParamsSchema.safeParse(req.query);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.issues[0].message,
      });
    }

    const { propertyId, eventType, completed, fromDate, toDate } = validationResult.data;

    // Build filter object
    const where: any = {};

    if (propertyId) {
      where.propertyId = propertyId;
    }

    if (eventType) {
      where.eventType = eventType;
    }

    if (completed !== undefined) {
      where.completed = completed;
    }

    if (fromDate || toDate) {
      where.scheduledDate = {};
      if (fromDate) {
        where.scheduledDate.gte = fromDate;
      }
      if (toDate) {
        where.scheduledDate.lte = toDate;
      }
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: { scheduledDate: 'asc' },
    });

    return res.json({
      success: true,
      events,
    });
  } catch (error) {
    console.error('Get events error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while fetching events',
    });
  }
});

// GET /api/events/:id - Get single event
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID format',
      });
    }

    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    return res.json({
      success: true,
      event,
    });
  } catch (error) {
    console.error('Get event error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while fetching event',
    });
  }
});

// POST /api/events - Create event (requires auth)
router.post('/', requireAuth, async (req, res) => {
  try {
    // Validate request body
    const validationResult = CreateEventSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.issues[0].message,
      });
    }

    const eventData = validationResult.data;

    // Create event
    const event = await prisma.event.create({
      data: eventData,
    });

    return res.status(201).json({
      success: true,
      event,
    });
  } catch (error) {
    console.error('Create event error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while creating event',
    });
  }
});

// PUT /api/events/:id - Update event (requires auth)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID format',
      });
    }

    // Validate request body with id
    const validationResult = UpdateEventSchema.safeParse({
      id,
      ...req.body,
    });

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.issues[0].message,
      });
    }

    // Check if event exists
    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    // Extract id from validated data and use rest for update
    const { id: _, ...updateData } = validationResult.data;

    // Update event
    const event = await prisma.event.update({
      where: { id },
      data: updateData,
    });

    return res.json({
      success: true,
      event,
    });
  } catch (error) {
    console.error('Update event error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while updating event',
    });
  }
});

// PATCH /api/events/:id/complete - Mark event as completed (requires auth)
router.patch('/:id/complete', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID format',
      });
    }

    // Check if event exists
    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    // Mark event as completed with current timestamp
    const event = await prisma.event.update({
      where: { id },
      data: {
        completed: true,
        completedDate: new Date(),
      },
    });

    return res.json({
      success: true,
      event,
    });
  } catch (error) {
    console.error('Complete event error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while completing event',
    });
  }
});

// DELETE /api/events/:id - Hard delete event (requires auth)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID format',
      });
    }

    // Check if event exists
    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    // Hard delete event
    await prisma.event.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error('Delete event error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while deleting event',
    });
  }
});

export default router;
