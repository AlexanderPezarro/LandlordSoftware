import { api } from '../api';
import type {
  Event,
  CreateEventRequest,
  UpdateEventRequest,
  EventFilters,
  EventsResponse,
  EventResponse,
} from '../../types/api.types';

export const eventsService = {
  /**
   * Get all events with optional filters
   * @param filters - Optional filters for propertyId, eventType, completed, and date range
   * @returns Array of events
   */
  async getEvents(filters?: EventFilters): Promise<Event[]> {
    const response = await api.get<EventsResponse>('/events', {
      params: filters,
    });
    return response.data.events;
  },

  /**
   * Get a single event by ID
   * @param id - Event ID
   * @returns Event details
   */
  async getEvent(id: string): Promise<Event> {
    const response = await api.get<EventResponse>(`/events/${id}`);
    return response.data.event;
  },

  /**
   * Create a new event
   * @param data - Event data
   * @returns Created event
   */
  async createEvent(data: CreateEventRequest): Promise<Event> {
    const response = await api.post<EventResponse>('/events', data);
    return response.data.event;
  },

  /**
   * Update an existing event
   * @param id - Event ID
   * @param data - Updated event data
   * @returns Updated event
   */
  async updateEvent(id: string, data: UpdateEventRequest): Promise<Event> {
    const response = await api.put<EventResponse>(`/events/${id}`, data);
    return response.data.event;
  },

  /**
   * Delete an event (hard delete)
   * @param id - Event ID
   */
  async deleteEvent(id: string): Promise<void> {
    await api.delete(`/events/${id}`);
  },

  /**
   * Mark an event as complete
   * @param id - Event ID
   * @returns Updated event with completed flag and completedDate
   */
  async markEventComplete(id: string): Promise<Event> {
    const response = await api.patch<EventResponse>(`/events/${id}/complete`);
    return response.data.event;
  },
};
