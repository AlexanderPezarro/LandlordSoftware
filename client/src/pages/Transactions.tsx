import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Landmark,
  Paperclip,
  X,
  AlertCircle,
} from 'lucide-react';
import { Container } from '../components/primitives/Container';
import { Button } from '../components/primitives/Button';
import { TextField } from '../components/primitives/TextField';
import { Select } from '../components/primitives/Select';
import { Card } from '../components/primitives/Card';
import { Table } from '../components/primitives/Table';
import { Dialog } from '../components/primitives/Dialog';
import { Spinner } from '../components/primitives/Spinner';
import { FileUpload } from '../components/primitives/FileUpload';
import TransactionRow from '../components/composed/TransactionRow/TransactionRow';
import DateRangePicker from '../components/composed/DateRangePicker/DateRangePicker';
import { PropertySelector } from '../components/composed/PropertySelector/PropertySelector';
import { ConfirmDialog } from '../components/composed/ConfirmDialog/ConfirmDialog';
import { SplitSection } from '../components/composed/Transaction/SplitSection';
import { transactionsService } from '../services/api/transactions.service';
import { documentsService } from '../services/api/documents.service';
import {
  Transaction,
  CreateTransactionRequest,
  UpdateTransactionRequest,
  TransactionFilters,
  TransactionSummary,
  TransactionSplit,
} from '../types/api.types';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { propertyOwnershipService, PropertyOwnership } from '../services/api/propertyOwnership.service';
import styles from './Transactions.module.scss';

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
  paidByUserId: string;
}

const initialFormData: TransactionFormData = {
  propertyId: '',
  type: 'Income',
  category: '',
  amount: '',
  transactionDate: format(new Date(), 'yyyy-MM-dd'),
  description: '',
  paidByUserId: '',
};

// Build Select options for type filter
const typeFilterOptions = [
  { value: 'all', label: 'All Types' },
  ...TRANSACTION_TYPES.map((type) => ({ value: type, label: type })),
];

// Build Select options for category filter
const categoryFilterOptions = [
  { value: 'all', label: 'All Categories' },
  ...INCOME_CATEGORIES.map((c) => ({ value: c, label: `Income - ${c}` })),
  ...EXPENSE_CATEGORIES.map((c) => ({ value: c, label: `Expense - ${c}` })),
];

// Build Select options for transaction type in form
const transactionTypeOptions = TRANSACTION_TYPES.map((type) => ({
  value: type,
  label: type,
}));

// Build Select options for paid-by
function buildPaidByOptions(propertyOwnership: PropertyOwnership[]) {
  return [
    { value: '', label: 'None' },
    ...propertyOwnership.map((ownership) => ({
      value: ownership.userId,
      label: ownership.user.email,
    })),
  ];
}

export const Transactions: React.FC = () => {
  const toast = useToast();
  const { user, canWrite } = useAuth();

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
  const [, setDeleteLoading] = useState(false);

  // Property ownership and splits
  const [propertyOwnership, setPropertyOwnership] = useState<PropertyOwnership[]>([]);
  const [splits, setSplits] = useState<TransactionSplit[]>([]);

  // Filter states
  const [propertyFilter, setPropertyFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateRangeStart, setDateRangeStart] = useState<Date | null>(null);
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: TransactionFilters = {};

      if (propertyFilter !== '') {
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

  // Load property ownership when property is selected
  useEffect(() => {
    const loadPropertyOwnership = async () => {
      if (!formData.propertyId) {
        setPropertyOwnership([]);
        setSplits([]);
        return;
      }

      try {
        const ownerships = await propertyOwnershipService.listOwners(formData.propertyId);
        setPropertyOwnership(ownerships);

        // When editing a transaction that already has splits loaded,
        // don't overwrite them with ownership defaults
        const hasExistingSplits =
          dialogMode === 'edit' &&
          selectedTransaction &&
          selectedTransaction.splits &&
          selectedTransaction.splits.length > 0 &&
          selectedTransaction.propertyId === formData.propertyId;

        if (!hasExistingSplits) {
          // Auto-generate splits from ownership (for new transactions or property changes)
          const amount = parseFloat(formData.amount) || 0;
          const generatedSplits = ownerships.map((ownership) => ({
            userId: ownership.userId,
            percentage: ownership.ownershipPercentage,
            amount: (amount * ownership.ownershipPercentage) / 100,
          }));
          setSplits(generatedSplits);
        }

        // Set default paidByUserId to current user if they're an owner
        // (only when no paidByUserId is already set)
        if (!formData.paidByUserId && user) {
          const isOwner = ownerships.some((o) => o.userId === user.id);
          if (isOwner) {
            setFormData((prev) => ({ ...prev, paidByUserId: user.id }));
          }
        }
      } catch (err) {
        console.error('Error loading property ownership:', err);
        setPropertyOwnership([]);
        setSplits([]);
      }
    };

    loadPropertyOwnership();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.propertyId]);

  const availableCategories = useMemo(() => {
    if (formData.type === 'Income') {
      return INCOME_CATEGORIES;
    } else {
      return EXPENSE_CATEGORIES;
    }
  }, [formData.type]);

  const categoryOptions = useMemo(() => {
    return availableCategories.map((category) => ({
      value: category,
      label: category,
    }));
  }, [availableCategories]);

  const handleCreateTransaction = () => {
    setSelectedTransaction(null);
    setFormData({
      ...initialFormData,
      paidByUserId: user?.id || '',
    });
    setFormErrors({});
    setSelectedFile(null);
    setPropertyOwnership([]);
    setSplits([]);
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
      paidByUserId: transaction.paidByUserId || '',
    });

    // Pre-load existing splits from the transaction so the useEffect
    // doesn't overwrite them with ownership defaults
    if (transaction.splits && transaction.splits.length > 0) {
      setSplits(
        transaction.splits.map((split) => ({
          userId: split.userId,
          percentage: split.percentage,
          amount: split.amount,
        }))
      );
    } else {
      setSplits([]);
    }

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

    // Validate splits if property has ownership
    if (splits.length > 0) {
      const totalPercentage = splits.reduce((sum, split) => sum + split.percentage, 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        toast.error('Split percentages must sum to 100%');
        return;
      }
    }

    try {
      setSaveLoading(true);

      const requestData: CreateTransactionRequest | UpdateTransactionRequest = {
        propertyId: formData.propertyId,
        type: formData.type,
        category: formData.category,
        amount: parseFloat(formData.amount),
        transactionDate: formData.transactionDate,
        description: formData.description,
      };

      // Add paidByUserId and splits for expenses with property ownership
      if (formData.type === 'Expense' && splits.length > 0) {
        requestData.paidByUserId = formData.paidByUserId || null;
        requestData.splits = splits;
      }

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

    // Recalculate split amounts when amount changes
    if (field === 'amount' && splits.length > 0) {
      const amount = parseFloat(value) || 0;
      const updatedSplits = splits.map((split) => ({
        ...split,
        amount: (amount * split.percentage) / 100,
      }));
      setSplits(updatedSplits);
    }
  };

  const handleClearFilters = () => {
    setPropertyFilter('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setDateRangeStart(null);
    setDateRangeEnd(null);
  };

  const hasActiveFilters =
    propertyFilter !== '' ||
    typeFilter !== 'all' ||
    categoryFilter !== 'all' ||
    dateRangeStart !== null ||
    dateRangeEnd !== null;

  const formatCurrency = (amount: number) => {
    return `\u00A3${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleFilesChange = useCallback((files: File[]) => {
    setSelectedFile(files.length > 0 ? files[0] : null);
  }, []);

  return (
    <Container maxWidth="xl">
      <div className={styles.page}>
        {/* Page Header */}
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Finances &amp; Transactions</h1>
          {canWrite() && (
            <Button
              variant="primary"
              startIcon={<Plus size={18} />}
              onClick={handleCreateTransaction}
            >
              New Transaction
            </Button>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className={styles.errorAlert} role="alert">
            <AlertCircle size={18} />
            <span className={styles.errorAlertText}>{error}</span>
            <button
              className={styles.errorAlertClose}
              onClick={() => setError(null)}
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Financial Summary Cards */}
        <div className={styles.summaryGrid}>
          <Card className={styles.summaryCard}>
            <Card.Content className={styles.summaryCardContent}>
              <span className={styles.summaryCardIcon}>
                <TrendingUp size={20} className={styles.iconSuccess} />
                <span className={styles.summaryCardTitle}>Total Income</span>
              </span>
              <span className={styles.summaryCardValue}>
                {summary ? formatCurrency(summary.total_income) : '\u00A30.00'}
              </span>
            </Card.Content>
          </Card>

          <Card className={styles.summaryCard}>
            <Card.Content className={styles.summaryCardContent}>
              <span className={styles.summaryCardIcon}>
                <TrendingDown size={20} className={styles.iconError} />
                <span className={styles.summaryCardTitle}>Total Expenses</span>
              </span>
              <span className={styles.summaryCardValue}>
                {summary ? formatCurrency(summary.total_expense) : '\u00A30.00'}
              </span>
            </Card.Content>
          </Card>

          <Card className={styles.summaryCard}>
            <Card.Content className={styles.summaryCardContent}>
              <span className={styles.summaryCardIcon}>
                <Landmark
                  size={20}
                  className={
                    summary && summary.net >= 0 ? styles.iconSuccess : styles.iconError
                  }
                />
                <span className={styles.summaryCardTitle}>Net Income</span>
              </span>
              <span className={styles.summaryCardValue}>
                {summary ? formatCurrency(summary.net) : '\u00A30.00'}
              </span>
            </Card.Content>
          </Card>
        </div>

        {/* Filters */}
        <Card className={styles.filtersCard}>
          <Card.Content>
            <p className={styles.filtersTitle}>Filters</p>

            <div className={styles.filtersContent}>
              <div className={styles.filterRow}>
                <div className={styles.filterField}>
                  <PropertySelector
                    value={propertyFilter}
                    onChange={setPropertyFilter}
                    includeAllOption={true}
                  />
                </div>

                <div className={styles.filterField}>
                  <Select
                    label="Transaction Type"
                    value={typeFilter}
                    onChange={(value) => setTypeFilter(value)}
                    options={typeFilterOptions}
                    fullWidth
                    size="small"
                  />
                </div>

                <div className={styles.filterField}>
                  <Select
                    label="Category"
                    value={categoryFilter}
                    onChange={(value) => setCategoryFilter(value)}
                    options={categoryFilterOptions}
                    fullWidth
                    size="small"
                  />
                </div>
              </div>

              <DateRangePicker
                startDate={dateRangeStart}
                endDate={dateRangeEnd}
                onStartChange={setDateRangeStart}
                onEndChange={setDateRangeEnd}
                label="Filter by Date Range"
              />

              {hasActiveFilters && (
                <div className={styles.clearFiltersRow}>
                  <Button variant="text" size="small" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </Card.Content>
        </Card>

        {/* Transactions List */}
        <Card className={styles.transactionsCard}>
          <Card.Content>
            <p className={styles.transactionsCount}>
              Showing {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
            </p>

            {loading ? (
              <div className={styles.loadingContainer}>
                <Spinner size="medium" />
              </div>
            ) : transactions.length === 0 ? (
              <div className={styles.emptyContainer}>
                <p className={styles.emptyText}>No transactions found</p>
                {canWrite() && (
                  <Button
                    variant="secondary"
                    startIcon={<Plus size={18} />}
                    onClick={handleCreateTransaction}
                  >
                    Create First Transaction
                  </Button>
                )}
              </div>
            ) : (
              <Table.Container>
                <Table>
                  <Table.Head>
                    <Table.Row>
                      <Table.Cell sortable={false}>Date</Table.Cell>
                      <Table.Cell sortable={false}>Property</Table.Cell>
                      <Table.Cell sortable={false}>Type</Table.Cell>
                      <Table.Cell sortable={false}>Category</Table.Cell>
                      <Table.Cell sortable={false}>Amount</Table.Cell>
                      <Table.Cell sortable={false}>Actions</Table.Cell>
                    </Table.Row>
                  </Table.Head>
                  <Table.Body>
                    {transactions.map((transaction) => (
                      <TransactionRow
                        key={transaction.id}
                        transaction={transaction}
                        onEdit={canWrite() ? handleEditTransaction : undefined}
                        onDelete={canWrite() ? handleDeleteTransaction : undefined}
                      />
                    ))}
                  </Table.Body>
                </Table>
              </Table.Container>
            )}
          </Card.Content>
        </Card>

        {/* Transaction Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} size="large">
          <Dialog.Title>
            {dialogMode === 'create' ? 'Create Transaction' : 'Edit Transaction'}
          </Dialog.Title>

          <Dialog.Content>
            <div className={styles.formStack}>
              <PropertySelector
                value={formData.propertyId}
                onChange={(value) => handleFormChange('propertyId', value)}
                includeAllOption={false}
              />
              {formErrors.propertyId && (
                <p className={styles.formError}>{formErrors.propertyId}</p>
              )}

              <Select
                label="Transaction Type"
                value={formData.type}
                onChange={(value) => handleFormChange('type', value)}
                options={transactionTypeOptions}
                fullWidth
                size="small"
                error={!!formErrors.type}
              />

              <Select
                label="Category"
                value={formData.category}
                onChange={(value) => handleFormChange('category', value)}
                options={categoryOptions}
                fullWidth
                size="small"
                placeholder="Select a category"
                error={!!formErrors.category}
                helperText={formErrors.category}
              />

              <TextField
                label="Amount"
                type="number"
                value={formData.amount}
                onChange={(e) => handleFormChange('amount', e.target.value)}
                error={!!formErrors.amount}
                helperText={formErrors.amount}
                fullWidth
                size="small"
                step="0.01"
                min="0"
              />

              <TextField
                label="Transaction Date"
                type="date"
                value={formData.transactionDate}
                onChange={(e) => handleFormChange('transactionDate', e.target.value)}
                error={!!formErrors.transactionDate}
                helperText={formErrors.transactionDate}
                fullWidth
                size="small"
              />

              <TextField
                label="Description"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                error={!!formErrors.description}
                helperText={formErrors.description}
                fullWidth
                size="small"
              />

              {/* Paid By - only for expenses with property ownership */}
              {formData.type === 'Expense' && propertyOwnership.length > 0 && (
                <Select
                  label="Paid By (Optional)"
                  value={formData.paidByUserId}
                  onChange={(value) => handleFormChange('paidByUserId', value)}
                  options={buildPaidByOptions(propertyOwnership)}
                  fullWidth
                  size="small"
                />
              )}

              {/* Transaction Splits */}
              <SplitSection
                propertyOwnership={propertyOwnership}
                amount={parseFloat(formData.amount) || 0}
                splits={splits}
                onSplitsChange={setSplits}
                disabled={!formData.propertyId || !formData.amount}
              />

              <div>
                <p className={styles.attachmentLabel}>
                  <Paperclip size={16} />
                  Attach Receipt/Document (Optional)
                </p>
                <FileUpload
                  onFilesChange={handleFilesChange}
                  accept="image/jpeg,image/png,application/pdf"
                  maxSize={10 * 1024 * 1024}
                />
              </div>
            </div>
          </Dialog.Content>

          <Dialog.Actions>
            <Button variant="text" onClick={() => setDialogOpen(false)} disabled={saveLoading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveTransaction}
              disabled={saveLoading}
              loading={saveLoading}
            >
              {saveLoading ? 'Saving...' : dialogMode === 'create' ? 'Create' : 'Update'}
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={confirmOpen}
          title="Delete Transaction"
          message="Are you sure you want to delete this transaction? This action cannot be undone."
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmOpen(false)}
        />
      </div>
    </Container>
  );
};
