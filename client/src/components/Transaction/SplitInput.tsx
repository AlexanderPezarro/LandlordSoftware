import React from 'react';
import { Box, TextField, Typography, Chip } from '@mui/material';

interface SplitInputProps {
  userId: string;
  userEmail: string;
  percentage: number;
  amount: number;
  isCustomized: boolean;
  onPercentageChange: (userId: string, percentage: number) => void;
}

export const SplitInput: React.FC<SplitInputProps> = ({
  userId,
  userEmail,
  percentage,
  amount,
  isCustomized,
  onPercentageChange,
}) => {
  const formatCurrency = (value: number) => {
    return `£${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handlePercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 100) {
      onPercentageChange(userId, value);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 1.5,
        borderRadius: 1,
        bgcolor: 'background.default',
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" noWrap>
          {userEmail}
        </Typography>
      </Box>

      <TextField
        size="small"
        type="number"
        value={percentage}
        onChange={handlePercentageChange}
        inputProps={{
          step: 0.01,
          min: 0,
          max: 100,
        }}
        sx={{ width: 100 }}
        label="%"
      />

      <Box sx={{ minWidth: 100, textAlign: 'right' }}>
        <Typography variant="body2" fontWeight="medium">
          {formatCurrency(amount)}
        </Typography>
      </Box>

      {isCustomized && (
        <Chip
          label="Custom"
          size="small"
          color="primary"
          variant="outlined"
          sx={{ minWidth: 70 }}
        />
      )}
    </Box>
  );
};
