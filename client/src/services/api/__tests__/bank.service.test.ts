import { bankService, WebhookStatusData } from '../bank.service';
import { api } from '../../api';

jest.mock('../../api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('bankService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getWebhookStatus', () => {
    it('should fetch webhook status data', async () => {
      const mockWebhookStatus: WebhookStatusData = {
        lastEventTimestamp: '2024-01-24T10:00:00Z',
        recentEvents: [
          {
            id: '1',
            accountId: 'acc-1',
            accountName: 'Test Account',
            status: 'success',
            startedAt: '2024-01-24T10:00:00Z',
            completedAt: '2024-01-24T10:00:01Z',
            errorMessage: null,
            webhookEventId: 'evt_123',
            transactionsFetched: 1,
          },
        ],
        failedCount24h: 0,
        failedCount1h: 0,
        accountStatuses: [
          {
            accountId: 'acc-1',
            accountName: 'Test Account',
            lastWebhookAt: '2024-01-24T10:00:00Z',
            lastWebhookStatus: 'success',
            webhookId: 'webhook_123',
          },
        ],
      };

      mockedApi.get.mockResolvedValue({
        data: { success: true, data: mockWebhookStatus },
      } as any);

      const result = await bankService.getWebhookStatus();

      expect(mockedApi.get).toHaveBeenCalledWith('/bank/webhooks/status');
      expect(result).toEqual(mockWebhookStatus);
    });

    it('should handle errors when fetching webhook status', async () => {
      const mockError = new Error('Failed to fetch webhook status');
      mockedApi.get.mockRejectedValue(mockError);

      await expect(bankService.getWebhookStatus()).rejects.toThrow('Failed to fetch webhook status');
    });

    it('should return data with no events when none exist', async () => {
      const mockEmptyStatus: WebhookStatusData = {
        lastEventTimestamp: null,
        recentEvents: [],
        failedCount24h: 0,
        failedCount1h: 0,
        accountStatuses: [],
      };

      mockedApi.get.mockResolvedValue({
        data: { success: true, data: mockEmptyStatus },
      } as any);

      const result = await bankService.getWebhookStatus();

      expect(result.lastEventTimestamp).toBeNull();
      expect(result.recentEvents).toHaveLength(0);
      expect(result.failedCount24h).toBe(0);
      expect(result.failedCount1h).toBe(0);
    });

    it('should return failure counts when webhooks have failed', async () => {
      const mockFailedStatus: WebhookStatusData = {
        lastEventTimestamp: '2024-01-24T10:00:00Z',
        recentEvents: [],
        failedCount24h: 5,
        failedCount1h: 3,
        accountStatuses: [],
      };

      mockedApi.get.mockResolvedValue({
        data: { success: true, data: mockFailedStatus },
      } as any);

      const result = await bankService.getWebhookStatus();

      expect(result.failedCount24h).toBe(5);
      expect(result.failedCount1h).toBe(3);
    });
  });
});
