import React, { useEffect, useState } from 'react';
import { UserPlus, AlertCircle } from 'lucide-react';
import { Container } from '../components/primitives/Container';
import { Button } from '../components/primitives/Button';
import { Dialog } from '../components/primitives/Dialog';
import { TextField } from '../components/primitives/TextField';
import { Select } from '../components/primitives/Select';
import { Spinner } from '../components/primitives/Spinner';
import { TenantCard } from '../components/composed/TenantCard';
import { tenantsService } from '../services/api/tenants.service';
import { leasesService } from '../services/api/leases.service';
import type { Tenant, CreateTenantRequest, UpdateTenantRequest, Property } from '../types/api.types';
import { ApiError } from '../types/api.types';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import styles from './Tenants.module.scss';

type TenantStatus = 'Prospective' | 'Active' | 'Former';

interface TenantWithProperty extends Tenant {
  currentProperty?: Property;
}

interface TabOption {
  key: string;
  label: string;
  status?: TenantStatus;
}

const TAB_OPTIONS: TabOption[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active', status: 'Active' },
  { key: 'prospective', label: 'Prospective', status: 'Prospective' },
  { key: 'former', label: 'Former', status: 'Former' },
];

const STATUS_OPTIONS = [
  { value: 'Prospective', label: 'Prospective' },
  { value: 'Active', label: 'Active' },
  { value: 'Former', label: 'Former' },
];

export const Tenants: React.FC = () => {
  const toast = useToast();
  const { canWrite } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<TenantWithProperty[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formData, setFormData] = useState<CreateTenantRequest>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    status: 'Prospective',
    emergencyContactName: '',
    emergencyContactPhone: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      setError(null);

      const fetchedTenants = await tenantsService.getTenants();

      // Fetch current active leases for each tenant
      const tenantsWithProperties = await Promise.all(
        fetchedTenants.map(async (tenant) => {
          try {
            const leases = await leasesService.getLeases({
              tenantId: tenant.id,
              status: 'Active'
            });
            const activeLease = leases.find(lease => lease.status === 'Active');
            return {
              ...tenant,
              currentProperty: activeLease?.property,
            };
          } catch (err) {
            // If there's an error fetching leases for a tenant, just return the tenant without property
            return {
              ...tenant,
              currentProperty: undefined,
            };
          }
        })
      );

      setTenants(tenantsWithProperties);
    } catch (err) {
      console.error('Error fetching tenants:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load tenants';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (mode: 'create' | 'edit', tenant?: Tenant) => {
    setDialogMode(mode);
    if (mode === 'edit' && tenant) {
      setSelectedTenant(tenant);
      setFormData({
        firstName: tenant.firstName,
        lastName: tenant.lastName,
        email: tenant.email,
        phone: tenant.phone || '',
        status: tenant.status,
        emergencyContactName: tenant.emergencyContactName || '',
        emergencyContactPhone: tenant.emergencyContactPhone || '',
        notes: tenant.notes || '',
      });
    } else {
      setSelectedTenant(null);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        status: 'Prospective',
        emergencyContactName: '',
        emergencyContactPhone: '',
        notes: '',
      });
    }
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedTenant(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      status: 'Prospective',
      emergencyContactName: '',
      emergencyContactPhone: '',
      notes: '',
    });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      // Prepare data, converting empty strings to null for optional fields
      const dataToSubmit = {
        ...formData,
        phone: formData.phone?.trim() || null,
        emergencyContactName: formData.emergencyContactName?.trim() || null,
        emergencyContactPhone: formData.emergencyContactPhone?.trim() || null,
        notes: formData.notes?.trim() || null,
      };

      if (dialogMode === 'create') {
        await tenantsService.createTenant(dataToSubmit);
        toast.success('Tenant created successfully');
      } else if (selectedTenant) {
        await tenantsService.updateTenant(selectedTenant.id, dataToSubmit as UpdateTenantRequest);
        toast.success('Tenant updated successfully');
      }

      handleCloseDialog();
      await fetchTenants();
    } catch (err) {
      console.error('Error saving tenant:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to save tenant';
      toast.error(errorMessage);
    }
  };

  const handleDeleteClick = (tenant: Tenant) => {
    setTenantToDelete(tenant);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setTenantToDelete(null);
  };

  const handleDeleteConfirm = async (archive: boolean) => {
    if (!tenantToDelete) return;

    try {
      setDeleteLoading(true);
      if (archive) {
        await tenantsService.archiveTenant(tenantToDelete.id);
        toast.success('Tenant archived successfully');
      } else {
        await tenantsService.deleteTenant(tenantToDelete.id);
        toast.success('Tenant permanently deleted');
      }
      setDeleteDialogOpen(false);
      setTenantToDelete(null);
      await fetchTenants();
    } catch (err) {
      console.error('Error deleting tenant:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to delete tenant';
      toast.error(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleFormChange = (field: keyof CreateTenantRequest, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const getFilteredTenants = (status?: TenantStatus): TenantWithProperty[] => {
    if (!status) {
      return tenants;
    }
    return tenants.filter(tenant => tenant.status === status);
  };

  const getCountForTab = (tabKey: string): number => {
    const tab = TAB_OPTIONS.find(t => t.key === tabKey);
    if (!tab || tabKey === 'all') return tenants.length;
    return getFilteredTenants(tab.status).length;
  };

  const getActiveTabTenants = (): TenantWithProperty[] => {
    const tab = TAB_OPTIONS.find(t => t.key === activeTab);
    if (!tab || activeTab === 'all') return tenants;
    return getFilteredTenants(tab.status);
  };

  const renderTenantGrid = (filteredTenants: TenantWithProperty[]) => {
    if (filteredTenants.length === 0) {
      return (
        <p className={styles.emptyState}>
          No tenants found
        </p>
      );
    }

    return (
      <div className={styles.tenantGrid}>
        {filteredTenants.map((tenant) => (
          <TenantCard
            key={tenant.id}
            tenant={tenant}
            currentProperty={tenant.currentProperty}
            onClick={canWrite() ? () => handleOpenDialog('edit', tenant) : undefined}
          />
        ))}
      </div>
    );
  };

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
        <h1 className={styles.errorTitle}>Tenants</h1>
        <div className={`${styles.alert} ${styles.alertError}`}>
          <AlertCircle size={20} className={styles.alertIcon} />
          <span>{error}</span>
        </div>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Tenants</h1>
          {canWrite() && (
            <Button
              variant="primary"
              startIcon={<UserPlus size={18} />}
              onClick={() => handleOpenDialog('create')}
            >
              Add Tenant
            </Button>
          )}
        </div>

        <div className={styles.tabsWrapper}>
          <div className={styles.tabList} role="tablist" aria-label="tenant tabs">
            {TAB_OPTIONS.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                id={`tenant-tab-${tab.key}`}
                aria-selected={activeTab === tab.key}
                aria-controls={`tenant-tabpanel-${tab.key}`}
                className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label} ({getCountForTab(tab.key)})
              </button>
            ))}
          </div>
        </div>

        <div
          role="tabpanel"
          id={`tenant-tabpanel-${activeTab}`}
          aria-labelledby={`tenant-tab-${activeTab}`}
          className={styles.tabPanel}
        >
          {renderTenantGrid(getActiveTabTenants())}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} size="medium">
        <Dialog.Title>
          {dialogMode === 'create' ? 'Add New Tenant' : 'Edit Tenant'}
        </Dialog.Title>
        <Dialog.Content>
          <div className={styles.formFields}>
            <TextField
              label="First Name"
              value={formData.firstName}
              onChange={(e) => handleFormChange('firstName', (e.target as HTMLInputElement).value)}
              error={!!formErrors.firstName}
              helperText={formErrors.firstName}
              required
              fullWidth
            />
            <TextField
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => handleFormChange('lastName', (e.target as HTMLInputElement).value)}
              error={!!formErrors.lastName}
              helperText={formErrors.lastName}
              required
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleFormChange('email', (e.target as HTMLInputElement).value)}
              error={!!formErrors.email}
              helperText={formErrors.email}
              required
              fullWidth
            />
            <TextField
              label="Phone"
              value={formData.phone ?? ''}
              onChange={(e) => handleFormChange('phone', (e.target as HTMLInputElement).value)}
              fullWidth
            />
            <Select
              label="Status"
              value={formData.status}
              onChange={(value) => handleFormChange('status', value)}
              options={STATUS_OPTIONS}
              fullWidth
              name="status"
            />
            <TextField
              label="Emergency Contact Name"
              value={formData.emergencyContactName ?? ''}
              onChange={(e) => handleFormChange('emergencyContactName', (e.target as HTMLInputElement).value)}
              fullWidth
            />
            <TextField
              label="Emergency Contact Phone"
              value={formData.emergencyContactPhone ?? ''}
              onChange={(e) => handleFormChange('emergencyContactPhone', (e.target as HTMLInputElement).value)}
              fullWidth
            />
            <TextField
              label="Notes"
              value={formData.notes ?? ''}
              onChange={(e) => handleFormChange('notes', (e.target as HTMLInputElement).value)}
              multiline
              rows={3}
              fullWidth
            />
          </div>
        </Dialog.Content>
        <Dialog.Actions>
          <Button variant="text" onClick={handleCloseDialog}>
            Cancel
          </Button>
          {canWrite() && dialogMode === 'edit' && selectedTenant && (
            <Button
              variant="secondary"
              className={styles.btnDanger}
              onClick={() => handleDeleteClick(selectedTenant)}
            >
              Delete
            </Button>
          )}
          {canWrite() && (
            <Button variant="primary" onClick={handleSubmit}>
              {dialogMode === 'create' ? 'Create' : 'Save'}
            </Button>
          )}
        </Dialog.Actions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel} size="small">
        <Dialog.Title>Delete Tenant</Dialog.Title>
        <Dialog.Content>
          <p>
            What would you like to do with {tenantToDelete?.firstName} {tenantToDelete?.lastName}?
          </p>
          <div className={styles.deleteInfo}>
            <p className={styles.deleteOption}>
              <strong>Archive:</strong> Changes status to &apos;Former&apos; and preserves all data
            </p>
            <p className={styles.deleteOption}>
              <strong>Permanently Delete:</strong> Removes tenant and all related data (leases, etc.)
            </p>
          </div>
        </Dialog.Content>
        <Dialog.Actions>
          <Button variant="text" onClick={handleDeleteCancel} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            className={styles.btnWarning}
            onClick={() => handleDeleteConfirm(true)}
            disabled={deleteLoading}
          >
            Archive
          </Button>
          <Button
            variant="primary"
            className={styles.btnDanger}
            onClick={() => handleDeleteConfirm(false)}
            disabled={deleteLoading}
            loading={deleteLoading}
          >
            Permanently Delete
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Container>
  );
};
