import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  CloudDownload as FetchingIcon,
  Settings as ProcessingIcon,
} from '@mui/icons-material';
import { bankService, ImportProgressUpdate } from '../../services/api/bank.service';

interface ImportProgressDialogProps {
  open: boolean;
  syncLogId: string;
  onClose: () => void;
}

export const ImportProgressDialog: React.FC<ImportProgressDialogProps> = ({
  open,
  syncLogId,
  onClose,
}) => {
  const [progress, setProgress] = useState<ImportProgressUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !syncLogId) {
      return;
    }

    // Subscribe to progress updates
    const unsubscribe = bankService.subscribeToImportProgress(syncLogId, (update) => {
      setProgress(update);

      // Auto-close on completion after a delay
      if (update.status === 'completed') {
        setTimeout(() => {
          onClose();
        }, 3000);
      }
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [open, syncLogId, onClose]);

  const getStatusIcon = () => {
    if (!progress) {
      return <CircularProgress size={48} />;
    }

    switch (progress.status) {
      case 'fetching':
        return <FetchingIcon sx={{ fontSize: 48, color: 'primary.main' }} />;
      case 'processing':
        return <ProcessingIcon sx={{ fontSize: 48, color: 'primary.main' }} />;
      case 'completed':
        return <SuccessIcon sx={{ fontSize: 48, color: 'success.main' }} />;
      case 'failed':
        return <ErrorIcon sx={{ fontSize: 48, color: 'error.main' }} />;
      default:
        return <CircularProgress size={48} />;
    }
  };

  const getStatusText = () => {
    if (!progress) {
      return 'Connecting...';
    }

    switch (progress.status) {
      case 'fetching':
        return 'Fetching Transactions';
      case 'processing':
        return 'Processing Transactions';
      case 'completed':
        return 'Import Complete';
      case 'failed':
        return 'Import Failed';
      default:
        return 'In Progress';
    }
  };

  const isComplete = progress?.status === 'completed' || progress?.status === 'failed';
  const canClose = isComplete || !progress;

  return (
    <Dialog
      open={open}
      onClose={canClose ? onClose : undefined}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={!canClose}
    >
      <DialogTitle>Import Progress</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, py: 2 }}>
          {/* Status Icon */}
          <Box>{getStatusIcon()}</Box>

          {/* Status Text */}
          <Typography variant="h6" textAlign="center">
            {getStatusText()}
          </Typography>

          {/* Progress Bar */}
          {progress && progress.status !== 'completed' && progress.status !== 'failed' && (
            <Box sx={{ width: '100%' }}>
              <LinearProgress />
            </Box>
          )}

          {/* Progress Details */}
          {progress && (
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
              {progress.message && (
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  {progress.message}
                </Typography>
              )}

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 2,
                  mt: 2,
                  p: 2,
                  bgcolor: 'background.default',
                  borderRadius: 1,
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Fetched
                  </Typography>
                  <Typography variant="h6">{progress.transactionsFetched}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Processed
                  </Typography>
                  <Typography variant="h6">{progress.transactionsProcessed}</Typography>
                </Box>
                {progress.duplicatesSkipped > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Duplicates Skipped
                    </Typography>
                    <Typography variant="h6">{progress.duplicatesSkipped}</Typography>
                  </Box>
                )}
                {progress.currentBatch !== undefined && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Current Batch
                    </Typography>
                    <Typography variant="h6">{progress.currentBatch}</Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}

          {/* Error Message */}
          {progress?.error && (
            <Alert severity="error" sx={{ width: '100%' }}>
              {progress.error}
            </Alert>
          )}

          {/* Success Message */}
          {progress?.status === 'completed' && (
            <Alert severity="success" sx={{ width: '100%' }}>
              Successfully imported {progress.transactionsProcessed} transactions!
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={!canClose} variant={isComplete ? 'contained' : 'text'}>
          {isComplete ? 'Close' : 'Running...'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
