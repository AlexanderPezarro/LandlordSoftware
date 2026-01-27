import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Alert,
  Stack,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { SplitInput } from './SplitInput';
import { PropertyOwnership } from '../../services/api/propertyOwnership.service';

export interface TransactionSplit {
  userId: string;
  percentage: number;
  amount: number;
}

interface SplitSectionProps {
  propertyOwnership: PropertyOwnership[];
  amount: number;
  splits: TransactionSplit[];
  onSplitsChange: (splits: TransactionSplit[]) => void;
  disabled?: boolean;
}

export const SplitSection: React.FC<SplitSectionProps> = ({
  propertyOwnership,
  amount,
  splits,
  onSplitsChange,
  disabled = false,
}) => {
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

  const handlePercentageChange = (userId: string, percentage: number) => {
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

  return (
    <Accordion defaultExpanded={false} disabled={disabled}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
          <Typography variant="subtitle2">Transaction Splits</Typography>
          {isCustomized && !disabled && (
            <Typography
              variant="caption"
              sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                px: 1,
                py: 0.5,
                borderRadius: 1,
              }}
            >
              Customized
            </Typography>
          )}
          {validationError && (
            <Typography variant="caption" color="error" sx={{ ml: 'auto' }}>
              Invalid
            </Typography>
          )}
        </Box>
      </AccordionSummary>

      <AccordionDetails>
        <Stack spacing={2}>
          {validationError && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {validationError}
            </Alert>
          )}

          {splits.length === 0 ? (
            <Alert severity="info">
              Select a property with ownership configured to enable transaction splits.
            </Alert>
          ) : (
            <>
              <Box>
                {splits.map((split) => {
                  const ownership = propertyOwnership.find((o) => o.userId === split.userId);
                  const isCustomSplit = ownership
                    ? Math.abs(split.percentage - ownership.ownershipPercentage) > 0.01
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
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" fontWeight="medium">
                  Total: {totalPercentage.toFixed(2)}%
                </Typography>

                {isCustomized && (
                  <Button
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={handleResetToDefaults}
                    disabled={disabled}
                  >
                    Reset to Ownership
                  </Button>
                )}
              </Box>
            </>
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};
