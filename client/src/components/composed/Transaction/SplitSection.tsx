import { useMemo, useState } from 'react';
import { ChevronDown, RotateCcw, AlertCircle, Info } from 'lucide-react';
import { Button } from '../../primitives/Button';
import { SplitInput } from './SplitInput';
import type { SplitInputProps } from './SplitInput';
import type { PropertyOwnership } from '../../../services/api/propertyOwnership.service';
import styles from './Transaction.module.scss';

export interface TransactionSplit {
  userId: string;
  percentage: number;
  amount: number;
}

export interface SplitSectionProps {
  propertyOwnership: PropertyOwnership[];
  amount: number;
  splits: TransactionSplit[];
  onSplitsChange: (splits: TransactionSplit[]) => void;
  disabled?: boolean;
}

export function SplitSection({
  propertyOwnership,
  amount,
  splits,
  onSplitsChange,
  disabled = false,
}: SplitSectionProps) {
  const [expanded, setExpanded] = useState(false);

  // Calculate if splits are customized
  const isCustomized = useMemo(() => {
    if (splits.length !== propertyOwnership.length) return true;

    return splits.some((split) => {
      const ownership = propertyOwnership.find((o) => o.userId === split.userId);
      return !ownership || Math.abs(split.percentage - ownership.ownershipPercentage) > 0.01;
    });
  }, [splits, propertyOwnership]);

  // Calculate total percentage
  const totalPercentage = useMemo(() => {
    return splits.reduce((sum, split) => sum + split.percentage, 0);
  }, [splits]);

  // Validation error message
  const validationError = useMemo(() => {
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return `Split percentages must sum to 100% (currently ${totalPercentage.toFixed(2)}%)`;
    }
    return null;
  }, [totalPercentage]);

  const handlePercentageChange: SplitInputProps['onPercentageChange'] = (
    userId,
    percentage
  ) => {
    const updatedSplits = splits.map((split) =>
      split.userId === userId
        ? {
            ...split,
            percentage,
            amount: (amount * percentage) / 100,
          }
        : split
    );
    onSplitsChange(updatedSplits);
  };

  const handleResetToDefaults = () => {
    const defaultSplits = propertyOwnership.map((ownership) => ({
      userId: ownership.userId,
      percentage: ownership.ownershipPercentage,
      amount: (amount * ownership.ownershipPercentage) / 100,
    }));
    onSplitsChange(defaultSplits);
  };

  const rootClassNames = [styles.splitSection, disabled ? styles.disabled : '']
    .filter(Boolean)
    .join(' ');

  const expandIconClassNames = [
    styles.expandIcon,
    expanded ? styles.expandIconOpen : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClassNames}>
      <button
        type="button"
        className={styles.splitHeader}
        onClick={() => !disabled && setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        <span className={styles.splitHeaderLeft}>
          <span className={styles.splitTitle}>Transaction Splits</span>
          {isCustomized && !disabled && (
            <span className={styles.customizedBadge}>Customized</span>
          )}
        </span>
        <span className={styles.splitHeaderRight}>
          {validationError && (
            <span className={styles.invalidBadge}>Invalid</span>
          )}
          <span className={expandIconClassNames}>
            <ChevronDown size={20} />
          </span>
        </span>
      </button>

      {expanded && (
        <div className={styles.splitBody}>
          {validationError && (
            <div className={styles.errorAlert} role="alert">
              <AlertCircle size={18} />
              <span>{validationError}</span>
            </div>
          )}

          {splits.length === 0 ? (
            <div className={styles.infoAlert} role="status">
              <Info size={18} />
              <span>
                Select a property with ownership configured to enable
                transaction splits.
              </span>
            </div>
          ) : (
            <>
              <div className={styles.splitList}>
                {splits.map((split) => {
                  const ownership = propertyOwnership.find(
                    (o) => o.userId === split.userId
                  );
                  const isCustomSplit = ownership
                    ? Math.abs(
                        split.percentage - ownership.ownershipPercentage
                      ) > 0.01
                    : false;

                  return (
                    <SplitInput
                      key={split.userId}
                      userId={split.userId}
                      userEmail={ownership?.user.email || 'Unknown User'}
                      percentage={split.percentage}
                      amount={split.amount}
                      isCustomized={isCustomSplit}
                      onPercentageChange={handlePercentageChange}
                    />
                  );
                })}
              </div>

              <div className={styles.splitFooter}>
                <span className={styles.totalLabel}>
                  Total: {totalPercentage.toFixed(2)}%
                </span>

                {isCustomized && (
                  <Button
                    variant="text"
                    size="small"
                    startIcon={<RotateCcw size={16} />}
                    onClick={handleResetToDefaults}
                    disabled={disabled}
                  >
                    Reset to Ownership
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
