import { Chip } from '../../primitives/Chip';
import type { ChipProps } from '../../primitives/Chip';
import type { Event } from '../../../types/api.types';

export interface EventBadgeProps {
  event: Event;
  onClick?: () => void;
  className?: string;
}

const eventTypeColorMap: Record<Event['eventType'], ChipProps['color']> = {
  Maintenance: 'warning',
  Inspection: 'primary',
  Repair: 'error',
  Viewing: 'default',
  Meeting: 'default',
  'Rent Due Date': 'success',
  'Lease Renewal': 'primary',
};

export function EventBadge({ event, onClick, className }: EventBadgeProps) {
  const color = eventTypeColorMap[event.eventType] ?? 'default';

  return (
    <span
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      style={{ cursor: onClick ? 'pointer' : undefined, display: 'inline-flex' }}
    >
      <Chip label={event.eventType} color={color} size="small" className={className} />
    </span>
  );
}
