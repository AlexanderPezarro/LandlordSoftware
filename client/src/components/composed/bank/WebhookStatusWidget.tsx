import { useEffect, useState } from 'react';
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Webhook,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { Card } from '../../primitives/Card';
import { Chip } from '../../primitives/Chip';
import { Button } from '../../primitives/Button';
import { Table } from '../../primitives/Table';
import { Spinner } from '../../primitives/Spinner';
import { Tooltip } from '../../primitives/Tooltip';
import {
  bankService,
  type WebhookStatusData,
} from '../../../services/api/bank.service';
import { ApiError } from '../../../types/api.types';
import { useToast } from '../../../contexts/ToastContext';
import { formatDistanceToNow } from 'date-fns';
import styles from './bank.module.scss';

type HealthStatus = 'healthy' | 'warning' | 'critical';

const getHealthStatus = (data: WebhookStatusData | null): HealthStatus => {
  if (!data) return 'healthy';
  if (data.failedCount1h >= 3) return 'critical';
  if (data.failedCount24h > 0) return 'warning';
  return 'healthy';
};

const getHealthColor = (
  status: HealthStatus
): 'success' | 'warning' | 'error' => {
  switch (status) {
    case 'healthy':
      return 'success';
    case 'warning':
      return 'warning';
    case 'critical':
      return 'error';
  }
};

const getHealthIcon = (status: HealthStatus) => {
  switch (status) {
    case 'healthy':
      return <CheckCircle size={24} />;
    case 'warning':
      return <AlertTriangle size={24} />;
    case 'critical':
      return <AlertCircle size={24} />;
  }
};

const getHealthIconClass = (status: HealthStatus) => {
  switch (status) {
    case 'healthy':
      return styles.healthIconSuccess;
    case 'warning':
      return styles.healthIconWarning;
    case 'critical':
      return styles.healthIconCritical;
  }
};

const getHealthMessage = (
  status: HealthStatus,
  data: WebhookStatusData | null
) => {
  if (!data) return 'No data';

  switch (status) {
    case 'healthy':
      return 'All webhooks operating normally';
    case 'warning':
      return `${data.failedCount24h} failed webhook${data.failedCount24h > 1 ? 's' : ''} in last 24 hours`;
    case 'critical':
      return `${data.failedCount1h} failed webhooks in last hour (critical)`;
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

export function WebhookStatusWidget() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [webhookStatus, setWebhookStatus] =
    useState<WebhookStatusData | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchWebhookStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bankService.getWebhookStatus();
      setWebhookStatus(data);
    } catch (err) {
      console.error('Error fetching webhook status:', err);
      const errorMessage =
        err instanceof ApiError
          ? err.message
          : 'Failed to load webhook status';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhookStatus();
  }, []);

  const handleRefresh = async () => {
    await fetchWebhookStatus();
    toast.success('Webhook status refreshed');
  };

  if (loading) {
    return (
      <Card className={styles.webhookCard}>
        <Card.Content>
          <div className={styles.loadingCenter}>
            <Spinner size="small" />
          </div>
        </Card.Content>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={styles.webhookCard}>
        <Card.Content>
          <div className={styles.errorAlertWidget}>
            <AlertCircle size={20} className={styles.alertIcon} />
            <span className={styles.alertText}>{error}</span>
          </div>
        </Card.Content>
      </Card>
    );
  }

  if (!webhookStatus) {
    return null;
  }

  const healthStatus = getHealthStatus(webhookStatus);

  return (
    <Card className={styles.webhookCard}>
      <Card.Content>
        <div className={styles.webhookHeader}>
          <div className={styles.webhookHeaderLeft}>
            <span className={styles.webhookIcon}>
              <Webhook size={24} />
            </span>
            <h3 className={styles.webhookTitle}>Webhook Health</h3>
          </div>
          <Tooltip content="Refresh status">
            <Button
              variant="icon"
              size="small"
              onClick={handleRefresh}
              aria-label="Refresh webhook status"
            >
              <RefreshCw size={16} />
            </Button>
          </Tooltip>
        </div>

        <div className={styles.webhookBody}>
          {/* Overall Health Status */}
          <div className={styles.healthRow}>
            <span className={getHealthIconClass(healthStatus)}>
              {getHealthIcon(healthStatus)}
            </span>
            <div className={styles.healthInfo}>
              <span className={styles.healthLabel}>Status</span>
              <span className={styles.healthMessage}>
                {getHealthMessage(healthStatus, webhookStatus)}
              </span>
            </div>
            {webhookStatus.failedCount24h > 0 && (
              <Chip
                label={`${webhookStatus.failedCount24h} failed`}
                color={getHealthColor(healthStatus)}
                size="small"
              />
            )}
          </div>

          {/* Last Event Timestamp */}
          <div>
            <span className={styles.lastEventLabel}>Last Webhook Event</span>
            <span className={styles.lastEventValue}>
              {formatTimestamp(webhookStatus.lastEventTimestamp)}
            </span>
          </div>

          {/* Expand Toggle */}
          <div>
            <Button
              variant="secondary"
              size="small"
              startIcon={
                expanded ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )
              }
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Hide' : 'View'} Webhook History
            </Button>
          </div>
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div className={styles.expandedSection}>
            <h4 className={styles.expandedSectionTitle}>
              Recent Webhook Events ({webhookStatus.recentEvents.length})
            </h4>
            {webhookStatus.recentEvents.length === 0 ? (
              <div className={styles.infoAlert}>
                <Info size={20} />
                <span className={styles.infoAlertText}>
                  No webhook events recorded yet
                </span>
              </div>
            ) : (
              <Table.Container>
                <Table>
                  <Table.Head>
                    <Table.Row>
                      <Table.Cell sortable={false}>Account</Table.Cell>
                      <Table.Cell sortable={false}>Status</Table.Cell>
                      <Table.Cell sortable={false}>Timestamp</Table.Cell>
                      <Table.Cell sortable={false}>Transactions</Table.Cell>
                      <Table.Cell sortable={false}>Error</Table.Cell>
                    </Table.Row>
                  </Table.Head>
                  <Table.Body>
                    {webhookStatus.recentEvents.map((event) => (
                      <Table.Row key={event.id}>
                        <Table.Cell>{event.accountName}</Table.Cell>
                        <Table.Cell>
                          <Chip
                            label={event.status}
                            color={
                              event.status === 'success' ? 'success' : 'error'
                            }
                            size="small"
                          />
                        </Table.Cell>
                        <Table.Cell>
                          {formatTimestamp(event.startedAt)}
                        </Table.Cell>
                        <Table.Cell>{event.transactionsFetched}</Table.Cell>
                        <Table.Cell>
                          {event.errorMessage ? (
                            <Tooltip content={event.errorMessage}>
                              <span className={styles.errorText}>
                                {event.errorMessage.substring(0, 30)}
                                {event.errorMessage.length > 30 ? '...' : ''}
                              </span>
                            </Tooltip>
                          ) : (
                            '-'
                          )}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </Table.Container>
            )}

            {webhookStatus.accountStatuses.length > 0 && (
              <>
                <h4 className={styles.expandedSectionTitleSpaced}>
                  Per-Account Status
                </h4>
                <Table.Container>
                  <Table>
                    <Table.Head>
                      <Table.Row>
                        <Table.Cell sortable={false}>Account</Table.Cell>
                        <Table.Cell sortable={false}>Last Webhook</Table.Cell>
                        <Table.Cell sortable={false}>Status</Table.Cell>
                      </Table.Row>
                    </Table.Head>
                    <Table.Body>
                      {webhookStatus.accountStatuses.map((status) => (
                        <Table.Row key={status.accountId}>
                          <Table.Cell>{status.accountName}</Table.Cell>
                          <Table.Cell>
                            {formatTimestamp(status.lastWebhookAt)}
                          </Table.Cell>
                          <Table.Cell>
                            {status.lastWebhookStatus ? (
                              <Chip
                                label={status.lastWebhookStatus}
                                color={
                                  status.lastWebhookStatus === 'success'
                                    ? 'success'
                                    : 'error'
                                }
                                size="small"
                              />
                            ) : (
                              '-'
                            )}
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table>
                </Table.Container>
              </>
            )}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
