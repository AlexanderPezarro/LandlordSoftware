import React from 'react';
import { TableRow, TableCell, IconButton, Box } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { TransactionRowProps } from '../../types/component.types';

const TransactionRow: React.FC<TransactionRowProps> = ({ transaction, onEdit, onDelete }) => {
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const formatAmount = (amount: number, type: 'Income' | 'Expense') => {
    const color = type === 'Income' ? 'success.main' : 'error.main';
    return (
      <Box component="span" sx={{ color, fontWeight: 500 }}>
        £{amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </Box>
    );
  };

  const propertyName = transaction.property?.name || '-';

  return (
    <TableRow hover>
      <TableCell>{formatDate(transaction.transactionDate)}</TableCell>
      <TableCell>{propertyName}</TableCell>
      <TableCell>{transaction.type}</TableCell>
      <TableCell>{transaction.category}</TableCell>
      <TableCell>{formatAmount(transaction.amount, transaction.type)}</TableCell>
      <TableCell>
        {(onEdit || onDelete) && (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {onEdit && (
              <IconButton
                size="small"
                onClick={() => onEdit(transaction)}
                aria-label="Edit transaction"
              >
                <EditIcon fontSize="small" />
              </IconButton>
            )}
            {onDelete && (
              <IconButton
                size="small"
                onClick={() => onDelete(transaction)}
                aria-label="Delete transaction"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        )}
      </TableCell>
    </TableRow>
  );
};

export default TransactionRow;
