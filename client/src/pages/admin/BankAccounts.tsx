import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
} from '@mui/material';
import {
  Add as AddIcon,
  AccountBalance as BankIcon,
} from '@mui/icons-material';
import { bankService } from '../../services/api/bank.service';
import { ApiError } from '../../types/api.types';
import { useToast } from '../../contexts/ToastContext';
import BankAccountsList from '../../components/bank/BankAccountsList';

export interface BankAccount {
  id: string;
  accountId: string;
  accountName: string;
  accountType: string;
  provider: string;
  syncEnabled: boolean;
  syncFromDate: string;
  lastSyncAt: string | null;
  lastSyncStatus: string;
  webhookId: string | null;
  webhookUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export const BankAccounts: React.FC = () => {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);

  // Connect dialog state
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [syncFromDays, setSyncFromDays] = useState(90);
  const [connectLoading, setConnectLoading] = useState(false);

  useEffect(() => {
    fetchAccounts();

    // Check for OAuth callback success/error in URL
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');

    if (success === 'monzo_connected') {
      toast.success('Monzo account connected successfully');
      // Clean up URL
      window.history.replaceState({}, '', '/admin/bank-accounts');
    } else if (error) {
      const errorMessages: Record<string, string> = {
        access_denied: 'You denied access to your Monzo account',
        missing_code: 'Authorization failed: missing code',
        missing_state: 'Authorization failed: invalid request',
        oauth_failed: 'Failed to connect Monzo account. Please try again.',
      };
      toast.error(errorMessages[error] || 'Failed to connect Monzo account');
      // Clean up URL
      window.history.replaceState({}, '', '/admin/bank-accounts');
    }
  }, [toast]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedAccounts = await bankService.getBankAccounts();
      setAccounts(fetchedAccounts);
    } catch (err) {
      console.error('Error fetching bank accounts:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load bank accounts';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenConnectDialog = () => {
    setSyncFromDays(90); // Reset to default
    setConnectDialogOpen(true);
  };

  const handleCloseConnectDialog = () => {
    setConnectDialogOpen(false);
  };

  const handleConnectMonzo = async () => {
    try {
      setConnectLoading(true);
      const response = await bankService.connectMonzo(syncFromDays);

      // Redirect to Monzo OAuth page
      window.location.href = response.authUrl;
    } catch (err) {
      console.error('Error connecting Monzo:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to connect Monzo account';
      toast.error(errorMessage);
      setConnectLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Bank Accounts
          </Typography>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Bank Accounts
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenConnectDialog}
          >
            Connect New Account
          </Button>
        </Box>

        {accounts.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <BankIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No bank accounts connected
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Connect your Monzo account to automatically import and categorize transactions.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenConnectDialog}
            >
              Connect Your First Account
            </Button>
          </Box>
        ) : (
          <BankAccountsList accounts={accounts} onRefresh={fetchAccounts} />
        )}
      </Box>

      {/* Connect Bank Account Dialog */}
      <Dialog
        open={connectDialogOpen}
        onClose={handleCloseConnectDialog}
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
          <Button onClick={handleCloseConnectDialog} color="inherit" disabled={connectLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleConnectMonzo}
            variant="contained"
            disabled={connectLoading}
            startIcon={<BankIcon />}
          >
            {connectLoading ? <CircularProgress size={24} /> : 'Connect to Monzo'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
