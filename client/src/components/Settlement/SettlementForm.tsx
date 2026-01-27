import React, { useState } from 'react';
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
} from '@mui/material';
import { settlementService } from '../../services/api/settlement.service';
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
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to record settlement');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name as string]: value,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Record Settlement</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {warning && <Alert severity="warning">{warning}</Alert>}

            <FormControl fullWidth required>
              <InputLabel>From (Payer)</InputLabel>
              <Select
                name="fromUserId"
                value={formData.fromUserId}
                onChange={handleChange as any}
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
                onChange={handleChange as any}
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
