import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Box,
  SelectChangeEvent,
} from '@mui/material';
import { settlementService } from '../../services/api/settlement.service';
import type { Balance } from '../../services/api/settlement.service';
import { useToast } from '../../contexts/ToastContext';

interface Owner {
  userId: string;
  user: { id: string; email: string };
}

interface SettlementFormProps {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  owners: Owner[];
  balances?: Balance[];
  onSuccess: () => void;
  suggestedFrom?: string;
  suggestedTo?: string;
  suggestedAmount?: number;
}

export const SettlementForm: React.FC<SettlementFormProps> = ({
  open,
  onClose,
  propertyId,
  owners,
  balances = [],
  onSuccess,
  suggestedFrom,
  suggestedTo,
  suggestedAmount,
}) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fromUserId: suggestedFrom || '',
    toUserId: suggestedTo || '',
    amount: suggestedAmount?.toString() || '',
    settlementDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Compute overpayment warning when amount exceeds balance between selected users
  const overpaymentWarning = useMemo(() => {
    const { fromUserId, toUserId, amount } = formData;
    if (!fromUserId || !toUserId || !amount) return null;

    const enteredAmount = Number(amount);
    if (isNaN(enteredAmount) || enteredAmount <= 0) return null;

    // Find the balance between the selected from and to users.
    // In the balance model: userB owes userA. So if fromUserId (payer) is userB
    // and toUserId (recipient) is userA, the outstanding amount is balance.amount.
    let outstandingBalance = 0;
    let creditorEmail = '';

    for (const balance of balances) {
      if (balance.userB === fromUserId && balance.userA === toUserId) {
        if (balance.amount > 0) {
          // userB (fromUser) owes userA (toUser) - correct direction
          outstandingBalance = balance.amount;
          creditorEmail = balance.userADetails.email;
        } else {
          // userA (toUser) owes userB (fromUser) - reverse direction, no outstanding
          outstandingBalance = 0;
          creditorEmail = '';
        }
        break;
      } else if (balance.userA === fromUserId && balance.userB === toUserId) {
        if (balance.amount < 0) {
          // userA (fromUser) owes userB (toUser) - correct direction
          outstandingBalance = Math.abs(balance.amount);
          creditorEmail = balance.userBDetails.email;
        } else {
          // userB (toUser) owes userA (fromUser) - reverse direction, no outstanding
          outstandingBalance = 0;
          creditorEmail = '';
        }
        break;
      }
    }

    if (enteredAmount > outstandingBalance && outstandingBalance >= 0) {
      const toOwner = owners.find((o) => o.userId === toUserId);
      const recipientLabel = toOwner?.user.email || creditorEmail || 'the recipient';
      return `You're settling \u00A3${enteredAmount.toFixed(2)} but ${recipientLabel} only owes you \u00A3${outstandingBalance.toFixed(2)}`;
    }

    return null;
  }, [formData.fromUserId, formData.toUserId, formData.amount, balances, owners]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setWarning(null);

    try {
      const result = await settlementService.recordSettlement({
        fromUserId: formData.fromUserId,
        toUserId: formData.toUserId,
        propertyId,
        amount: Number(formData.amount),
        settlementDate: new Date(formData.settlementDate),
        notes: formData.notes || undefined,
      });

      if (result.warning) {
        setWarning(result.warning);
      }

      toast.success('Settlement recorded successfully');
      onSuccess();
      onClose();
    } catch (error) {
      const apiError = error as { response?: { data?: { error: string } } };
      toast.error(apiError.response?.data?.error || 'Failed to record settlement');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e:
      | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | SelectChangeEvent<string>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name as string]: value as string,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Record Settlement</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {warning && <Alert severity="warning">{warning}</Alert>}
            {overpaymentWarning && (
              <Alert severity="warning">{overpaymentWarning}</Alert>
            )}

            <FormControl fullWidth required>
              <InputLabel>From (Payer)</InputLabel>
              <Select
                name="fromUserId"
                value={formData.fromUserId}
                onChange={handleChange}
                label="From (Payer)"
              >
                {owners.map((owner) => (
                  <MenuItem
                    key={owner.userId}
                    value={owner.userId}
                    disabled={owner.userId === formData.toUserId}
                  >
                    {owner.user.email}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>To (Recipient)</InputLabel>
              <Select
                name="toUserId"
                value={formData.toUserId}
                onChange={handleChange}
                label="To (Recipient)"
              >
                {owners.map((owner) => (
                  <MenuItem
                    key={owner.userId}
                    value={owner.userId}
                    disabled={owner.userId === formData.fromUserId}
                  >
                    {owner.user.email}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              required
              type="number"
              label="Amount"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              inputProps={{ min: 0.01, step: 0.01 }}
            />

            <TextField
              fullWidth
              required
              type="date"
              label="Settlement Date"
              name="settlementDate"
              value={formData.settlementDate}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Notes (optional)"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Recording...' : 'Record Settlement'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
