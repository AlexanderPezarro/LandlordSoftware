import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Calendar,
  Columns3,
  LayoutList,
  List,
  RefreshCw,
  X,
  AlertCircle,
} from 'lucide-react';
import { Calendar as BigCalendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enGB } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/calendar.css';
import { Container } from '../components/primitives/Container';
import { Button } from '../components/primitives/Button';
import { Select } from '../components/primitives/Select';
import { Card } from '../components/primitives/Card';
import { Spinner } from '../components/primitives/Spinner';
import { Tooltip } from '../components/primitives/Tooltip';
import { EventDialog } from '../components/composed/EventDialog';
import { PropertySelector } from '../components/composed/PropertySelector';
import { DateRangePicker } from '../components/composed/DateRangePicker';
import { ConfirmDialog } from '../components/composed/ConfirmDialog';
import { EventBadge } from '../components/composed/EventBadge';
import { eventsService } from '../services/api/events.service';
import { Event, CreateEventRequest, UpdateEventRequest, EventFilters } from '../types/api.types';
import { useAuth } from '../contexts/AuthContext';
import styles from './Events.module.scss';

const locales = {
  'en-GB': enGB,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Event;
}

const EVENT_TYPES = ['Inspection', 'Maintenance', 'Repair', 'Meeting', 'Rent Due Date', 'Lease Renewal', 'Viewing'] as const;

interface EventComponentProps {
  event: CalendarEvent;
}

const EventComponent: React.FC<EventComponentProps> = ({ event }) => {
  return (
    <div className={styles.eventInner}>
      <EventBadge event={event.resource} />
      {event.resource.completed && <span className={styles.eventCompleted}>✓</span>}
    </div>
  );
};

export const Events: React.FC = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
  const { canWrite } = useAuth();

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Confirm dialog states
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Calendar view state
  const [calendarView, setCalendarView] = useState<View>('month');

  // Filter states
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [completedFilter, setCompletedFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [dateRangeStart, setDateRangeStart] = useState<Date | null>(null);
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: EventFilters = {};

      if (propertyFilter !== 'all') {
        filters.propertyId = propertyFilter;
      }

      if (eventTypeFilter !== 'all') {
        filters.eventType = eventTypeFilter as typeof EVENT_TYPES[number];
      }

      if (completedFilter !== 'all') {
        filters.completed = completedFilter === 'completed';
      }

      if (dateRangeStart) {
        filters.fromDate = dateRangeStart.toISOString();
      }

      if (dateRangeEnd) {
        filters.toDate = dateRangeEnd.toISOString();
      }

      const data = await eventsService.getEvents(filters);
      setEvents(data);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [propertyFilter, eventTypeFilter, completedFilter, dateRangeStart, dateRangeEnd]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const calendarEvents: CalendarEvent[] = useMemo(() => {
    return events.map((event) => {
      const start = new Date(event.scheduledDate);
      const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour duration

      return {
        id: event.id,
        title: `${event.title}${event.completed ? ' ✓' : ''}`,
        start,
        end,
        resource: event,
      };
    });
  }, [events]);

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setDialogMode('create');
    setDialogOpen(true);
  };

  const handleSelectEvent = (calendarEvent: CalendarEvent) => {
    setSelectedEvent(calendarEvent.resource);
    setDialogMode('view');
    setDialogOpen(true);
  };

  const handleEditEvent = () => {
    if (selectedEvent) {
      setDialogMode('edit');
    }
  };

  const handleSaveEvent = async (data: CreateEventRequest | UpdateEventRequest) => {
    if (dialogMode === 'create') {
      await eventsService.createEvent(data as CreateEventRequest);
    } else if (dialogMode === 'edit' && selectedEvent) {
      await eventsService.updateEvent(selectedEvent.id, data as UpdateEventRequest);
    }
    await fetchEvents();
  };

  const handleDeleteClick = () => {
    setConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedEvent) return;

    try {
      await eventsService.deleteEvent(selectedEvent.id);
      setConfirmOpen(false);
      setDialogOpen(false);
      await fetchEvents();
    } catch (err) {
      console.error('Error deleting event:', err);
      setError('Failed to delete event. Please try again.');
    }
  };

  const handleToggleComplete = async () => {
    if (!selectedEvent) return;

    try {
      if (selectedEvent.completed) {
        // If already completed, update to mark as incomplete
        await eventsService.updateEvent(selectedEvent.id, {
          completed: false,
          completedDate: null,
        });
      } else {
        // Mark as complete using the dedicated endpoint
        await eventsService.markEventComplete(selectedEvent.id);
      }
      await fetchEvents();
      setDialogOpen(false);
    } catch (err) {
      console.error('Error toggling event completion:', err);
      setError('Failed to update event. Please try again.');
    }
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const eventType = event.resource.eventType;
    const completed = event.resource.completed;

    let backgroundColor = '#bdbdbd';

    switch (eventType) {
      case 'Maintenance':
        backgroundColor = '#ed6c02';
        break;
      case 'Inspection':
        backgroundColor = '#ff9800';
        break;
      case 'Repair':
        backgroundColor = '#d32f2f';
        break;
      case 'Viewing':
        backgroundColor = '#0288d1';
        break;
      case 'Meeting':
        backgroundColor = '#616161';
        break;
      case 'Rent Due Date':
        backgroundColor = '#2e7d32';
        break;
      case 'Lease Renewal':
        backgroundColor = '#1976d2';
        break;
    }

    return {
      style: {
        backgroundColor,
        opacity: completed ? 0.6 : 1,
        textDecoration: completed ? 'line-through' : 'none',
        borderRadius: '4px',
        border: 'none',
        color: 'white',
      },
    };
  };

  const handleClearFilters = () => {
    setPropertyFilter('all');
    setEventTypeFilter('all');
    setCompletedFilter('all');
    setDateRangeStart(null);
    setDateRangeEnd(null);
  };

  const hasActiveFilters =
    propertyFilter !== 'all' ||
    eventTypeFilter !== 'all' ||
    completedFilter !== 'all' ||
    dateRangeStart !== null ||
    dateRangeEnd !== null;

  return (
    <Container maxWidth="xl">
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Events Calendar</h1>
          {canWrite() && (
            <Button
              variant="primary"
              startIcon={<Plus size={18} />}
              onClick={handleCreateEvent}
              size={isMobile ? 'small' : 'medium'}
            >
              New Event
            </Button>
          )}
        </div>

        {error && (
          <div className={styles.errorAlert} role="alert">
            <AlertCircle size={18} />
            <span className={styles.errorAlertText}>{error}</span>
            <button
              className={styles.errorAlertClose}
              onClick={() => setError(null)}
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <Card className={styles.filtersCard}>
          <Card.Content>
            <p className={styles.filtersTitle}>Filters</p>

            <div className={styles.filtersContent}>
              <div className={styles.filterRow}>
                <div className={styles.filterField}>
                  <PropertySelector
                    value={propertyFilter}
                    onChange={setPropertyFilter}
                    includeAllOption={true}
                  />
                </div>

                <div className={styles.filterField}>
                  <Select
                    label="Event Type"
                    value={eventTypeFilter}
                    onChange={(value) => setEventTypeFilter(value)}
                    options={[
                      { value: 'all', label: 'All Types' },
                      ...EVENT_TYPES.map((type) => ({ value: type, label: type })),
                    ]}
                    size="small"
                    fullWidth
                  />
                </div>

                <div className={styles.filterField}>
                  <Select
                    label="Status"
                    value={completedFilter}
                    onChange={(value) => setCompletedFilter(value as typeof completedFilter)}
                    options={[
                      { value: 'all', label: 'All Status' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'completed', label: 'Completed' },
                    ]}
                    size="small"
                    fullWidth
                  />
                </div>
              </div>

              <DateRangePicker
                startDate={dateRangeStart}
                endDate={dateRangeEnd}
                onStartChange={setDateRangeStart}
                onEndChange={setDateRangeEnd}
                label="Filter by Date Range"
              />

              {hasActiveFilters && (
                <div className={styles.clearFiltersRow}>
                  <Button variant="text" size="small" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </Card.Content>
        </Card>

        <Card className={styles.controlsCard}>
          <Card.Content>
            <div className={styles.controlsRow}>
              <p className={styles.eventsCount}>
                Showing {events.length} event{events.length !== 1 ? 's' : ''}
              </p>

              <div className={styles.viewControls}>
                <Tooltip content="Refresh">
                  <button
                    className={styles.refreshButton}
                    onClick={fetchEvents}
                    disabled={loading}
                    aria-label="Refresh events"
                  >
                    <RefreshCw size={16} />
                  </button>
                </Tooltip>

                <Button
                  size="small"
                  variant={calendarView === 'month' ? 'primary' : 'secondary'}
                  onClick={() => setCalendarView('month')}
                  startIcon={<Calendar size={14} />}
                >
                  Month
                </Button>
                <Button
                  size="small"
                  variant={calendarView === 'week' ? 'primary' : 'secondary'}
                  onClick={() => setCalendarView('week')}
                  startIcon={<Columns3 size={14} />}
                >
                  Week
                </Button>
                <Button
                  size="small"
                  variant={calendarView === 'day' ? 'primary' : 'secondary'}
                  onClick={() => setCalendarView('day')}
                  startIcon={<LayoutList size={14} />}
                >
                  Day
                </Button>
                <Button
                  size="small"
                  variant={calendarView === 'agenda' ? 'primary' : 'secondary'}
                  onClick={() => setCalendarView('agenda')}
                  startIcon={<List size={14} />}
                >
                  Agenda
                </Button>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card className={styles.calendarCard}>
          <div className={styles.calendarWrapper}>
            {loading ? (
              <div className={styles.loadingContainer}>
                <Spinner />
              </div>
            ) : (
              <BigCalendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                view={calendarView}
                onView={setCalendarView}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={eventStyleGetter}
                components={{
                  event: EventComponent,
                }}
                popup
                tooltipAccessor={(event) => event.resource.description || event.title}
              />
            )}
          </div>
        </Card>

        <EventDialog
          open={dialogOpen}
          mode={dialogMode}
          event={selectedEvent}
          onClose={() => {
            setDialogOpen(false);
            setSelectedEvent(null);
          }}
          onSave={handleSaveEvent}
          onDelete={canWrite() ? handleDeleteClick : undefined}
          onToggleComplete={canWrite() ? handleToggleComplete : undefined}
          onEdit={canWrite() ? handleEditEvent : undefined}
        />

        <ConfirmDialog
          open={confirmOpen}
          title="Delete Event"
          message="Are you sure you want to delete this event? This action cannot be undone."
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmOpen(false)}
        />
      </div>
    </Container>
  );
};
