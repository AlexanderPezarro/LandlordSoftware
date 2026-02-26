import React, { useEffect, useState } from 'react';
import { Plus, Landmark } from 'lucide-react';
import { Container } from '../../components/primitives/Container';
import { Button } from '../../components/primitives/Button';
import { Spinner } from '../../components/primitives/Spinner';
import { Dialog } from '../../components/primitives/Dialog';
import { Select } from '../../components/primitives/Select';
import { bankService, BankAccount } from '../../services/api/bank.service';
import { ApiError } from '../../types/api.types';
import { useToast } from '../../contexts/ToastContext';
import { BankAccountsList } from '../../components/composed/bank';
import { ImportProgressDialog } from '../../components/composed/bank';
import { WebhookStatusWidget } from '../../components/composed/bank';
import styles from './BankAccounts.module.scss';

const SYNC_OPTIONS = [
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days (recommended)' },
  { value: '180', label: '6 months' },
  { value: '365', label: '1 year' },
  { value: '730', label: '2 years' },
  { value: '1825', label: '5 years (maximum)' },
];

export const BankAccounts: React.FC = () => {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);

  // Connect dialog state
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [syncFromDays, setSyncFromDays] = useState('90');
  const [connectLoading, setConnectLoading] = useState(false);

  // Import progress dialog state
  const [importProgressOpen, setImportProgressOpen] = useState(false);
  const [importSyncLogId, setImportSyncLogId] = useState<string>('');

  useEffect(() => {
    fetchAccounts();

    // Check for OAuth callback success/error in URL
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');
    const bankAccountId = params.get('bankAccountId');

    if (success === 'monzo_connected') {
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
    setSyncFromDays('90'); // Reset to default
    setConnectDialogOpen(true);
  };

  const handleCloseConnectDialog = () => {
    setConnectDialogOpen(false);
  };

  const handleConnectMonzo = async () => {
    try {
      setConnectLoading(true);
      const response = await bankService.connectMonzo(Number(syncFromDays));

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
          <h1 className={styles.title}>Bank Accounts</h1>
          <div className={styles.alert}>{error}</div>
        </div>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Bank Accounts</h1>
          <Button
            variant="primary"
            startIcon={<Plus size={18} />}
            onClick={handleOpenConnectDialog}
          >
            Connect New Account
          </Button>
        </div>

        {/* Webhook Status Widget - Only show if there are accounts */}
        {accounts.length > 0 && <WebhookStatusWidget />}

        {accounts.length === 0 ? (
          <div className={styles.empty}>
            <Landmark size={64} className={styles.emptyIcon} />
            <h2 className={styles.emptyTitle}>
              No bank accounts connected
            </h2>
            <p className={styles.emptyText}>
              Connect your Monzo account to automatically import and categorize transactions.
            </p>
            <Button
              variant="primary"
              startIcon={<Plus size={18} />}
              onClick={handleOpenConnectDialog}
            >
              Connect Your First Account
            </Button>
          </div>
        ) : (
          <BankAccountsList accounts={accounts} />
        )}
      </div>

      {/* Connect Bank Account Dialog */}
      <Dialog
        open={connectDialogOpen}
        onClose={handleCloseConnectDialog}
        size="medium"
      >
        <Dialog.Title>Connect Monzo Account</Dialog.Title>
        <Dialog.Content>
          <div className={styles.dialogBody}>
            <p className={styles.dialogHint}>
              Select how far back to import your transaction history. You can import transactions from the last 30 days up to 5 years.
            </p>
            <Select
              label="Import History"
              value={syncFromDays}
              onChange={(value) => setSyncFromDays(value)}
              options={SYNC_OPTIONS}
              helperText="Default: 90 days. Importing more history may take longer to process."
            />
          </div>
        </Dialog.Content>
        <Dialog.Actions>
          <Button variant="text" onClick={handleCloseConnectDialog} disabled={connectLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConnectMonzo}
            disabled={connectLoading}
            loading={connectLoading}
            startIcon={<Landmark size={18} />}
          >
            Connect to Monzo
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
