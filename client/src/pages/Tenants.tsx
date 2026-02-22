import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { tenantsService } from '../services/api/tenants.service';
import { leasesService } from '../services/api/leases.service';
import type { Tenant, CreateTenantRequest, UpdateTenantRequest, Property } from '../types/api.types';
import { ApiError } from '../types/api.types';
import TenantCard from '../components/shared/TenantCard';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

type TenantStatus = 'Prospective' | 'Active' | 'Former';

interface TenantWithProperty extends Tenant {
  currentProperty?: Property;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tenant-tabpanel-${index}`}
      aria-labelledby={`tenant-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `tenant-tab-${index}`,
    'aria-controls': `tenant-tabpanel-${index}`,
  };
}

export const Tenants: React.FC = () => {
  const toast = useToast();
  const { canWrite } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<TenantWithProperty[]>([]);
  const [tabValue, setTabValue] = useState(0);
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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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

  const allTenants = getFilteredTenants();
  const activeTenants = getFilteredTenants('Active');
  const prospectiveTenants = getFilteredTenants('Prospective');
  const formerTenants = getFilteredTenants('Former');

  const renderTenantGrid = (filteredTenants: TenantWithProperty[]) => {
    if (filteredTenants.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No tenants found
          </Typography>
        </Box>
      );
    }

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          gap: 3,
        }}
      >
        {filteredTenants.map((tenant) => (
          <TenantCard
            key={tenant.id}
            tenant={tenant}
            currentProperty={tenant.currentProperty}
            onClick={canWrite() ? () => handleOpenDialog('edit', tenant) : undefined}
          />
        ))}
      </Box>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Tenants
          </Typography>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Tenants
          </Typography>
          {canWrite() && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog('create')}
            >
              Add Tenant
            </Button>
          )}
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="tenant tabs">
            <Tab label={`All (${allTenants.length})`} {...a11yProps(0)} />
            <Tab label={`Active (${activeTenants.length})`} {...a11yProps(1)} />
            <Tab label={`Prospective (${prospectiveTenants.length})`} {...a11yProps(2)} />
            <Tab label={`Former (${formerTenants.length})`} {...a11yProps(3)} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {renderTenantGrid(allTenants)}
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          {renderTenantGrid(activeTenants)}
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          {renderTenantGrid(prospectiveTenants)}
        </TabPanel>
        <TabPanel value={tabValue} index={3}>
          {renderTenantGrid(formerTenants)}
        </TabPanel>
      </Box>

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === 'create' ? 'Add New Tenant' : 'Edit Tenant'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="First Name"
              value={formData.firstName}
              onChange={(e) => handleFormChange('firstName', e.target.value)}
              error={!!formErrors.firstName}
              helperText={formErrors.firstName}
              required
              fullWidth
            />
            <TextField
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => handleFormChange('lastName', e.target.value)}
              error={!!formErrors.lastName}
              helperText={formErrors.lastName}
              required
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleFormChange('email', e.target.value)}
              error={!!formErrors.email}
              helperText={formErrors.email}
              required
              fullWidth
            />
            <TextField
              label="Phone"
              value={formData.phone}
              onChange={(e) => handleFormChange('phone', e.target.value)}
              fullWidth
            />
            <TextField
              label="Status"
              select
              value={formData.status}
              onChange={(e) => handleFormChange('status', e.target.value)}
              required
              fullWidth
            >
              <MenuItem value="Prospective">Prospective</MenuItem>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Former">Former</MenuItem>
            </TextField>
            <TextField
              label="Emergency Contact Name"
              value={formData.emergencyContactName}
              onChange={(e) => handleFormChange('emergencyContactName', e.target.value)}
              fullWidth
            />
            <TextField
              label="Emergency Contact Phone"
              value={formData.emergencyContactPhone}
              onChange={(e) => handleFormChange('emergencyContactPhone', e.target.value)}
              fullWidth
            />
            <TextField
              label="Notes"
              value={formData.notes}
              onChange={(e) => handleFormChange('notes', e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancel
          </Button>
          {canWrite() && dialogMode === 'edit' && selectedTenant && (
            <Button
              onClick={() => handleDeleteClick(selectedTenant)}
              color="error"
              variant="outlined"
            >
              Delete
            </Button>
          )}
          {canWrite() && (
            <Button onClick={handleSubmit} variant="contained" color="primary">
              {dialogMode === 'create' ? 'Create' : 'Save'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel} maxWidth="sm" fullWidth>
        <DialogTitle>Delete Tenant</DialogTitle>
        <DialogContent>
          <Typography>
            What would you like to do with {tenantToDelete?.firstName} {tenantToDelete?.lastName}?
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>Archive:</strong> Changes status to 'Former' and preserves all data
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Permanently Delete:</strong> Removes tenant and all related data (leases, etc.)
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button
            onClick={() => handleDeleteConfirm(true)}
            color="warning"
            variant="outlined"
            disabled={deleteLoading}
          >
            Archive
          </Button>
          <Button
            onClick={() => handleDeleteConfirm(false)}
            color="error"
            variant="contained"
            disabled={deleteLoading}
          >
            {deleteLoading ? <CircularProgress size={24} /> : 'Permanently Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
