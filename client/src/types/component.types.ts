import { Property, Tenant, Transaction, Event, Lease } from './api.types';

// PropertyCard Types
export interface PropertyWithLease extends Property {
  activeLease?: Lease | null;
}

export interface PropertyCardProps {
  property: PropertyWithLease;
  onClick?: () => void;
}

// TenantCard Types
export interface TenantCardProps {
  tenant: Tenant;
  currentProperty?: Property;
  onClick?: () => void;
}

// TransactionRow Types
export interface TransactionRowProps {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

// EventBadge Types
export interface EventBadgeProps {
  event: Event;
  onClick?: () => void;
}

// FileUpload Types
export interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  accept?: string;
  maxSize?: number; // in bytes
}

// ConfirmDialog Types
export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

// StatsCard Types
export interface TrendData {
  value: number;
  direction: 'up' | 'down';
}

export interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  trend?: TrendData;
}

// DateRangePicker Types
export interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  label?: string;
}

// PropertySelector Types
export interface PropertySelectorProps {
  value: string; // propertyId or 'all'
  onChange: (value: string) => void;
  includeAllOption?: boolean;
}
