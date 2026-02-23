import { Pencil, Trash2, Users } from 'lucide-react';
import { Card } from '../../primitives/Card';
import { Button } from '../../primitives/Button';
import type { PropertyCardProps } from '../../../types/component.types';
import styles from './PropertyCard.module.scss';

const statusClassMap: Record<string, string> = {
  Available: styles.statusAvailable,
  Occupied: styles.statusOccupied,
  'Under Maintenance': styles.statusMaintenance,
  'For Sale': styles.statusForSale,
};

function formatRent(amount: number): string {
  return `\u00A3${amount.toLocaleString('en-GB')}/month`;
}

export function PropertyCard({ property, onClick, onEdit, onDelete }: PropertyCardProps) {
  const address = `${property.street}, ${property.city}, ${property.county} ${property.postcode}`;

  const statusClass = statusClassMap[property.status] ?? styles.statusDefault;

  const owners = (property as unknown as Record<string, unknown>).owners as
    | Array<{ userId: string; email?: string; percentage: number }>
    | undefined;

  return (
    <Card className={styles.propertyCard} onClick={onClick}>
      <Card.Content>
        <div className={styles.header}>
          <span className={styles.name}>{property.name}</span>
          <span className={`${styles.status} ${statusClass}`}>{property.status}</span>
        </div>

        <span className={styles.address}>{address}</span>
        <span className={styles.type}>{property.propertyType}</span>

        {owners && owners.length > 1 && (
          <div className={styles.owners}>
            <Users size={14} />
            <span className={styles.ownerCount}>
              {owners.length} owners
            </span>
          </div>
        )}

        <div className={styles.rent}>
          {property.activeLease ? (
            <span className={styles.rentAmount}>{formatRent(property.activeLease.monthlyRent)}</span>
          ) : (
            <span className={styles.noLease}>No active lease</span>
          )}
        </div>
      </Card.Content>

      {(onEdit || onDelete) && (
        <Card.Actions className={styles.actions}>
          {onEdit && (
            <Button
              variant="icon"
              size="small"
              aria-label="Edit property"
              onClick={onEdit}
            >
              <Pencil size={16} />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="icon"
              size="small"
              className={styles.deleteButton}
              aria-label="Delete property"
              onClick={onDelete}
            >
              <Trash2 size={16} />
            </Button>
          )}
        </Card.Actions>
      )}
    </Card>
  );
}
