import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Table } from '../../primitives/Table';
import { Button } from '../../primitives/Button';
import { TransactionRowProps } from '../../../types/component.types';
import styles from './TransactionRow.module.scss';

const TransactionRow: React.FC<TransactionRowProps> = ({
  transaction,
  onEdit,
  onDelete,
}) => {
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const formatAmount = (amount: number, type: 'Income' | 'Expense') => {
    const formatted = amount.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return (
      <span
        className={
          type === 'Income' ? styles.amountIncome : styles.amountExpense
        }
      >
        {'\u00A3'}
        {formatted}
      </span>
    );
  };

  const propertyName = transaction.property?.name || '-';

  const hasSplits =
    transaction.splits != null && transaction.splits.length > 0;

  return (
    <Table.Row>
      <Table.Cell>{formatDate(transaction.transactionDate)}</Table.Cell>
      <Table.Cell>{propertyName}</Table.Cell>
      <Table.Cell>{transaction.type}</Table.Cell>
      <Table.Cell>
        {transaction.category}
        {hasSplits && (
          <span className={styles.splitBadge}>Split</span>
        )}
      </Table.Cell>
      <Table.Cell>{formatAmount(transaction.amount, transaction.type)}</Table.Cell>
      <Table.Cell>
        {(onEdit || onDelete) && (
          <span className={styles.actions}>
            {onEdit && (
              <Button
                variant="icon"
                size="small"
                onClick={() => onEdit(transaction)}
                aria-label="Edit transaction"
              >
                <Pencil size={16} />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="icon"
                size="small"
                onClick={() => onDelete(transaction)}
                aria-label="Delete transaction"
              >
                <Trash2 size={16} />
              </Button>
            )}
          </span>
        )}
      </Table.Cell>
    </Table.Row>
  );
};

export default TransactionRow;
