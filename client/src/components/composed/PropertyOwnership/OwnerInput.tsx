import React from 'react';
import { Trash2 } from 'lucide-react';
import { TextField } from '../../primitives/TextField';
import { Select } from '../../primitives/Select';
import { Button } from '../../primitives/Button';
import type { SelectOption } from '../../primitives/Select';
import type { UserListItem } from '../../../services/api/users.service';
import styles from './PropertyOwnership.module.scss';

export interface OwnerInputProps {
  userId: string;
  percentage: number;
  users: UserListItem[];
  onUserChange: (userId: string) => void;
  onPercentageChange: (percentage: number) => void;
  onRemove: () => void;
  disabled?: boolean;
  error?: string;
}

export const OwnerInput: React.FC<OwnerInputProps> = ({
  userId,
  percentage,
  users,
  onUserChange,
  onPercentageChange,
  onRemove,
  disabled = false,
  error,
}) => {
  const userOptions: SelectOption[] = users.map((user) => ({
    value: user.id,
    label: user.email,
  }));

  return (
    <div className={styles.ownerRow}>
      <div className={styles.ownerSelect}>
        <Select
          label="Owner"
          placeholder="Select an owner"
          options={userOptions}
          value={userId}
          onChange={onUserChange}
          disabled={disabled}
          error={!!error}
          fullWidth
          name="owner-user"
        />
      </div>
      <div className={styles.percentageField}>
        <TextField
          label="Ownership %"
          type="number"
          value={percentage}
          onChange={(e) =>
            onPercentageChange(parseFloat((e.target as HTMLInputElement).value) || 0)
          }
          disabled={disabled}
          min={0.01}
          max={100}
          step={0.01}
          endAdornment={<span className={styles.percentSymbol}>%</span>}
          error={!!error}
          helperText={error}
        />
      </div>
      <Button
        variant="icon"
        onClick={onRemove}
        disabled={disabled}
        className={styles.removeButton}
        aria-label="Remove owner"
      >
        <Trash2 size={18} />
      </Button>
    </div>
  );
};
