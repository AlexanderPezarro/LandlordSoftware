import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Landmark,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Clock,
  Unlink,
  Info,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Container } from '../components/primitives/Container';
import { Card } from '../components/primitives/Card';
import { Button } from '../components/primitives/Button';
import { TextField } from '../components/primitives/TextField';
import { Spinner } from '../components/primitives/Spinner';
import { Divider } from '../components/primitives/Divider';
import { Select } from '../components/primitives/Select';
import { Dialog } from '../components/primitives/Dialog';
import { Table } from '../components/primitives/Table';
import { Chip } from '../components/primitives/Chip';
import { Tooltip } from '../components/primitives/Tooltip';
import { usersService, UserListItem } from '../services/api/users.service';
import { bankService, BankAccount } from '../services/api/bank.service';
import { ApiError } from '../types/api.types';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { ImportProgressDialog } from '../components/bank/ImportProgressDialog';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import styles from './Settings.module.scss';

export const Settings: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  // Users management state
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  // Create user dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserErrors, setCreateUserErrors] = useState<Record<string, string>>({});

  // Delete user dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserListItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Bank accounts state
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankAccountsLoading, setBankAccountsLoading] = useState(true);

  // Bank connection dialog state
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [syncFromDays, setSyncFromDays] = useState(90);
  const [bankConnectLoading, setBankConnectLoading] = useState(false);

  // Import progress dialog state
  const [importProgressOpen, setImportProgressOpen] = useState(false);
  const [importSyncLogId, setImportSyncLogId] = useState<string>('');

  // SCA pending approval state
  const [pendingApprovalOpen, setPendingApprovalOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [completeConnectionLoading, setCompleteConnectionLoading] = useState(false);

  const fetchBankAccounts = async () => {
    try {
      setBankAccountsLoading(true);
      const accounts = await bankService.getBankAccounts();
      setBankAccounts(accounts);
    } catch (err) {
      console.error('Error fetching bank accounts:', err);
    } finally {
      setBankAccountsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchBankAccounts();

    // Check for OAuth callback success/error in URL
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');
    const bankAccountId = params.get('bankAccountId');

    // Check for pending SCA approval redirect
    const pendingApproval = params.get('pending_approval');
    const pendingIdParam = params.get('pendingId');

    if (pendingApproval === 'monzo' && pendingIdParam) {
      setPendingId(pendingIdParam);
      setPendingApprovalOpen(true);
      window.history.replaceState({}, '', '/settings');
    } else if (success === 'monzo_connected') {
      toast.success('Monzo account connected successfully');

      // If we have a bank account ID, fetch the active sync log and show progress
      if (bankAccountId) {
        bankService
          .getActiveSyncLog(bankAccountId)
          .then((syncLog) => {
            if (syncLog.status === 'in_progress') {
              setImportSyncLogId(syncLog.id);
              setImportProgressOpen(true);
            }
          })
          .catch((err) => {
            console.error('Failed to fetch sync log:', err);
          });
      }

      // Clean up URL
      window.history.replaceState({}, '', '/settings');
    } else if (error) {
      const errorMessages: Record<string, string> = {
        access_denied: 'You denied access to your Monzo account',
        missing_code: 'Authorization failed: missing code',
        missing_state: 'Authorization failed: invalid request',
        oauth_failed: 'Failed to connect Monzo account. Please try again.',
      };
      toast.error(errorMessages[error] || 'Failed to connect Monzo account');
      // Clean up URL
      window.history.replaceState({}, '', '/settings');
    }
  }, [toast]);

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      setUsersError(null);
      const fetchedUsers = await usersService.getUsers();
      setUsers(fetchedUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load users';
      setUsersError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setUsersLoading(false);
    }
  };

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

  // Create user handlers
  const validateCreateUserForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!newUserEmail.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUserEmail)) {
      errors.email = 'Invalid email format';
    }

    if (!newUserPassword.trim()) {
      errors.password = 'Password is required';
    } else if (newUserPassword.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    setCreateUserErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenCreateDialog = () => {
    setNewUserEmail('');
    setNewUserPassword('');
    setCreateUserErrors({});
    setCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setNewUserEmail('');
    setNewUserPassword('');
    setCreateUserErrors({});
  };

  const handleCreateUser = async () => {
    if (!validateCreateUserForm()) {
      return;
    }

    try {
      setCreateUserLoading(true);
      await usersService.createUser(newUserEmail, newUserPassword, 'LANDLORD');
      toast.success('User created successfully');
      handleCloseCreateDialog();
      await fetchUsers();
    } catch (err) {
      console.error('Error creating user:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to create user';
      toast.error(errorMessage);
    } finally {
      setCreateUserLoading(false);
    }
  };

  // Delete user handlers
  const handleDeleteClick = (user: UserListItem) => {
    setUserToDelete(user);
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

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatLastSync = (lastSyncAt: string | null): string => {
    if (!lastSyncAt) return 'Never synced';
    const diffMs = Date.now() - new Date(lastSyncAt).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(lastSyncAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getSyncStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'synced':
      case 'success':
        return <CheckCircle size={16} className={styles.syncIconSuccess} />;
      case 'syncing':
      case 'in_progress':
        return <RefreshCw size={16} className={styles.syncIconWarning} />;
      case 'error':
      case 'failed':
        return <AlertCircle size={16} className={styles.syncIconError} />;
      default:
        return <Clock size={16} className={styles.syncIconDefault} />;
    }
  };

  const getSyncStatusColor = (status: string): 'success' | 'error' | 'warning' | 'default' => {
    switch (status.toLowerCase()) {
      case 'synced':
      case 'success':
        return 'success';
      case 'syncing':
      case 'in_progress':
        return 'warning';
      case 'error':
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatSyncStatus = (status: string): string => {
    return status.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  // Bank connection handlers
  const handleOpenBankDialog = () => {
    setSyncFromDays(90); // Reset to default
    setBankDialogOpen(true);
  };

  const handleCloseBankDialog = () => {
    setBankDialogOpen(false);
  };

  const handleConnectMonzo = async () => {
    try {
      setBankConnectLoading(true);
      const response = await bankService.connectMonzo(syncFromDays);

      // Redirect to Monzo OAuth page
      window.location.href = response.authUrl;
    } catch (err) {
      console.error('Error connecting Monzo:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to connect Monzo account';
      toast.error(errorMessage);
      setBankConnectLoading(false);
    }
  };

  const handleCompleteConnection = async () => {
    if (!pendingId) return;

    try {
      setCompleteConnectionLoading(true);
      const response = await bankService.completeMonzoConnection(pendingId);

      setPendingApprovalOpen(false);
      setPendingId(null);
      toast.success('Monzo account connected successfully');
      fetchBankAccounts();

      // Fetch active sync log and show progress (same as existing success flow)
      if (response.bankAccountId) {
        try {
          const syncLog = await bankService.getActiveSyncLog(response.bankAccountId);
          if (syncLog.status === 'in_progress') {
            setImportSyncLogId(syncLog.id);
            setImportProgressOpen(true);
          }
        } catch (err) {
          console.error('Failed to fetch sync log:', err);
        }
      }
    } catch (err) {
      console.error('Error completing connection:', err);
      const isAxiosError = err && typeof err === 'object' && 'response' in err;
      const status = isAxiosError ? (err as { response?: { status?: number } }).response?.status : undefined;

      if (status === 403) {
        toast.error('Please approve access in your Monzo app first, then try again.');
      } else {
        const errorMessage = err instanceof ApiError ? err.message : 'Failed to complete connection. Please restart the connection flow.';
        toast.error(errorMessage);
        setPendingApprovalOpen(false);
        setPendingId(null);
      }
    } finally {
      setCompleteConnectionLoading(false);
    }
  };

  const syncFromDaysOptions = [
    { value: '30', label: '30 days' },
    { value: '90', label: '90 days (recommended)' },
    { value: '180', label: '6 months' },
    { value: '365', label: '1 year' },
    { value: '730', label: '2 years' },
    { value: '1825', label: '5 years (maximum)' },
  ];

  return (
    <Container maxWidth="lg">
      <div className={styles.page}>
        <h1 className={styles.pageTitle}>Settings</h1>

        {/* Change Password Section */}
        <Card className={styles.section}>
          <Card.Content>
            <h2 className={styles.sectionTitle}>Change Password</h2>
            <Divider spacing={3} />
            <div className={styles.passwordForm}>
              <TextField
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword((e.target as HTMLInputElement).value);
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
                  setNewPassword((e.target as HTMLInputElement).value);
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
                  setConfirmPassword((e.target as HTMLInputElement).value);
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
                variant="primary"
                onClick={handlePasswordChange}
                disabled={passwordLoading}
                loading={passwordLoading}
                className={styles.passwordButton}
              >
                Change Password
              </Button>
            </div>
          </Card.Content>
        </Card>

        {/* Bank Accounts Section */}
        <Card className={styles.section}>
          <Card.Content>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Bank Accounts</h2>
              {bankAccounts.length === 0 && !bankAccountsLoading && (
                <Button
                  variant="primary"
                  startIcon={<Landmark size={18} />}
                  onClick={handleOpenBankDialog}
                >
                  Connect Monzo
                </Button>
              )}
            </div>
            <Divider spacing={3} />

            {bankAccountsLoading ? (
              <div className={styles.loadingCenter}>
                <Spinner size="small" />
              </div>
            ) : bankAccounts.length === 0 ? (
              <p className={styles.emptyText}>
                Connect your Monzo account to automatically import and categorize transactions.
              </p>
            ) : (
              <div className={styles.bankAccountList}>
                {bankAccounts.map((account) => (
                  <div key={account.id} className={styles.bankAccountRow}>
                    <div className={styles.bankAccountInfo}>
                      <Landmark size={24} className={styles.bankIcon} />
                      <div>
                        <p
                          className={styles.bankAccountName}
                          onClick={() => navigate('/admin/bank-accounts')}
                        >
                          {account.accountName}
                        </p>
                        <p className={styles.bankAccountMeta}>
                          {account.provider.charAt(0).toUpperCase() + account.provider.slice(1)} &middot; {account.accountType}
                        </p>
                      </div>
                    </div>
                    <div className={styles.bankAccountActions}>
                      <div className={styles.syncStatusArea}>
                        <span className={styles.syncStatusChip}>
                          {getSyncStatusIcon(account.lastSyncStatus)}
                          <Chip
                            label={formatSyncStatus(account.lastSyncStatus)}
                            color={getSyncStatusColor(account.lastSyncStatus)}
                            size="small"
                          />
                        </span>
                        <span className={styles.syncLastTime}>
                          {formatLastSync(account.lastSyncAt)}
                        </span>
                      </div>
                      <Tooltip content="Reconnect account">
                        <button
                          type="button"
                          className={styles.reconnectButton}
                          onClick={handleOpenBankDialog}
                        >
                          <Unlink size={18} />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card.Content>
        </Card>

        {/* User Management Section */}
        <Card className={styles.section}>
          <Card.Content>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>User Management</h2>
              <Button
                variant="primary"
                startIcon={<Plus size={18} />}
                onClick={handleOpenCreateDialog}
              >
                Add User
              </Button>
            </div>
            <Divider spacing={3} />

            {usersLoading ? (
              <div className={styles.loadingCenter}>
                <Spinner />
              </div>
            ) : usersError ? (
              <div className={`${styles.alert} ${styles.alertError}`}>
                <AlertCircle size={20} />
                <span>{usersError}</span>
              </div>
            ) : (
              <Table.Container>
                <Table>
                  <Table.Head>
                    <Table.Row>
                      <Table.Cell sortable={false}>Email</Table.Cell>
                      <Table.Cell sortable={false}>Created</Table.Cell>
                      <Table.Cell sortable={false} align="right">Actions</Table.Cell>
                    </Table.Row>
                  </Table.Head>
                  <Table.Body>
                    {users.map((user) => (
                      <Table.Row key={user.id}>
                        <Table.Cell>
                          {user.email}
                          {currentUser?.id === user.id && (
                            <span className={styles.userYouLabel}>(you)</span>
                          )}
                        </Table.Cell>
                        <Table.Cell>{formatDate(user.createdAt)}</Table.Cell>
                        <Table.Cell align="right">
                          <button
                            type="button"
                            className={styles.deleteButton}
                            onClick={() => handleDeleteClick(user)}
                            disabled={currentUser?.id === user.id}
                            title={currentUser?.id === user.id ? 'Cannot delete yourself' : 'Delete user'}
                          >
                            <Trash2 size={20} />
                          </button>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                    {users.length === 0 && (
                      <Table.Empty colSpan={3}>No users found</Table.Empty>
                    )}
                  </Table.Body>
                </Table>
              </Table.Container>
            )}
          </Card.Content>
        </Card>
      </div>

      {/* Create User Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        size="medium"
      >
        <Dialog.Title>Add New User</Dialog.Title>
        <Dialog.Content>
          <div className={styles.dialogForm}>
            <TextField
              label="Email"
              type="email"
              value={newUserEmail}
              onChange={(e) => {
                setNewUserEmail((e.target as HTMLInputElement).value);
                if (createUserErrors.email) {
                  setCreateUserErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.email;
                    return newErrors;
                  });
                }
              }}
              error={!!createUserErrors.email}
              helperText={createUserErrors.email}
              required
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={newUserPassword}
              onChange={(e) => {
                setNewUserPassword((e.target as HTMLInputElement).value);
                if (createUserErrors.password) {
                  setCreateUserErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.password;
                    return newErrors;
                  });
                }
              }}
              error={!!createUserErrors.password}
              helperText={createUserErrors.password || 'Minimum 8 characters'}
              required
              fullWidth
            />
          </div>
        </Dialog.Content>
        <Dialog.Actions>
          <Button variant="secondary" onClick={handleCloseCreateDialog}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateUser}
            disabled={createUserLoading}
            loading={createUserLoading}
          >
            Create User
          </Button>
        </Dialog.Actions>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete User"
        message={`Are you sure you want to delete ${userToDelete?.email}? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        loading={deleteLoading}
      />

      {/* Bank Connection Dialog */}
      <Dialog
        open={bankDialogOpen}
        onClose={handleCloseBankDialog}
        size="medium"
      >
        <Dialog.Title>Connect Monzo Account</Dialog.Title>
        <Dialog.Content>
          <div className={styles.dialogForm}>
            <p className={styles.emptyText}>
              Select how far back to import your transaction history. You can import transactions from the last 30 days up to 5 years.
            </p>
            <Select
              label="Import History"
              name="sync-from-days"
              value={String(syncFromDays)}
              onChange={(value) => setSyncFromDays(Number(value))}
              options={syncFromDaysOptions}
              helperText="Default: 90 days. Importing more history may take longer to process."
              fullWidth
            />
          </div>
        </Dialog.Content>
        <Dialog.Actions>
          <Button variant="secondary" onClick={handleCloseBankDialog} disabled={bankConnectLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConnectMonzo}
            disabled={bankConnectLoading}
            loading={bankConnectLoading}
            startIcon={<Landmark size={18} />}
          >
            Connect to Monzo
          </Button>
        </Dialog.Actions>
      </Dialog>

      {/* SCA Pending Approval Dialog */}
      <Dialog
        open={pendingApprovalOpen}
        onClose={() => {
          setPendingApprovalOpen(false);
          setPendingId(null);
        }}
        size="medium"
      >
        <Dialog.Title>Approve in Monzo App</Dialog.Title>
        <Dialog.Content>
          <div className={styles.pendingApprovalContent}>
            <Landmark size={48} className={styles.pendingApprovalIcon} />
            <p className={styles.pendingApprovalText}>
              Monzo requires you to approve this connection in your mobile app.
            </p>
            <div className={`${styles.alert} ${styles.alertInfo}`}>
              <Info size={20} />
              <span>Open your Monzo app, approve the access request, then click the button below.</span>
            </div>
          </div>
        </Dialog.Content>
        <Dialog.Actions>
          <Button
            variant="secondary"
            onClick={() => {
              setPendingApprovalOpen(false);
              setPendingId(null);
            }}
            disabled={completeConnectionLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCompleteConnection}
            disabled={completeConnectionLoading}
            loading={completeConnectionLoading}
            startIcon={!completeConnectionLoading ? <Landmark size={18} /> : undefined}
          >
            {completeConnectionLoading ? "Connecting..." : "I've Approved It"}
          </Button>
        </Dialog.Actions>
      </Dialog>

      {/* Import Progress Dialog */}
      {importSyncLogId && (
        <ImportProgressDialog
          open={importProgressOpen}
          syncLogId={importSyncLogId}
          onClose={() => setImportProgressOpen(false)}
        />
      )}
    </Container>
  );
};
