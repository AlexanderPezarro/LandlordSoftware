import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { importProgressTracker, ImportProgressUpdate } from '../importProgressTracker.js';

describe('ImportProgressTracker', () => {
  beforeEach(() => {
    // Remove all listeners before each test
    importProgressTracker.removeAllListeners();
  });

  it('should emit progress updates', (done) => {
    const syncLogId = 'test-sync-log-123';
    const update: ImportProgressUpdate = {
      syncLogId,
      status: 'fetching',
      transactionsFetched: 100,
      transactionsProcessed: 0,
      duplicatesSkipped: 0,
      message: 'Fetching transactions...',
    };

    importProgressTracker.onProgress(syncLogId, (receivedUpdate) => {
      expect(receivedUpdate).toEqual(update);
      done();
    });

    importProgressTracker.emitProgress(update);
  });

  it('should support multiple listeners for the same sync log', (done) => {
    const syncLogId = 'test-sync-log-456';
    const update: ImportProgressUpdate = {
      syncLogId,
      status: 'processing',
      transactionsFetched: 200,
      transactionsProcessed: 150,
      duplicatesSkipped: 50,
      message: 'Processing transactions...',
    };

    let callCount = 0;
    const checkDone = () => {
      callCount++;
      if (callCount === 2) {
        done();
      }
    };

    importProgressTracker.onProgress(syncLogId, (receivedUpdate) => {
      expect(receivedUpdate).toEqual(update);
      checkDone();
    });

    importProgressTracker.onProgress(syncLogId, (receivedUpdate) => {
      expect(receivedUpdate).toEqual(update);
      checkDone();
    });

    importProgressTracker.emitProgress(update);
  });

  it('should only receive updates for the correct sync log', (done) => {
    const syncLogId1 = 'sync-log-1';
    const syncLogId2 = 'sync-log-2';

    const update1: ImportProgressUpdate = {
      syncLogId: syncLogId1,
      status: 'fetching',
      transactionsFetched: 50,
      transactionsProcessed: 0,
      duplicatesSkipped: 0,
    };

    const update2: ImportProgressUpdate = {
      syncLogId: syncLogId2,
      status: 'completed',
      transactionsFetched: 100,
      transactionsProcessed: 100,
      duplicatesSkipped: 0,
    };

    // Listener for sync log 1 should not receive updates for sync log 2
    importProgressTracker.onProgress(syncLogId1, (receivedUpdate) => {
      expect(receivedUpdate.syncLogId).toBe(syncLogId1);
      expect(receivedUpdate).toEqual(update1);
      done();
    });

    // Emit update for sync log 2 (should not trigger listener)
    importProgressTracker.emitProgress(update2);

    // Emit update for sync log 1 (should trigger listener)
    importProgressTracker.emitProgress(update1);
  });

  it('should remove listener correctly', () => {
    const syncLogId = 'test-sync-log-789';
    const mockCallback = jest.fn();

    importProgressTracker.onProgress(syncLogId, mockCallback);
    importProgressTracker.offProgress(syncLogId, mockCallback);

    const update: ImportProgressUpdate = {
      syncLogId,
      status: 'fetching',
      transactionsFetched: 0,
      transactionsProcessed: 0,
      duplicatesSkipped: 0,
    };

    importProgressTracker.emitProgress(update);

    // Callback should not have been called since it was removed
    expect(mockCallback).not.toHaveBeenCalled();
  });

  it('should handle completion status', (done) => {
    const syncLogId = 'test-sync-complete';
    const update: ImportProgressUpdate = {
      syncLogId,
      status: 'completed',
      transactionsFetched: 500,
      transactionsProcessed: 450,
      duplicatesSkipped: 50,
      message: 'Import completed successfully',
    };

    importProgressTracker.onProgress(syncLogId, (receivedUpdate) => {
      expect(receivedUpdate.status).toBe('completed');
      expect(receivedUpdate.transactionsProcessed).toBe(450);
      done();
    });

    importProgressTracker.emitProgress(update);
  });

  it('should handle error status', (done) => {
    const syncLogId = 'test-sync-error';
    const update: ImportProgressUpdate = {
      syncLogId,
      status: 'failed',
      transactionsFetched: 100,
      transactionsProcessed: 0,
      duplicatesSkipped: 0,
      error: 'Network error occurred',
    };

    importProgressTracker.onProgress(syncLogId, (receivedUpdate) => {
      expect(receivedUpdate.status).toBe('failed');
      expect(receivedUpdate.error).toBe('Network error occurred');
      done();
    });

    importProgressTracker.emitProgress(update);
  });

  it('should handle batch information', (done) => {
    const syncLogId = 'test-sync-batch';
    const update: ImportProgressUpdate = {
      syncLogId,
      status: 'fetching',
      transactionsFetched: 300,
      transactionsProcessed: 0,
      duplicatesSkipped: 0,
      currentBatch: 3,
      totalBatches: 10,
      message: 'Fetching batch 3 of 10...',
    };

    importProgressTracker.onProgress(syncLogId, (receivedUpdate) => {
      expect(receivedUpdate.currentBatch).toBe(3);
      expect(receivedUpdate.totalBatches).toBe(10);
      done();
    });

    importProgressTracker.emitProgress(update);
  });
});
