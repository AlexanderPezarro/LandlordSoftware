import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Stack,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
} from '@mui/material';
import {
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccountBalance as AccountBalanceIcon,
  AttachFile as AttachFileIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { transactionsService } from '../services/api/transactions.service';
import { documentsService } from '../services/api/documents.service';
import {
  Transaction,
  CreateTransactionRequest,
  UpdateTransactionRequest,
  TransactionFilters,
  TransactionSummary,
} from '../types/api.types';
import TransactionRow from '../components/shared/TransactionRow';
import StatsCard from '../components/shared/StatsCard';
import DateRangePicker from '../components/shared/DateRangePicker';
import PropertySelector from '../components/shared/PropertySelector';
import FileUpload from '../components/shared/FileUpload';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';

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

interface TransactionFormData {
  propertyId: string;
  type: 'Income' | 'Expense';
  category: string;
  amount: string;
  transactionDate: string;
  description: string;
}

const initialFormData: TransactionFormData = {
  propertyId: '',
  type: 'Income',
  category: '',
  amount: '',
  transactionDate: format(new Date(), 'yyyy-MM-dd'),
  description: '',
};

export const Transactions: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const toast = useToast();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState<TransactionFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Partial<TransactionFormData>>({});
  const [saveLoading, setSaveLoading] = useState(false);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Confirm dialog states
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Filter states
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateRangeStart, setDateRangeStart] = useState<Date | null>(null);
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: TransactionFilters = {};

      if (propertyFilter !== 'all') {
        filters.propertyId = propertyFilter;
      }

      if (typeFilter !== 'all') {
        filters.type = typeFilter as 'Income' | 'Expense';
      }

      if (categoryFilter !== 'all') {
        filters.category = categoryFilter;
      }

      if (dateRangeStart) {
        filters.startDate = dateRangeStart.toISOString().split('T')[0];
      }

      if (dateRangeEnd) {
        filters.endDate = dateRangeEnd.toISOString().split('T')[0];
      }

      const [transactionsData, summaryData] = await Promise.all([
        transactionsService.getTransactions(filters),
        transactionsService.getTransactionSummary(filters),
      ]);

      setTransactions(transactionsData);
      setSummary(summaryData);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [propertyFilter, typeFilter, categoryFilter, dateRangeStart, dateRangeEnd]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const availableCategories = useMemo(() => {
    if (formData.type === 'Income') {
      return INCOME_CATEGORIES;
    } else {
      return EXPENSE_CATEGORIES;
    }
  }, [formData.type]);

  const handleCreateTransaction = () => {
    setSelectedTransaction(null);
    setFormData(initialFormData);
    setFormErrors({});
    setSelectedFile(null);
    setDialogMode('create');
    setDialogOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setFormData({
      propertyId: transaction.propertyId,
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount.toString(),
      transactionDate: transaction.transactionDate.split('T')[0],
      description: transaction.description || '',
    });
    setFormErrors({});
    setSelectedFile(null);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const handleDeleteTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTransaction) return;

    try {
      setDeleteLoading(true);
      await transactionsService.deleteTransaction(selectedTransaction.id);
      setConfirmOpen(false);
      toast.success('Transaction deleted successfully');
      await fetchTransactions();
    } catch (err) {
      console.error('Error deleting transaction:', err);
      toast.error('Failed to delete transaction. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<TransactionFormData> = {};

    if (!formData.propertyId) {
      errors.propertyId = 'Property is required';
    }

    if (!formData.category) {
      errors.category = 'Category is required';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      errors.amount = 'Amount must be greater than 0';
    }

    if (!formData.transactionDate) {
      errors.transactionDate = 'Transaction date is required';
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveTransaction = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaveLoading(true);

      const requestData = {
        propertyId: formData.propertyId,
        type: formData.type,
        category: formData.category,
        amount: parseFloat(formData.amount),
        transactionDate: formData.transactionDate,
        description: formData.description,
      };

      let transaction: Transaction;

      if (dialogMode === 'create') {
        transaction = await transactionsService.createTransaction(requestData as CreateTransactionRequest);
        toast.success('Transaction created successfully');
      } else if (selectedTransaction) {
        transaction = await transactionsService.updateTransaction(
          selectedTransaction.id,
          requestData as UpdateTransactionRequest
        );
        toast.success('Transaction updated successfully');
      } else {
        return;
      }

      // Upload file if selected
      if (selectedFile && transaction) {
        try {
          await documentsService.uploadDocument(selectedFile, 'Transaction', transaction.id);
          toast.success('File uploaded successfully');
        } catch (err) {
          console.error('Error uploading file:', err);
          toast.warning('Transaction saved but file upload failed');
        }
      }

      setDialogOpen(false);
      await fetchTransactions();
    } catch (err) {
      console.error('Error saving transaction:', err);
      toast.error('Failed to save transaction. Please try again.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleFormChange = (field: keyof TransactionFormData, value: string) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };

      // Reset category when type changes
      if (field === 'type') {
        newData.category = '';
      }

      return newData;
    });

    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleClearFilters = () => {
    setPropertyFilter('all');
    setTypeFilter('all');
    setCategoryFilter('all');
    setDateRangeStart(null);
    setDateRangeEnd(null);
  };

  const hasActiveFilters =
    propertyFilter !== 'all' ||
    typeFilter !== 'all' ||
    categoryFilter !== 'all' ||
    dateRangeStart !== null ||
    dateRangeEnd !== null;

  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Finances & Transactions
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateTransaction}
            size={isMobile ? 'small' : 'medium'}
          >
            New Transaction
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Financial Summary Cards */}
        {/* Note: Using CSS Grid instead of MUI Grid for MUI v7 compatibility (Grid component deprecated in v7) */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            },
            gap: 3,
            mb: 3,
          }}
        >
          <StatsCard
            title="Total Income"
            value={summary ? formatCurrency(summary.total_income) : '£0.00'}
            icon={<TrendingUpIcon />}
            color={theme.palette.success.main}
          />
          <StatsCard
            title="Total Expenses"
            value={summary ? formatCurrency(summary.total_expense) : '£0.00'}
            icon={<TrendingDownIcon />}
            color={theme.palette.error.main}
          />
          <StatsCard
            title="Net Income"
            value={summary ? formatCurrency(summary.net) : '£0.00'}
            icon={<AccountBalanceIcon />}
            color={
              summary && summary.net >= 0 ? theme.palette.success.main : theme.palette.error.main
            }
          />
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Filters
          </Typography>

          <Stack spacing={2}>
            <Stack direction={isMobile ? 'column' : 'row'} spacing={2}>
              <PropertySelector
                value={propertyFilter}
                onChange={setPropertyFilter}
                includeAllOption={true}
              />

              <TextField
                select
                fullWidth
                size="small"
                label="Transaction Type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="all">All Types</MenuItem>
                {TRANSACTION_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                fullWidth
                size="small"
                label="Category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <MenuItem value="all">All Categories</MenuItem>
                <MenuItem disabled>--- Income ---</MenuItem>
                {INCOME_CATEGORIES.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
                <MenuItem disabled>--- Expense ---</MenuItem>
                {EXPENSE_CATEGORIES.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <DateRangePicker
              startDate={dateRangeStart}
              endDate={dateRangeEnd}
              onStartDateChange={setDateRangeStart}
              onEndDateChange={setDateRangeEnd}
              label="Filter by Date Range"
            />

            {hasActiveFilters && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button size="small" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              </Box>
            )}
          </Stack>
        </Paper>

        {/* Transactions List */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            Showing {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </Typography>

          {loading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 200,
              }}
            >
              <CircularProgress />
            </Box>
          ) : transactions.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 200,
                flexDirection: 'column',
              }}
            >
              <Typography variant="body1" color="text.secondary">
                No transactions found
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleCreateTransaction}
                sx={{ mt: 2 }}
              >
                Create First Transaction
              </Button>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Property</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      onEdit={handleEditTransaction}
                      onDelete={handleDeleteTransaction}
                    />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Transaction Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            {dialogMode === 'create' ? 'Create Transaction' : 'Edit Transaction'}
          </DialogTitle>

          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <PropertySelector
                value={formData.propertyId}
                onChange={(value) => handleFormChange('propertyId', value)}
                includeAllOption={false}
              />
              {formErrors.propertyId && (
                <Typography variant="caption" color="error">
                  {formErrors.propertyId}
                </Typography>
              )}

              <FormControl fullWidth size="small" error={!!formErrors.type}>
                <InputLabel>Transaction Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Transaction Type"
                  onChange={(e: SelectChangeEvent) => handleFormChange('type', e.target.value)}
                >
                  {TRANSACTION_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small" error={!!formErrors.category}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  label="Category"
                  onChange={(e: SelectChangeEvent) => handleFormChange('category', e.target.value)}
                >
                  {availableCategories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.category && (
                  <Typography variant="caption" color="error">
                    {formErrors.category}
                  </Typography>
                )}
              </FormControl>

              <TextField
                fullWidth
                size="small"
                label="Amount"
                type="number"
                value={formData.amount}
                onChange={(e) => handleFormChange('amount', e.target.value)}
                error={!!formErrors.amount}
                helperText={formErrors.amount}
                inputProps={{ step: '0.01', min: '0' }}
              />

              <TextField
                fullWidth
                size="small"
                label="Transaction Date"
                type="date"
                value={formData.transactionDate}
                onChange={(e) => handleFormChange('transactionDate', e.target.value)}
                error={!!formErrors.transactionDate}
                helperText={formErrors.transactionDate}
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                fullWidth
                size="small"
                label="Description"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                error={!!formErrors.description}
                helperText={formErrors.description}
              />

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AttachFileIcon fontSize="small" />
                  Attach Receipt/Document (Optional)
                </Typography>
                <FileUpload
                  onFileSelect={setSelectedFile}
                  accept="image/jpeg,image/png,application/pdf"
                  maxSize={10 * 1024 * 1024}
                />
              </Box>
            </Stack>
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} disabled={saveLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveTransaction}
              variant="contained"
              disabled={saveLoading}
              startIcon={saveLoading ? <CircularProgress size={16} /> : undefined}
            >
              {saveLoading ? 'Saving...' : dialogMode === 'create' ? 'Create' : 'Update'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={confirmOpen}
          title="Delete Transaction"
          message="Are you sure you want to delete this transaction? This action cannot be undone."
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmOpen(false)}
          loading={deleteLoading}
        />
      </Box>
    </Container>
  );
};
