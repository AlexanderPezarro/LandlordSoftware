/**
 * Retry utility with exponential backoff
 *
 * Implements retry logic for network requests with:
 * - Exponential backoff (1s, 2s, 4s, ...)
 * - Rate limiting support (Retry-After header)
 * - Configurable retry attempts and delays
 * - Comprehensive error logging
 */

export interface RetryOptions {
  /**
   * Maximum number of retry attempts (default: 3)
   */
  maxAttempts?: number;

  /**
   * Base delay in milliseconds for exponential backoff (default: 1000ms)
   */
  baseDelay?: number;

  /**
   * Maximum delay in milliseconds (default: 30000ms)
   */
  maxDelay?: number;

  /**
   * HTTP status codes that should trigger a retry
   * Default: [408, 429, 500, 502, 503, 504]
   */
  retryableStatuses?: number[];

  /**
   * Callback invoked before each retry attempt
   * @param error - The error that triggered the retry
   * @param attempt - Current attempt number (1-indexed)
   * @param delay - Delay in milliseconds before retry
   */
  onRetry?: (error: Error, attempt: number, delay: number) => void;
}

interface HttpError extends Error {
  response?: {
    status: number;
    headers?: Record<string, string>;
  };
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

/**
 * Determines if an error should trigger a retry
 * @param error - The error to check
 * @param retryableStatuses - List of HTTP status codes that are retryable
 * @returns true if the error is retryable
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isRetryableError(error: any, retryableStatuses: number[]): boolean {
  // Network errors (ECONNREFUSED, ETIMEDOUT, etc.) are always retryable
  if (error.code && typeof error.code === 'string') {
    const networkErrorCodes = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ECONNRESET',
      'ENETUNREACH',
      'ENOTFOUND',
    ];
    if (networkErrorCodes.includes(error.code)) {
      return true;
    }
  }

  // Check if it's an HTTP error with a retryable status
  if (error.response && typeof error.response.status === 'number') {
    return retryableStatuses.includes(error.response.status);
  }

  // Check for fetch API errors
  if (error.name === 'AbortError' || error.name === 'TimeoutError') {
    return true;
  }

  return false;
}

/**
 * Extracts retry delay from 429 response Retry-After header
 * @param error - The HTTP error
 * @returns Delay in milliseconds, or null if header not present
 */
function getRetryAfterDelay(error: HttpError): number | null {
  const retryAfter = error.response?.headers?.['retry-after'];

  if (!retryAfter) {
    return null;
  }

  // Check if it's a number (seconds)
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000; // Convert to milliseconds
  }

  // Check if it's an HTTP date
  const retryDate = new Date(retryAfter);
  if (!isNaN(retryDate.getTime())) {
    const now = Date.now();
    const delay = retryDate.getTime() - now;
    return Math.max(0, delay); // Ensure non-negative
  }

  return null;
}

/**
 * Calculates exponential backoff delay
 * @param attempt - Current attempt number (0-indexed)
 * @param baseDelay - Base delay in milliseconds
 * @param maxDelay - Maximum delay in milliseconds
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  const delay = baseDelay * Math.pow(2, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Delays execution for the specified number of milliseconds
 * @param ms - Milliseconds to delay
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Executes a function with retry logic and exponential backoff
 *
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns Promise resolving to the function's return value
 * @throws The last error if all retry attempts fail
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   async () => {
 *     return await fetchFromApi();
 *   },
 *   {
 *     maxAttempts: 3,
 *     onRetry: (error, attempt, delay) => {
 *       console.log(`Retry attempt ${attempt} after ${delay}ms: ${error.message}`);
 *     }
 *   }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      return await fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      lastError = error;

      // Check if we should retry
      const shouldRetry = isRetryableError(error, config.retryableStatuses);

      if (!shouldRetry || attempt === config.maxAttempts - 1) {
        // Either non-retryable error or last attempt
        throw error;
      }

      // Calculate delay
      let retryDelay: number;

      // Check for Retry-After header on 429 responses
      if (error.response?.status === 429) {
        const retryAfter = getRetryAfterDelay(error);
        retryDelay = retryAfter !== null ? retryAfter : calculateBackoffDelay(attempt, config.baseDelay, config.maxDelay);
      } else {
        retryDelay = calculateBackoffDelay(attempt, config.baseDelay, config.maxDelay);
      }

      // Cap delay at maxDelay
      retryDelay = Math.min(retryDelay, config.maxDelay);

      // Invoke retry callback if provided
      if (options.onRetry) {
        options.onRetry(error, attempt + 1, retryDelay);
      }

      // Wait before retrying
      await delay(retryDelay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Retry failed');
}
