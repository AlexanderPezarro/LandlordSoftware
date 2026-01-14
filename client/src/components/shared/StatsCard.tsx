import React from 'react';
import { Card, CardContent, Typography, Avatar, Box } from '@mui/material';
import { TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon } from '@mui/icons-material';
import { StatsCardProps } from '../../types/component.types';

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color, trend }) => {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ fontWeight: 600, mb: 1 }}>
              {value}
            </Typography>
            {trend && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color: trend.direction === 'up' ? 'success.main' : 'error.main',
                }}
              >
                {trend.direction === 'up' ? (
                  <TrendingUpIcon fontSize="small" />
                ) : (
                  <TrendingDownIcon fontSize="small" />
                )}
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {trend.value}%
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar
            sx={{
              backgroundColor: color || 'primary.main',
              width: 56,
              height: 56,
            }}
          >
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
