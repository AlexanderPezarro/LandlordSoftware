import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  InputAdornment,
  SelectChangeEvent,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Search as SearchIcon,
  AccountBalance as BankIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import {
  pendingTransactionsService,
  PendingTransaction,
} from '../../services/api/pendingTransactions.service';
import { bankService } from '../../services/api/bank.service';
import { ApiError } from '../../types/api.types';
import { useToast } from '../../contexts/ToastContext';
import PropertySelector from '../../components/shared/PropertySelector';
import { useProperties } from '../../contexts/PropertiesContext';

const TRANSACTION_TYPES = ['Income', 'Expense'] as const;
const INCOME_CATEGORIES = ['Rent', 'Security Deposit', 'Late Fee', 'Lease Fee'] as const;
const EXPENSE_CATEGORIES = [
  'Maintenance',
  'Repair',
  'Utilities',
  'Insurance',
  'Property Tax',
  'Management Fee',
  'Legal Fee',
  'Transport',
  'Other',
] as const;

interface BankAccount {
  id: string;
  accountName: string;
  accountType: string;
  provider: string;
}

export const PendingTransactions: React.FC = () => {
  const toast = useToast();
  const { properties } = useProperties();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  // Filter states
  const [bankAccountFilter, setBankAccountFilter] = useState<string>('all');
  const [reviewStatusFilter, setReviewStatusFilter] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Inline editing states - track which row is being edited
  const [editingRows, setEditingRows] = useState<Record<string, boolean>>({});
  const [savingRows, setSavingRows] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchData();
  }, [bankAccountFilter, reviewStatusFilter, searchQuery]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch pending transactions
      const filters: any = {};
      if (bankAccountFilter !== 'all') filters.bankAccountId = bankAccountFilter;
      if (reviewStatusFilter !== 'all') filters.reviewStatus = reviewStatusFilter;
      if (searchQuery) filters.search = searchQuery;

      const [transactions, accounts] = await Promise.all([
        pendingTransactionsService.getPendingTransactions(filters),
        bankService.getBankAccounts(),
      ]);

      setPendingTransactions(transactions);
      setBankAccounts(accounts);
    } catch (err) {
      console.error('Error fetching pending transactions:', err);
      const errorMessage =
        err instanceof ApiError ? err.message : 'Failed to load pending transactions';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateField = async (
    id: string,
    field: 'propertyId' | 'type' | 'category',
    value: string | null
  ) => {
    try {
      setSavingRows((prev) => ({ ...prev, [id]: true }));

      const updateData: any = {};
      updateData[field] = value;

      await pendingTransactionsService.updatePendingTransaction(id, updateData);

      // Update local state
      setPendingTransactions((prev) =>
        prev.map((tx) => (tx.id === id ? { ...tx, [field]: value } : tx))
      );

      toast.success('Updated successfully');
    } catch (err) {
      console.error('Error updating pending transaction:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to update';
      toast.error(errorMessage);
    } finally {
      setSavingRows((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleApprove = async (tx: PendingTransaction) => {
    // Validate required fields
    if (!tx.propertyId) {
      toast.error('Please select a property before approving');
      return;
    }
    if (!tx.type) {
      toast.error('Please select a transaction type before approving');
      return;
    }
    if (!tx.category) {
      toast.error('Please select a category before approving');
      return;
    }

    try {
      setSavingRows((prev) => ({ ...prev, [tx.id]: true }));

      await pendingTransactionsService.approvePendingTransaction(tx.id);
      toast.success('Transaction approved successfully');

      // Refresh the list
      await fetchData();
    } catch (err) {
      console.error('Error approving transaction:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to approve transaction';
      toast.error(errorMessage);
    } finally {
      setSavingRows((prev) => ({ ...prev, [tx.id]: false }));
    }
  };

  const getCategoriesForType = (type: string | null): readonly string[] => {
    if (type === 'Income') return INCOME_CATEGORIES;
    if (type === 'Expense') return EXPENSE_CATEGORIES;
    return [];
  };

  const formatAmount = (amount: number, currency: string) => {
    const absAmount = Math.abs(amount / 100); // Convert from pence to pounds
    const formatted = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency || 'GBP',
    }).format(absAmount);
    return amount < 0 ? `-${formatted}` : formatted;
  };

  const isRowComplete = (tx: PendingTransaction): boolean => {
    return !!(tx.propertyId && tx.type && tx.category);
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Pending Transactions Review
          </Typography>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Pending Transactions Review
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Review and categorize imported bank transactions before approving them.
        </Typography>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              label="Search"
              placeholder="Search by description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ flex: '1 1 300px', minWidth: 200 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            <FormControl sx={{ flex: '0 0 200px', minWidth: 200 }}>
              <InputLabel>Bank Account</InputLabel>
              <Select
                value={bankAccountFilter}
                label="Bank Account"
                onChange={(e) => setBankAccountFilter(e.target.value)}
              >
                <MenuItem value="all">All Accounts</MenuItem>
                {bankAccounts.map((account) => (
                  <MenuItem key={account.id} value={account.id}>
                    {account.accountName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ flex: '0 0 200px', minWidth: 200 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={reviewStatusFilter}
                label="Status"
                onChange={(e) => setReviewStatusFilter(e.target.value)}
              >
                <MenuItem value="pending">Pending Review</MenuItem>
                <MenuItem value="reviewed">Reviewed</MenuItem>
                <MenuItem value="all">All</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Paper>

        {/* Transactions Table */}
        {pendingTransactions.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <BankIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No pending transactions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {reviewStatusFilter === 'pending'
                ? 'All transactions have been reviewed!'
                : 'No transactions found matching your filters.'}
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Bank Account</TableCell>
                  <TableCell sx={{ minWidth: 200 }}>Property</TableCell>
                  <TableCell sx={{ minWidth: 140 }}>Type</TableCell>
                  <TableCell sx={{ minWidth: 180 }}>Category</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingTransactions.map((tx) => (
                  <TableRow
                    key={tx.id}
                    sx={{
                      backgroundColor: tx.reviewedAt ? 'action.hover' : 'inherit',
                      opacity: savingRows[tx.id] ? 0.6 : 1,
                    }}
                  >
                    <TableCell>
                      {format(new Date(tx.transactionDate), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{tx.description}</Typography>
                      {tx.bankTransaction.counterpartyName && (
                        <Typography variant="caption" color="text.secondary">
                          {tx.bankTransaction.counterpartyName}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 'medium',
                          color: tx.amount > 0 ? 'success.main' : 'error.main',
                        }}
                      >
                        {formatAmount(tx.amount, tx.currency)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{tx.bankAccount.accountName}</Typography>
                    </TableCell>
                    <TableCell>
                      <PropertySelector
                        value={tx.propertyId || ''}
                        onChange={(propertyId) => handleUpdateField(tx.id, 'propertyId', propertyId)}
                        disabled={!!tx.reviewedAt || savingRows[tx.id]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select
                          value={tx.type || ''}
                          onChange={(e: SelectChangeEvent) =>
                            handleUpdateField(tx.id, 'type', e.target.value)
                          }
                          disabled={!!tx.reviewedAt || savingRows[tx.id]}
                          displayEmpty
                        >
                          <MenuItem value="">
                            <em>Select type</em>
                          </MenuItem>
                          {TRANSACTION_TYPES.map((type) => (
                            <MenuItem key={type} value={type}>
                              {type}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select
                          value={tx.category || ''}
                          onChange={(e: SelectChangeEvent) =>
                            handleUpdateField(tx.id, 'category', e.target.value)
                          }
                          disabled={!tx.type || !!tx.reviewedAt || savingRows[tx.id]}
                          displayEmpty
                        >
                          <MenuItem value="">
                            <em>Select category</em>
                          </MenuItem>
                          {getCategoriesForType(tx.type).map((category) => (
                            <MenuItem key={category} value={category}>
                              {category}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell align="center">
                      {tx.reviewedAt ? (
                        <Chip label="Reviewed" size="small" color="success" />
                      ) : (
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          startIcon={<ApproveIcon />}
                          onClick={() => handleApprove(tx)}
                          disabled={!isRowComplete(tx) || savingRows[tx.id]}
                        >
                          Approve
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Container>
  );
};
