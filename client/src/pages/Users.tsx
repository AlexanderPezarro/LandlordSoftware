import React, { useEffect, useState, useCallback } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import { usersService, UserListItem } from '../services/api/users.service';
import { ApiError } from '../types/api.types';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Container } from '../components/primitives/Container';
import { Button } from '../components/primitives/Button';
import { TextField } from '../components/primitives/TextField';
import { Select } from '../components/primitives/Select';
import { Table } from '../components/primitives/Table';
import { Dialog } from '../components/primitives/Dialog';
import { Spinner } from '../components/primitives/Spinner';
import styles from './Users.module.scss';

type Role = 'ADMIN' | 'LANDLORD' | 'VIEWER';

const ROLES: Role[] = ['ADMIN', 'LANDLORD', 'VIEWER'];

const ROLE_OPTIONS = ROLES.map((role) => ({ value: role, label: role }));

interface UserFormData {
  email: string;
  password: string;
  role: Role;
}

const initialFormData: UserFormData = {
  email: '',
  password: '',
  role: 'LANDLORD',
};

export const Users: React.FC = () => {
  const toast = useToast();
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserListItem[]>([]);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Delete dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserListItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Role update loading states
  const [roleUpdateLoading, setRoleUpdateLoading] = useState<Record<string, boolean>>({});

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedUsers = await usersService.getUsers();
      setUsers(fetchedUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load users';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // Check if user is admin, if not redirect
    if (!isAdmin()) {
      toast.error('Access denied. Admin privileges required.');
      navigate('/');
      return;
    }
    fetchUsers();
  }, [isAdmin, navigate, toast, fetchUsers]);

  const handleOpenDialog = () => {
    setFormData(initialFormData);
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFormData(initialFormData);
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(formData.password)) {
      errors.password = 'Password must contain at least one uppercase letter';
    } else if (!/[a-z]/.test(formData.password)) {
      errors.password = 'Password must contain at least one lowercase letter';
    } else if (!/[0-9]/.test(formData.password)) {
      errors.password = 'Password must contain at least one number';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      await usersService.createUser(formData.email.trim(), formData.password, formData.role);
      toast.success('User created successfully');
      handleCloseDialog();
      await fetchUsers();
    } catch (err) {
      console.error('Error creating user:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to create user';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    // Prevent changing own role
    if (user?.id === userId) {
      toast.error('You cannot change your own role');
      return;
    }

    try {
      setRoleUpdateLoading((prev) => ({ ...prev, [userId]: true }));
      await usersService.updateUserRole(userId, newRole as Role);
      toast.success('User role updated successfully');
      await fetchUsers();
    } catch (err) {
      console.error('Error updating user role:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to update user role';
      toast.error(errorMessage);
    } finally {
      setRoleUpdateLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleDeleteClick = (userItem: UserListItem) => {
    // Prevent deleting self
    if (user?.id === userItem.id) {
      toast.error('You cannot delete yourself');
      return;
    }
    setUserToDelete(userItem);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      setDeleteLoading(true);
      await usersService.deleteUser(userToDelete.id);
      toast.success('User deleted successfully');
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      await fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to delete user';
      toast.error(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleFormChange = (field: keyof UserFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <div className={styles.loadingWrapper}>
          <Spinner />
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <div className={styles.page}>
          <h1 className={styles.title}>Users</h1>
          <div className={styles.alert}>{error}</div>
        </div>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Users</h1>
          <Button
            variant="primary"
            startIcon={<UserPlus size={18} />}
            onClick={handleOpenDialog}
          >
            Add User
          </Button>
        </div>

        {users.length === 0 ? (
          <div className={styles.emptyState}>
            <h2 className={styles.emptyTitle}>No users found</h2>
            <Button
              variant="secondary"
              startIcon={<UserPlus size={18} />}
              onClick={handleOpenDialog}
            >
              Add First User
            </Button>
          </div>
        ) : (
          <Table.Container>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.Cell sortable={false}>Email</Table.Cell>
                  <Table.Cell sortable={false}>Role</Table.Cell>
                  <Table.Cell sortable={false}>Created At</Table.Cell>
                  <Table.Cell sortable={false} align="right">Actions</Table.Cell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {users.map((userItem) => (
                  <Table.Row key={userItem.id}>
                    <Table.Cell>{userItem.email}</Table.Cell>
                    <Table.Cell>
                      <Select
                        options={ROLE_OPTIONS}
                        value={userItem.role}
                        onChange={(value) => handleRoleChange(userItem.id, value)}
                        size="small"
                        disabled={roleUpdateLoading[userItem.id] || user?.id === userItem.id}
                      />
                    </Table.Cell>
                    <Table.Cell>
                      {new Date(userItem.createdAt).toLocaleDateString()}
                    </Table.Cell>
                    <Table.Cell align="right">
                      <Button
                        variant="icon"
                        size="small"
                        onClick={() => handleDeleteClick(userItem)}
                        disabled={user?.id === userItem.id}
                        aria-label="Delete user"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Table.Container>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} size="medium">
        <Dialog.Title>Add New User</Dialog.Title>
        <Dialog.Content>
          <div className={styles.dialogForm}>
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleFormChange('email', e.target.value)}
              error={!!formErrors.email}
              helperText={formErrors.email}
              required
              fullWidth
              autoFocus
            />
            <TextField
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => handleFormChange('password', e.target.value)}
              error={!!formErrors.password}
              helperText={formErrors.password || 'Min 8 characters, with uppercase, lowercase, and number'}
              required
              fullWidth
            />
            <Select
              label="Role"
              options={ROLE_OPTIONS}
              value={formData.role}
              onChange={(value) => handleFormChange('role', value)}
              fullWidth
            />
          </div>
        </Dialog.Content>
        <Dialog.Actions>
          <Button variant="text" onClick={handleCloseDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting} loading={submitting}>
            {submitting ? 'Creating...' : 'Create'}
          </Button>
        </Dialog.Actions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={deleteLoading ? () => {} : handleDeleteCancel} size="small">
        <Dialog.Title>Delete User</Dialog.Title>
        <Dialog.Content>
          <p>{`Are you sure you want to delete ${userToDelete?.email}? This action cannot be undone.`}</p>
        </Dialog.Content>
        <Dialog.Actions>
          <Button variant="text" onClick={handleDeleteCancel} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleDeleteConfirm} disabled={deleteLoading} loading={deleteLoading}>
            {deleteLoading ? 'Processing...' : 'Confirm'}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Container>
  );
};
