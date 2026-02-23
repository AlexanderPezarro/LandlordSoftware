import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Plus, Search, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { Container } from '../components/primitives/Container';
import { Button } from '../components/primitives/Button';
import { TextField } from '../components/primitives/TextField';
import { Select } from '../components/primitives/Select';
import { DatePicker } from '../components/primitives/DatePicker';
import { Card } from '../components/primitives/Card';
import { Chip } from '../components/primitives/Chip';
import { Dialog } from '../components/primitives/Dialog';
import { Spinner } from '../components/primitives/Spinner';
import { leasesService } from '../services/api/leases.service';
import { propertiesService } from '../services/api/properties.service';
import { tenantsService } from '../services/api/tenants.service';
import type {
  Lease,
  Property,
  Tenant,
  CreateLeaseRequest,
  UpdateLeaseRequest,
  LeaseFilters,
} from '../types/api.types';
import { ApiError } from '../types/api.types';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import styles from './Leases.module.scss';

type LeaseStatus = 'Draft' | 'Active' | 'Expired' | 'Terminated';

const LEASE_STATUSES: LeaseStatus[] = ['Draft', 'Active', 'Expired', 'Terminated'];

interface LeaseFormData {
  propertyId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  securityDepositAmount: string;
  securityDepositPaidDate: string;
  status: LeaseStatus;
}

const initialFormData: LeaseFormData = {
  propertyId: '',
  tenantId: '',
  startDate: '',
  endDate: '',
  monthlyRent: '',
  securityDepositAmount: '',
  securityDepositPaidDate: '',
  status: 'Draft',
};

const getStatusColor = (status: LeaseStatus): 'default' | 'success' | 'warning' | 'error' => {
  switch (status) {
    case 'Active':
      return 'success';
    case 'Draft':
      return 'warning';
    case 'Expired':
      return 'default';
    case 'Terminated':
      return 'error';
    default:
      return 'default';
  }
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/** Convert "YYYY-MM-DD" string to Date, or return null. */
const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
};

/** Convert Date to "YYYY-MM-DD" string. */
const toDateString = (date: Date | null): string => {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const Leases: React.FC = () => {
  const toast = useToast();
  const { canWrite } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);
  const [formData, setFormData] = useState<LeaseFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leaseToDelete, setLeaseToDelete] = useState<Lease | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch leases with filters
      const filters: LeaseFilters = {};
      if (propertyFilter !== 'all') filters.propertyId = propertyFilter;
      if (statusFilter !== 'all') filters.status = statusFilter as LeaseStatus;

      const [fetchedLeases, fetchedProperties, fetchedTenants] = await Promise.all([
        leasesService.getLeases(filters),
        propertiesService.getProperties(),
        tenantsService.getTenants(),
      ]);

      setLeases(fetchedLeases);
      setProperties(fetchedProperties);
      setTenants(fetchedTenants);
    } catch (err) {
      console.error('Error fetching data:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load leases';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [propertyFilter, statusFilter, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenDialog = (mode: 'create' | 'edit', lease?: Lease) => {
    setDialogMode(mode);
    if (mode === 'edit' && lease) {
      setSelectedLease(lease);
      setFormData({
        propertyId: lease.propertyId,
        tenantId: lease.tenantId,
        startDate: lease.startDate,
        endDate: lease.endDate || '',
        monthlyRent: lease.monthlyRent.toString(),
        securityDepositAmount: lease.securityDepositAmount.toString(),
        securityDepositPaidDate: lease.securityDepositPaidDate || '',
        status: lease.status,
      });
    } else {
      setSelectedLease(null);
      setFormData(initialFormData);
    }
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedLease(null);
    setFormData(initialFormData);
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.propertyId) {
      errors.propertyId = 'Property is required';
    }

    if (!formData.tenantId) {
      errors.tenantId = 'Tenant is required';
    }

    if (!formData.startDate) {
      errors.startDate = 'Start date is required';
    }

    if (!formData.monthlyRent) {
      errors.monthlyRent = 'Monthly rent is required';
    } else if (parseFloat(formData.monthlyRent) <= 0) {
      errors.monthlyRent = 'Monthly rent must be greater than 0';
    }

    if (!formData.securityDepositAmount) {
      errors.securityDepositAmount = 'Security deposit is required';
    } else if (parseFloat(formData.securityDepositAmount) < 0) {
      errors.securityDepositAmount = 'Security deposit must be 0 or greater';
    }

    if (formData.endDate && formData.startDate && formData.endDate < formData.startDate) {
      errors.endDate = 'End date must be after start date';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const dataToSubmit: CreateLeaseRequest = {
        propertyId: formData.propertyId,
        tenantId: formData.tenantId,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        monthlyRent: parseFloat(formData.monthlyRent),
        securityDepositAmount: parseFloat(formData.securityDepositAmount),
        securityDepositPaidDate: formData.securityDepositPaidDate || null,
        status: formData.status,
      };

      if (dialogMode === 'create') {
        await leasesService.createLease(dataToSubmit);
        toast.success('Lease created successfully');
      } else if (selectedLease) {
        await leasesService.updateLease(selectedLease.id, dataToSubmit as UpdateLeaseRequest);
        toast.success('Lease updated successfully');
      }

      handleCloseDialog();
      await fetchData();
    } catch (err) {
      console.error('Error saving lease:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to save lease';
      toast.error(errorMessage);
    }
  };

  const handleDeleteClick = (lease: Lease, event: React.MouseEvent) => {
    event.stopPropagation();
    setLeaseToDelete(lease);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setLeaseToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!leaseToDelete) return;

    try {
      setDeleteLoading(true);
      await leasesService.deleteLease(leaseToDelete.id);
      toast.success('Lease terminated successfully');
      setDeleteDialogOpen(false);
      setLeaseToDelete(null);
      await fetchData();
    } catch (err) {
      console.error('Error deleting lease:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to delete lease';
      toast.error(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleFormChange = (field: keyof LeaseFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleEditClick = (lease: Lease, event: React.MouseEvent) => {
    event.stopPropagation();
    handleOpenDialog('edit', lease);
  };

  const filteredLeases = useMemo(() => {
    let filtered = leases;

    // Apply search filter (client-side for tenant name)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((lease) => {
        const tenantName = lease.tenant
          ? `${lease.tenant.firstName} ${lease.tenant.lastName}`.toLowerCase()
          : '';
        const propertyName = lease.property?.name.toLowerCase() || '';
        return tenantName.includes(query) || propertyName.includes(query);
      });
    }

    return filtered;
  }, [leases, searchQuery]);

  const getPropertyName = (propertyId: string): string => {
    const property = properties.find((p) => p.id === propertyId);
    return property?.name || 'Unknown Property';
  };

  const getTenantName = (tenantId: string): string => {
    const tenant = tenants.find((t) => t.id === tenantId);
    return tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Unknown Tenant';
  };

  const getDeleteLeaseDescription = (): string => {
    if (!leaseToDelete) return '';
    const propertyName = leaseToDelete.property?.name || getPropertyName(leaseToDelete.propertyId);
    const tenantName = leaseToDelete.tenant
      ? `${leaseToDelete.tenant.firstName} ${leaseToDelete.tenant.lastName}`
      : getTenantName(leaseToDelete.tenantId);
    return `${propertyName} - ${tenantName}`;
  };

  // Build select options
  const propertyFilterOptions = [
    { value: 'all', label: 'All Properties' },
    ...properties.map((p) => ({ value: p.id, label: p.name })),
  ];

  const statusFilterOptions = [
    { value: 'all', label: 'All Statuses' },
    ...LEASE_STATUSES.map((s) => ({ value: s, label: s })),
  ];

  const propertyOptions = properties.map((p) => ({
    value: p.id,
    label: `${p.name} - ${p.street}, ${p.city}`,
  }));

  const tenantOptions = tenants.map((t) => ({
    value: t.id,
    label: `${t.firstName} ${t.lastName} - ${t.email}`,
  }));

  const statusOptions = LEASE_STATUSES.map((s) => ({ value: s, label: s }));

  if (loading) {
    return (
      <Container maxWidth="lg">
        <div className={styles.loadingWrapper}>
          <Spinner />
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <div className={styles.page}>
          <h1 className={styles.title}>Leases</h1>
          <div className={styles.errorAlert}>{error}</div>
        </div>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Leases</h1>
          {canWrite() && (
            <Button
              variant="primary"
              startIcon={<Plus size={20} />}
              onClick={() => handleOpenDialog('create')}
            >
              Add Lease
            </Button>
          )}
        </div>

        {/* Search and Filters */}
        <div className={styles.filters}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by property or tenant name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
            startAdornment={<Search size={20} />}
          />
          <div className={styles.filterRow}>
            <Select
              label="Property"
              value={propertyFilter}
              onChange={(value) => setPropertyFilter(value)}
              options={propertyFilterOptions}
              size="small"
              fullWidth
            />
            <Select
              label="Status"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              options={statusFilterOptions}
              size="small"
              fullWidth
            />
          </div>
        </div>

        {/* Leases Grid */}
        {filteredLeases.length === 0 ? (
          <div className={styles.emptyState}>
            <h2 className={styles.emptyTitle}>No leases found</h2>
            {canWrite() && (
              <Button
                variant="secondary"
                startIcon={<Plus size={20} />}
                onClick={() => handleOpenDialog('create')}
              >
                Add First Lease
              </Button>
            )}
          </div>
        ) : (
          <div className={styles.cardGrid}>
            {filteredLeases.map((lease) => (
              <Card
                key={lease.id}
                className={`${styles.leaseCard} ${canWrite() ? styles.leaseCardClickable : ''}`}
                onClick={canWrite() ? () => handleOpenDialog('edit', lease) : undefined}
              >
                <Card.Content>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.propertyName}>
                      {lease.property?.name || getPropertyName(lease.propertyId)}
                    </h3>
                    <Chip
                      label={lease.status}
                      color={getStatusColor(lease.status)}
                      size="small"
                    />
                  </div>
                  <p className={styles.tenantName}>
                    Tenant: {lease.tenant
                      ? `${lease.tenant.firstName} ${lease.tenant.lastName}`
                      : getTenantName(lease.tenantId)}
                  </p>
                  <p className={styles.monthlyRent}>
                    {formatCurrency(lease.monthlyRent)}/month
                  </p>
                  <p className={styles.leaseDates}>
                    {formatDate(lease.startDate)} - {lease.endDate ? formatDate(lease.endDate) : 'Ongoing'}
                  </p>
                </Card.Content>
                {canWrite() && (
                  <Card.Actions className={styles.cardActions}>
                    <Button
                      variant="icon"
                      size="small"
                      onClick={(e) => handleEditClick(lease, e)}
                      aria-label="Edit lease"
                    >
                      <Pencil size={18} />
                    </Button>
                    <Button
                      variant="icon"
                      size="small"
                      onClick={(e) => handleDeleteClick(lease, e)}
                      aria-label="Delete lease"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </Card.Actions>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} size="large">
        <Dialog.Title>
          {dialogMode === 'create' ? 'Add New Lease' : 'Edit Lease'}
        </Dialog.Title>
        <Dialog.Content>
          <div className={styles.formGrid}>
            <Select
              label="Property"
              value={formData.propertyId}
              onChange={(value) => handleFormChange('propertyId', value)}
              options={propertyOptions}
              error={!!formErrors.propertyId}
              helperText={formErrors.propertyId}
              placeholder="Select a property"
              fullWidth
              name="propertyId"
            />
            <Select
              label="Tenant"
              value={formData.tenantId}
              onChange={(value) => handleFormChange('tenantId', value)}
              options={tenantOptions}
              error={!!formErrors.tenantId}
              helperText={formErrors.tenantId}
              placeholder="Select a tenant"
              fullWidth
              name="tenantId"
            />
            <div className={styles.formRow}>
              <DatePicker
                label="Start Date"
                value={parseDate(formData.startDate)}
                onChange={(date) => handleFormChange('startDate', toDateString(date))}
                error={!!formErrors.startDate}
                helperText={formErrors.startDate}
                dateFormat="dd/MM/yyyy"
                placeholderText="Select start date"
              />
              <DatePicker
                label="End Date"
                value={parseDate(formData.endDate)}
                onChange={(date) => handleFormChange('endDate', toDateString(date))}
                error={!!formErrors.endDate}
                helperText={formErrors.endDate || 'Leave empty for ongoing lease'}
                dateFormat="dd/MM/yyyy"
                placeholderText="Select end date"
              />
            </div>
            <div className={styles.formRow}>
              <TextField
                label="Monthly Rent"
                type="number"
                value={formData.monthlyRent}
                onChange={(e) => handleFormChange('monthlyRent', (e.target as HTMLInputElement).value)}
                error={!!formErrors.monthlyRent}
                helperText={formErrors.monthlyRent}
                startAdornment={<span>£</span>}
              />
              <TextField
                label="Security Deposit"
                type="number"
                value={formData.securityDepositAmount}
                onChange={(e) => handleFormChange('securityDepositAmount', (e.target as HTMLInputElement).value)}
                error={!!formErrors.securityDepositAmount}
                helperText={formErrors.securityDepositAmount}
                startAdornment={<span>£</span>}
              />
            </div>
            <div className={styles.formRow}>
              <DatePicker
                label="Security Deposit Paid Date"
                value={parseDate(formData.securityDepositPaidDate)}
                onChange={(date) => handleFormChange('securityDepositPaidDate', toDateString(date))}
                dateFormat="dd/MM/yyyy"
                placeholderText="Select date"
              />
              <Select
                label="Status"
                value={formData.status}
                onChange={(value) => handleFormChange('status', value)}
                options={statusOptions}
                fullWidth
                name="status"
              />
            </div>
          </div>
        </Dialog.Content>
        <Dialog.Actions>
          <Button variant="text" onClick={handleCloseDialog}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {dialogMode === 'create' ? 'Create' : 'Save'}
          </Button>
        </Dialog.Actions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={deleteLoading ? () => {} : handleDeleteCancel}
        size="small"
      >
        <Dialog.Title>
          <span className={styles.titleRow}>
            <AlertTriangle size={20} className={styles.warningIcon} />
            Terminate Lease
          </span>
        </Dialog.Title>
        <Dialog.Content>
          <p className={styles.deleteDialogMessage}>
            Are you sure you want to terminate the lease for {getDeleteLeaseDescription()}? This will set the lease status to &apos;Terminated&apos;.
          </p>
        </Dialog.Content>
        <Dialog.Actions>
          <Button variant="text" onClick={handleDeleteCancel} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className={styles.confirmDanger}
            onClick={handleDeleteConfirm}
            disabled={deleteLoading}
            loading={deleteLoading}
          >
            {deleteLoading ? 'Processing...' : 'Confirm'}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Container>
  );
};
