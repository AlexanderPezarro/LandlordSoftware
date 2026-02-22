import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Button,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Sync as SyncIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Rule as RuleIcon,
} from '@mui/icons-material';
import type { BankAccount } from '../../services/api/bank.service';

interface BankAccountsListProps {
  accounts: BankAccount[];
}

const BankAccountsList: React.FC<BankAccountsListProps> = ({ accounts }) => {
  const navigate = useNavigate();

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'default' => {
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
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'synced':
      case 'success':
        return <CheckCircleIcon fontSize="small" />;
      case 'syncing':
      case 'in_progress':
        return <SyncIcon fontSize="small" />;
      case 'error':
      case 'failed':
        return <ErrorIcon fontSize="small" />;
      case 'never_synced':
        return <ScheduleIcon fontSize="small" />;
      default:
        return <WarningIcon fontSize="small" />;
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

  const getWebhookStatus = (webhookId: string | null): { label: string; color: 'success' | 'error' | 'default' } => {
    if (webhookId) {
      return { label: 'Active', color: 'success' };
    }
    return { label: 'Inactive', color: 'error' };
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
        },
        gap: 3,
      }}
    >
      {accounts.map((account) => {
        const statusColor = getStatusColor(account.lastSyncStatus);
        const statusIcon = getStatusIcon(account.lastSyncStatus);
        const webhookStatus = getWebhookStatus(account.webhookId);

        return (
          <Card
            key={account.id}
            elevation={2}
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <CardContent sx={{ flexGrow: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                    {account.accountName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {account.accountType} • {account.provider}
                  </Typography>
                </Box>
                <Chip
                  icon={statusIcon}
                  label={formatStatus(account.lastSyncStatus)}
                  color={statusColor}
                  size="small"
                />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Last Sync
                  </Typography>
                  <Typography variant="body2">
                    {formatLastSync(account.lastSyncAt)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Webhook Status
                  </Typography>
                  <Chip
                    label={webhookStatus.label}
                    color={webhookStatus.color}
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Pending Review
                  </Typography>
                  <Chip
                    label={account.pendingCount || 0}
                    size="small"
                    color={(account.pendingCount || 0) > 0 ? 'warning' : 'default'}
                    sx={{ mt: 0.5 }}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Sync Enabled
                  </Typography>
                  <Typography variant="body2">
                    {account.syncEnabled ? 'Yes' : 'No'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>

            <CardActions sx={{ justifyContent: 'space-between', pt: 0, px: 2, pb: 2 }}>
              <Button
                size="small"
                startIcon={<RuleIcon />}
                onClick={() => navigate(`/admin/bank-accounts/${account.id}/rules`)}
              >
                Rules
              </Button>
              <Tooltip title="Settings (Coming soon)">
                <span>
                  <IconButton
                    size="small"
                    color="primary"
                    disabled
                    aria-label="Account settings"
                  >
                    <SettingsIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </CardActions>
          </Card>
        );
      })}
    </Box>
  );
};

export default BankAccountsList;
