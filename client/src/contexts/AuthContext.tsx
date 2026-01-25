import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, LoginRequest, AuthResponse } from '../../../shared/types/auth.types';
import { authService } from '../services/api/auth.service';
import { ApiError } from '../types/api.types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: () => boolean;
  canWrite: () => boolean;
  login: (credentials: LoginRequest) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const userData = await authService.getMe();
      setUser(userData);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        // User not authenticated, this is expected
        setUser(null);
      } else {
        console.error('Error checking authentication:', error);
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (credentials: LoginRequest): Promise<AuthResponse> => {
    try {
      const response = await authService.login(credentials.email, credentials.password);

      if (response.success && response.user) {
        setUser(response.user);
      }

      return response;
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error instanceof ApiError ? error.message : 'An unexpected error occurred',
      };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear user even if request fails
      setUser(null);
    }
  };

  // Listen for unauthorized events from API client
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      // Optionally redirect to login page
      // window.location.href = '/login';
    };

    window.addEventListener('api:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('api:unauthorized', handleUnauthorized);
    };
  }, []);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const isAdmin = useCallback(() => {
    return user?.role === 'ADMIN';
  }, [user]);

  const canWrite = useCallback(() => {
    return user?.role === 'ADMIN' || user?.role === 'LANDLORD';
  }, [user]);

  const value: AuthContextType = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    isAdmin,
    canWrite,
    login,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
