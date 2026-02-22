import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  TextField,
  CircularProgress,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  AccountBalance as BankIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Sync as SyncIcon,
  Schedule as ScheduleIcon,
  LinkOff as LinkOffIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { usersService, UserListItem } from '../services/api/users.service';
import { bankService, BankAccount } from '../services/api/bank.service';
import { ApiError } from '../types/api.types';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { ImportProgressDialog } from '../components/bank/ImportProgressDialog';
import ConfirmDialog from '../components/shared/ConfirmDialog';

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
        return <CheckCircleIcon fontSize="small" color="success" />;
      case 'syncing':
      case 'in_progress':
        return <SyncIcon fontSize="small" color="warning" />;
      case 'error':
      case 'failed':
        return <ErrorIcon fontSize="small" color="error" />;
      default:
        return <ScheduleIcon fontSize="small" color="disabled" />;
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

        {/* Bank Accounts Section */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Bank Accounts
            </Typography>
            {bankAccounts.length === 0 && !bankAccountsLoading && (
              <Button
                variant="contained"
                startIcon={<BankIcon />}
                onClick={handleOpenBankDialog}
              >
                Connect Monzo
              </Button>
            )}
          </Box>
          <Divider sx={{ mb: 3 }} />

          {bankAccountsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : bankAccounts.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Connect your Monzo account to automatically import and categorize transactions.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {bankAccounts.map((account) => (
                <Box
                  key={account.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <BankIcon color="primary" />
                    <Box>
                      <Typography
                        variant="subtitle2"
                        sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                        onClick={() => navigate('/admin/bank-accounts')}
                      >
                        {account.accountName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {account.provider.charAt(0).toUpperCase() + account.provider.slice(1)} &middot; {account.accountType}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ textAlign: 'right' }}>
                      <Chip
                        icon={getSyncStatusIcon(account.lastSyncStatus)}
                        label={formatSyncStatus(account.lastSyncStatus)}
                        color={getSyncStatusColor(account.lastSyncStatus)}
                        size="small"
                        variant="outlined"
                      />
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                        {formatLastSync(account.lastSyncAt)}
                      </Typography>
                    </Box>
                    <Tooltip title="Reconnect account">
                      <IconButton size="small" onClick={handleOpenBankDialog}>
                        <LinkOffIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Paper>

        {/* User Management Section */}
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              User Management
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateDialog}
            >
              Add User
            </Button>
          </Box>
          <Divider sx={{ mb: 3 }} />

          {usersLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : usersError ? (
            <Alert severity="error">{usersError}</Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Email</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        {user.email}
                        {currentUser?.id === user.id && (
                          <Typography
                            component="span"
                            variant="caption"
                            sx={{ ml: 1, color: 'text.secondary' }}
                          >
                            (you)
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteClick(user)}
                          disabled={currentUser?.id === user.id}
                          title={currentUser?.id === user.id ? 'Cannot delete yourself' : 'Delete user'}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No users found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>

      {/* Create User Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Email"
              type="email"
              value={newUserEmail}
              onChange={(e) => {
                setNewUserEmail(e.target.value);
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
                setNewUserPassword(e.target.value);
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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleCreateUser}
            variant="contained"
            disabled={createUserLoading}
          >
            {createUserLoading ? <CircularProgress size={24} /> : 'Create User'}
          </Button>
        </DialogActions>
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
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Connect Monzo Account</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Select how far back to import your transaction history. You can import transactions from the last 30 days up to 5 years.
            </Typography>
            <FormControl fullWidth>
              <InputLabel id="sync-from-days-label">Import History</InputLabel>
              <Select
                labelId="sync-from-days-label"
                id="sync-from-days"
                value={syncFromDays}
                label="Import History"
                onChange={(e) => setSyncFromDays(Number(e.target.value))}
              >
                <MenuItem value={30}>30 days</MenuItem>
                <MenuItem value={90}>90 days (recommended)</MenuItem>
                <MenuItem value={180}>6 months</MenuItem>
                <MenuItem value={365}>1 year</MenuItem>
                <MenuItem value={730}>2 years</MenuItem>
                <MenuItem value={1825}>5 years (maximum)</MenuItem>
              </Select>
              <FormHelperText>
                Default: 90 days. Importing more history may take longer to process.
              </FormHelperText>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBankDialog} color="inherit" disabled={bankConnectLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleConnectMonzo}
            variant="contained"
            disabled={bankConnectLoading}
            startIcon={<BankIcon />}
          >
            {bankConnectLoading ? <CircularProgress size={24} /> : 'Connect to Monzo'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* SCA Pending Approval Dialog */}
      <Dialog
        open={pendingApprovalOpen}
        onClose={() => {
          setPendingApprovalOpen(false);
          setPendingId(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Approve in Monzo App</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 2 }}>
            <BankIcon sx={{ fontSize: 48, color: 'primary.main' }} />
            <Typography variant="body1" textAlign="center">
              Monzo requires you to approve this connection in your mobile app.
            </Typography>
            <Alert severity="info" sx={{ width: '100%' }}>
              Open your Monzo app, approve the access request, then click the button below.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setPendingApprovalOpen(false);
              setPendingId(null);
            }}
            color="inherit"
            disabled={completeConnectionLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCompleteConnection}
            variant="contained"
            disabled={completeConnectionLoading}
            startIcon={completeConnectionLoading ? <CircularProgress size={20} /> : <BankIcon />}
          >
            {completeConnectionLoading ? "Connecting..." : "I've Approved It"}
          </Button>
        </DialogActions>
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
