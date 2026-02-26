import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Clock,
  AlertTriangle,
  Settings,
  Scale,
} from 'lucide-react';
import { Card } from '../../primitives/Card';
import { Chip } from '../../primitives/Chip';
import { Button } from '../../primitives/Button';
import { Tooltip } from '../../primitives/Tooltip';
import type { BankAccount } from '../../../services/api/bank.service';
import styles from './bank.module.scss';

export interface BankAccountsListProps {
  accounts: BankAccount[];
}

const getStatusColor = (
  status: string
): 'success' | 'error' | 'warning' | 'default' => {
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
    case 'never_synced':
    default:
      return 'default';
  }
};

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'synced':
    case 'success':
      return <CheckCircle size={14} />;
    case 'syncing':
    case 'in_progress':
      return <RefreshCw size={14} />;
    case 'error':
    case 'failed':
      return <AlertCircle size={14} />;
    case 'never_synced':
      return <Clock size={14} />;
    default:
      return <AlertTriangle size={14} />;
  }
};

const formatStatus = (status: string): string => {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatLastSync = (lastSyncAt: string | null): string => {
  if (!lastSyncAt) {
    return 'Never synced';
  }

  const syncDate = new Date(lastSyncAt);
  const now = new Date();
  const diffMs = now.getTime() - syncDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return syncDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
};

const getWebhookStatus = (
  webhookId: string | null
): { label: string; color: 'success' | 'error' } => {
  if (webhookId) {
    return { label: 'Active', color: 'success' };
  }
  return { label: 'Inactive', color: 'error' };
};

export function BankAccountsList({ accounts }: BankAccountsListProps) {
  const navigate = useNavigate();

  return (
    <div className={styles.accountsGrid}>
      {accounts.map((account) => {
        const statusColor = getStatusColor(account.lastSyncStatus);
        const statusIcon = getStatusIcon(account.lastSyncStatus);
        const webhookStatus = getWebhookStatus(account.webhookId);

        return (
          <Card key={account.id} className={styles.accountCard}>
            <Card.Content>
              <div className={styles.accountHeader}>
                <div>
                  <h3 className={styles.accountName}>
                    {account.accountName}
                  </h3>
                  <span className={styles.accountMeta}>
                    {account.accountType} &bull; {account.provider}
                  </span>
                </div>
                <Chip
                  label={`${statusIcon ? '' : ''}${formatStatus(account.lastSyncStatus)}`}
                  color={statusColor}
                  size="small"
                />
              </div>

              <div className={styles.accountDetails}>
                <div>
                  <span className={styles.detailLabel}>Last Sync</span>
                  <span className={styles.detailValue}>
                    {formatLastSync(account.lastSyncAt)}
                  </span>
                </div>

                <div>
                  <span className={styles.detailLabel}>Webhook Status</span>
                  <Chip
                    label={webhookStatus.label}
                    color={webhookStatus.color}
                    size="small"
                  />
                </div>

                <div>
                  <span className={styles.detailLabel}>Pending Review</span>
                  <Chip
                    label={String(account.pendingCount || 0)}
                    size="small"
                    color={
                      (account.pendingCount || 0) > 0 ? 'warning' : 'default'
                    }
                  />
                </div>

                <div>
                  <span className={styles.detailLabel}>Sync Enabled</span>
                  <span className={styles.detailValue}>
                    {account.syncEnabled ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </Card.Content>

            <Card.Actions>
              <div className={styles.accountActions}>
                <Button
                  variant="text"
                  size="small"
                  startIcon={<Scale size={16} />}
                  onClick={() =>
                    navigate(`/admin/bank-accounts/${account.id}/rules`)
                  }
                >
                  Rules
                </Button>
                <Tooltip content="Settings (Coming soon)">
                  <Button
                    variant="icon"
                    size="small"
                    disabled
                    aria-label="Account settings"
                  >
                    <Settings size={16} />
                  </Button>
                </Tooltip>
              </div>
            </Card.Actions>
          </Card>
        );
      })}
    </div>
  );
}
