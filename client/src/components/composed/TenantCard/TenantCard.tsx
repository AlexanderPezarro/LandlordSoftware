import { Mail, Phone, ShieldAlert, Building } from 'lucide-react';
import { Card } from '../../primitives/Card';
import { Avatar } from '../../primitives/Avatar';
import { Chip } from '../../primitives/Chip';
import type { Tenant, Property } from '../../../types/api.types';
import styles from './TenantCard.module.scss';

export interface TenantCardProps {
  tenant: Tenant;
  currentProperty?: Property;
  onClick?: () => void;
  className?: string;
}

const statusColorMap: Record<Tenant['status'], 'primary' | 'success' | 'error'> = {
  Prospective: 'primary',
  Active: 'success',
  Former: 'error',
};

export function TenantCard({ tenant, currentProperty, onClick, className }: TenantCardProps) {
  const fullName = `${tenant.firstName} ${tenant.lastName}`;
  const chipColor = statusColorMap[tenant.status];

  return (
    <Card onClick={onClick} className={[styles.tenantCard, className].filter(Boolean).join(' ')}>
      <Card.Content>
        <div className={styles.header}>
          <Avatar name={fullName} size="medium" />
          <div className={styles.headerInfo}>
            <span className={styles.name}>{fullName}</span>
            <div className={styles.badges}>
              {tenant.emergencyContactName && (
                <ShieldAlert
                  size={16}
                  className={styles.emergencyIcon}
                  aria-label="Emergency contact available"
                />
              )}
              <Chip label={tenant.status} color={chipColor} size="small" />
            </div>
          </div>
        </div>

        <div className={styles.contactInfo}>
          <span className={styles.contactRow}>
            <Mail size={14} className={styles.contactIcon} />
            <span className={styles.contactText}>{tenant.email}</span>
          </span>
          {tenant.phone && (
            <span className={styles.contactRow}>
              <Phone size={14} className={styles.contactIcon} />
              <span className={styles.contactText}>{tenant.phone}</span>
            </span>
          )}
        </div>

        {currentProperty && (
          <div className={styles.propertySection}>
            <Building size={14} className={styles.contactIcon} />
            <span className={styles.propertyText}>
              <strong>Current:</strong> {currentProperty.name}
            </span>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
