import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Pagination,
} from '@mui/material';
import {
  Home as HomeIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccountBalance as AccountBalanceIcon,
  Add as AddIcon,
  PersonAdd as PersonAddIcon,
  AddBusiness as AddBusinessIcon,
  Event as EventIcon,
} from '@mui/icons-material';
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

  const handleTransactionPageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setTransactionPage(value);
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
            Dashboard
          </Typography>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>

        {/* Overview Cards */}
        {/* Note: Using CSS Grid instead of MUI Grid for MUI v7 compatibility (Grid component deprecated in v7) */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            gap: 3,
            mb: 4,
          }}
        >
          {/* Properties Count Card */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <HomeIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Properties
                  </Typography>
                  <Typography variant="h4">{data.propertiesCount}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Income Card */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUpIcon sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Income (This Month)
                  </Typography>
                  <Typography variant="h5">{formatCurrency(data.income)}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Expenses Card */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingDownIcon sx={{ fontSize: 40, color: 'error.main', mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Expenses (This Month)
                  </Typography>
                  <Typography variant="h5">{formatCurrency(data.expenses)}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Net Card */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AccountBalanceIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Net (This Month)
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      color: data.net >= 0 ? 'success.main' : 'error.main',
                    }}
                  >
                    {formatCurrency(data.net)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Quick Actions */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(4, 1fr)',
              },
              gap: 2,
            }}
          >
            <Button
              variant="contained"
              color="primary"
              fullWidth
              startIcon={<AddBusinessIcon />}
              onClick={() => navigate('/properties')}
            >
              Add Property
            </Button>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              startIcon={<PersonAddIcon />}
              onClick={() => navigate('/tenants')}
            >
              Add Tenant
            </Button>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              startIcon={<AddIcon />}
              onClick={() => navigate('/transactions')}
            >
              Add Transaction
            </Button>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              startIcon={<EventIcon />}
              onClick={() => navigate('/events')}
            >
              Add Event
            </Button>
          </Box>
        </Paper>

        {/* Two Column Layout for Events and Transactions */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, 1fr)',
            },
            gap: 3,
          }}
        >
          {/* Upcoming Events */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Upcoming Events
            </Typography>
            {data.upcomingEvents.length === 0 ? (
              <Typography color="text.secondary" sx={{ mt: 2 }}>
                No upcoming events
              </Typography>
            ) : (
              <List>
                {data.upcomingEvents.map((event, index) => (
                  <React.Fragment key={event.id}>
                    {index > 0 && <Divider />}
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={event.eventType}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                            <Typography variant="body2">
                              {formatDate(event.scheduledDate)}
                            </Typography>
                          </Box>
                        }
                        secondary={event.description || 'No description'}
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>

          {/* Recent Transactions */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Transactions
            </Typography>
            {data.recentTransactions.length === 0 ? (
              <Typography color="text.secondary" sx={{ mt: 2 }}>
                No recent transactions
              </Typography>
            ) : (
              <>
                <List>
                  {paginatedTransactions.map((transaction, index) => (
                    <React.Fragment key={transaction.id}>
                      {index > 0 && <Divider />}
                      <ListItem sx={{ px: 0 }}>
                        <ListItemText
                          primary={
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <Box>
                                <Chip
                                  label={transaction.type}
                                  size="small"
                                  color={transaction.type === 'Income' ? 'success' : 'error'}
                                  sx={{ mr: 1 }}
                                />
                                <Typography variant="body2" component="span">
                                  {transaction.category}
                                </Typography>
                              </Box>
                              <Typography
                                variant="body1"
                                fontWeight="bold"
                                sx={{
                                  color:
                                    transaction.type === 'Income' ? 'success.main' : 'error.main',
                                }}
                              >
                                {transaction.type === 'Income' ? '+' : '-'}
                                {formatCurrency(transaction.amount)}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                              <Typography variant="caption">
                                {transaction.description || 'No description'}
                              </Typography>
                              <Typography variant="caption">
                                {formatDate(transaction.transactionDate)}
                              </Typography>
                            </Box>
                          }
                          slotProps={{ secondary: { component: 'div' } }}
                        />
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
                {totalTransactionPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Pagination
                      count={totalTransactionPages}
                      page={transactionPage}
                      onChange={handleTransactionPageChange}
                      color="primary"
                    />
                  </Box>
                )}
              </>
            )}
          </Paper>
        </Box>
      </Box>
    </Container>
  );
};
