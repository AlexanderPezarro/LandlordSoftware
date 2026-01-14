import React from 'react';
import { Card, CardContent, Typography, Chip, Box } from '@mui/material';
import { PropertyCardProps } from '../../types/component.types';

const PropertyCard: React.FC<PropertyCardProps> = ({ property }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Vacant':
        return 'warning';
      case 'For Sale':
        return 'info';
      case 'Occupied':
        return 'success';
      default:
        return 'default';
    }
  };

  const formatRent = (amount: number) => {
    return `£${amount.toLocaleString('en-GB')}/month`;
  };

  const address = `${property.street}, ${property.city}, ${property.state} ${property.zipCode}`;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            {property.name}
          </Typography>
          <Chip
            label={property.status}
            color={getStatusColor(property.status)}
            size="small"
          />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {address}
        </Typography>

        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          {property.activeLease ? (
            <Typography variant="body2" sx={{ fontWeight: 500, color: 'success.main' }}>
              {formatRent(property.activeLease.rentAmount)}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No active lease
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default PropertyCard;
