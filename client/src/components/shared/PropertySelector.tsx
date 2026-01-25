import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  SelectChangeEvent,
} from '@mui/material';
import { useProperties } from '../../contexts/PropertiesContext';
import type { PropertySelectorProps } from '../../types/component.types';

const PropertySelector: React.FC<PropertySelectorProps> = ({
  value,
  onChange,
  includeAllOption = true,
  disabled = false,
}) => {
  // Use context instead of local state and fetch
  const { properties, loading, error } = useProperties();

  const handleChange = (event: SelectChangeEvent) => {
    onChange(event.target.value);
  };

  return (
    <FormControl fullWidth size="small" error={!!error}>
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
        {/* Empty string is a valid value that parent components may pass.
            Display a placeholder when includeAllOption is false and value is empty. */}
        {!includeAllOption && value === '' && (
          <MenuItem value="" disabled>
            Select a property
          </MenuItem>
        )}
        {properties.length === 0 ? (
          <MenuItem disabled>No properties available</MenuItem>
        ) : (
          properties.map((property) => (
            <MenuItem key={property.id} value={property.id}>
              {property.name} - {property.street}, {property.postcode}
            </MenuItem>
          ))
        )}
      </Select>
      {error && <FormHelperText>{error}</FormHelperText>}
    </FormControl>
  );
};

export default PropertySelector;
