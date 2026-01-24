import { describe, it, expect } from '@jest/globals';
import { getMonzoErrorMessage } from '../monzoApiWrapper.js';

describe('Monzo API Wrapper', () => {
  describe('getMonzoErrorMessage', () => {
    it('should return message for 401 error', () => {
      const error: any = new Error('Unauthorized');
      error.response = { status: 401 };

      expect(getMonzoErrorMessage(error)).toBe(
        'Access token has expired. Please reconnect your bank account.'
      );
    });

    it('should return message for 403 error', () => {
      const error: any = new Error('Forbidden');
      error.response = { status: 403 };

      expect(getMonzoErrorMessage(error)).toBe(
        'Access denied. Please reconnect your bank account.'
      );
    });

    it('should return message for 404 error', () => {
      const error: any = new Error('Not Found');
      error.response = { status: 404 };

      expect(getMonzoErrorMessage(error)).toBe(
        'Resource not found. The account or transaction may have been deleted.'
      );
    });

    it('should return message for 429 error', () => {
      const error: any = new Error('Too Many Requests');
      error.response = { status: 429 };

      expect(getMonzoErrorMessage(error)).toBe(
        'Rate limit exceeded. Please try again later.'
      );
    });

    it('should return message for 500 error', () => {
      const error: any = new Error('Internal Server Error');
      error.response = { status: 500 };

      expect(getMonzoErrorMessage(error)).toBe(
        'Monzo service is temporarily unavailable. Please try again later.'
      );
    });

    it('should return message for 502 error', () => {
      const error: any = new Error('Bad Gateway');
      error.response = { status: 502 };

      expect(getMonzoErrorMessage(error)).toBe(
        'Monzo service is temporarily unavailable. Please try again later.'
      );
    });

    it('should return message for 503 error', () => {
      const error: any = new Error('Service Unavailable');
      error.response = { status: 503 };

      expect(getMonzoErrorMessage(error)).toBe(
        'Monzo service is temporarily unavailable. Please try again later.'
      );
    });

    it('should return message for ECONNREFUSED error', () => {
      const error: any = new Error('Connection refused');
      error.code = 'ECONNREFUSED';

      expect(getMonzoErrorMessage(error)).toBe(
        'Could not connect to Monzo. Please check your internet connection.'
      );
    });

    it('should return message for ETIMEDOUT error', () => {
      const error: any = new Error('Timeout');
      error.code = 'ETIMEDOUT';

      expect(getMonzoErrorMessage(error)).toBe(
        'Request timed out. Please try again.'
      );
    });

    it('should return message for ECONNRESET error', () => {
      const error: any = new Error('Connection reset');
      error.code = 'ECONNRESET';

      expect(getMonzoErrorMessage(error)).toBe(
        'Connection was reset. Please try again.'
      );
    });

    it('should return generic message for other HTTP errors', () => {
      const error: any = new Error('Bad Request');
      error.response = { status: 400 };

      expect(getMonzoErrorMessage(error)).toBe('Request failed with status 400');
    });

    it('should return error message for unknown error', () => {
      const error = new Error('Some unknown error');

      expect(getMonzoErrorMessage(error)).toBe('Some unknown error');
    });

    it('should return default message for non-Error objects', () => {
      expect(getMonzoErrorMessage('not an error')).toBe('An unknown error occurred');
    });
  });
});
