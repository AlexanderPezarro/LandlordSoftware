import React, { useEffect, useState } from 'react';
import { CheckCircle, Search, Landmark, Trash2, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { Container } from '../../components/primitives/Container';
import { Button } from '../../components/primitives/Button';
import { Spinner } from '../../components/primitives/Spinner';
import { TextField } from '../../components/primitives/TextField';
import { Select } from '../../components/primitives/Select';
import { Table } from '../../components/primitives/Table';
import { Chip } from '../../components/primitives/Chip';
import { Dialog } from '../../components/primitives/Dialog';
import { ConfirmDialog } from '../../components/composed/ConfirmDialog';
import {
  pendingTransactionsService,
  PendingTransaction,
} from '../../services/api/pendingTransactions.service';
import { bankService } from '../../services/api/bank.service';
import { ApiError } from '../../types/api.types';
import { useToast } from '../../contexts/ToastContext';
import PropertySelector from '../../components/shared/PropertySelector';
import { useProperties } from '../../contexts/PropertiesContext';
import styles from './PendingTransactions.module.scss';

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

const TYPE_OPTIONS = [
  { value: '', label: 'Select type' },
  ...TRANSACTION_TYPES.map((type) => ({ value: type, label: type })),
];

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

  const getCategoryOptions = (type: string | null) => {
    const categories = getCategoriesForType(type);
    return [
      { value: '', label: 'Select category' },
      ...categories.map((cat) => ({ value: cat, label: cat })),
    ];
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

  const bankAccountOptions = [
    { value: 'all', label: 'All Accounts' },
    ...bankAccounts.map((account) => ({
      value: account.id,
      label: account.accountName,
    })),
  ];

  const statusFilterOptions = [
    { value: 'pending', label: 'Pending Review' },
    { value: 'reviewed', label: 'Reviewed' },
    { value: 'all', label: 'All' },
  ];

  const bulkTypeOptions = [
    { value: '', label: 'No change' },
    ...TRANSACTION_TYPES.map((type) => ({ value: type, label: type })),
  ];

  const bulkCategoryOptions = [
    { value: '', label: 'No change' },
    ...getCategoriesForType(bulkUpdateType).map((cat) => ({ value: cat, label: cat })),
  ];

  if (loading) {
    return (
      <Container maxWidth="xl">
        <div className={styles.loadingWrapper}>
          <Spinner />
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl">
        <div className={styles.page}>
          <h1 className={styles.title}>Pending Transactions Review</h1>
          <div className={styles.alert}>{error}</div>
        </div>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <div className={styles.page}>
        <h1 className={styles.title}>Pending Transactions Review</h1>
        <p className={styles.subtitle}>
          Review and categorize imported bank transactions before approving them.
        </p>

        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.searchField}>
            <TextField
              label="Search"
              placeholder="Search by description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
              fullWidth
              startAdornment={<Search size={18} />}
            />
          </div>

          <div className={styles.filterSelect}>
            <Select
              label="Bank Account"
              value={bankAccountFilter}
              onChange={(value) => setBankAccountFilter(value)}
              options={bankAccountOptions}
            />
          </div>

          <div className={styles.filterSelect}>
            <Select
              label="Status"
              value={reviewStatusFilter}
              onChange={(value) => setReviewStatusFilter(value)}
              options={statusFilterOptions}
            />
          </div>
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedIds.size > 0 && (
          <div className={styles.bulkToolbar}>
            <span className={styles.bulkLabel}>
              {selectedIds.size} transaction(s) selected
            </span>
            <Button
              variant="primary"
              startIcon={<CheckCircle size={18} />}
              onClick={handleBulkApprove}
              disabled={bulkUpdating}
            >
              Approve Selected
            </Button>
            <Button
              variant="secondary"
              startIcon={<Pencil size={18} />}
              onClick={handleOpenBulkUpdate}
              disabled={bulkUpdating}
            >
              Update Selected
            </Button>
            <Button
              variant="secondary"
              startIcon={<Trash2 size={18} />}
              onClick={handleOpenBulkReject}
              disabled={bulkUpdating}
            >
              Reject Selected
            </Button>
          </div>
        )}

        {/* Transactions Table */}
        {pendingTransactions.length === 0 ? (
          <div className={styles.empty}>
            <Landmark size={64} className={styles.emptyIcon} />
            <h2 className={styles.emptyTitle}>No pending transactions</h2>
            <p className={styles.emptyText}>
              {reviewStatusFilter === 'pending'
                ? 'All transactions have been reviewed!'
                : 'No transactions found matching your filters.'}
            </p>
          </div>
        ) : (
          <Table.Container>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.Cell width="48px">
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeSelected;
                      }}
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      disabled={unreviewedCount === 0}
                    />
                  </Table.Cell>
                  <Table.Cell sortable sortDirection={null}>Date</Table.Cell>
                  <Table.Cell sortable sortDirection={null}>Description</Table.Cell>
                  <Table.Cell sortable sortDirection={null} align="right">Amount</Table.Cell>
                  <Table.Cell sortable sortDirection={null}>Bank Account</Table.Cell>
                  <Table.Cell sortable sortDirection={null} className={styles.propertyCol}>Property</Table.Cell>
                  <Table.Cell sortable sortDirection={null} className={styles.typeCol}>Type</Table.Cell>
                  <Table.Cell sortable sortDirection={null} className={styles.categoryCol}>Category</Table.Cell>
                  <Table.Cell align="center" sortable sortDirection={null}>Actions</Table.Cell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {pendingTransactions.map((tx) => (
                  <Table.Row
                    key={tx.id}
                    className={[
                      tx.reviewedAt ? styles.reviewedRow : '',
                      savingRows[tx.id] ? styles.savingRow : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <Table.Cell width="48px">
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={isSelected(tx.id)}
                        onChange={() => handleSelectOne(tx.id)}
                        disabled={!!tx.reviewedAt}
                      />
                    </Table.Cell>
                    <Table.Cell>
                      {format(new Date(tx.transactionDate), 'dd/MM/yyyy')}
                    </Table.Cell>
                    <Table.Cell>
                      <span className={styles.description}>{tx.description}</span>
                      {tx.bankTransaction.counterpartyName && (
                        <span className={styles.counterparty}>
                          {tx.bankTransaction.counterpartyName}
                        </span>
                      )}
                    </Table.Cell>
                    <Table.Cell align="right">
                      <span
                        className={
                          tx.amount > 0 ? styles.amountPositive : styles.amountNegative
                        }
                      >
                        {formatAmount(tx.amount, tx.currency)}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className={styles.accountName}>{tx.bankAccount.accountName}</span>
                    </Table.Cell>
                    <Table.Cell className={styles.propertyCol}>
                      <PropertySelector
                        value={tx.propertyId || ''}
                        onChange={(propertyId) => handleUpdateField(tx.id, 'propertyId', propertyId)}
                        disabled={!!tx.reviewedAt || savingRows[tx.id]}
                        includeAllOption={false}
                      />
                    </Table.Cell>
                    <Table.Cell className={styles.typeCol}>
                      <Select
                        value={tx.type || ''}
                        onChange={(value) =>
                          handleUpdateField(tx.id, 'type', value || null)
                        }
                        options={TYPE_OPTIONS}
                        disabled={!!tx.reviewedAt || savingRows[tx.id]}
                        size="small"
                        fullWidth
                      />
                    </Table.Cell>
                    <Table.Cell className={styles.categoryCol}>
                      <Select
                        value={tx.category || ''}
                        onChange={(value) =>
                          handleUpdateField(tx.id, 'category', value || null)
                        }
                        options={getCategoryOptions(tx.type)}
                        disabled={!tx.type || !!tx.reviewedAt || savingRows[tx.id]}
                        size="small"
                        fullWidth
                      />
                    </Table.Cell>
                    <Table.Cell align="center">
                      {tx.reviewedAt ? (
                        <Chip label="Reviewed" size="small" color="success" />
                      ) : (
                        <Button
                          variant="primary"
                          size="small"
                          startIcon={<CheckCircle size={16} />}
                          onClick={() => handleApprove(tx)}
                          disabled={!isRowComplete(tx) || savingRows[tx.id]}
                        >
                          Approve
                        </Button>
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Table.Container>
        )}

        {/* Bulk Update Dialog */}
        <Dialog
          open={bulkUpdateDialogOpen}
          onClose={handleCloseBulkUpdate}
          size="medium"
        >
          <Dialog.Title>Bulk Update Transactions</Dialog.Title>
          <Dialog.Content>
            <p className={styles.bulkDialogText}>
              Update the following fields for {selectedIds.size} selected transaction(s). Leave
              fields empty to keep existing values.
            </p>

            <div className={styles.bulkForm}>
              <PropertySelector
                value={bulkUpdateProperty}
                onChange={setBulkUpdateProperty}
                includeAllOption={false}
              />

              <Select
                label="Type (optional)"
                value={bulkUpdateType}
                onChange={(value) => setBulkUpdateType(value)}
                options={bulkTypeOptions}
                fullWidth
              />

              <Select
                label="Category (optional)"
                value={bulkUpdateCategory}
                onChange={(value) => setBulkUpdateCategory(value)}
                options={bulkCategoryOptions}
                disabled={!bulkUpdateType}
                fullWidth
              />
            </div>
          </Dialog.Content>
          <Dialog.Actions>
            <Button variant="text" onClick={handleCloseBulkUpdate} disabled={bulkUpdating}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleBulkUpdate}
              disabled={bulkUpdating}
              loading={bulkUpdating}
            >
              Update
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Bulk Reject Confirmation Dialog */}
        <ConfirmDialog
          open={bulkRejectDialogOpen}
          title="Reject Transactions"
          message={`Are you sure you want to reject ${selectedIds.size} selected transaction(s)? This will permanently delete them and cannot be undone.`}
          severity="danger"
          confirmLabel={bulkUpdating ? 'Rejecting...' : 'Reject'}
          onConfirm={handleBulkReject}
          onCancel={handleCloseBulkReject}
        />
      </div>
    </Container>
  );
};
