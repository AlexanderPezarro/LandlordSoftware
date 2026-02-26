import { TextField } from '../../primitives/TextField';
import { Chip } from '../../primitives/Chip';
import styles from './Transaction.module.scss';

export interface SplitInputProps {
  userId: string;
  userEmail: string;
  percentage: number;
  amount: number;
  isCustomized: boolean;
  onPercentageChange: (userId: string, percentage: number) => void;
}

export function SplitInput({
  userId,
  userEmail,
  percentage,
  amount,
  isCustomized,
  onPercentageChange,
}: SplitInputProps) {
  const formatCurrency = (value: number) => {
    return `\u00a3${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handlePercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 100) {
      onPercentageChange(userId, value);
    }
  };

  return (
    <div className={styles.splitInputRow}>
      <span className={styles.splitInputEmail}>{userEmail}</span>

      <div className={styles.splitInputPercentage}>
        <TextField
          size="small"
          type="number"
          value={percentage}
          onChange={handlePercentageChange}
          step={0.01}
          min={0}
          max={100}
          label="%"
        />
      </div>

      <span className={styles.splitInputAmount}>{formatCurrency(amount)}</span>

      {isCustomized && (
        <span className={styles.splitInputCustomChip}>
          <Chip label="Custom" size="small" color="primary" />
        </span>
      )}
    </div>
  );
}
