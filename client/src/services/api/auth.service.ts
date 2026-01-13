import { api } from '../api';
import type { AuthResponse, User } from '../../types/api.types';

export const authService = {
  /**
   * Login with email and password
   * @param email - User email
   * @param password - User password
   * @returns AuthResponse with user data on success
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  /**
   * Get current authenticated user
   * @returns User data if authenticated
   */
  async getMe(): Promise<User> {
    const response = await api.get<AuthResponse>('/auth/me');
    if (response.data.success && response.data.user) {
      return response.data.user;
    }
    throw new Error('User not authenticated');
  },
};
