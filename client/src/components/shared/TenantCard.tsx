import React from 'react';
import { Card, CardContent, Typography, Chip, Box } from '@mui/material';
import { ContactEmergency as EmergencyIcon } from '@mui/icons-material';
import { TenantCardProps } from '../../types/component.types';

const TenantCard: React.FC<TenantCardProps> = ({ tenant, currentProperty, onClick }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Prospective':
        return 'info';
      case 'Active':
        return 'success';
      case 'Former':
        return 'error';
      default:
        return 'default';
    }
  };

  const fullName = `${tenant.firstName} ${tenant.lastName}`;

  return (
    <Card
      elevation={2}
      onClick={onClick}
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'elevation 0.2s',
        '&:hover': onClick ? {
          elevation: 4,
          boxShadow: 4,
        } : {},
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            {fullName}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {tenant.emergencyContactName && (
              <EmergencyIcon color="action" fontSize="small" titleAccess="Emergency contact available" />
            )}
            <Chip
              label={tenant.status}
              color={getStatusColor(tenant.status)}
              size="small"
            />
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          {tenant.email}
        </Typography>

        {tenant.phone && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {tenant.phone}
          </Typography>
        )}

        {currentProperty && (
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Current:</strong> {currentProperty.name}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default TenantCard;
