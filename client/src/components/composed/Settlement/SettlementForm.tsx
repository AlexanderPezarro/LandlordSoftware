import { useState, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog } from '../../primitives/Dialog';
import { Button } from '../../primitives/Button';
import { TextField } from '../../primitives/TextField';
import { Select } from '../../primitives/Select';
import { settlementService } from '../../../services/api/settlement.service';
import type { Balance } from '../../../services/api/settlement.service';
import { useToast } from '../../../contexts/ToastContext';
import styles from './Settlement.module.scss';

interface Owner {
  userId: string;
  user: { id: string; email: string };
}

export interface SettlementFormProps {
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

export function SettlementForm({
  open,
  onClose,
  propertyId,
  owners,
  balances = [],
  onSuccess,
  suggestedFrom,
  suggestedTo,
  suggestedAmount,
}: SettlementFormProps) {
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

  // Build Select options, filtering out the "other" user for each selector
  const fromOptions = owners
    .filter((o) => o.userId !== formData.toUserId)
    .map((o) => ({ value: o.userId, label: o.user.email }));

  const toOptions = owners
    .filter((o) => o.userId !== formData.fromUserId)
    .map((o) => ({ value: o.userId, label: o.user.email }));

  // Compute overpayment warning when amount exceeds balance between selected users
  const overpaymentWarning = useMemo(() => {
    const { fromUserId, toUserId, amount } = formData;
    if (!fromUserId || !toUserId || !amount) return null;

    const enteredAmount = Number(amount);
    if (isNaN(enteredAmount) || enteredAmount <= 0) return null;

    let outstandingBalance = 0;
    let creditorEmail = '';

    for (const balance of balances) {
      if (balance.userB === fromUserId && balance.userA === toUserId) {
        if (balance.amount > 0) {
          outstandingBalance = balance.amount;
          creditorEmail = balance.userADetails.email;
        } else {
          outstandingBalance = 0;
          creditorEmail = '';
        }
        break;
      } else if (balance.userA === fromUserId && balance.userB === toUserId) {
        if (balance.amount < 0) {
          outstandingBalance = Math.abs(balance.amount);
          creditorEmail = balance.userBDetails.email;
        } else {
          outstandingBalance = 0;
          creditorEmail = '';
        }
        break;
      }
    }

    if (enteredAmount > outstandingBalance && outstandingBalance >= 0) {
      const toOwner = owners.find((o) => o.userId === toUserId);
      const recipientLabel =
        toOwner?.user.email || creditorEmail || 'the recipient';
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
      toast.error(
        apiError.response?.data?.error || 'Failed to record settlement'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name) {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (field: string) => (value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onClose={onClose} size="medium">
      <form onSubmit={handleSubmit}>
        <Dialog.Title>Record Settlement</Dialog.Title>
        <Dialog.Content>
          <div className={styles.formFields}>
            {warning && (
              <div className={styles.warningAlert}>
                <AlertTriangle size={20} className={styles.warningIcon} />
                <span className={styles.warningText}>{warning}</span>
              </div>
            )}
            {overpaymentWarning && (
              <div className={styles.warningAlert}>
                <AlertTriangle size={20} className={styles.warningIcon} />
                <span className={styles.warningText}>
                  {overpaymentWarning}
                </span>
              </div>
            )}

            <Select
              label="From (Payer)"
              name="fromUserId"
              placeholder="Select payer"
              options={fromOptions}
              value={formData.fromUserId}
              onChange={handleSelectChange('fromUserId')}
              fullWidth
            />

            <Select
              label="To (Recipient)"
              name="toUserId"
              placeholder="Select recipient"
              options={toOptions}
              value={formData.toUserId}
              onChange={handleSelectChange('toUserId')}
              fullWidth
            />

            <TextField
              label="Amount"
              name="amount"
              type="number"
              value={formData.amount}
              onChange={handleTextChange}
              required
              min={0.01}
              step={0.01}
              fullWidth
            />

            <TextField
              label="Settlement Date"
              name="settlementDate"
              type="date"
              value={formData.settlementDate}
              onChange={handleTextChange}
              required
              fullWidth
            />

            <TextField
              label="Notes (optional)"
              name="notes"
              value={formData.notes}
              onChange={handleTextChange}
              multiline
              rows={3}
              fullWidth
            />
          </div>
        </Dialog.Content>
        <Dialog.Actions>
          <Button variant="text" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {loading ? 'Recording...' : 'Record Settlement'}
          </Button>
        </Dialog.Actions>
      </form>
    </Dialog>
  );
}
