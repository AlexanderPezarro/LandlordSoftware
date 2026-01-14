import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import { CheckCircle as CheckIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { EventBadgeProps } from '../../types/component.types';

const EventBadge: React.FC<EventBadgeProps> = ({ event }) => {
  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'Maintenance':
        return 'warning';
      case 'Inspection':
        return 'warning';
      case 'Showing':
        return 'info';
      case 'Meeting':
        return 'secondary';
      case 'Other':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const tooltipTitle = (
    <div>
      <div><strong>{event.eventType}</strong></div>
      <div>Scheduled: {formatDate(event.scheduledDate)}</div>
      {event.description && <div>{event.description}</div>}
    </div>
  );

  return (
    <Tooltip title={tooltipTitle} arrow>
      <Chip
        label={event.eventType}
        color={getEventColor(event.eventType)}
        size="small"
        icon={event.completed ? <CheckIcon /> : undefined}
      />
    </Tooltip>
  );
};

export default EventBadge;
