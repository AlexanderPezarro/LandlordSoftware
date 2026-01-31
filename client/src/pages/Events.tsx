import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Stack,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  CalendarMonth as CalendarIcon,
  ViewWeek as WeekIcon,
  ViewDay as DayIcon,
  ViewAgenda as AgendaIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enGB } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/calendar.css';
import { eventsService } from '../services/api/events.service';
import { Event, CreateEventRequest, UpdateEventRequest, EventFilters } from '../types/api.types';
import EventDialog from '../components/events/EventDialog';
import PropertySelector from '../components/shared/PropertySelector';
import DateRangePicker from '../components/shared/DateRangePicker';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import EventBadge from '../components/shared/EventBadge';
import { useAuth } from '../contexts/AuthContext';

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
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflow: 'hidden' }}>
      <EventBadge event={event.resource} />
      {event.resource.completed && <Typography variant="caption" sx={{ ml: 0.5 }}>✓</Typography>}
    </Box>
  );
};

export const Events: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { canWrite } = useAuth();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Confirm dialog states
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
      setDeleteLoading(true);
      await eventsService.deleteEvent(selectedEvent.id);
      setConfirmOpen(false);
      setDialogOpen(false);
      await fetchEvents();
    } catch (err) {
      console.error('Error deleting event:', err);
      setError('Failed to delete event. Please try again.');
    } finally {
      setDeleteLoading(false);
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

    let backgroundColor = theme.palette.grey[400];

    switch (eventType) {
      case 'Maintenance':
        backgroundColor = theme.palette.warning.main;
        break;
      case 'Inspection':
        backgroundColor = theme.palette.warning.light;
        break;
      case 'Repair':
        backgroundColor = theme.palette.error.main;
        break;
      case 'Viewing':
        backgroundColor = theme.palette.info.main;
        break;
      case 'Meeting':
        backgroundColor = theme.palette.secondary.main;
        break;
      case 'Rent Due Date':
        backgroundColor = theme.palette.success.main;
        break;
      case 'Lease Renewal':
        backgroundColor = theme.palette.primary.main;
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
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Events Calendar
          </Typography>
          {canWrite() && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateEvent}
              size={isMobile ? 'small' : 'medium'}
            >
              New Event
            </Button>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Filters
          </Typography>

          <Stack spacing={2}>
            <Stack direction={isMobile ? 'column' : 'row'} spacing={2}>
              <PropertySelector
                value={propertyFilter}
                onChange={setPropertyFilter}
                includeAllOption={true}
              />

              <TextField
                select
                fullWidth
                size="small"
                label="Event Type"
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
              >
                <MenuItem value="all">All Types</MenuItem>
                {EVENT_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                fullWidth
                size="small"
                label="Status"
                value={completedFilter}
                onChange={(e) => setCompletedFilter(e.target.value as typeof completedFilter)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </TextField>
            </Stack>

            <DateRangePicker
              startDate={dateRangeStart}
              endDate={dateRangeEnd}
              onStartDateChange={setDateRangeStart}
              onEndDateChange={setDateRangeEnd}
              label="Filter by Date Range"
            />

            {hasActiveFilters && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button size="small" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              </Box>
            )}
          </Stack>
        </Paper>

        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap">
            <Typography variant="subtitle2">
              Showing {events.length} event{events.length !== 1 ? 's' : ''}
            </Typography>

            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="Refresh">
                <IconButton onClick={fetchEvents} size="small" disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>

              <Button
                size="small"
                variant={calendarView === 'month' ? 'contained' : 'outlined'}
                onClick={() => setCalendarView('month')}
                startIcon={<CalendarIcon />}
              >
                Month
              </Button>
              <Button
                size="small"
                variant={calendarView === 'week' ? 'contained' : 'outlined'}
                onClick={() => setCalendarView('week')}
                startIcon={<WeekIcon />}
              >
                Week
              </Button>
              <Button
                size="small"
                variant={calendarView === 'day' ? 'contained' : 'outlined'}
                onClick={() => setCalendarView('day')}
                startIcon={<DayIcon />}
              >
                Day
              </Button>
              <Button
                size="small"
                variant={calendarView === 'agenda' ? 'contained' : 'outlined'}
                onClick={() => setCalendarView('agenda')}
                startIcon={<AgendaIcon />}
              >
                Agenda
              </Button>
            </Stack>
          </Stack>
        </Paper>

        <Paper sx={{ p: 2, height: isMobile ? 500 : 700 }}>
          {loading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            <Calendar
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
        </Paper>

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
          loading={deleteLoading}
        />
      </Box>
    </Container>
  );
};
