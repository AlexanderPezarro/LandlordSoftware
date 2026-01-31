import { renderHook, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { authService } from '../../services/api/auth.service';
import type { User } from '../../../../shared/types/auth.types';

// Mock the auth service
jest.mock('../../services/api/auth.service', () => ({
  authService: {
    getMe: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
  },
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('AuthContext.canWrite()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock getMe to avoid auth check on mount
    mockAuthService.getMe.mockRejectedValue({ status: 401 });
  });

  const createMockUser = (role: 'ADMIN' | 'LANDLORD' | 'VIEWER'): User => ({
    id: '1',
    email: 'test@example.com',
    role,
  });

  describe('ADMIN role', () => {
    it('should return true for ADMIN users', async () => {
      const adminUser = createMockUser('ADMIN');
      mockAuthService.getMe.mockResolvedValueOnce(adminUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Wait for auth check to complete
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.canWrite()).toBe(true);
    });

    it('should allow ADMIN users to have write permissions', async () => {
      const adminUser = createMockUser('ADMIN');
      mockAuthService.getMe.mockResolvedValueOnce(adminUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => expect(result.current.user).toEqual(adminUser));

      expect(result.current.canWrite()).toBe(true);
      expect(result.current.user?.role).toBe('ADMIN');
    });
  });

  describe('LANDLORD role', () => {
    it('should return true for LANDLORD users', async () => {
      const landlordUser = createMockUser('LANDLORD');
      mockAuthService.getMe.mockResolvedValueOnce(landlordUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.canWrite()).toBe(true);
    });

    it('should allow LANDLORD users to manage their properties', async () => {
      const landlordUser = createMockUser('LANDLORD');
      mockAuthService.getMe.mockResolvedValueOnce(landlordUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => expect(result.current.user).toEqual(landlordUser));

      expect(result.current.canWrite()).toBe(true);
      expect(result.current.user?.role).toBe('LANDLORD');
    });
  });

  describe('VIEWER role', () => {
    it('should return false for VIEWER users', async () => {
      const viewerUser = createMockUser('VIEWER');
      mockAuthService.getMe.mockResolvedValueOnce(viewerUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.canWrite()).toBe(false);
    });

    it('should deny VIEWER users write permissions', async () => {
      const viewerUser = createMockUser('VIEWER');
      mockAuthService.getMe.mockResolvedValueOnce(viewerUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => expect(result.current.user).toEqual(viewerUser));

      expect(result.current.canWrite()).toBe(false);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.role).toBe('VIEWER');
    });
  });

  describe('Unauthenticated users', () => {
    it('should return false when user is null', async () => {
      mockAuthService.getMe.mockRejectedValueOnce({ status: 401 });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.user).toBeNull();
      expect(result.current.canWrite()).toBe(false);
    });

    it('should deny write permissions for unauthenticated users', async () => {
      mockAuthService.getMe.mockRejectedValueOnce({ status: 401 });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.canWrite()).toBe(false);
    });
  });

  describe('Role transitions', () => {
    it('should update canWrite() when user role changes', async () => {
      const viewerUser = createMockUser('VIEWER');
      mockAuthService.getMe.mockResolvedValueOnce(viewerUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => expect(result.current.user).toEqual(viewerUser));
      expect(result.current.canWrite()).toBe(false);

      // Simulate role upgrade
      const landlordUser = createMockUser('LANDLORD');
      mockAuthService.login.mockResolvedValueOnce({
        success: true,
        user: landlordUser,
      });

      await result.current.login({
        email: 'test@example.com',
        password: 'password',
      });

      await waitFor(() => expect(result.current.user?.role).toBe('LANDLORD'));
      expect(result.current.canWrite()).toBe(true);
    });

    it('should update canWrite() when user logs out', async () => {
      const adminUser = createMockUser('ADMIN');
      mockAuthService.getMe.mockResolvedValueOnce(adminUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => expect(result.current.user).toEqual(adminUser));
      expect(result.current.canWrite()).toBe(true);

      // Logout
      mockAuthService.logout.mockResolvedValueOnce();
      await result.current.logout();

      await waitFor(() => expect(result.current.user).toBeNull());
      expect(result.current.canWrite()).toBe(false);
    });
  });

  describe('Consistency with isAdmin()', () => {
    it('should return true for both canWrite() and isAdmin() when user is ADMIN', async () => {
      const adminUser = createMockUser('ADMIN');
      mockAuthService.getMe.mockResolvedValueOnce(adminUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => expect(result.current.user).toEqual(adminUser));

      expect(result.current.canWrite()).toBe(true);
      expect(result.current.isAdmin()).toBe(true);
    });

    it('should have canWrite() true but isAdmin() false for LANDLORD', async () => {
      const landlordUser = createMockUser('LANDLORD');
      mockAuthService.getMe.mockResolvedValueOnce(landlordUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => expect(result.current.user).toEqual(landlordUser));

      expect(result.current.canWrite()).toBe(true);
      expect(result.current.isAdmin()).toBe(false);
    });

    it('should return false for both canWrite() and isAdmin() when user is VIEWER', async () => {
      const viewerUser = createMockUser('VIEWER');
      mockAuthService.getMe.mockResolvedValueOnce(viewerUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => expect(result.current.user).toEqual(viewerUser));

      expect(result.current.canWrite()).toBe(false);
      expect(result.current.isAdmin()).toBe(false);
    });
  });
});
