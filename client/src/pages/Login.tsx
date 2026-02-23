import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Info, AlertCircle } from 'lucide-react';
import { Card } from '../components/primitives/Card';
import { TextField } from '../components/primitives/TextField';
import { Button } from '../components/primitives/Button';
import { Spinner } from '../components/primitives/Spinner';
import { useAuth } from '../contexts/AuthContext';
import { LoginFormSchema, LoginFormData } from '../../../shared/validation/auth.validation';
import { authService } from '../services/api/auth.service';
import { ApiError } from '../types/api.types';
import styles from './Login.module.scss';

export const Login: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);
  const { login, checkAuth } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginFormSchema),
    mode: 'onSubmit',
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
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
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
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred during setup');
      }
    }
  };

  // Loading state while checking setup
  if (setupRequired === null) {
    return (
      <div className={styles.page}>
        <div className={styles.spinnerWrapper}>
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <h1 className={styles.title}>Landlord Management System</h1>
        <h2 className={styles.subtitle}>
          {setupRequired ? 'Create Admin Account' : 'Sign In'}
        </h2>
        {setupRequired && (
          <div className={`${styles.alert} ${styles.alertInfo}`}>
            <Info size={20} className={styles.alertIcon} />
            <span className={styles.alertText}>
              No users exist. Create the first admin account to get started.
            </span>
          </div>
        )}
        {error && (
          <div className={`${styles.alert} ${styles.alertError}`}>
            <AlertCircle size={20} className={styles.alertIcon} />
            <span className={styles.alertText}>{error}</span>
          </div>
        )}
        <form
          className={styles.form}
          onSubmit={handleSubmit(setupRequired ? onSetupSubmit : onSubmit)}
        >
          <div className={styles.field}>
            <TextField
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
          </div>
          <div className={styles.field}>
            <TextField
              fullWidth
              label="Password"
              type="password"
              id="password"
              autoComplete={setupRequired ? 'new-password' : 'current-password'}
              error={!!errors.password}
              helperText={
                errors.password?.message ||
                (setupRequired ? 'Min 8 characters, 1 uppercase, 1 lowercase, 1 number' : '')
              }
              disabled={isSubmitting}
              {...register('password')}
            />
          </div>
          <Button
            type="submit"
            fullWidth
            variant="primary"
            className={styles.submitButton}
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            {isSubmitting
              ? setupRequired
                ? 'Creating Admin...'
                : 'Signing in...'
              : setupRequired
                ? 'Create Admin & Continue'
                : 'Sign In'}
          </Button>
        </form>
      </Card>
    </div>
  );
};
