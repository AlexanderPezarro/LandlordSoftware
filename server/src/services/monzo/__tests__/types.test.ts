import { describe, it, expect } from '@jest/globals';
import type {
  MonzoTransaction,
  MonzoTransactionsResponse,
  MonzoAccount,
  MonzoAccountsResponse,
  MonzoTokenResponse,
  MonzoWebhook,
  MonzoWebhookRegistrationResponse,
  MonzoWebhookPayload,
  MonzoErrorResponse,
} from '../types.js';

describe('Monzo API Types', () => {
  describe('MonzoTransaction', () => {
    it('should accept a valid transaction object', () => {
      const transaction: MonzoTransaction = {
        account_id: 'acc_00008gju41AHyfLUzBUk8A',
        id: 'tx_00008zIcpb1TB4yeIFXMzx',
        created: '2024-01-01T12:00:00Z',
        description: 'Test Transaction',
        amount: 1500,
        currency: 'GBP',
        notes: 'Test note',
        merchant: {
          id: 'merchant_123',
          name: 'Test Merchant',
        },
        counterparty: {
          name: 'John Doe',
        },
        category: 'eating_out',
        settled: '2024-01-01T12:00:00Z',
      };

      expect(transaction.account_id).toBe('acc_00008gju41AHyfLUzBUk8A');
      expect(transaction.amount).toBe(1500);
    });

    it('should allow optional merchant and counterparty fields to be null', () => {
      const transaction: MonzoTransaction = {
        account_id: 'acc_123',
        id: 'tx_123',
        created: '2024-01-01T12:00:00Z',
        description: 'Test',
        amount: 1000,
        currency: 'GBP',
        notes: '',
        merchant: null,
        counterparty: null,
      };

      expect(transaction.merchant).toBeNull();
      expect(transaction.counterparty).toBeNull();
    });

    it('should allow optional fields to be undefined', () => {
      const transaction: MonzoTransaction = {
        account_id: 'acc_123',
        id: 'tx_123',
        created: '2024-01-01T12:00:00Z',
        description: 'Test',
        amount: 1000,
        currency: 'GBP',
        notes: '',
      };

      expect(transaction.merchant).toBeUndefined();
      expect(transaction.settled).toBeUndefined();
      expect(transaction.category).toBeUndefined();
    });
  });

  describe('MonzoTransactionsResponse', () => {
    it('should accept a valid transactions response', () => {
      const response: MonzoTransactionsResponse = {
        transactions: [
          {
            account_id: 'acc_123',
            id: 'tx_123',
            created: '2024-01-01T12:00:00Z',
            description: 'Test',
            amount: 1000,
            currency: 'GBP',
            notes: '',
          },
        ],
      };

      expect(response.transactions).toHaveLength(1);
    });

    it('should accept an empty transactions array', () => {
      const response: MonzoTransactionsResponse = {
        transactions: [],
      };

      expect(response.transactions).toHaveLength(0);
    });
  });

  describe('MonzoAccount', () => {
    it('should accept a valid account object', () => {
      const account: MonzoAccount = {
        id: 'acc_00008gju41AHyfLUzBUk8A',
        description: 'Test Account',
        type: 'uk_retail',
        created: '2024-01-01T00:00:00Z',
        closed: false,
      };

      expect(account.id).toBe('acc_00008gju41AHyfLUzBUk8A');
      expect(account.closed).toBe(false);
    });

    it('should allow optional fields to be undefined', () => {
      const account: MonzoAccount = {
        id: 'acc_123',
      };

      expect(account.description).toBeUndefined();
      expect(account.type).toBeUndefined();
    });
  });

  describe('MonzoAccountsResponse', () => {
    it('should accept a valid accounts response', () => {
      const response: MonzoAccountsResponse = {
        accounts: [
          {
            id: 'acc_123',
            description: 'Personal Account',
            type: 'uk_retail',
          },
          {
            id: 'acc_456',
            description: 'Joint Account',
            type: 'uk_retail_joint',
          },
        ],
      };

      expect(response.accounts).toHaveLength(2);
    });
  });

  describe('MonzoTokenResponse', () => {
    it('should accept a valid token response', () => {
      const response: MonzoTokenResponse = {
        access_token: 'access_token_123',
        refresh_token: 'refresh_token_123',
        expires_in: 3600,
        token_type: 'Bearer',
        user_id: 'user_123',
        client_id: 'client_123',
      };

      expect(response.access_token).toBe('access_token_123');
      expect(response.expires_in).toBe(3600);
    });

    it('should allow optional fields to be undefined', () => {
      const response: MonzoTokenResponse = {
        access_token: 'access_token_123',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      expect(response.refresh_token).toBeUndefined();
      expect(response.user_id).toBeUndefined();
    });
  });

  describe('MonzoWebhook', () => {
    it('should accept a valid webhook object', () => {
      const webhook: MonzoWebhook = {
        id: 'webhook_123',
        account_id: 'acc_123',
        url: 'https://example.com/webhook',
      };

      expect(webhook.id).toBe('webhook_123');
      expect(webhook.url).toBe('https://example.com/webhook');
    });
  });

  describe('MonzoWebhookRegistrationResponse', () => {
    it('should accept a valid webhook registration response', () => {
      const response: MonzoWebhookRegistrationResponse = {
        webhook: {
          id: 'webhook_123',
          account_id: 'acc_123',
          url: 'https://example.com/webhook',
        },
      };

      expect(response.webhook.id).toBe('webhook_123');
    });
  });

  describe('MonzoWebhookPayload', () => {
    it('should accept a valid webhook payload for transaction.created events', () => {
      const payload: MonzoWebhookPayload = {
        type: 'transaction.created',
        data: {
          account_id: 'acc_123',
          id: 'tx_123',
          created: '2024-01-01T12:00:00Z',
          description: 'Test Transaction',
          amount: 1500,
          currency: 'GBP',
          notes: 'Test note',
        },
      };

      expect(payload.type).toBe('transaction.created');
      expect(payload.data.id).toBe('tx_123');
    });
  });

  describe('MonzoErrorResponse', () => {
    it('should accept a valid error response', () => {
      const error: MonzoErrorResponse = {
        code: 'unauthorized',
        message: 'Invalid access token',
        params: {
          foo: 'bar',
        },
      };

      expect(error.code).toBe('unauthorized');
      expect(error.message).toBe('Invalid access token');
    });

    it('should allow optional fields to be undefined', () => {
      const error: MonzoErrorResponse = {
        message: 'Something went wrong',
      };

      expect(error.code).toBeUndefined();
      expect(error.params).toBeUndefined();
    });
  });
});
