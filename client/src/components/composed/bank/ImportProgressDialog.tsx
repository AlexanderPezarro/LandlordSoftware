import { useEffect, useState } from 'react';
import {
  CloudDownload,
  Settings,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Dialog } from '../../primitives/Dialog';
import { Spinner } from '../../primitives/Spinner';
import { Button } from '../../primitives/Button';
import {
  bankService,
  type ImportProgressUpdate,
} from '../../../services/api/bank.service';
import styles from './bank.module.scss';

export interface ImportProgressDialogProps {
  open: boolean;
  syncLogId: string;
  onClose: () => void;
}

export function ImportProgressDialog({
  open,
  syncLogId,
  onClose,
}: ImportProgressDialogProps) {
  const [progress, setProgress] = useState<ImportProgressUpdate | null>(null);

  useEffect(() => {
    if (!open || !syncLogId) {
      return;
    }

    const unsubscribe = bankService.subscribeToImportProgress(
      syncLogId,
      (update) => {
        setProgress(update);

        if (update.status === 'completed') {
          setTimeout(() => {
            onClose();
          }, 3000);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [open, syncLogId, onClose]);

  const getStatusIcon = () => {
    if (!progress) {
      return <Spinner size="large" />;
    }

    switch (progress.status) {
      case 'fetching':
        return (
          <CloudDownload size={48} className={styles.statusIconFetching} />
        );
      case 'processing':
        return (
          <Settings size={48} className={styles.statusIconProcessing} />
        );
      case 'completed':
        return (
          <CheckCircle size={48} className={styles.statusIconCompleted} />
        );
      case 'failed':
        return (
          <AlertCircle size={48} className={styles.statusIconFailed} />
        );
      default:
        return <Spinner size="large" />;
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

  const isComplete =
    progress?.status === 'completed' || progress?.status === 'failed';
  const canClose = isComplete || !progress;

  return (
    <Dialog
      open={open}
      onClose={canClose ? onClose : () => {}}
      size="medium"
      disableBackdropClose={!canClose}
    >
      <Dialog.Title>Import Progress</Dialog.Title>
      <Dialog.Content>
        <div className={styles.progressBody}>
          <div className={styles.statusIcon}>{getStatusIcon()}</div>

          <h3 className={styles.statusText}>{getStatusText()}</h3>

          {progress &&
            progress.status !== 'completed' &&
            progress.status !== 'failed' && (
              <div className={styles.progressBarContainer}>
                <div className={styles.progressBar} />
              </div>
            )}

          {progress && (
            <div style={{ width: '100%' }}>
              {progress.message && (
                <p className={styles.progressMessage}>{progress.message}</p>
              )}

              <div className={styles.statsGrid}>
                <div>
                  <span className={styles.statLabel}>Fetched</span>
                  <span className={styles.statValue}>
                    {progress.transactionsFetched}
                  </span>
                </div>
                <div>
                  <span className={styles.statLabel}>Processed</span>
                  <span className={styles.statValue}>
                    {progress.transactionsProcessed}
                  </span>
                </div>
                {progress.duplicatesSkipped > 0 && (
                  <div>
                    <span className={styles.statLabel}>
                      Duplicates Skipped
                    </span>
                    <span className={styles.statValue}>
                      {progress.duplicatesSkipped}
                    </span>
                  </div>
                )}
                {progress.currentBatch !== undefined && (
                  <div>
                    <span className={styles.statLabel}>Current Batch</span>
                    <span className={styles.statValue}>
                      {progress.currentBatch}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {progress?.error && (
            <div className={styles.alertError}>
              <AlertCircle size={20} className={styles.alertIcon} />
              <span className={styles.alertText}>{progress.error}</span>
            </div>
          )}

          {progress?.status === 'completed' && (
            <div className={styles.alertSuccess}>
              <CheckCircle size={20} className={styles.alertIcon} />
              <span className={styles.alertText}>
                Successfully imported {progress.transactionsProcessed}{' '}
                transactions!
              </span>
            </div>
          )}
        </div>
      </Dialog.Content>
      <Dialog.Actions>
        <Button
          variant={isComplete ? 'primary' : 'text'}
          onClick={onClose}
          disabled={!canClose}
        >
          {isComplete ? 'Close' : 'Running...'}
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
}
