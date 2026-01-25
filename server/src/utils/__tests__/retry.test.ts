import { describe, it, expect } from '@jest/globals';
import { retryWithBackoff } from '../retry.js';

// Error interfaces for testing
interface TestHttpError extends Error {
  response: {
    status: number;
    headers?: Record<string, string>;
  };
}

interface TestNetworkError extends Error {
  code: string;
}

interface TestTimeoutError extends Error {
  name: 'TimeoutError';
}

interface TestAbortError extends Error {
  name: 'AbortError';
}

// Helper to create HTTP errors with specific status codes
function createHttpError(status: number, headers: Record<string, string> = {}): TestHttpError {
  const error = new Error(`HTTP ${status}`) as TestHttpError;
  error.response = { status, headers };
  return error;
}

// Helper to create network errors
function createNetworkError(code: string): TestNetworkError {
  const error = new Error(`Network error: ${code}`) as TestNetworkError;
  error.code = code;
  return error;
}

describe('retryWithBackoff', () => {
  describe('successful execution', () => {
    it('should return result on first attempt if successful', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        return 'success';
      };

      const result = await retryWithBackoff(fn);

      expect(result).toBe('success');
      expect(callCount).toBe(1);
    });
  });

  describe('network errors', () => {
    it('should retry on ECONNREFUSED error', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount === 1) {
          throw createNetworkError('ECONNREFUSED');
        }
        return 'success';
      };

      const result = await retryWithBackoff(fn, { baseDelay: 10 });

      expect(result).toBe('success');
      expect(callCount).toBe(2);
    });

    it('should retry on ETIMEDOUT error', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount === 1) {
          throw createNetworkError('ETIMEDOUT');
        }
        return 'success';
      };

      const result = await retryWithBackoff(fn, { baseDelay: 10 });

      expect(result).toBe('success');
      expect(callCount).toBe(2);
    });

    it('should retry on ECONNRESET error', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount === 1) {
          throw createNetworkError('ECONNRESET');
        }
        return 'success';
      };

      const result = await retryWithBackoff(fn, { baseDelay: 10 });

      expect(result).toBe('success');
      expect(callCount).toBe(2);
    });

    it('should fail after max retries', async () => {
      let callCount = 0;
      const error = createNetworkError('ECONNREFUSED');
      const fn = async () => {
        callCount++;
        throw error;
      };

      await expect(retryWithBackoff(fn, { baseDelay: 10 })).rejects.toThrow('Network error: ECONNREFUSED');
      expect(callCount).toBe(3); // Default maxAttempts
    });

    it('should use exponential backoff delays', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount <= 2) {
          throw createNetworkError('ETIMEDOUT');
        }
        return 'success';
      };

      const delays: number[] = [];

      const onRetry = (_error: Error, _attempt: number, delay: number) => {
        delays.push(delay);
      };

      await retryWithBackoff(fn, { baseDelay: 50, onRetry });

      // Check delay values - exponential backoff pattern
      expect(delays).toHaveLength(2);
      expect(delays[0]).toBe(50);  // 50ms * 2^0
      expect(delays[1]).toBe(100); // 50ms * 2^1
    });
  });

  describe('HTTP errors', () => {
    it('should retry on 500 error', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount === 1) {
          throw createHttpError(500);
        }
        return 'success';
      };

      const result = await retryWithBackoff(fn, { baseDelay: 10 });

      expect(result).toBe('success');
      expect(callCount).toBe(2);
    });

    it('should retry on 502 error', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount === 1) {
          throw createHttpError(502);
        }
        return 'success';
      };

      const result = await retryWithBackoff(fn, { baseDelay: 10 });

      expect(result).toBe('success');
      expect(callCount).toBe(2);
    });

    it('should retry on 503 error', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount === 1) {
          throw createHttpError(503);
        }
        return 'success';
      };

      const result = await retryWithBackoff(fn, { baseDelay: 10 });

      expect(result).toBe('success');
      expect(callCount).toBe(2);
    });

    it('should retry on 504 error', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount === 1) {
          throw createHttpError(504);
        }
        return 'success';
      };

      const result = await retryWithBackoff(fn, { baseDelay: 10 });

      expect(result).toBe('success');
      expect(callCount).toBe(2);
    });

    it('should retry on 408 error', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount === 1) {
          throw createHttpError(408);
        }
        return 'success';
      };

      const result = await retryWithBackoff(fn, { baseDelay: 10 });

      expect(result).toBe('success');
      expect(callCount).toBe(2);
    });

    it('should retry on 429 error', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount === 1) {
          throw createHttpError(429);
        }
        return 'success';
      };

      const result = await retryWithBackoff(fn, { baseDelay: 10 });

      expect(result).toBe('success');
      expect(callCount).toBe(2);
    });

    it('should not retry on 400 error', async () => {
      let callCount = 0;
      const error = createHttpError(400);
      const fn = async () => {
        callCount++;
        throw error;
      };

      await expect(retryWithBackoff(fn, { baseDelay: 10 })).rejects.toThrow('HTTP 400');
      expect(callCount).toBe(1);
    });

    it('should not retry on 404 error', async () => {
      let callCount = 0;
      const error = createHttpError(404);
      const fn = async () => {
        callCount++;
        throw error;
      };

      await expect(retryWithBackoff(fn, { baseDelay: 10 })).rejects.toThrow('HTTP 404');
      expect(callCount).toBe(1);
    });

    it('should not retry on 403 error', async () => {
      let callCount = 0;
      const error = createHttpError(403);
      const fn = async () => {
        callCount++;
        throw error;
      };

      await expect(retryWithBackoff(fn, { baseDelay: 10 })).rejects.toThrow('HTTP 403');
      expect(callCount).toBe(1);
    });
  });

  describe('rate limiting (429)', () => {
    it('should use Retry-After header value (seconds)', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount === 1) {
          throw createHttpError(429, { 'retry-after': '1' });
        }
        return 'success';
      };

      const delays: number[] = [];
      const onRetry = (_error: Error, _attempt: number, delay: number) => {
        delays.push(delay);
      };

      await retryWithBackoff(fn, { baseDelay: 10, onRetry });

      // Should use Retry-After value (1 second = 1000ms)
      expect(delays[0]).toBe(1000);
      expect(callCount).toBe(2);
    });

    it('should use Retry-After header value (HTTP date)', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount === 1) {
          // Create future date - should result in delay > base delay
          const futureDate = new Date(Date.now() + 2000).toUTCString();
          throw createHttpError(429, { 'retry-after': futureDate });
        }
        return 'success';
      };

      const delays: number[] = [];
      const onRetry = (_error: Error, _attempt: number, delay: number) => {
        delays.push(delay);
      };

      await retryWithBackoff(fn, { baseDelay: 10, onRetry });

      // Should parse the HTTP date and use a delay significantly longer than base delay
      // Allow for processing time - delay should be at least 1 second but less than 3
      expect(delays[0]).toBeGreaterThan(100); // Much more than base delay of 10ms
      expect(delays[0]).toBeLessThan(3000); // But less than 3 seconds
      expect(callCount).toBe(2);
    });

    it('should use default backoff if Retry-After header is missing', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount === 1) {
          throw createHttpError(429);
        }
        return 'success';
      };

      const delays: number[] = [];
      const onRetry = (_error: Error, _attempt: number, delay: number) => {
        delays.push(delay);
      };

      await retryWithBackoff(fn, { baseDelay: 50, onRetry });

      // Should use exponential backoff (50ms for first retry)
      expect(delays[0]).toBe(50);
      expect(callCount).toBe(2);
    });

    it('should cap Retry-After delay at maxDelay', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount === 1) {
          throw createHttpError(429, { 'retry-after': '100' });
        }
        return 'success';
      };

      const delays: number[] = [];
      const onRetry = (_error: Error, _attempt: number, delay: number) => {
        delays.push(delay);
      };

      await retryWithBackoff(fn, { baseDelay: 10, maxDelay: 500, onRetry });

      // Should cap at maxDelay (500ms instead of 100000ms)
      expect(delays[0]).toBe(500);
      expect(callCount).toBe(2);
    });
  });

  describe('custom options', () => {
    it('should respect custom maxAttempts', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        throw createNetworkError('ECONNREFUSED');
      };

      await expect(retryWithBackoff(fn, { maxAttempts: 5, baseDelay: 10 })).rejects.toThrow();
      expect(callCount).toBe(5);
    });

    it('should respect custom baseDelay', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount === 1) {
          throw createNetworkError('ETIMEDOUT');
        }
        return 'success';
      };

      const delays: number[] = [];
      const onRetry = (_error: Error, _attempt: number, delay: number) => {
        delays.push(delay);
      };

      await retryWithBackoff(fn, { baseDelay: 100, onRetry });

      expect(delays[0]).toBe(100);
    });

    it('should call onRetry callback with correct parameters', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount === 1) {
          throw createNetworkError('ETIMEDOUT');
        }
        if (callCount === 2) {
          throw createHttpError(500);
        }
        return 'success';
      };

      const retryCallbacks: Array<{ error: Error; attempt: number; delay: number }> = [];
      const onRetry = (error: Error, attempt: number, delay: number) => {
        retryCallbacks.push({ error, attempt, delay });
      };

      await retryWithBackoff(fn, { baseDelay: 10, onRetry });

      expect(retryCallbacks).toHaveLength(2);
      expect(retryCallbacks[0].attempt).toBe(1);
      expect(retryCallbacks[0].delay).toBe(10);
      expect(retryCallbacks[1].attempt).toBe(2);
      expect(retryCallbacks[1].delay).toBe(20);
    });
  });

  describe('edge cases', () => {
    it('should respect maxDelay cap with large attempt numbers', async () => {
      const fn = async () => {
        throw createNetworkError('ECONNREFUSED');
      };

      const delays: number[] = [];
      const onRetry = (_error: Error, _attempt: number, delay: number) => {
        delays.push(delay);
      };

      await expect(
        retryWithBackoff(fn, {
          maxAttempts: 6,
          baseDelay: 100,
          maxDelay: 500,
          onRetry
        })
      ).rejects.toThrow();

      // Check that no delay exceeds maxDelay
      // With baseDelay=100, delays will be: 100, 200, 400, 500 (capped), 500 (capped)
      delays.forEach(delay => {
        expect(delay).toBeLessThanOrEqual(500);
      });
      expect(delays.length).toBe(5); // 6 attempts - 1 (initial attempt)
    });

    it('should handle synchronous errors', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        throw createNetworkError('ECONNREFUSED');
      };

      await expect(retryWithBackoff(fn, { baseDelay: 10 })).rejects.toThrow();
      expect(callCount).toBe(3);
    });

    it('should handle TimeoutError', async () => {
      let callCount = 0;
      const error = new Error('Timeout') as TestTimeoutError;
      error.name = 'TimeoutError';
      const fn = async () => {
        callCount++;
        if (callCount === 1) {
          throw error;
        }
        return 'success';
      };

      const result = await retryWithBackoff(fn, { baseDelay: 10 });

      expect(result).toBe('success');
      expect(callCount).toBe(2);
    });

    it('should handle AbortError', async () => {
      let callCount = 0;
      const error = new Error('Aborted') as TestAbortError;
      error.name = 'AbortError';
      const fn = async () => {
        callCount++;
        if (callCount === 1) {
          throw error;
        }
        return 'success';
      };

      const result = await retryWithBackoff(fn, { baseDelay: 10 });

      expect(result).toBe('success');
      expect(callCount).toBe(2);
    });
  });
});
