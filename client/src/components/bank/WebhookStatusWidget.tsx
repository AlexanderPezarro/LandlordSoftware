import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Webhook as WebhookIcon,
} from '@mui/icons-material';
import { bankService, WebhookStatusData } from '../../services/api/bank.service';
import { ApiError } from '../../types/api.types';
import { useToast } from '../../contexts/ToastContext';
import { formatDistanceToNow } from 'date-fns';

export const WebhookStatusWidget: React.FC = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatusData | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchWebhookStatus();
  }, []);

  const fetchWebhookStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bankService.getWebhookStatus();
      setWebhookStatus(data);
    } catch (err) {
      console.error('Error fetching webhook status:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load webhook status';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchWebhookStatus();
    toast.success('Webhook status refreshed');
  };

  const getHealthStatus = (): 'healthy' | 'warning' | 'critical' => {
    if (!webhookStatus) return 'healthy';
    if (webhookStatus.failedCount1h >= 3) return 'critical';
    if (webhookStatus.failedCount24h > 0) return 'warning';
    return 'healthy';
  };

  const getHealthColor = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'error';
    }
  };

  const getHealthIcon = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'critical':
        return <ErrorIcon color="error" />;
    }
  };

  const getHealthMessage = (status: 'healthy' | 'warning' | 'critical') => {
    if (!webhookStatus) return 'No data';

    switch (status) {
      case 'healthy':
        return 'All webhooks operating normally';
      case 'warning':
        return `${webhookStatus.failedCount24h} failed webhook${webhookStatus.failedCount24h > 1 ? 's' : ''} in last 24 hours`;
      case 'critical':
        return `${webhookStatus.failedCount1h} failed webhooks in last hour (critical)`;
    }
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  if (!webhookStatus) {
    return null;
  }

  const healthStatus = getHealthStatus();

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WebhookIcon color="primary" />
            <Typography variant="h6">Webhook Health</Typography>
          </Box>
          <Tooltip title="Refresh status">
            <IconButton onClick={handleRefresh} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Overall Health Status */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {getHealthIcon(healthStatus)}
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Status
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {getHealthMessage(healthStatus)}
              </Typography>
            </Box>
            {webhookStatus.failedCount24h > 0 && (
              <Chip
                label={`${webhookStatus.failedCount24h} failed`}
                color={getHealthColor(healthStatus)}
                size="small"
              />
            )}
          </Box>

          {/* Last Event Timestamp */}
          <Box>
            <Typography variant="body2" color="text.secondary">
              Last Webhook Event
            </Typography>
            <Typography variant="body1">
              {formatTimestamp(webhookStatus.lastEventTimestamp)}
            </Typography>
          </Box>

          {/* Quick Actions */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Hide' : 'View'} Webhook History
            </Button>
          </Box>
        </Box>

        {/* Expandable Details */}
        <Collapse in={expanded}>
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Recent Webhook Events ({webhookStatus.recentEvents.length})
            </Typography>
            {webhookStatus.recentEvents.length === 0 ? (
              <Alert severity="info">No webhook events recorded yet</Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Account</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>Transactions</TableCell>
                      <TableCell>Error</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {webhookStatus.recentEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>{event.accountName}</TableCell>
                        <TableCell>
                          <Chip
                            label={event.status}
                            color={event.status === 'success' ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{formatTimestamp(event.startedAt)}</TableCell>
                        <TableCell>{event.transactionsFetched}</TableCell>
                        <TableCell>
                          {event.errorMessage ? (
                            <Tooltip title={event.errorMessage}>
                              <Typography variant="body2" sx={{ cursor: 'help' }}>
                                {event.errorMessage.substring(0, 30)}
                                {event.errorMessage.length > 30 ? '...' : ''}
                              </Typography>
                            </Tooltip>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {webhookStatus.accountStatuses.length > 0 && (
              <>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
                  Per-Account Status
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Account</TableCell>
                        <TableCell>Last Webhook</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {webhookStatus.accountStatuses.map((status) => (
                        <TableRow key={status.accountId}>
                          <TableCell>{status.accountName}</TableCell>
                          <TableCell>{formatTimestamp(status.lastWebhookAt)}</TableCell>
                          <TableCell>
                            {status.lastWebhookStatus ? (
                              <Chip
                                label={status.lastWebhookStatus}
                                color={status.lastWebhookStatus === 'success' ? 'success' : 'error'}
                                size="small"
                              />
                            ) : (
                              '-'
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};
