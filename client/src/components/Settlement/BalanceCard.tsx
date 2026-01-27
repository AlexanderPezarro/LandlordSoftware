import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Divider,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';

interface Balance {
  userA: string;
  userB: string;
  amount: number;
  userADetails: { id: string; email: string };
  userBDetails: { id: string; email: string };
}

interface BalanceCardProps {
  balances: Balance[];
  currentUserId?: string;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({ balances, currentUserId }) => {
  if (balances.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <AccountBalanceIcon color="primary" />
            <Typography variant="h6">Current Balances</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            All balances are settled. No outstanding payments.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <AccountBalanceIcon color="primary" />
          <Typography variant="h6">Current Balances</Typography>
        </Box>

        {balances.map((balance, index) => {
          // Determine who owes whom
          const owesUser = balance.userBDetails;
          const owedUser = balance.userADetails;
          const amount = Math.abs(balance.amount);

          // Highlight balances involving current user
          const involvesCurrentUser =
            currentUserId &&
            (balance.userA === currentUserId || balance.userB === currentUserId);

          return (
            <Box key={index}>
              {index > 0 && <Divider sx={{ my: 2 }} />}
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                sx={{
                  p: 1,
                  backgroundColor: involvesCurrentUser ? 'action.hover' : 'transparent',
                  borderRadius: 1,
                }}
              >
                <Box>
                  <Typography variant="body1">
                    <strong>{owesUser.email}</strong> owes <strong>{owedUser.email}</strong>
                  </Typography>
                </Box>
                <Chip
                  label={`£${amount.toFixed(2)}`}
                  color={involvesCurrentUser ? 'primary' : 'default'}
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>
            </Box>
          );
        })}
      </CardContent>
    </Card>
  );
};
