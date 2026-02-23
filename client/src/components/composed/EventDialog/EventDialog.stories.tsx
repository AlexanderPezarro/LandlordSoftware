import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Dialog } from '../../primitives/Dialog';
import { TextField } from '../../primitives/TextField';
import { Select } from '../../primitives/Select';
import type { SelectOption } from '../../primitives/Select';
import { DatePicker } from '../../primitives/DatePicker';
import { Button } from '../../primitives/Button';
import { Chip } from '../../primitives/Chip';

/**
 * EventDialog is a composed component that provides a form for creating and
 * editing calendar events. Because it relies on PropertiesContext for the
 * PropertySelector, these stories render the underlying primitives directly
 * to avoid requiring the context provider.
 */

const EVENT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'Inspection', label: 'Inspection' },
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'Repair', label: 'Repair' },
  { value: 'Meeting', label: 'Meeting' },
  { value: 'Rent Due Date', label: 'Rent Due Date' },
  { value: 'Lease Renewal', label: 'Lease Renewal' },
  { value: 'Viewing', label: 'Viewing' },
];

const PROPERTY_OPTIONS: SelectOption[] = [
  { value: 'prop-1', label: '12 Oak Avenue - 12 Oak Avenue, SW1A 1AA' },
  { value: 'prop-2', label: 'Riverside Flat - 45 River Road, E1 6AN' },
  { value: 'prop-3', label: 'High Street Studio - 88 High Street, M1 1AE' },
];

const noop = fn();

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta = {
  title: 'Composed/EventDialog',
};

export default meta;

type Story = StoryObj;

// ---------------------------------------------------------------------------
// Create Mode
// ---------------------------------------------------------------------------

export const CreateMode: Story = {
  render: () => (
    <Dialog open onClose={noop} size="medium">
      <Dialog.Title>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span>Create New Event</span>
        </span>
      </Dialog.Title>
      <Dialog.Content>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Select
            label="Property"
            name="property"
            options={PROPERTY_OPTIONS}
            value=""
            placeholder="Select a property"
            fullWidth
          />
          <Select
            label="Event Type"
            name="event-type"
            options={EVENT_TYPE_OPTIONS}
            value="Inspection"
            fullWidth
          />
          <TextField
            label="Title"
            placeholder="Enter a title for this event"
            required
            fullWidth
          />
          <DatePicker
            label="Scheduled Date & Time"
            value={new Date('2026-03-15T10:00:00')}
            showTimeSelect
            dateFormat="dd/MM/yyyy HH:mm"
          />
          <TextField
            label="Description"
            placeholder="Add any notes or details about this event..."
            multiline
            rows={4}
            fullWidth
          />
        </div>
      </Dialog.Content>
      <Dialog.Actions>
        <Button variant="text" onClick={noop}>Cancel</Button>
        <Button variant="primary" onClick={noop}>Save</Button>
      </Dialog.Actions>
    </Dialog>
  ),
};

// ---------------------------------------------------------------------------
// Edit Mode
// ---------------------------------------------------------------------------

export const EditMode: Story = {
  render: () => (
    <Dialog open onClose={noop} size="medium">
      <Dialog.Title>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span>Edit Event</span>
        </span>
      </Dialog.Title>
      <Dialog.Content>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Select
            label="Property"
            name="property"
            options={PROPERTY_OPTIONS}
            value="prop-1"
            fullWidth
          />
          <Select
            label="Event Type"
            name="event-type"
            options={EVENT_TYPE_OPTIONS}
            value="Maintenance"
            fullWidth
          />
          <TextField
            label="Title"
            value="Boiler annual service"
            fullWidth
          />
          <DatePicker
            label="Scheduled Date & Time"
            value={new Date('2026-04-10T14:30:00')}
            showTimeSelect
            dateFormat="dd/MM/yyyy HH:mm"
          />
          <TextField
            label="Description"
            value="Annual boiler service and safety inspection by GasSafe engineer."
            multiline
            rows={4}
            fullWidth
          />
        </div>
      </Dialog.Content>
      <Dialog.Actions>
        <Button variant="text" onClick={noop}>Cancel</Button>
        <Button variant="primary" onClick={noop}>Save</Button>
      </Dialog.Actions>
    </Dialog>
  ),
};

// ---------------------------------------------------------------------------
// Validation Errors
// ---------------------------------------------------------------------------

export const ValidationErrors: Story = {
  render: () => (
    <Dialog open onClose={noop} size="medium">
      <Dialog.Title>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span>Create New Event</span>
        </span>
      </Dialog.Title>
      <Dialog.Content>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Select
            label="Property"
            name="property"
            options={PROPERTY_OPTIONS}
            value=""
            placeholder="Select a property"
            error
            helperText="Please select a property"
            fullWidth
          />
          <Select
            label="Event Type"
            name="event-type"
            options={EVENT_TYPE_OPTIONS}
            value=""
            placeholder="Select event type"
            error
            helperText="Please select an event type"
            fullWidth
          />
          <TextField
            label="Title"
            placeholder="Enter a title for this event"
            required
            error
            helperText="Title is required"
            fullWidth
          />
          <DatePicker
            label="Scheduled Date & Time"
            value={null}
            showTimeSelect
            dateFormat="dd/MM/yyyy HH:mm"
            error
            helperText="Please select a date"
          />
          <TextField
            label="Description"
            placeholder="Add any notes or details about this event..."
            multiline
            rows={4}
            fullWidth
          />
        </div>
      </Dialog.Content>
      <Dialog.Actions>
        <Button variant="text" onClick={noop}>Cancel</Button>
        <Button variant="primary" onClick={noop}>Save</Button>
      </Dialog.Actions>
    </Dialog>
  ),
};

// ---------------------------------------------------------------------------
// View Mode - Pending
// ---------------------------------------------------------------------------

export const ViewModePending: Story = {
  render: () => (
    <Dialog open onClose={noop} size="medium">
      <Dialog.Title>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span>Event Details</span>
        </span>
      </Dialog.Title>
      <Dialog.Content>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Chip label="Pending" color="default" size="small" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Select
            label="Property"
            name="property"
            options={PROPERTY_OPTIONS}
            value="prop-2"
            disabled
            fullWidth
          />
          <Select
            label="Event Type"
            name="event-type"
            options={EVENT_TYPE_OPTIONS}
            value="Viewing"
            disabled
            fullWidth
          />
          <TextField
            label="Title"
            value="Tenant viewing for flat 3B"
            disabled
            fullWidth
          />
          <DatePicker
            label="Scheduled Date & Time"
            value={new Date('2026-03-20T11:00:00')}
            showTimeSelect
            dateFormat="dd/MM/yyyy HH:mm"
            disabled
          />
          <TextField
            label="Description"
            value="Prospective tenant viewing. Keys at reception."
            multiline
            rows={4}
            disabled
            fullWidth
          />
        </div>
      </Dialog.Content>
      <Dialog.Actions>
        <Button variant="secondary" onClick={noop}>Mark Complete</Button>
        <Button variant="text" onClick={noop}>Close</Button>
        <Button variant="primary" onClick={noop}>Edit</Button>
      </Dialog.Actions>
    </Dialog>
  ),
};
