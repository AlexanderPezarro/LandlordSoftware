import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Chip,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import { format } from 'date-fns';

interface Settlement {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  settlementDate: string;
  notes?: string;
  fromUser: { id: string; email: string };
  toUser: { id: string; email: string };
}

interface SettlementHistoryProps {
  settlements: Settlement[];
}

export const SettlementHistory: React.FC<SettlementHistoryProps> = ({ settlements }) => {
  if (settlements.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <HistoryIcon color="primary" />
            <Typography variant="h6">Settlement History</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            No settlements recorded yet.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <HistoryIcon color="primary" />
          <Typography variant="h6">Settlement History</Typography>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>From</TableCell>
                <TableCell>To</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {settlements.map((settlement) => (
                <TableRow key={settlement.id}>
                  <TableCell>
                    {format(new Date(settlement.settlementDate), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>{settlement.fromUser.email}</TableCell>
                  <TableCell>{settlement.toUser.email}</TableCell>
                  <TableCell align="right">
                    <Chip label={`£${settlement.amount.toFixed(2)}`} color="success" size="small" />
                  </TableCell>
                  <TableCell>{settlement.notes || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};
