import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { LoginFormSchema, LoginFormData } from '../../../shared/validation/auth.validation';
import { authService } from '../services/api/auth.service';

export const Login: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);
  const { login, checkAuth } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginFormSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Check if setup is required on mount
  useEffect(() => {
    const checkSetup = async () => {
      try {
        const required = await authService.isSetupRequired();
        setSetupRequired(required);
      } catch (err) {
        console.error('Failed to check setup status:', err);
        setSetupRequired(false); // Default to login form on error
      }
    };
    checkSetup();
  }, []);

  const onSubmit = async (data: LoginFormData) => {
    setError(null);

    try {
      const result = await login(data);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }
  };

  const onSetupSubmit = async (data: LoginFormData) => {
    setError(null);

    try {
      const result = await authService.setupAdmin(data.email, data.password);
      if (result.success) {
        // User is automatically logged in, sync auth state
        await checkAuth();
        navigate('/dashboard');
      } else {
        setError(result.error || 'Setup failed');
      }
    } catch (err) {
      setError('An unexpected error occurred during setup');
    }
  };

  // Loading state while checking setup
  if (setupRequired === null) {
    return (
      <Container component="main" maxWidth="xs">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
            Landlord Management System
          </Typography>
          <Typography component="h2" variant="h6" sx={{ mb: 3 }}>
            {setupRequired ? 'Create Admin Account' : 'Sign In'}
          </Typography>
          {setupRequired && (
            <Alert severity="info" sx={{ width: '100%', mb: 2 }}>
              No users exist. Create the first admin account to get started.
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box
            component="form"
            onSubmit={handleSubmit(setupRequired ? onSetupSubmit : onSubmit)}
            sx={{ width: '100%' }}
          >
            <TextField
              margin="normal"
              fullWidth
              id="email"
              label="Email Address"
              autoComplete="email"
              autoFocus
              error={!!errors.email}
              helperText={errors.email?.message}
              disabled={isSubmitting}
              {...register('email')}
            />
            <TextField
              margin="normal"
              fullWidth
              label="Password"
              type="password"
              id="password"
              autoComplete={setupRequired ? 'new-password' : 'current-password'}
              error={!!errors.password}
              helperText={errors.password?.message}
              disabled={isSubmitting}
              {...register('password')}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isSubmitting || !isValid}
            >
              {isSubmitting
                ? setupRequired
                  ? 'Creating Admin...'
                  : 'Signing in...'
                : setupRequired
                  ? 'Create Admin & Continue'
                  : 'Sign In'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};
