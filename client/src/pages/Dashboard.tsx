import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  TrendingUp,
  TrendingDown,
  Landmark,
  Building2,
  UserPlus,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Container } from '../components/primitives/Container';
import { Card } from '../components/primitives/Card';
import { Button } from '../components/primitives/Button';
import { Chip } from '../components/primitives/Chip';
import { Divider } from '../components/primitives/Divider';
import { Spinner } from '../components/primitives/Spinner';
import { api } from '../services/api';
import {
  Transaction,
  Event as EventType,
  PropertiesResponse,
  TransactionsResponse,
  TransactionSummaryResponse,
  EventsResponse,
} from '../types/api.types';
import { ApiError } from '../types/api.types';
import styles from './Dashboard.module.scss';

interface DashboardData {
  propertiesCount: number;
  income: number;
  expenses: number;
  net: number;
  recentTransactions: Transaction[];
  upcomingEvents: EventType[];
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData>({
    propertiesCount: 0,
    income: 0,
    expenses: 0,
    net: 0,
    recentTransactions: [],
    upcomingEvents: [],
  });
  const [transactionPage, setTransactionPage] = useState(1);
  const transactionsPerPage = 10;

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Calculate current month date range
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const fromDate = startOfMonth.toISOString().split('T')[0];
        const toDate = endOfMonth.toISOString().split('T')[0];

        // Fetch all data in parallel
        const [propertiesRes, summaryRes, transactionsRes, eventsRes] = await Promise.all([
          api.get<PropertiesResponse>('/properties'),
          api.get<TransactionSummaryResponse>('/transactions/summary', {
            params: { from_date: fromDate, to_date: toDate },
          }),
          api.get<TransactionsResponse>('/transactions'),
          api.get<EventsResponse>('/events', {
            params: {
              completed: false,
              fromDate: now.toISOString().split('T')[0],
            },
          }),
        ]);

        // Filter upcoming events and sort by date (earliest first), take first 5
        const upcomingEvents = eventsRes.data.events
          .filter((event) => new Date(event.scheduledDate) >= now)
          .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
          .slice(0, 5);

        // Store all transactions for pagination (already sorted by date desc in API)
        const recentTransactions = transactionsRes.data.transactions;

        setData({
          propertiesCount: propertiesRes.data.properties.length,
          income: summaryRes.data.summary.total_income,
          expenses: summaryRes.data.summary.total_expense,
          net: summaryRes.data.summary.net,
          recentTransactions,
          upcomingEvents,
        });
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        const errorMessage = err instanceof ApiError ? err.message : 'Failed to load dashboard data';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate paginated transactions
  const totalTransactionPages = Math.ceil(data.recentTransactions.length / transactionsPerPage);
  const paginatedTransactions = data.recentTransactions.slice(
    (transactionPage - 1) * transactionsPerPage,
    transactionPage * transactionsPerPage
  );

  const handleTransactionPageChange = (page: number) => {
    setTransactionPage(page);
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <div className={styles.loadingWrapper}>
          <Spinner size="large" />
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <div className={styles.page}>
          <h1 className={styles.title}>Dashboard</h1>
          <div className={styles.alert}>{error}</div>
        </div>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <div className={styles.page}>
        <h1 className={styles.title}>Dashboard</h1>

        {/* Overview Cards */}
        <div className={styles.statsGrid}>
          {/* Properties Count Card */}
          <Card className={styles.statCard}>
            <Card.Content>
              <div className={styles.statCardInner}>
                <Home size={40} className={`${styles.statIcon} ${styles.statIconPrimary}`} />
                <div>
                  <span className={styles.statLabel}>Properties</span>
                  <span className={styles.statValueH4}>{data.propertiesCount}</span>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Income Card */}
          <Card className={styles.statCard}>
            <Card.Content>
              <div className={styles.statCardInner}>
                <TrendingUp size={40} className={`${styles.statIcon} ${styles.statIconSuccess}`} />
                <div>
                  <span className={styles.statLabel}>Income (This Month)</span>
                  <span className={styles.statValueH5}>{formatCurrency(data.income)}</span>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Expenses Card */}
          <Card className={styles.statCard}>
            <Card.Content>
              <div className={styles.statCardInner}>
                <TrendingDown size={40} className={`${styles.statIcon} ${styles.statIconError}`} />
                <div>
                  <span className={styles.statLabel}>Expenses (This Month)</span>
                  <span className={styles.statValueH5}>{formatCurrency(data.expenses)}</span>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Net Card */}
          <Card className={styles.statCard}>
            <Card.Content>
              <div className={styles.statCardInner}>
                <Landmark size={40} className={`${styles.statIcon} ${styles.statIconPrimary}`} />
                <div>
                  <span className={styles.statLabel}>Net (This Month)</span>
                  <span
                    className={`${styles.statValueH5} ${data.net >= 0 ? styles.netPositive : styles.netNegative}`}
                  >
                    {formatCurrency(data.net)}
                  </span>
                </div>
              </div>
            </Card.Content>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className={styles.quickActions}>
          <h2 className={styles.quickActionsTitle}>Quick Actions</h2>
          <div className={styles.quickActionsGrid}>
            <Button
              variant="primary"
              fullWidth
              startIcon={<Building2 size={18} />}
              onClick={() => navigate('/properties')}
            >
              Add Property
            </Button>
            <Button
              variant="primary"
              fullWidth
              startIcon={<UserPlus size={18} />}
              onClick={() => navigate('/tenants')}
            >
              Add Tenant
            </Button>
            <Button
              variant="primary"
              fullWidth
              startIcon={<Plus size={18} />}
              onClick={() => navigate('/transactions')}
            >
              Add Transaction
            </Button>
            <Button
              variant="primary"
              fullWidth
              startIcon={<Calendar size={18} />}
              onClick={() => navigate('/events')}
            >
              Add Event
            </Button>
          </div>
        </div>

        {/* Two Column Layout for Events and Transactions */}
        <div className={styles.twoColumnGrid}>
          {/* Upcoming Events */}
          <div className={styles.sectionPanel}>
            <h2 className={styles.sectionTitle}>Upcoming Events</h2>
            {data.upcomingEvents.length === 0 ? (
              <p className={styles.emptyText}>No upcoming events</p>
            ) : (
              <div>
                {data.upcomingEvents.map((event, index) => (
                  <React.Fragment key={event.id}>
                    {index > 0 && <Divider />}
                    <div className={styles.listItem}>
                      <div className={styles.eventPrimary}>
                        <Chip
                          label={event.eventType}
                          size="small"
                          color="primary"
                        />
                        <span className={styles.eventDate}>
                          {formatDate(event.scheduledDate)}
                        </span>
                      </div>
                      <div className={styles.eventDescription}>
                        {event.description || 'No description'}
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          <div className={styles.sectionPanel}>
            <h2 className={styles.sectionTitle}>Recent Transactions</h2>
            {data.recentTransactions.length === 0 ? (
              <p className={styles.emptyText}>No recent transactions</p>
            ) : (
              <>
                <div>
                  {paginatedTransactions.map((transaction, index) => (
                    <React.Fragment key={transaction.id}>
                      {index > 0 && <Divider />}
                      <div className={styles.listItem}>
                        <div className={styles.transactionPrimary}>
                          <div className={styles.transactionLeft}>
                            <Chip
                              label={transaction.type}
                              size="small"
                              color={transaction.type === 'Income' ? 'success' : 'error'}
                            />
                            <span className={styles.transactionCategory}>
                              {transaction.category}
                            </span>
                          </div>
                          <span
                            className={`${styles.transactionAmount} ${
                              transaction.type === 'Income'
                                ? styles.amountIncome
                                : styles.amountExpense
                            }`}
                          >
                            {transaction.type === 'Income' ? '+' : '-'}
                            {formatCurrency(transaction.amount)}
                          </span>
                        </div>
                        <div className={styles.transactionSecondary}>
                          <span className={styles.transactionDescription}>
                            {transaction.description || 'No description'}
                          </span>
                          <span className={styles.transactionDate}>
                            {formatDate(transaction.transactionDate)}
                          </span>
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
                {totalTransactionPages > 1 && (
                  <div className={styles.paginationWrapper}>
                    <button
                      className={styles.paginationButton}
                      onClick={() => handleTransactionPageChange(transactionPage - 1)}
                      disabled={transactionPage <= 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    {Array.from({ length: totalTransactionPages }, (_, i) => i + 1).map(
                      (page) => (
                        <button
                          key={page}
                          className={`${styles.paginationButton} ${
                            page === transactionPage ? styles.paginationButtonActive : ''
                          }`}
                          onClick={() => handleTransactionPageChange(page)}
                          aria-label={`Page ${page}`}
                          aria-current={page === transactionPage ? 'page' : undefined}
                        >
                          {page}
                        </button>
                      )
                    )}
                    <button
                      className={styles.paginationButton}
                      onClick={() => handleTransactionPageChange(transactionPage + 1)}
                      disabled={transactionPage >= totalTransactionPages}
                      aria-label="Next page"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Container>
  );
};
