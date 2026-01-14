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
  Edit as EditIcon,
  Delete as DeleteIcon,
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
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';
import type { PropertyWithLease } from '../types/component.types';

type PropertyStatus = 'Vacant' | 'Occupied' | 'For Sale';
type PropertyType = 'Single Family' | 'Multi-Family' | 'Condo' | 'Townhouse' | 'Apartment';

const PROPERTY_STATUSES: PropertyStatus[] = ['Vacant', 'Occupied', 'For Sale'];
const PROPERTY_TYPES: PropertyType[] = ['Single Family', 'Multi-Family', 'Condo', 'Townhouse', 'Apartment'];

interface PropertyFormData {
  name: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: PropertyType;
  numberOfUnits: string;
  numberOfBedrooms: string;
  numberOfBathrooms: string;
  squareFootage: string;
  yearBuilt: string;
  status: PropertyStatus;
  purchasePrice: string;
  currentValue: string;
  notes: string;
}

const initialFormData: PropertyFormData = {
  name: '',
  street: '',
  city: '',
  state: '',
  zipCode: '',
  propertyType: 'Single Family',
  numberOfUnits: '1',
  numberOfBedrooms: '0',
  numberOfBathrooms: '0',
  squareFootage: '',
  yearBuilt: '',
  status: 'Vacant',
  purchasePrice: '',
  currentValue: '',
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

      const fetchedProperties = await propertiesService.getProperties();

      // Fetch active leases for each property
      const propertiesWithLeases = await Promise.all(
        fetchedProperties.map(async (property) => {
          try {
            const leases = await leasesService.getLeases({
              propertyId: property.id,
              status: 'Active',
            });
            const activeLease = leases.find((lease) => lease.status === 'Active');
            return {
              ...property,
              activeLease: activeLease || null,
            };
          } catch (err) {
            return {
              ...property,
              activeLease: null,
            };
          }
        })
      );

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
        state: property.state,
        zipCode: property.zipCode,
        propertyType: property.propertyType,
        numberOfUnits: property.numberOfUnits.toString(),
        numberOfBedrooms: property.numberOfBedrooms.toString(),
        numberOfBathrooms: property.numberOfBathrooms.toString(),
        squareFootage: property.squareFootage?.toString() || '',
        yearBuilt: property.yearBuilt?.toString() || '',
        status: property.status,
        purchasePrice: property.purchasePrice?.toString() || '',
        currentValue: property.currentValue?.toString() || '',
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

    if (!formData.state.trim()) {
      errors.state = 'State is required';
    }

    if (!formData.zipCode.trim()) {
      errors.zipCode = 'Zip code is required';
    }

    const units = parseInt(formData.numberOfUnits);
    if (isNaN(units) || units < 1) {
      errors.numberOfUnits = 'Number of units must be at least 1';
    }

    const bedrooms = parseInt(formData.numberOfBedrooms);
    if (isNaN(bedrooms) || bedrooms < 0) {
      errors.numberOfBedrooms = 'Number of bedrooms must be 0 or greater';
    }

    const bathrooms = parseInt(formData.numberOfBathrooms);
    if (isNaN(bathrooms) || bathrooms < 0) {
      errors.numberOfBathrooms = 'Number of bathrooms must be 0 or greater';
    }

    if (formData.squareFootage && parseInt(formData.squareFootage) <= 0) {
      errors.squareFootage = 'Square footage must be greater than 0';
    }

    if (formData.yearBuilt && parseInt(formData.yearBuilt) < 1800) {
      errors.yearBuilt = 'Year built must be 1800 or later';
    }

    if (formData.purchasePrice && parseFloat(formData.purchasePrice) < 0) {
      errors.purchasePrice = 'Purchase price must be 0 or greater';
    }

    if (formData.currentValue && parseFloat(formData.currentValue) < 0) {
      errors.currentValue = 'Current value must be 0 or greater';
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
        state: formData.state.trim(),
        zipCode: formData.zipCode.trim(),
        propertyType: formData.propertyType,
        numberOfUnits: parseInt(formData.numberOfUnits),
        numberOfBedrooms: parseInt(formData.numberOfBedrooms),
        numberOfBathrooms: parseInt(formData.numberOfBathrooms),
        squareFootage: formData.squareFootage ? parseInt(formData.squareFootage) : null,
        yearBuilt: formData.yearBuilt ? parseInt(formData.yearBuilt) : null,
        status: formData.status,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : null,
        currentValue: formData.currentValue ? parseFloat(formData.currentValue) : null,
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

  const handleDeleteConfirm = async () => {
    if (!propertyToDelete) return;

    try {
      setDeleteLoading(true);
      await propertiesService.deleteProperty(propertyToDelete.id);
      toast.success('Property deleted successfully');
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
          property.zipCode.toLowerCase().includes(query)
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
              <Box key={property.id} sx={{ position: 'relative' }}>
                <PropertyCard
                  property={property}
                  onClick={() => handlePropertyClick(property)}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    display: 'flex',
                    gap: 0.5,
                  }}
                >
                  <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    onClick={(e) => handleEditClick(property, e)}
                    sx={{ minWidth: 'auto', p: 1 }}
                  >
                    <EditIcon fontSize="small" />
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    onClick={(e) => handleDeleteClick(property, e)}
                    sx={{ minWidth: 'auto', p: 1 }}
                  >
                    <DeleteIcon fontSize="small" />
                  </Button>
                </Box>
              </Box>
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
                label="State"
                value={formData.state}
                onChange={(e) => handleFormChange('state', e.target.value)}
                error={!!formErrors.state}
                helperText={formErrors.state}
                required
              />
            </Box>
            <TextField
              label="Zip Code"
              value={formData.zipCode}
              onChange={(e) => handleFormChange('zipCode', e.target.value)}
              error={!!formErrors.zipCode}
              helperText={formErrors.zipCode}
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
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
              <TextField
                label="Number of Units"
                type="number"
                value={formData.numberOfUnits}
                onChange={(e) => handleFormChange('numberOfUnits', e.target.value)}
                error={!!formErrors.numberOfUnits}
                helperText={formErrors.numberOfUnits}
                required
                inputProps={{ min: 1 }}
              />
              <TextField
                label="Bedrooms"
                type="number"
                value={formData.numberOfBedrooms}
                onChange={(e) => handleFormChange('numberOfBedrooms', e.target.value)}
                error={!!formErrors.numberOfBedrooms}
                helperText={formErrors.numberOfBedrooms}
                required
                inputProps={{ min: 0 }}
              />
              <TextField
                label="Bathrooms"
                type="number"
                value={formData.numberOfBathrooms}
                onChange={(e) => handleFormChange('numberOfBathrooms', e.target.value)}
                error={!!formErrors.numberOfBathrooms}
                helperText={formErrors.numberOfBathrooms}
                required
                inputProps={{ min: 0 }}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="Square Footage"
                type="number"
                value={formData.squareFootage}
                onChange={(e) => handleFormChange('squareFootage', e.target.value)}
                error={!!formErrors.squareFootage}
                helperText={formErrors.squareFootage}
                inputProps={{ min: 0 }}
              />
              <TextField
                label="Year Built"
                type="number"
                value={formData.yearBuilt}
                onChange={(e) => handleFormChange('yearBuilt', e.target.value)}
                error={!!formErrors.yearBuilt}
                helperText={formErrors.yearBuilt}
                inputProps={{ min: 1800, max: new Date().getFullYear() }}
              />
            </Box>
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
                label="Purchase Price"
                type="number"
                value={formData.purchasePrice}
                onChange={(e) => handleFormChange('purchasePrice', e.target.value)}
                error={!!formErrors.purchasePrice}
                helperText={formErrors.purchasePrice}
                inputProps={{ min: 0, step: 0.01 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
              <TextField
                label="Current Value"
                type="number"
                value={formData.currentValue}
                onChange={(e) => handleFormChange('currentValue', e.target.value)}
                error={!!formErrors.currentValue}
                helperText={formErrors.currentValue}
                inputProps={{ min: 0, step: 0.01 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
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
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Property"
        message={`Are you sure you want to delete ${propertyToDelete?.name}? This will set the property status to 'For Sale'.`}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        loading={deleteLoading}
      />
    </Container>
  );
};
