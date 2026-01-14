import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  CircularProgress,
  Typography,
  IconButton,
  Stack,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { enGB } from 'date-fns/locale';
import { format } from 'date-fns';
import PropertySelector from '../shared/PropertySelector';
import { Event, CreateEventRequest, UpdateEventRequest } from '../../types/api.types';

interface EventDialogProps {
  open: boolean;
  mode: 'create' | 'edit' | 'view';
  event: Event | null;
  onClose: () => void;
  onSave: (data: CreateEventRequest | UpdateEventRequest) => Promise<void>;
  onDelete?: () => void;
  onToggleComplete?: () => void;
  onEdit?: () => void;
}

const EVENT_TYPES = ['Maintenance', 'Inspection', 'Showing', 'Meeting', 'Other'] as const;

const EventDialog: React.FC<EventDialogProps> = ({
  open,
  mode,
  event,
  onClose,
  onSave,
  onDelete,
  onToggleComplete,
  onEdit,
}) => {
  const [propertyId, setPropertyId] = useState('');
  const [eventType, setEventType] = useState<typeof EVENT_TYPES[number]>('Maintenance');
  const [scheduledDate, setScheduledDate] = useState<Date | null>(new Date());
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && event && (mode === 'edit' || mode === 'view')) {
      setPropertyId(event.propertyId);
      setEventType(event.eventType);
      setScheduledDate(new Date(event.scheduledDate));
      setDescription(event.description || '');
    } else if (open && mode === 'create') {
      setPropertyId('');
      setEventType('Maintenance');
      setScheduledDate(new Date());
      setDescription('');
    }
    setErrors({});
  }, [open, event, mode]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!propertyId || propertyId === 'all') {
      newErrors.propertyId = 'Please select a property';
    }

    if (!eventType) {
      newErrors.eventType = 'Please select an event type';
    }

    if (!scheduledDate) {
      newErrors.scheduledDate = 'Please select a date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      const data: CreateEventRequest | UpdateEventRequest = {
        propertyId,
        eventType,
        scheduledDate: scheduledDate!.toISOString(),
        description: description.trim() || null,
      };

      await onSave(data);
      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (mode === 'create') return 'Create New Event';
    if (mode === 'edit') return 'Edit Event';
    return 'Event Details';
  };

  const isViewMode = mode === 'view';

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
      <Dialog
        open={open}
        onClose={loading ? undefined : onClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">{getTitle()}</Typography>
            <IconButton
              onClick={onClose}
              disabled={loading}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {event && mode === 'view' && (
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  label={event.completed ? 'Completed' : 'Pending'}
                  color={event.completed ? 'success' : 'default'}
                  size="small"
                  icon={event.completed ? <CheckCircleIcon /> : <UncheckedIcon />}
                />
                {event.completedDate && (
                  <Typography variant="caption" color="text.secondary">
                    Completed on {format(new Date(event.completedDate), 'PPP')}
                  </Typography>
                )}
              </Stack>
            </Box>
          )}

          <Stack spacing={3}>
            <PropertySelector
              value={propertyId}
              onChange={setPropertyId}
              includeAllOption={false}
            />
            {errors.propertyId && (
              <Typography variant="caption" color="error">
                {errors.propertyId}
              </Typography>
            )}

            <TextField
              select
              fullWidth
              label="Event Type"
              value={eventType}
              onChange={(e) => setEventType(e.target.value as typeof EVENT_TYPES[number])}
              disabled={isViewMode}
              error={!!errors.eventType}
              helperText={errors.eventType}
            >
              {EVENT_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>

            <DateTimePicker
              label="Scheduled Date & Time"
              value={scheduledDate}
              onChange={setScheduledDate}
              disabled={isViewMode}
              format="dd/MM/yyyy HH:mm"
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: !!errors.scheduledDate,
                  helperText: errors.scheduledDate,
                },
              }}
            />

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isViewMode}
              placeholder="Add any notes or details about this event..."
            />

            {event && mode === 'view' && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Created: {format(new Date(event.createdAt), 'PPP')}
                </Typography>
                <br />
                <Typography variant="caption" color="text.secondary">
                  Last updated: {format(new Date(event.updatedAt), 'PPP')}
                </Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          {mode === 'view' && event && (
            <>
              {onToggleComplete && (
                <Button
                  onClick={onToggleComplete}
                  color={event.completed ? 'inherit' : 'success'}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={16} /> : (event.completed ? <UncheckedIcon /> : <CheckCircleIcon />)}
                >
                  {event.completed ? 'Mark Incomplete' : 'Mark Complete'}
                </Button>
              )}
              {onDelete && (
                <Button
                  onClick={onDelete}
                  color="error"
                  disabled={loading}
                >
                  Delete
                </Button>
              )}
              <Box sx={{ flex: 1 }} />
              {onEdit && (
                <Button
                  onClick={onEdit}
                  variant="contained"
                  disabled={loading}
                >
                  Edit
                </Button>
              )}
            </>
          )}

          <Button
            onClick={onClose}
            disabled={loading}
            color="inherit"
          >
            {mode === 'view' ? 'Close' : 'Cancel'}
          </Button>

          {mode !== 'view' && (
            <Button
              onClick={handleSave}
              disabled={loading}
              variant="contained"
              startIcon={loading ? <CircularProgress size={16} /> : undefined}
            >
              {loading ? 'Saving...' : 'Save'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default EventDialog;
