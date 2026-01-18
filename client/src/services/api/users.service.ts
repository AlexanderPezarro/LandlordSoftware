import { api } from '../api';

export interface UserListItem {
  id: string;
  email: string;
  role: 'ADMIN' | 'LANDLORD' | 'VIEWER';
  createdAt: string;
}

interface UsersResponse {
  success: boolean;
  users: UserListItem[];
}

interface UserResponse {
  success: boolean;
  user: UserListItem;
}

interface MessageResponse {
  success: boolean;
  message: string;
}

export const usersService = {
  /**
   * Get all users
   * @returns Array of users
   */
  async getUsers(): Promise<UserListItem[]> {
    const response = await api.get<UsersResponse>('/users');
    return response.data.users;
  },

  /**
   * Create a new user
   * @param email - User email
   * @param password - User password
   * @param role - User role (ADMIN, LANDLORD, or VIEWER)
   * @returns Created user
   */
  async createUser(email: string, password: string, role: 'ADMIN' | 'LANDLORD' | 'VIEWER'): Promise<UserListItem> {
    const response = await api.post<UserResponse>('/users', { email, password, role });
    return response.data.user;
  },

  /**
   * Update a user's role
   * @param id - User ID
   * @param role - New role (ADMIN, LANDLORD, or VIEWER)
   * @returns Updated user
   */
  async updateUserRole(id: string, role: 'ADMIN' | 'LANDLORD' | 'VIEWER'): Promise<UserListItem> {
    const response = await api.put<UserResponse>(`/users/${id}/role`, { role });
    return response.data.user;
  },

  /**
   * Delete a user
   * @param id - User ID
   */
  async deleteUser(id: string): Promise<void> {
    await api.delete<MessageResponse>(`/users/${id}`);
  },

  /**
   * Change current user's password
   * @param currentPassword - Current password
   * @param newPassword - New password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.put<MessageResponse>('/auth/password', { currentPassword, newPassword });
  },
};
