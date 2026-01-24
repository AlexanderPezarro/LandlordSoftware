import React, { useEffect, useState, useMemo } from 'react';
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
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { propertiesService } from '../services/api/properties.service';
import { leasesService } from '../services/api/leases.service';
import type {
  Property,
  CreatePropertyRequest,
  UpdatePropertyRequest,
} from '../types/api.types';
import { ApiError } from '../types/api.types';
import PropertyCard from '../components/shared/PropertyCard';
import { useToast } from '../contexts/ToastContext';
import type { PropertyWithLease } from '../types/component.types';

type PropertyStatus = 'Available' | 'Occupied' | 'Under Maintenance' | 'For Sale';
type PropertyType = 'House' | 'Flat' | 'Studio' | 'Bungalow' | 'Terraced' | 'Semi-Detached' | 'Detached' | 'Maisonette' | 'Commercial';

const PROPERTY_STATUSES: PropertyStatus[] = ['Available', 'Occupied', 'Under Maintenance', 'For Sale'];
const PROPERTY_TYPES: PropertyType[] = ['House', 'Flat', 'Studio', 'Bungalow', 'Terraced', 'Semi-Detached', 'Detached', 'Maisonette', 'Commercial'];

interface PropertyFormData {
  name: string;
  street: string;
  city: string;
  county: string;
  postcode: string;
  propertyType: PropertyType;
  status: PropertyStatus;
  purchaseDate: string;
  purchasePrice: string;
  notes: string;
}

const initialFormData: PropertyFormData = {
  name: '',
  street: '',
  city: '',
  county: '',
  postcode: '',
  propertyType: 'House',
  status: 'Available',
  purchaseDate: '',
  purchasePrice: '',
  notes: '',
};

export const Properties: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<PropertyWithLease[]>([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'status'>('name');

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [formData, setFormData] = useState<PropertyFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all properties
      const fetchedProperties = await propertiesService.getProperties();

      // If no properties, no need to fetch leases
      if (fetchedProperties.length === 0) {
        setProperties([]);
        return;
      }

      // Batch fetch all active leases for all properties in ONE call
      const propertyIds = fetchedProperties.map(p => p.id);
      const allLeases = await leasesService.getLeases({
        propertyId: propertyIds,
        status: 'Active',
      });

      // Match leases to properties client-side
      const propertiesWithLeases = fetchedProperties.map(property => {
        const activeLease = allLeases.find(
          lease => lease.propertyId === property.id && lease.status === 'Active'
        );
        return {
          ...property,
          activeLease: activeLease || null,
        };
      });

      setProperties(propertiesWithLeases);
    } catch (err) {
      console.error('Error fetching properties:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load properties';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (mode: 'create' | 'edit', property?: Property) => {
    setDialogMode(mode);
    if (mode === 'edit' && property) {
      setSelectedProperty(property);
      setFormData({
        name: property.name,
        street: property.street,
        city: property.city,
        county: property.county,
        postcode: property.postcode,
        propertyType: property.propertyType,
        status: property.status,
        purchaseDate: property.purchaseDate || '',
        purchasePrice: property.purchasePrice?.toString() || '',
        notes: property.notes || '',
      });
    } else {
      setSelectedProperty(null);
      setFormData(initialFormData);
    }
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedProperty(null);
    setFormData(initialFormData);
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Property name is required';
    }

    if (!formData.street.trim()) {
      errors.street = 'Street address is required';
    }

    if (!formData.city.trim()) {
      errors.city = 'City is required';
    }

    if (!formData.county.trim()) {
      errors.county = 'County is required';
    }

    if (!formData.postcode.trim()) {
      errors.postcode = 'Postcode is required';
    }

    if (formData.purchasePrice && parseFloat(formData.purchasePrice) < 0) {
      errors.purchasePrice = 'Purchase price must be 0 or greater';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const dataToSubmit: CreatePropertyRequest = {
        name: formData.name.trim(),
        street: formData.street.trim(),
        city: formData.city.trim(),
        county: formData.county.trim(),
        postcode: formData.postcode.trim(),
        propertyType: formData.propertyType,
        status: formData.status,
        purchaseDate: formData.purchaseDate || null,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : null,
        notes: formData.notes.trim() || null,
      };

      if (dialogMode === 'create') {
        await propertiesService.createProperty(dataToSubmit);
        toast.success('Property created successfully');
      } else if (selectedProperty) {
        await propertiesService.updateProperty(
          selectedProperty.id,
          dataToSubmit as UpdatePropertyRequest
        );
        toast.success('Property updated successfully');
      }

      handleCloseDialog();
      await fetchProperties();
    } catch (err) {
      console.error('Error saving property:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to save property';
      toast.error(errorMessage);
    }
  };

  const handleDeleteClick = (property: Property, event: React.MouseEvent) => {
    event.stopPropagation();
    setPropertyToDelete(property);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setPropertyToDelete(null);
  };

  const handleDeleteConfirm = async (archive: boolean) => {
    if (!propertyToDelete) return;

    try {
      setDeleteLoading(true);
      if (archive) {
        await propertiesService.archiveProperty(propertyToDelete.id);
        toast.success('Property archived successfully');
      } else {
        await propertiesService.deleteProperty(propertyToDelete.id);
        toast.success('Property permanently deleted');
      }
      setDeleteDialogOpen(false);
      setPropertyToDelete(null);
      await fetchProperties();
    } catch (err) {
      console.error('Error deleting property:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to delete property';
      toast.error(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleFormChange = (field: keyof PropertyFormData, value: string) => {
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

  const handlePropertyClick = (property: PropertyWithLease) => {
    navigate(`/properties/${property.id}`);
  };

  const handleEditClick = (property: Property, event: React.MouseEvent) => {
    event.stopPropagation();
    handleOpenDialog('edit', property);
  };

  const filteredAndSortedProperties = useMemo(() => {
    let filtered = properties;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (property) =>
          property.name.toLowerCase().includes(query) ||
          property.street.toLowerCase().includes(query) ||
          property.city.toLowerCase().includes(query) ||
          property.postcode.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((property) => property.status === statusFilter);
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((property) => property.propertyType === typeFilter);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'status') {
        return a.status.localeCompare(b.status);
      }
      return 0;
    });

    return sorted;
  }, [properties, searchQuery, statusFilter, typeFilter, sortBy]);

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
            Properties
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
            Properties
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog('create')}
          >
            Add Property
          </Button>
        </Box>

        {/* Search and Filters */}
        <Box sx={{ mb: 3 }}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name, address, or postcode..."
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
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                {PROPERTY_STATUSES.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                fullWidth
                size="small"
                label="Property Type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="all">All Types</MenuItem>
                {PROPERTY_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                fullWidth
                size="small"
                label="Sort By"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'status')}
              >
                <MenuItem value="name">Name</MenuItem>
                <MenuItem value="status">Status</MenuItem>
              </TextField>
            </Stack>
          </Stack>
        </Box>

        {/* Properties Grid */}
        {filteredAndSortedProperties.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No properties found
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog('create')}
              sx={{ mt: 2 }}
            >
              Add First Property
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
            {filteredAndSortedProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onClick={() => handlePropertyClick(property)}
                onEdit={(e) => handleEditClick(property, e)}
                onDelete={(e) => handleDeleteClick(property, e)}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? 'Add New Property' : 'Edit Property'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Property Name"
              value={formData.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              error={!!formErrors.name}
              helperText={formErrors.name}
              required
              fullWidth
            />
            <TextField
              label="Street Address"
              value={formData.street}
              onChange={(e) => handleFormChange('street', e.target.value)}
              error={!!formErrors.street}
              helperText={formErrors.street}
              required
              fullWidth
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="City"
                value={formData.city}
                onChange={(e) => handleFormChange('city', e.target.value)}
                error={!!formErrors.city}
                helperText={formErrors.city}
                required
              />
              <TextField
                label="County"
                value={formData.county}
                onChange={(e) => handleFormChange('county', e.target.value)}
                error={!!formErrors.county}
                helperText={formErrors.county}
                required
              />
            </Box>
            <TextField
              label="Postcode"
              value={formData.postcode}
              onChange={(e) => handleFormChange('postcode', e.target.value)}
              error={!!formErrors.postcode}
              helperText={formErrors.postcode}
              required
              fullWidth
            />
            <TextField
              label="Property Type"
              select
              value={formData.propertyType}
              onChange={(e) => handleFormChange('propertyType', e.target.value)}
              required
              fullWidth
            >
              {PROPERTY_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Status"
              select
              value={formData.status}
              onChange={(e) => handleFormChange('status', e.target.value)}
              required
              fullWidth
            >
              {PROPERTY_STATUSES.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </TextField>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="Purchase Date"
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => handleFormChange('purchaseDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Purchase Price"
                type="number"
                value={formData.purchasePrice}
                onChange={(e) => handleFormChange('purchasePrice', e.target.value)}
                error={!!formErrors.purchasePrice}
                helperText={formErrors.purchasePrice}
                inputProps={{ min: 0, step: 0.01 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">£</InputAdornment>,
                }}
              />
            </Box>
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
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {dialogMode === 'create' ? 'Create' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel} maxWidth="sm" fullWidth>
        <DialogTitle>Delete Property</DialogTitle>
        <DialogContent>
          <Typography>
            What would you like to do with {propertyToDelete?.name}?
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>Archive:</strong> Changes status to 'For Sale' and preserves all data
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Permanently Delete:</strong> Removes property and all related data (leases, transactions, events, etc.)
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
