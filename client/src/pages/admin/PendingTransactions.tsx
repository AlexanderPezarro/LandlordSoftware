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
  Chip,
  InputAdornment,
  SelectChangeEvent,
  Checkbox,
  Toolbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Search as SearchIcon,
  AccountBalance as BankIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
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
  useProperties(); // Initialize properties context

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  // Filter states
  const [bankAccountFilter, setBankAccountFilter] = useState<string>('all');
  const [reviewStatusFilter, setReviewStatusFilter] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Inline editing states - track which row is being saved
  const [savingRows, setSavingRows] = useState<Record<string, boolean>>({});

  // Bulk selection states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkUpdateDialogOpen, setBulkUpdateDialogOpen] = useState(false);
  const [bulkRejectDialogOpen, setBulkRejectDialogOpen] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Bulk update form
  const [bulkUpdateProperty, setBulkUpdateProperty] = useState<string>('');
  const [bulkUpdateType, setBulkUpdateType] = useState<string>('');
  const [bulkUpdateCategory, setBulkUpdateCategory] = useState<string>('');

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

      // Clear selection if transactions list changes
      setSelectedIds(new Set());
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
    // Store original value for revert on failure
    const originalTx = pendingTransactions.find((tx) => tx.id === id);
    const originalValue = originalTx?.[field];

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

      // Revert to original value on failure
      setPendingTransactions((prev) =>
        prev.map((tx) => (tx.id === id ? { ...tx, [field]: originalValue } : tx))
      );
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

  // Bulk selection handlers
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const unreviewedIds = pendingTransactions
        .filter((tx) => !tx.reviewedAt)
        .map((tx) => tx.id);
      setSelectedIds(new Set(unreviewedIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const isSelected = (id: string) => selectedIds.has(id);

  const unreviewedCount = pendingTransactions.filter((tx) => !tx.reviewedAt).length;
  const isAllSelected = unreviewedCount > 0 && selectedIds.size === unreviewedCount;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < unreviewedCount;

  // Bulk approve handler
  const handleBulkApprove = async () => {
    try {
      setBulkUpdating(true);
      const ids = Array.from(selectedIds);

      await pendingTransactionsService.bulkApprovePendingTransactions(ids);
      toast.success(`Successfully approved ${ids.length} transaction(s)`);

      // Refresh the list
      await fetchData();
    } catch (err) {
      console.error('Error bulk approving transactions:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to approve transactions';
      toast.error(errorMessage);
    } finally {
      setBulkUpdating(false);
    }
  };

  // Bulk update handlers
  const handleOpenBulkUpdate = () => {
    setBulkUpdateProperty('');
    setBulkUpdateType('');
    setBulkUpdateCategory('');
    setBulkUpdateDialogOpen(true);
  };

  const handleCloseBulkUpdate = () => {
    setBulkUpdateDialogOpen(false);
  };

  const handleBulkUpdate = async () => {
    try {
      setBulkUpdating(true);
      const ids = Array.from(selectedIds);

      const updates: any = {};
      if (bulkUpdateProperty) updates.propertyId = bulkUpdateProperty;
      if (bulkUpdateType) updates.type = bulkUpdateType;
      if (bulkUpdateCategory) updates.category = bulkUpdateCategory;

      if (Object.keys(updates).length === 0) {
        toast.error('Please select at least one field to update');
        setBulkUpdating(false);
        return;
      }

      const result = await pendingTransactionsService.bulkUpdatePendingTransactions(ids, updates);
      toast.success(result.message);

      // Refresh the list
      await fetchData();
      handleCloseBulkUpdate();
    } catch (err) {
      console.error('Error bulk updating transactions:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to update transactions';
      toast.error(errorMessage);
    } finally {
      setBulkUpdating(false);
    }
  };

  // Bulk reject handlers
  const handleOpenBulkReject = () => {
    setBulkRejectDialogOpen(true);
  };

  const handleCloseBulkReject = () => {
    setBulkRejectDialogOpen(false);
  };

  const handleBulkReject = async () => {
    try {
      setBulkUpdating(true);
      const ids = Array.from(selectedIds);

      const result = await pendingTransactionsService.bulkRejectPendingTransactions(ids);
      toast.success(result.message);

      // Refresh the list
      await fetchData();
      handleCloseBulkReject();
    } catch (err) {
      console.error('Error bulk rejecting transactions:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to reject transactions';
      toast.error(errorMessage);
    } finally {
      setBulkUpdating(false);
    }
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

        {/* Bulk Actions Toolbar */}
        {selectedIds.size > 0 && (
          <Paper sx={{ mb: 2 }}>
            <Toolbar sx={{ gap: 2 }}>
              <Typography variant="subtitle1" sx={{ flex: '1 1 100%' }}>
                {selectedIds.size} transaction(s) selected
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<ApproveIcon />}
                onClick={handleBulkApprove}
                disabled={bulkUpdating}
              >
                Approve Selected
              </Button>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={handleOpenBulkUpdate}
                disabled={bulkUpdating}
              >
                Update Selected
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleOpenBulkReject}
                disabled={bulkUpdating}
              >
                Reject Selected
              </Button>
            </Toolbar>
          </Paper>
        )}

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
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={isSomeSelected}
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      disabled={unreviewedCount === 0}
                    />
                  </TableCell>
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
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected(tx.id)}
                        onChange={() => handleSelectOne(tx.id)}
                        disabled={!!tx.reviewedAt}
                      />
                    </TableCell>
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
                        includeAllOption={false}
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

        {/* Bulk Update Dialog */}
        <Dialog
          open={bulkUpdateDialogOpen}
          onClose={handleCloseBulkUpdate}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Bulk Update Transactions</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 3 }}>
              Update the following fields for {selectedIds.size} selected transaction(s). Leave
              fields empty to keep existing values.
            </DialogContentText>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <PropertySelector
                value={bulkUpdateProperty}
                onChange={setBulkUpdateProperty}
                includeAllOption={false}
              />

              <FormControl fullWidth>
                <InputLabel>Type (optional)</InputLabel>
                <Select
                  value={bulkUpdateType}
                  label="Type (optional)"
                  onChange={(e) => setBulkUpdateType(e.target.value)}
                >
                  <MenuItem value="">
                    <em>No change</em>
                  </MenuItem>
                  {TRANSACTION_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Category (optional)</InputLabel>
                <Select
                  value={bulkUpdateCategory}
                  label="Category (optional)"
                  onChange={(e) => setBulkUpdateCategory(e.target.value)}
                  disabled={!bulkUpdateType}
                >
                  <MenuItem value="">
                    <em>No change</em>
                  </MenuItem>
                  {getCategoriesForType(bulkUpdateType).map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseBulkUpdate} disabled={bulkUpdating}>
              Cancel
            </Button>
            <Button onClick={handleBulkUpdate} variant="contained" disabled={bulkUpdating}>
              {bulkUpdating ? 'Updating...' : 'Update'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Bulk Reject Confirmation Dialog */}
        <Dialog open={bulkRejectDialogOpen} onClose={handleCloseBulkReject}>
          <DialogTitle>Reject Transactions</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to reject {selectedIds.size} selected transaction(s)? This will
              permanently delete them and cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseBulkReject} disabled={bulkUpdating}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkReject}
              variant="contained"
              color="error"
              disabled={bulkUpdating}
            >
              {bulkUpdating ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};
