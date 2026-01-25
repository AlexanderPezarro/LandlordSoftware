import { api } from '../api';

export interface MatchingRule {
  id: string;
  bankAccountId: string | null;
  name: string;
  enabled: boolean;
  priority: number;
  conditions: string;
  propertyId: string | null;
  type: 'INCOME' | 'EXPENSE' | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMatchingRuleRequest {
  name: string;
  enabled: boolean;
  conditions: string;
  propertyId?: string | null;
  type?: 'INCOME' | 'EXPENSE' | null;
  category?: string | null;
}

export interface UpdateMatchingRuleRequest {
  name?: string;
  enabled?: boolean;
  conditions?: string;
  propertyId?: string | null;
  type?: 'INCOME' | 'EXPENSE' | null;
  category?: string | null;
}

export interface TestRuleRequest {
  description: string;
  amount: number;
  counterpartyName?: string;
  merchant?: string;
  reference?: string;
}

export interface RulesResponse {
  success: boolean;
  rules: MatchingRule[];
}

export interface RuleResponse {
  success: boolean;
  rule: MatchingRule;
}

export interface CreateRuleResponse {
  success: boolean;
  rule: MatchingRule;
  reprocessing: {
    processed: number;
    approved: number;
    failed: number;
  };
}

export interface UpdateRuleResponse {
  success: boolean;
  rule: MatchingRule;
  reprocessing: {
    processed: number;
    approved: number;
    failed: number;
  };
}

export interface DeleteRuleResponse {
  success: boolean;
  message: string;
  reprocessing: {
    processed: number;
    approved: number;
    failed: number;
  };
}

export interface ReorderRulesResponse {
  success: boolean;
  message: string;
}

export interface TestRuleResponse {
  success: boolean;
  matches: boolean;
  result: {
    matchedRules: string[];
    suggestedPropertyId: string | null;
    suggestedType: 'INCOME' | 'EXPENSE' | null;
    suggestedCategory: string | null;
  };
}

export const matchingRulesService = {
  /**
   * Get all rules for a bank account
   * @param accountId - Bank account ID
   * @returns List of matching rules
   */
  async getRules(accountId: string): Promise<MatchingRule[]> {
    const response = await api.get<RulesResponse>(`/bank/accounts/${accountId}/rules`);
    return response.data.rules;
  },

  /**
   * Get a single rule by ID
   * @param ruleId - Rule ID
   * @returns Matching rule
   */
  async getRule(ruleId: string): Promise<MatchingRule> {
    const response = await api.get<RuleResponse>(`/bank/rules/${ruleId}`);
    return response.data.rule;
  },

  /**
   * Create a new rule for a bank account
   * @param accountId - Bank account ID
   * @param data - Rule data
   * @returns Created rule with reprocessing results
   */
  async createRule(
    accountId: string,
    data: CreateMatchingRuleRequest
  ): Promise<CreateRuleResponse> {
    const response = await api.post<CreateRuleResponse>(
      `/bank/accounts/${accountId}/rules`,
      data
    );
    return response.data;
  },

  /**
   * Update an existing rule
   * @param ruleId - Rule ID
   * @param data - Updated fields
   * @returns Updated rule with reprocessing results
   */
  async updateRule(
    ruleId: string,
    data: UpdateMatchingRuleRequest
  ): Promise<UpdateRuleResponse> {
    const response = await api.put<UpdateRuleResponse>(`/bank/rules/${ruleId}`, data);
    return response.data;
  },

  /**
   * Delete a rule
   * @param ruleId - Rule ID
   * @returns Success message with reprocessing results
   */
  async deleteRule(ruleId: string): Promise<DeleteRuleResponse> {
    const response = await api.delete<DeleteRuleResponse>(`/bank/rules/${ruleId}`);
    return response.data;
  },

  /**
   * Reorder rules by priority
   * @param ruleIds - Array of rule IDs in desired order
   * @returns Success message
   */
  async reorderRules(ruleIds: string[]): Promise<ReorderRulesResponse> {
    const response = await api.post<ReorderRulesResponse>('/bank/rules/reorder', { ruleIds });
    return response.data;
  },

  /**
   * Test a rule with sample transaction data
   * @param ruleId - Rule ID
   * @param data - Sample transaction data
   * @returns Test result showing if rule matches
   */
  async testRule(ruleId: string, data: TestRuleRequest): Promise<TestRuleResponse> {
    const response = await api.post<TestRuleResponse>(`/bank/rules/${ruleId}/test`, data);
    return response.data;
  },
};
