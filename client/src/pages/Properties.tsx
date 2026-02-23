import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, AlertCircle } from 'lucide-react';
import { Container } from '../components/primitives/Container';
import { Button } from '../components/primitives/Button';
import { TextField } from '../components/primitives/TextField';
import { Select } from '../components/primitives/Select';
import { Dialog } from '../components/primitives/Dialog';
import { Spinner } from '../components/primitives/Spinner';
import { PropertyCard } from '../components/composed/PropertyCard/PropertyCard';
import { OwnershipSection } from '../components/composed/PropertyOwnership/OwnershipSection';
import { propertiesService } from '../services/api/properties.service';
import { leasesService } from '../services/api/leases.service';
import { propertyOwnershipService } from '../services/api/propertyOwnership.service';
import type {
  Property,
  CreatePropertyRequest,
  UpdatePropertyRequest,
} from '../types/api.types';
import { ApiError } from '../types/api.types';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { useProperties } from '../contexts/PropertiesContext';
import type { PropertyWithLease } from '../types/component.types';
import styles from './Properties.module.scss';

type PropertyStatus = 'Available' | 'Occupied' | 'Under Maintenance' | 'For Sale';
type PropertyType = 'House' | 'Flat' | 'Studio' | 'Bungalow' | 'Terraced' | 'Semi-Detached' | 'Detached' | 'Maisonette' | 'Commercial';

const PROPERTY_STATUSES: PropertyStatus[] = ['Available', 'Occupied', 'Under Maintenance', 'For Sale'];
const PROPERTY_TYPES: PropertyType[] = ['House', 'Flat', 'Studio', 'Bungalow', 'Terraced', 'Semi-Detached', 'Detached', 'Maisonette', 'Commercial'];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  ...PROPERTY_STATUSES.map((s) => ({ value: s, label: s })),
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  ...PROPERTY_TYPES.map((t) => ({ value: t, label: t })),
];

const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'status', label: 'Status' },
];

const PROPERTY_TYPE_OPTIONS = PROPERTY_TYPES.map((t) => ({ value: t, label: t }));
const PROPERTY_STATUS_OPTIONS = PROPERTY_STATUSES.map((s) => ({ value: s, label: s }));

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
  const { canWrite } = useAuth();
  const { refetch: refetchPropertiesContext } = useProperties();

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
  const [owners, setOwners] = useState<Array<{ userId: string; percentage: number }>>([]);

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

  const handleOpenDialog = async (mode: 'create' | 'edit', property?: Property) => {
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
      // Load existing owners
      try {
        const existingOwners = await propertyOwnershipService.listOwners(property.id);
        setOwners(existingOwners.map((o) => ({ userId: o.userId, percentage: o.ownershipPercentage })));
      } catch (err) {
        console.error('Error loading property owners:', err);
        setOwners([]);
      }
    } else {
      setSelectedProperty(null);
      setFormData(initialFormData);
      setOwners([]);
    }
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedProperty(null);
    setFormData(initialFormData);
    setFormErrors({});
    setOwners([]);
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

    // Validate ownership configuration
    if (owners.length > 0) {
      // Check for empty user selections
      const hasEmptyUsers = owners.some((o) => !o.userId);
      if (hasEmptyUsers) {
        errors.ownership = 'All owners must have a user selected';
      }

      // Check for duplicate users
      const userIds = owners.map((o) => o.userId);
      const hasDuplicates = userIds.some((id, index) => id && userIds.indexOf(id) !== index);
      if (hasDuplicates) {
        errors.ownership = 'Each user can only be added once as an owner';
      }

      // Check total percentage
      const totalPercentage = owners.reduce((sum, o) => sum + o.percentage, 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        errors.ownership = `Total ownership must equal 100%. Current total: ${totalPercentage.toFixed(2)}%`;
      }
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

      let propertyId: string;

      if (dialogMode === 'create') {
        const createdProperty = await propertiesService.createProperty(dataToSubmit);
        propertyId = createdProperty.id;
        toast.success('Property created successfully');
      } else if (selectedProperty) {
        await propertiesService.updateProperty(
          selectedProperty.id,
          dataToSubmit as UpdatePropertyRequest
        );
        propertyId = selectedProperty.id;
        toast.success('Property updated successfully');
      } else {
        return;
      }

      // Sync ownership configuration if owners are configured
      if (owners.length > 0) {
        try {
          const existingOwners = await propertyOwnershipService.listOwners(propertyId);

          // Remove owners not in new list
          for (const existing of existingOwners) {
            if (!owners.find((o) => o.userId === existing.userId)) {
              await propertyOwnershipService.removeOwner(propertyId, existing.userId);
            }
          }

          // Add or update owners
          for (const owner of owners) {
            const existing = existingOwners.find((o) => o.userId === owner.userId);
            if (existing) {
              if (Math.abs(existing.ownershipPercentage - owner.percentage) > 0.01) {
                await propertyOwnershipService.updateOwner(propertyId, owner.userId, {
                  ownershipPercentage: owner.percentage,
                });
              }
            } else {
              await propertyOwnershipService.addOwner(propertyId, {
                userId: owner.userId,
                propertyId,
                ownershipPercentage: owner.percentage,
              });
            }
          }
        } catch (err) {
          console.error('Error syncing ownership:', err);
          const errorMessage = err instanceof ApiError ? err.message : 'Failed to sync ownership';
          toast.error(errorMessage);
        }
      }

      handleCloseDialog();
      await fetchProperties();
      await refetchPropertiesContext();
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
      await refetchPropertiesContext();
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
          <h1 className={styles.title}>Properties</h1>
          <div className={styles.alert}>
            <AlertCircle size={20} />
            {error}
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Properties</h1>
          {canWrite() && (
            <Button
              variant="primary"
              startIcon={<Plus size={18} />}
              onClick={() => handleOpenDialog('create')}
            >
              Add Property
            </Button>
          )}
        </div>

        {/* Search and Filters */}
        <div className={styles.filters}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search by name, address, or postcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
            startAdornment={<Search size={18} />}
          />
          <div className={styles.filterRow}>
            <Select
              label="Status"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              options={STATUS_OPTIONS}
              fullWidth
              size="small"
            />
            <Select
              label="Property Type"
              value={typeFilter}
              onChange={(value) => setTypeFilter(value)}
              options={TYPE_OPTIONS}
              fullWidth
              size="small"
            />
            <Select
              label="Sort By"
              value={sortBy}
              onChange={(value) => setSortBy(value as 'name' | 'status')}
              options={SORT_OPTIONS}
              fullWidth
              size="small"
            />
          </div>
        </div>

        {/* Properties Grid */}
        {filteredAndSortedProperties.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No properties found</p>
            {canWrite() && (
              <Button
                variant="secondary"
                startIcon={<Plus size={18} />}
                onClick={() => handleOpenDialog('create')}
              >
                Add First Property
              </Button>
            )}
          </div>
        ) : (
          <div className={styles.grid}>
            {filteredAndSortedProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onClick={() => handlePropertyClick(property)}
                onEdit={canWrite() ? (e) => handleEditClick(property, e) : undefined}
                onDelete={canWrite() ? (e) => handleDeleteClick(property, e) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} size="large">
        <Dialog.Title>
          {dialogMode === 'create' ? 'Add New Property' : 'Edit Property'}
        </Dialog.Title>
        <Dialog.Content>
          <div className={styles.formFields}>
            <TextField
              label="Property Name"
              value={formData.name}
              onChange={(e) => handleFormChange('name', (e.target as HTMLInputElement).value)}
              error={!!formErrors.name}
              helperText={formErrors.name}
              required
              fullWidth
            />
            <TextField
              label="Street Address"
              value={formData.street}
              onChange={(e) => handleFormChange('street', (e.target as HTMLInputElement).value)}
              error={!!formErrors.street}
              helperText={formErrors.street}
              required
              fullWidth
            />
            <div className={styles.formRow}>
              <TextField
                label="City"
                value={formData.city}
                onChange={(e) => handleFormChange('city', (e.target as HTMLInputElement).value)}
                error={!!formErrors.city}
                helperText={formErrors.city}
                required
              />
              <TextField
                label="County"
                value={formData.county}
                onChange={(e) => handleFormChange('county', (e.target as HTMLInputElement).value)}
                error={!!formErrors.county}
                helperText={formErrors.county}
                required
              />
            </div>
            <TextField
              label="Postcode"
              value={formData.postcode}
              onChange={(e) => handleFormChange('postcode', (e.target as HTMLInputElement).value)}
              error={!!formErrors.postcode}
              helperText={formErrors.postcode}
              required
              fullWidth
            />
            <Select
              label="Property Type"
              value={formData.propertyType}
              onChange={(value) => handleFormChange('propertyType', value)}
              options={PROPERTY_TYPE_OPTIONS}
              fullWidth
            />
            <Select
              label="Status"
              value={formData.status}
              onChange={(value) => handleFormChange('status', value)}
              options={PROPERTY_STATUS_OPTIONS}
              fullWidth
            />
            <div className={styles.formRow}>
              <TextField
                label="Purchase Date"
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => handleFormChange('purchaseDate', (e.target as HTMLInputElement).value)}
              />
              <TextField
                label="Purchase Price"
                type="number"
                value={formData.purchasePrice}
                onChange={(e) => handleFormChange('purchasePrice', (e.target as HTMLInputElement).value)}
                error={!!formErrors.purchasePrice}
                helperText={formErrors.purchasePrice}
                min={0}
                step={0.01}
                startAdornment={<span>\u00A3</span>}
              />
            </div>
            <TextField
              label="Notes"
              value={formData.notes}
              onChange={(e) => handleFormChange('notes', (e.target as HTMLInputElement).value)}
              multiline
              rows={3}
              fullWidth
            />

            {/* Ownership Configuration */}
            <div className={styles.ownershipSection}>
              <OwnershipSection
                owners={owners}
                onChange={setOwners}
                disabled={false}
              />
              {formErrors.ownership && (
                <div className={styles.ownershipError} role="alert">
                  <AlertCircle size={18} />
                  {formErrors.ownership}
                </div>
              )}
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
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel} size="small">
        <Dialog.Title>Delete Property</Dialog.Title>
        <Dialog.Content>
          <p className={styles.deleteQuestion}>
            What would you like to do with {propertyToDelete?.name}?
          </p>
          <div className={styles.deleteBody}>
            <p className={styles.deleteOption}>
              <strong>Archive:</strong> Changes status to &apos;For Sale&apos; and preserves all data
            </p>
            <p className={styles.deleteOption}>
              <strong>Permanently Delete:</strong> Removes property and all related data (leases, transactions, events, etc.)
            </p>
          </div>
        </Dialog.Content>
        <Dialog.Actions>
          <Button variant="text" onClick={handleDeleteCancel} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleDeleteConfirm(true)}
            disabled={deleteLoading}
          >
            Archive
          </Button>
          <Button
            variant="primary"
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
