import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  SelectChangeEvent,
} from '@mui/material';
import { PropertySelectorProps } from '../../types/component.types';
import { useProperties } from '../../contexts/PropertiesContext';

const PropertySelector: React.FC<PropertySelectorProps> = ({
  value,
  onChange,
  includeAllOption = true,
  disabled = false,
}) => {
  const { properties, loading, error } = useProperties();

  const handleChange = (event: SelectChangeEvent) => {
    onChange(event.target.value);
  };

  return (
    <FormControl fullWidth size="small">
      <InputLabel id="property-selector-label">Property</InputLabel>
      <Select
        labelId="property-selector-label"
        id="property-selector"
        value={value}
        label="Property"
        onChange={handleChange}
        disabled={disabled || loading || !!error}
      >
        {includeAllOption && (
          <MenuItem value="all">All Properties</MenuItem>
        )}
        {!includeAllOption && value === '' && (
          <MenuItem value="" disabled>
            Select a property
          </MenuItem>
        )}
        {loading ? (
          <MenuItem disabled>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            Loading properties...
          </MenuItem>
        ) : error ? (
          <MenuItem disabled>Failed to load properties</MenuItem>
        ) : properties.length === 0 ? (
          <MenuItem disabled>No properties available</MenuItem>
        ) : (
          properties.map((property) => (
            <MenuItem key={property.id} value={property.id}>
              {property.name} - {property.street}, {property.postcode}
            </MenuItem>
          ))
        )}
      </Select>
    </FormControl>
  );
};

export default PropertySelector;
