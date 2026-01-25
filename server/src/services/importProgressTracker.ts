import { EventEmitter } from 'events';

/**
 * Progress update event data
 */
export interface ImportProgressUpdate {
  syncLogId: string;
  status: 'fetching' | 'processing' | 'completed' | 'failed';
  transactionsFetched: number;
  transactionsProcessed: number;
  duplicatesSkipped: number;
  currentBatch?: number;
  totalBatches?: number;
  message?: string;
  error?: string;
}

/**
 * Singleton event emitter for tracking import progress across the application.
 * Used to send real-time progress updates to connected SSE clients.
 */
class ImportProgressTracker extends EventEmitter {
  private static instance: ImportProgressTracker;

  private constructor() {
    super();
    // Increase max listeners since we might have multiple concurrent imports
    this.setMaxListeners(50);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ImportProgressTracker {
    if (!ImportProgressTracker.instance) {
      ImportProgressTracker.instance = new ImportProgressTracker();
    }
    return ImportProgressTracker.instance;
  }

  /**
   * Emit progress update for a specific sync log
   */
  public emitProgress(update: ImportProgressUpdate): void {
    this.emit('progress', update);
    // Also emit to a sync-specific channel for targeted listening
    this.emit(`progress:${update.syncLogId}`, update);
  }

  /**
   * Listen to progress updates for a specific sync log
   */
  public onProgress(syncLogId: string, callback: (update: ImportProgressUpdate) => void): void {
    this.on(`progress:${syncLogId}`, callback);
  }

  /**
   * Remove progress listener for a specific sync log
   */
  public offProgress(syncLogId: string, callback: (update: ImportProgressUpdate) => void): void {
    this.off(`progress:${syncLogId}`, callback);
  }
}

export const importProgressTracker = ImportProgressTracker.getInstance();
