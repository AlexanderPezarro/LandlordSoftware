import { useState, useEffect } from 'react';
import {
  X,
  CheckCircle,
  Circle,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { Dialog } from '../../primitives/Dialog';
import { TextField } from '../../primitives/TextField';
import { Select } from '../../primitives/Select';
import type { SelectOption } from '../../primitives/Select';
import { DatePicker } from '../../primitives/DatePicker';
import { Button } from '../../primitives/Button';
import { Chip } from '../../primitives/Chip';
import { PropertySelector } from '../PropertySelector';
import type {
  Event,
  CreateEventRequest,
  UpdateEventRequest,
} from '../../../types/api.types';
import styles from './EventDialog.module.scss';

const EVENT_TYPES = [
  'Inspection',
  'Maintenance',
  'Repair',
  'Meeting',
  'Rent Due Date',
  'Lease Renewal',
  'Viewing',
] as const;

type EventType = (typeof EVENT_TYPES)[number];

const EVENT_TYPE_OPTIONS: SelectOption[] = EVENT_TYPES.map((type) => ({
  value: type,
  label: type,
}));

export interface EventDialogProps {
  open: boolean;
  mode: 'create' | 'edit' | 'view';
  event: Event | null;
  onClose: () => void;
  onSave: (data: CreateEventRequest | UpdateEventRequest) => Promise<void>;
  onDelete?: () => void;
  onToggleComplete?: () => void;
  onEdit?: () => void;
}

export function EventDialog({
  open,
  mode,
  event,
  onClose,
  onSave,
  onDelete,
  onToggleComplete,
  onEdit,
}: EventDialogProps) {
  const [propertyId, setPropertyId] = useState('');
  const [eventType, setEventType] = useState<EventType>('Inspection');
  const [title, setTitle] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date | null>(new Date());
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (open && event && (mode === 'edit' || mode === 'view')) {
      setPropertyId(event.propertyId);
      setEventType(event.eventType);
      setTitle(event.title || '');
      setScheduledDate(new Date(event.scheduledDate));
      setDescription(event.description || '');
    } else if (open && mode === 'create') {
      setPropertyId('');
      setEventType('Inspection');
      setTitle('');
      setScheduledDate(new Date());
      setDescription('');
    }
    setErrors({});
    setSaveError('');
  }, [open, event, mode]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!propertyId || propertyId === 'all') {
      newErrors.propertyId = 'Please select a property';
    }

    if (!eventType) {
      newErrors.eventType = 'Please select an event type';
    }

    if (!title.trim()) {
      newErrors.title = 'Title is required';
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
      setSaveError('');

      const data: CreateEventRequest | UpdateEventRequest = {
        propertyId,
        eventType,
        title: title.trim(),
        scheduledDate: scheduledDate!.toISOString(),
        description: description.trim() || null,
      };

      await onSave(data);
      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to save event. Please try again.';
      setSaveError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getDialogTitle = () => {
    if (mode === 'create') return 'Create New Event';
    if (mode === 'edit') return 'Edit Event';
    return 'Event Details';
  };

  const isViewMode = mode === 'view';

  return (
    <Dialog
      open={open}
      onClose={loading ? () => {} : onClose}
      size="medium"
      disableBackdropClose={loading}
    >
      <Dialog.Title>
        <span className={styles.titleRow}>
          <span className={styles.titleText}>{getDialogTitle()}</span>
          <Button
            variant="icon"
            size="small"
            onClick={onClose}
            disabled={loading}
            aria-label="Close dialog"
          >
            <X size={18} />
          </Button>
        </span>
      </Dialog.Title>

      <Dialog.Content>
        {saveError && (
          <div className={styles.alert}>
            <AlertCircle size={16} className={styles.alertIcon} />
            <span className={styles.alertText}>{saveError}</span>
            <Button
              variant="icon"
              size="small"
              onClick={() => setSaveError('')}
              aria-label="Dismiss error"
            >
              <X size={14} />
            </Button>
          </div>
        )}

        {event && mode === 'view' && (
          <div className={styles.statusRow}>
            <Chip
              label={event.completed ? 'Completed' : 'Pending'}
              color={event.completed ? 'success' : 'default'}
              size="small"
            />
            {event.completedDate && (
              <span className={styles.completedDate}>
                Completed on {format(new Date(event.completedDate), 'PPP')}
              </span>
            )}
          </div>
        )}

        <div className={styles.fields}>
          <div className={styles.fieldGroup}>
            <PropertySelector
              value={propertyId}
              onChange={setPropertyId}
              includeAllOption={false}
              disabled={isViewMode}
            />
            {errors.propertyId && (
              <span className={styles.fieldError}>{errors.propertyId}</span>
            )}
          </div>

          <Select
            label="Event Type"
            name="event-type"
            options={EVENT_TYPE_OPTIONS}
            value={eventType}
            onChange={(val) => setEventType(val as EventType)}
            disabled={isViewMode}
            error={!!errors.eventType}
            helperText={errors.eventType}
            fullWidth
          />

          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isViewMode}
            error={!!errors.title}
            helperText={errors.title}
            placeholder="Enter a title for this event"
            required
            fullWidth
          />

          <DatePicker
            label="Scheduled Date & Time"
            value={scheduledDate}
            onChange={setScheduledDate}
            disabled={isViewMode}
            showTimeSelect
            dateFormat="dd/MM/yyyy HH:mm"
            error={!!errors.scheduledDate}
            helperText={errors.scheduledDate}
          />

          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isViewMode}
            placeholder="Add any notes or details about this event..."
            multiline
            rows={4}
            fullWidth
          />

          {event && mode === 'view' && (
            <div className={styles.timestamps}>
              <span className={styles.timestamp}>
                Created: {format(new Date(event.createdAt), 'PPP')}
              </span>
              <span className={styles.timestamp}>
                Last updated: {format(new Date(event.updatedAt), 'PPP')}
              </span>
            </div>
          )}
        </div>
      </Dialog.Content>

      <Dialog.Actions>
        {mode === 'view' && event && (
          <>
            {onToggleComplete && (
              <Button
                variant="secondary"
                onClick={onToggleComplete}
                disabled={loading}
                startIcon={
                  loading ? (
                    <Loader2 size={16} className={styles.spinIcon} />
                  ) : event.completed ? (
                    <Circle size={16} />
                  ) : (
                    <CheckCircle size={16} />
                  )
                }
              >
                {event.completed ? 'Mark Incomplete' : 'Mark Complete'}
              </Button>
            )}
            {onDelete && (
              <Button
                variant="secondary"
                className={styles.deleteButton}
                onClick={onDelete}
                disabled={loading}
              >
                Delete
              </Button>
            )}
            <span className={styles.spacer} />
            {onEdit && (
              <Button
                variant="primary"
                onClick={onEdit}
                disabled={loading}
              >
                Edit
              </Button>
            )}
          </>
        )}

        <Button
          variant="text"
          onClick={onClose}
          disabled={loading}
        >
          {mode === 'view' ? 'Close' : 'Cancel'}
        </Button>

        {mode !== 'view' && (
          <Button
            variant="primary"
            onClick={handleSave}
            loading={loading}
          >
            {loading ? 'Saving...' : 'Save'}
          </Button>
        )}
      </Dialog.Actions>
    </Dialog>
  );
}
