import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { propertiesService } from '../services/api/properties.service';
import type { Property } from '../types/api.types';
import { ApiError } from '../types/api.types';

interface PropertiesContextValue {
  properties: Property[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const PropertiesContext = createContext<PropertiesContextValue | undefined>(undefined);

interface PropertiesProviderProps {
  children: React.ReactNode;
}

export const PropertiesProvider: React.FC<PropertiesProviderProps> = ({ children }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedProperties = await propertiesService.getProperties();

      // Sort properties alphabetically by name
      const sortedProperties = fetchedProperties.sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      setProperties(sortedProperties);
    } catch (err) {
      console.error('Error fetching properties:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load properties';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const value: PropertiesContextValue = {
    properties,
    loading,
    error,
    refetch: fetchProperties,
  };

  return (
    <PropertiesContext.Provider value={value}>
      {children}
    </PropertiesContext.Provider>
  );
};

export const useProperties = (): PropertiesContextValue => {
  const context = useContext(PropertiesContext);
  if (context === undefined) {
    throw new Error('useProperties must be used within a PropertiesProvider');
  }
  return context;
};
