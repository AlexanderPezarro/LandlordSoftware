import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as monzoClient from '../client.js';
import type {
  MonzoTokenResponse,
  MonzoAccountsResponse,
  MonzoTransactionsResponse,
  MonzoWebhookRegistrationResponse,
} from '../types.js';

// Mock global fetch
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('Monzo API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exchangeCodeForTokens', () => {
    it('should exchange authorization code for tokens successfully', async () => {
      const mockResponse: MonzoTokenResponse = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        expires_in: 3600,
        token_type: 'Bearer',
        user_id: 'user_123',
        client_id: 'client_123',
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await monzoClient.exchangeCodeForTokens(
        'auth_code_123',
        'client_id_123',
        'client_secret_123',
        'https://example.com/callback'
      );

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.monzo.com/oauth2/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      );

      // Verify request body contains correct parameters
      const callArgs = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0];
      const requestBody = callArgs[1]?.body as URLSearchParams;
      expect(requestBody.get('grant_type')).toBe('authorization_code');
      expect(requestBody.get('client_id')).toBe('client_id_123');
      expect(requestBody.get('client_secret')).toBe('client_secret_123');
      expect(requestBody.get('redirect_uri')).toBe('https://example.com/callback');
      expect(requestBody.get('code')).toBe('auth_code_123');
    });

    it('should throw error when token exchange fails', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Invalid authorization code',
      } as Response);

      await expect(
        monzoClient.exchangeCodeForTokens(
          'invalid_code',
          'client_id_123',
          'client_secret_123',
          'https://example.com/callback'
        )
      ).rejects.toThrow('Failed to exchange authorization code for tokens');
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token successfully', async () => {
      const mockResponse: MonzoTokenResponse = {
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await monzoClient.refreshAccessToken(
        'old_refresh_token',
        'client_id_123',
        'client_secret_123'
      );

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Verify request body contains correct parameters
      const callArgs = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0];
      const requestBody = callArgs[1]?.body as URLSearchParams;
      expect(requestBody.get('grant_type')).toBe('refresh_token');
      expect(requestBody.get('refresh_token')).toBe('old_refresh_token');
    });

    it('should throw error when token refresh fails', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Invalid refresh token',
      } as Response);

      await expect(
        monzoClient.refreshAccessToken(
          'invalid_refresh_token',
          'client_id_123',
          'client_secret_123'
        )
      ).rejects.toThrow('Failed to refresh access token');
    });
  });

  describe('getAccounts', () => {
    it('should fetch accounts successfully', async () => {
      const mockResponse: MonzoAccountsResponse = {
        accounts: [
          {
            id: 'acc_123',
            description: 'Test Account',
            type: 'uk_retail',
            created: '2024-01-01T00:00:00Z',
            closed: false,
          },
          {
            id: 'acc_456',
            description: 'Joint Account',
            type: 'uk_retail_joint',
            created: '2024-01-01T00:00:00Z',
            closed: false,
          },
        ],
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await monzoClient.getAccounts('test_access_token');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.monzo.com/accounts',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer test_access_token',
          },
        })
      );
    });

    it('should throw error when account fetch fails', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Unauthorized',
      } as Response);

      await expect(monzoClient.getAccounts('invalid_token')).rejects.toThrow(
        'Failed to fetch account information'
      );
    });
  });

  describe('getTransactions', () => {
    it('should fetch transactions successfully', async () => {
      const mockResponse: MonzoTransactionsResponse = {
        transactions: [
          {
            id: 'tx_123',
            account_id: 'acc_123',
            created: '2024-01-01T12:00:00Z',
            description: 'Test Transaction',
            amount: 1500,
            currency: 'GBP',
            notes: 'Test note',
            merchant: { id: 'merchant_123', name: 'Test Merchant' },
            counterparty: { name: 'John Doe' },
            category: 'eating_out',
            settled: '2024-01-01T12:00:00Z',
          },
        ],
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await monzoClient.getTransactions(
        'test_access_token',
        'acc_123',
        '2024-01-01T00:00:00Z'
      );

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Verify URL contains correct parameters
      const callArgs = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0];
      const url = callArgs[0] as string;
      expect(url).toContain('account_id=acc_123');
      expect(url).toContain('since=2024-01-01T00%3A00%3A00Z');
      expect(url).toContain('limit=100');
    });

    it('should include before parameter for pagination', async () => {
      const mockResponse: MonzoTransactionsResponse = {
        transactions: [],
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await monzoClient.getTransactions(
        'test_access_token',
        'acc_123',
        '2024-01-01T00:00:00Z',
        '2024-01-15T00:00:00Z',
        50
      );

      const callArgs = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0];
      const url = callArgs[0] as string;
      expect(url).toContain('before=2024-01-15T00%3A00%3A00Z');
      expect(url).toContain('limit=50');
    });

    it('should throw error when transaction fetch fails', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Unauthorized',
      } as Response);

      await expect(
        monzoClient.getTransactions('invalid_token', 'acc_123', '2024-01-01T00:00:00Z')
      ).rejects.toThrow('Failed to fetch transactions');
    });
  });

  describe('registerWebhook', () => {
    it('should register webhook successfully', async () => {
      const mockResponse: MonzoWebhookRegistrationResponse = {
        webhook: {
          id: 'webhook_123',
          account_id: 'acc_123',
          url: 'https://example.com/webhook',
        },
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await monzoClient.registerWebhook(
        'test_access_token',
        'acc_123',
        'https://example.com/webhook'
      );

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.monzo.com/webhooks',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer test_access_token',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      );

      // Verify request body
      const callArgs = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0];
      const requestBody = callArgs[1]?.body as URLSearchParams;
      expect(requestBody.get('account_id')).toBe('acc_123');
      expect(requestBody.get('url')).toBe('https://example.com/webhook');
    });

    it('should throw error when webhook registration fails', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Webhook registration failed',
      } as Response);

      await expect(
        monzoClient.registerWebhook('test_access_token', 'acc_123', 'https://example.com/webhook')
      ).rejects.toThrow('Failed to register webhook with Monzo');
    });
  });

  describe('deleteWebhook', () => {
    it('should delete webhook successfully', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
      } as Response);

      await monzoClient.deleteWebhook('test_access_token', 'webhook_123');

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.monzo.com/webhooks/webhook_123',
        expect.objectContaining({
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer test_access_token',
          },
        })
      );
    });

    it('should throw error when webhook deletion fails', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Webhook not found',
      } as Response);

      await expect(
        monzoClient.deleteWebhook('test_access_token', 'invalid_webhook_id')
      ).rejects.toThrow('Failed to delete webhook from Monzo');
    });
  });

  describe('generateAuthUrl', () => {
    it('should generate correct authorization URL', () => {
      const url = monzoClient.generateAuthUrl(
        'client_id_123',
        'https://example.com/callback',
        'random_state_123'
      );

      expect(url).toContain('https://auth.monzo.com/');
      expect(url).toContain('client_id=client_id_123');
      expect(url).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fcallback');
      expect(url).toContain('response_type=code');
      expect(url).toContain('state=random_state_123');
    });

    it('should properly encode URL parameters', () => {
      const url = monzoClient.generateAuthUrl(
        'client id with spaces',
        'https://example.com/callback?foo=bar',
        'state with spaces'
      );

      // Verify URL encoding
      expect(url).toContain('client_id=client+id+with+spaces');
      expect(url).toContain('state=state+with+spaces');
    });
  });
});
