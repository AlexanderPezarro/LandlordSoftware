import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  useTheme,
  Stack,
  InputAdornment,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
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
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';

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

export const Leases: React.FC = () => {
  const toast = useToast();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
            Leases
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
            Leases
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog('create')}
          >
            Add Lease
          </Button>
        </Box>

        {/* Search and Filters */}
        <Box sx={{ mb: 3 }}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by property or tenant name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <Stack direction={isMobile ? 'column' : 'row'} spacing={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Property"
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
              >
                <MenuItem value="all">All Properties</MenuItem>
                {properties.map((property) => (
                  <MenuItem key={property.id} value={property.id}>
                    {property.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                fullWidth
                size="small"
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                {LEASE_STATUSES.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Stack>
        </Box>

        {/* Leases Grid */}
        {filteredLeases.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No leases found
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog('create')}
              sx={{ mt: 2 }}
            >
              Add First Lease
            </Button>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: 3,
            }}
          >
            {filteredLeases.map((lease) => (
              <Card
                key={lease.id}
                sx={{
                  position: 'relative',
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 4,
                  },
                }}
                onClick={() => handleOpenDialog('edit', lease)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="div" noWrap sx={{ flex: 1, mr: 1 }}>
                      {lease.property?.name || getPropertyName(lease.propertyId)}
                    </Typography>
                    <Chip
                      label={lease.status}
                      color={getStatusColor(lease.status)}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Tenant: {lease.tenant
                      ? `${lease.tenant.firstName} ${lease.tenant.lastName}`
                      : getTenantName(lease.tenantId)}
                  </Typography>
                  <Typography variant="h6" color="primary" gutterBottom>
                    {formatCurrency(lease.monthlyRent)}/month
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(lease.startDate)} - {lease.endDate ? formatDate(lease.endDate) : 'Ongoing'}
                  </Typography>
                  <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5 }}>
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      onClick={(e) => handleEditClick(lease, e)}
                      sx={{ minWidth: 'auto', p: 1 }}
                      aria-label="Edit lease"
                    >
                      <EditIcon fontSize="small" />
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      color="error"
                      onClick={(e) => handleDeleteClick(lease, e)}
                      sx={{ minWidth: 'auto', p: 1 }}
                      aria-label="Delete lease"
                    >
                      <DeleteIcon fontSize="small" />
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? 'Add New Lease' : 'Edit Lease'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Property"
              select
              value={formData.propertyId}
              onChange={(e) => handleFormChange('propertyId', e.target.value)}
              error={!!formErrors.propertyId}
              helperText={formErrors.propertyId}
              required
              fullWidth
            >
              {properties.map((property) => (
                <MenuItem key={property.id} value={property.id}>
                  {property.name} - {property.street}, {property.city}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Tenant"
              select
              value={formData.tenantId}
              onChange={(e) => handleFormChange('tenantId', e.target.value)}
              error={!!formErrors.tenantId}
              helperText={formErrors.tenantId}
              required
              fullWidth
            >
              {tenants.map((tenant) => (
                <MenuItem key={tenant.id} value={tenant.id}>
                  {tenant.firstName} {tenant.lastName} - {tenant.email}
                </MenuItem>
              ))}
            </TextField>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="Start Date"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleFormChange('startDate', e.target.value)}
                error={!!formErrors.startDate}
                helperText={formErrors.startDate}
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                label="End Date"
                type="date"
                value={formData.endDate}
                onChange={(e) => handleFormChange('endDate', e.target.value)}
                error={!!formErrors.endDate}
                helperText={formErrors.endDate || 'Leave empty for ongoing lease'}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="Monthly Rent"
                type="number"
                value={formData.monthlyRent}
                onChange={(e) => handleFormChange('monthlyRent', e.target.value)}
                error={!!formErrors.monthlyRent}
                helperText={formErrors.monthlyRent}
                inputProps={{ min: 0, step: 0.01 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">£</InputAdornment>,
                }}
                required
              />
              <TextField
                label="Security Deposit"
                type="number"
                value={formData.securityDepositAmount}
                onChange={(e) => handleFormChange('securityDepositAmount', e.target.value)}
                error={!!formErrors.securityDepositAmount}
                helperText={formErrors.securityDepositAmount}
                inputProps={{ min: 0, step: 0.01 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">£</InputAdornment>,
                }}
                required
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="Security Deposit Paid Date"
                type="date"
                value={formData.securityDepositPaidDate}
                onChange={(e) => handleFormChange('securityDepositPaidDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Status"
                select
                value={formData.status}
                onChange={(e) => handleFormChange('status', e.target.value)}
                required
              >
                {LEASE_STATUSES.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {dialogMode === 'create' ? 'Create' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Terminate Lease"
        message={`Are you sure you want to terminate the lease for ${getDeleteLeaseDescription()}? This will set the lease status to 'Terminated'.`}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        loading={deleteLoading}
      />
    </Container>
  );
};
