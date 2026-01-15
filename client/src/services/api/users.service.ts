import { api } from '../api';

export interface UserListItem {
  id: string;
  email: string;
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
   * @returns Created user
   */
  async createUser(email: string, password: string): Promise<UserListItem> {
    const response = await api.post<UserResponse>('/users', { email, password });
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
