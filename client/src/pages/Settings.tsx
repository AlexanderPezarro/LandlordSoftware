import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  TextField,
  CircularProgress,
  Divider,
} from '@mui/material';
import { usersService } from '../services/api/users.service';
import { ApiError } from '../types/api.types';
import { useToast } from '../contexts/ToastContext';

export const Settings: React.FC = () => {
  const toast = useToast();

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  // Password change handlers
  const validatePasswordForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!currentPassword.trim()) {
      errors.currentPassword = 'Current password is required';
    }

    if (!newPassword.trim()) {
      errors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    }

    if (!confirmPassword.trim()) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordChange = async () => {
    if (!validatePasswordForm()) {
      return;
    }

    try {
      setPasswordLoading(true);
      await usersService.changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({});
    } catch (err) {
      console.error('Error changing password:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to change password';
      toast.error(errorMessage);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>

        {/* Change Password Section */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Change Password
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 400 }}>
            <TextField
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (passwordErrors.currentPassword) {
                  setPasswordErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.currentPassword;
                    return newErrors;
                  });
                }
              }}
              error={!!passwordErrors.currentPassword}
              helperText={passwordErrors.currentPassword}
              fullWidth
            />
            <TextField
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (passwordErrors.newPassword) {
                  setPasswordErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.newPassword;
                    return newErrors;
                  });
                }
              }}
              error={!!passwordErrors.newPassword}
              helperText={passwordErrors.newPassword || 'Minimum 8 characters'}
              fullWidth
            />
            <TextField
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (passwordErrors.confirmPassword) {
                  setPasswordErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.confirmPassword;
                    return newErrors;
                  });
                }
              }}
              error={!!passwordErrors.confirmPassword}
              helperText={passwordErrors.confirmPassword}
              fullWidth
            />
            <Button
              variant="contained"
              onClick={handlePasswordChange}
              disabled={passwordLoading}
              sx={{ alignSelf: 'flex-start' }}
            >
              {passwordLoading ? <CircularProgress size={24} /> : 'Change Password'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};
