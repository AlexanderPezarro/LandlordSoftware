import React, { useState, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  SelectChangeEvent,
} from '@mui/material';
import { api } from '../../services/api';
import { PropertiesResponse, Property } from '../../types/api.types';
import { PropertySelectorProps } from '../../types/component.types';

const PropertySelector: React.FC<PropertySelectorProps> = ({
  value,
  onChange,
  includeAllOption = true,
}) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get<PropertiesResponse>('/properties');

        // Sort properties alphabetically by name
        const sortedProperties = response.data.properties.sort((a, b) =>
          a.name.localeCompare(b.name)
        );

        setProperties(sortedProperties);
      } catch (err) {
        setError('Failed to load properties');
        console.error('Error fetching properties:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

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
        disabled={loading || !!error}
      >
        {loading ? (
          <MenuItem disabled>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            Loading properties...
          </MenuItem>
        ) : error ? (
          <MenuItem disabled>{error}</MenuItem>
        ) : (
          <>
            {includeAllOption && (
              <MenuItem value="all">All Properties</MenuItem>
            )}
            {properties.map((property) => (
              <MenuItem key={property.id} value={property.id}>
                {property.name} - {property.street}, {property.city}
              </MenuItem>
            ))}
          </>
        )}
      </Select>
    </FormControl>
  );
};

export default PropertySelector;
