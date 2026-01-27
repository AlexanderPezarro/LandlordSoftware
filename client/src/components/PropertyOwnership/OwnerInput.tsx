import React from 'react';
import {
  Box,
  TextField,
  IconButton,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import type { UserListItem } from '../../services/api/users.service';

interface OwnerInputProps {
  userId: string;
  percentage: number;
  users: UserListItem[];
  onUserChange: (userId: string) => void;
  onPercentageChange: (percentage: number) => void;
  onRemove: () => void;
  disabled?: boolean;
  error?: string;
}

export const OwnerInput: React.FC<OwnerInputProps> = ({
  userId,
  percentage,
  users,
  onUserChange,
  onPercentageChange,
  onRemove,
  disabled = false,
  error,
}) => {
  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
      <TextField
        select
        label="Owner"
        value={userId}
        onChange={(e) => onUserChange(e.target.value)}
        disabled={disabled}
        required
        fullWidth
        error={!!error}
      >
        <MenuItem value="">
          <em>Select an owner</em>
        </MenuItem>
        {users.map((user) => (
          <MenuItem key={user.id} value={user.id}>
            {user.email}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label="Ownership %"
        type="number"
        value={percentage}
        onChange={(e) => onPercentageChange(parseFloat(e.target.value) || 0)}
        disabled={disabled}
        required
        inputProps={{ min: 0.01, max: 100, step: 0.01 }}
        InputProps={{
          endAdornment: <InputAdornment position="end">%</InputAdornment>,
        }}
        error={!!error}
        helperText={error}
        sx={{ width: 180 }}
      />
      <IconButton
        onClick={onRemove}
        disabled={disabled}
        color="error"
        sx={{ mt: 1 }}
      >
        <DeleteIcon />
      </IconButton>
    </Box>
  );
};
