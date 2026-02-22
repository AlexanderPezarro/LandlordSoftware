import { matchingRulesService, MatchingRule, CreateMatchingRuleRequest, UpdateMatchingRuleRequest, TestRuleRequest } from '../matchingRules.service';
import { api } from '../../api';

jest.mock('../../api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('matchingRulesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRules', () => {
    it('should fetch rules for a bank account', async () => {
      const mockRules: MatchingRule[] = [
        {
          id: '1',
          bankAccountId: 'acc-1',
          name: 'Test Rule',
          enabled: true,
          priority: 0,
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'test' }],
          }),
          propertyId: null,
          type: null,
          category: null,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockedApi.get.mockResolvedValue({
        data: { success: true, rules: mockRules },
      } as any);

      const result = await matchingRulesService.getRules('acc-1');

      expect(mockedApi.get).toHaveBeenCalledWith('/bank/accounts/acc-1/rules');
      expect(result).toEqual(mockRules);
    });
  });

  describe('getRule', () => {
    it('should fetch a single rule by ID', async () => {
      const mockRule: MatchingRule = {
        id: '1',
        bankAccountId: 'acc-1',
        name: 'Test Rule',
        enabled: true,
        priority: 0,
        conditions: JSON.stringify({
          operator: 'AND',
          rules: [{ field: 'description', matchType: 'contains', value: 'test' }],
        }),
        propertyId: null,
        type: null,
        category: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockedApi.get.mockResolvedValue({
        data: { success: true, rule: mockRule },
      } as any);

      const result = await matchingRulesService.getRule('1');

      expect(mockedApi.get).toHaveBeenCalledWith('/bank/rules/1');
      expect(result).toEqual(mockRule);
    });
  });

  describe('createRule', () => {
    it('should create a new rule', async () => {
      const request: CreateMatchingRuleRequest = {
        name: 'New Rule',
        enabled: true,
        conditions: JSON.stringify({
          operator: 'AND',
          rules: [{ field: 'description', matchType: 'contains', value: 'test' }],
        }),
        propertyId: 'prop-1',
        type: 'INCOME',
        category: 'Rent',
      };

      const mockResponse = {
        success: true,
        rule: {
          id: '1',
          bankAccountId: 'acc-1',
          priority: 0,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          ...request,
        },
        reprocessing: {
          processed: 5,
          approved: 3,
          failed: 0,
        },
      };

      mockedApi.post.mockResolvedValue({
        data: mockResponse,
      } as any);

      const result = await matchingRulesService.createRule('acc-1', request);

      expect(mockedApi.post).toHaveBeenCalledWith('/bank/accounts/acc-1/rules', request);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateRule', () => {
    it('should update an existing rule', async () => {
      const request: UpdateMatchingRuleRequest = {
        name: 'Updated Rule',
        enabled: false,
      };

      const mockResponse = {
        success: true,
        rule: {
          id: '1',
          bankAccountId: 'acc-1',
          name: 'Updated Rule',
          enabled: false,
          priority: 0,
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'test' }],
          }),
          propertyId: null,
          type: null,
          category: null,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        reprocessing: {
          processed: 5,
          approved: 3,
          failed: 0,
        },
      };

      mockedApi.put.mockResolvedValue({
        data: mockResponse,
      } as any);

      const result = await matchingRulesService.updateRule('1', request);

      expect(mockedApi.put).toHaveBeenCalledWith('/bank/rules/1', request);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteRule', () => {
    it('should delete a rule', async () => {
      const mockResponse = {
        success: true,
        message: 'Matching rule deleted successfully',
        reprocessing: {
          processed: 5,
          approved: 3,
          failed: 0,
        },
      };

      mockedApi.delete.mockResolvedValue({
        data: mockResponse,
      } as any);

      const result = await matchingRulesService.deleteRule('1');

      expect(mockedApi.delete).toHaveBeenCalledWith('/bank/rules/1');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('reorderRules', () => {
    it('should reorder rules', async () => {
      const ruleIds = ['1', '2', '3'];

      const mockResponse = {
        success: true,
        message: 'Rules reordered successfully',
      };

      mockedApi.post.mockResolvedValue({
        data: mockResponse,
      } as any);

      const result = await matchingRulesService.reorderRules(ruleIds);

      expect(mockedApi.post).toHaveBeenCalledWith('/bank/rules/reorder', { ruleIds });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('testRule', () => {
    it('should test a rule with sample data', async () => {
      const testData: TestRuleRequest = {
        description: 'Test transaction',
        amount: 100,
        counterpartyName: 'Test Counterparty',
        merchant: 'Test Merchant',
        reference: 'REF123',
      };

      const mockResponse = {
        success: true,
        matches: true,
        result: {
          matchedRules: ['1'],
          suggestedPropertyId: 'prop-1',
          suggestedType: 'INCOME',
          suggestedCategory: 'Rent',
        },
      };

      mockedApi.post.mockResolvedValue({
        data: mockResponse,
      } as any);

      const result = await matchingRulesService.testRule('1', testData);

      expect(mockedApi.post).toHaveBeenCalledWith('/bank/rules/1/test', testData);
      expect(result).toEqual(mockResponse);
    });
  });
});
