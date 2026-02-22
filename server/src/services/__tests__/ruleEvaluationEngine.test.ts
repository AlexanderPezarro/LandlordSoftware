import { describe, it, expect } from '@jest/globals';
import { evaluateRules } from '../ruleEvaluationEngine.js';
import type { BankTransaction, MatchingRule } from '@prisma/client';

// Helper to create mock bank transaction
function createMockTransaction(overrides: Partial<BankTransaction> = {}): BankTransaction {
  return {
    id: 'tx_test_001',
    bankAccountId: 'acc_test_001',
    externalId: 'ext_test_001',
    amount: -50.00,
    currency: 'GBP',
    description: 'Coffee Shop',
    counterpartyName: 'Starbucks',
    reference: 'REF123',
    merchant: 'Starbucks London',
    category: 'eating_out',
    transactionDate: new Date('2024-01-15T10:00:00Z'),
    settledDate: new Date('2024-01-15T12:00:00Z'),
    importedAt: new Date('2024-01-16T08:00:00Z'),
    transactionId: null,
    pendingTransactionId: null,
    ...overrides,
  };
}

// Helper to create mock matching rule
function createMockRule(overrides: Partial<MatchingRule> = {}): MatchingRule {
  return {
    id: 'rule_test_001',
    bankAccountId: 'acc_test_001',
    priority: 0,
    enabled: true,
    name: 'Test Rule',
    conditions: JSON.stringify({
      operator: 'AND',
      rules: [],
    }),
    propertyId: null,
    type: null,
    category: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('Rule Evaluation Engine', () => {
  describe('String match types', () => {
    describe('contains (case-insensitive by default)', () => {
      it('should match when description contains the value', () => {
        const transaction = createMockTransaction({ description: 'Payment to Coffee Shop' });
        const rule = createMockRule({
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'coffee' }],
          }),
          propertyId: 'prop_001',
        });

        const result = evaluateRules(transaction, [rule]);

        expect(result.propertyId).toBe('prop_001');
        expect(result.matchedRules).toEqual(['rule_test_001']);
        expect(result.isFullyMatched).toBe(false);
      });

      it('should not match when description does not contain the value', () => {
        const transaction = createMockTransaction({ description: 'Payment to Restaurant' });
        const rule = createMockRule({
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'coffee' }],
          }),
          propertyId: 'prop_001',
        });

        const result = evaluateRules(transaction, [rule]);

        expect(result.propertyId).toBeUndefined();
        expect(result.matchedRules).toEqual([]);
        expect(result.isFullyMatched).toBe(false);
      });

      it('should respect caseSensitive flag when true', () => {
        const transaction = createMockTransaction({ description: 'Payment to Coffee Shop' });
        const rule = createMockRule({
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'coffee', caseSensitive: true }],
          }),
          propertyId: 'prop_001',
        });

        const result = evaluateRules(transaction, [rule]);

        expect(result.propertyId).toBeUndefined();
        expect(result.matchedRules).toEqual([]);
      });

      it('should match case-insensitively when caseSensitive is false or undefined', () => {
        const transaction = createMockTransaction({ description: 'Payment to Coffee Shop' });
        const rule1 = createMockRule({
          id: 'rule_001',
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'coffee', caseSensitive: false }],
          }),
          propertyId: 'prop_001',
        });

        const result = evaluateRules(transaction, [rule1]);
        expect(result.propertyId).toBe('prop_001');
      });
    });

    describe('equals', () => {
      it('should match when description equals the value (case-insensitive by default)', () => {
        const transaction = createMockTransaction({ description: 'Coffee Shop' });
        const rule = createMockRule({
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'equals', value: 'coffee shop' }],
          }),
          propertyId: 'prop_001',
        });

        const result = evaluateRules(transaction, [rule]);

        expect(result.propertyId).toBe('prop_001');
        expect(result.matchedRules).toEqual(['rule_test_001']);
      });

      it('should not match when description does not equal the value', () => {
        const transaction = createMockTransaction({ description: 'Coffee Shop London' });
        const rule = createMockRule({
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'equals', value: 'coffee shop' }],
          }),
          propertyId: 'prop_001',
        });

        const result = evaluateRules(transaction, [rule]);

        expect(result.propertyId).toBeUndefined();
        expect(result.matchedRules).toEqual([]);
      });

      it('should respect caseSensitive flag', () => {
        const transaction = createMockTransaction({ description: 'Coffee Shop' });
        const rule = createMockRule({
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'equals', value: 'coffee shop', caseSensitive: true }],
          }),
          propertyId: 'prop_001',
        });

        const result = evaluateRules(transaction, [rule]);

        expect(result.propertyId).toBeUndefined();
      });
    });

    describe('startsWith', () => {
      it('should match when description starts with the value', () => {
        const transaction = createMockTransaction({ description: 'Coffee Shop Payment' });
        const rule = createMockRule({
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'startsWith', value: 'coffee' }],
          }),
          propertyId: 'prop_001',
        });

        const result = evaluateRules(transaction, [rule]);

        expect(result.propertyId).toBe('prop_001');
      });

      it('should not match when description does not start with the value', () => {
        const transaction = createMockTransaction({ description: 'Payment to Coffee Shop' });
        const rule = createMockRule({
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'startsWith', value: 'coffee' }],
          }),
          propertyId: 'prop_001',
        });

        const result = evaluateRules(transaction, [rule]);

        expect(result.propertyId).toBeUndefined();
      });
    });

    describe('endsWith', () => {
      it('should match when description ends with the value', () => {
        const transaction = createMockTransaction({ description: 'Payment to Coffee Shop' });
        const rule = createMockRule({
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'endsWith', value: 'shop' }],
          }),
          propertyId: 'prop_001',
        });

        const result = evaluateRules(transaction, [rule]);

        expect(result.propertyId).toBe('prop_001');
      });

      it('should not match when description does not end with the value', () => {
        const transaction = createMockTransaction({ description: 'Coffee Shop Payment' });
        const rule = createMockRule({
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'endsWith', value: 'shop' }],
          }),
          propertyId: 'prop_001',
        });

        const result = evaluateRules(transaction, [rule]);

        expect(result.propertyId).toBeUndefined();
      });
    });
  });

  describe('Numeric match types (amount field)', () => {
    describe('greaterThan', () => {
      it('should match when amount is greater than value', () => {
        const transaction = createMockTransaction({ amount: -100.00 });
        const rule = createMockRule({
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'amount', matchType: 'greaterThan', value: -150 }],
          }),
          propertyId: 'prop_001',
        });

        const result = evaluateRules(transaction, [rule]);

        expect(result.propertyId).toBe('prop_001');
      });

      it('should not match when amount is less than or equal to value', () => {
        const transaction = createMockTransaction({ amount: -100.00 });
        const rule = createMockRule({
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'amount', matchType: 'greaterThan', value: -100 }],
          }),
          propertyId: 'prop_001',
        });

        const result = evaluateRules(transaction, [rule]);

        expect(result.propertyId).toBeUndefined();
      });
    });

    describe('lessThan', () => {
      it('should match when amount is less than value', () => {
        const transaction = createMockTransaction({ amount: -50.00 });
        const rule = createMockRule({
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'amount', matchType: 'lessThan', value: -25 }],
          }),
          propertyId: 'prop_001',
        });

        const result = evaluateRules(transaction, [rule]);

        expect(result.propertyId).toBe('prop_001');
      });

      it('should not match when amount is greater than or equal to value', () => {
        const transaction = createMockTransaction({ amount: -50.00 });
        const rule = createMockRule({
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'amount', matchType: 'lessThan', value: -50 }],
          }),
          propertyId: 'prop_001',
        });

        const result = evaluateRules(transaction, [rule]);

        expect(result.propertyId).toBeUndefined();
      });
    });

    describe('positive amounts (income)', () => {
      it('should handle greaterThan for positive amounts', () => {
        const transaction = createMockTransaction({ amount: 500.00 });
        const rule = createMockRule({
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'amount', matchType: 'greaterThan', value: 400 }],
          }),
          type: 'INCOME',
        });

        const result = evaluateRules(transaction, [rule]);

        expect(result.type).toBe('INCOME');
      });
    });
  });

  describe('Multiple fields', () => {
    it('should match on counterpartyName', () => {
      const transaction = createMockTransaction({ counterpartyName: 'John Smith' });
      const rule = createMockRule({
        conditions: JSON.stringify({
          operator: 'AND',
          rules: [{ field: 'counterpartyName', matchType: 'equals', value: 'john smith' }],
        }),
        propertyId: 'prop_001',
      });

      const result = evaluateRules(transaction, [rule]);

      expect(result.propertyId).toBe('prop_001');
    });

    it('should match on reference', () => {
      const transaction = createMockTransaction({ reference: 'RENT-JAN-2024' });
      const rule = createMockRule({
        conditions: JSON.stringify({
          operator: 'AND',
          rules: [{ field: 'reference', matchType: 'contains', value: 'rent' }],
        }),
        propertyId: 'prop_001',
      });

      const result = evaluateRules(transaction, [rule]);

      expect(result.propertyId).toBe('prop_001');
    });

    it('should match on merchant', () => {
      const transaction = createMockTransaction({ merchant: 'Tesco Superstore' });
      const rule = createMockRule({
        conditions: JSON.stringify({
          operator: 'AND',
          rules: [{ field: 'merchant', matchType: 'startsWith', value: 'tesco' }],
        }),
        category: 'groceries',
      });

      const result = evaluateRules(transaction, [rule]);

      expect(result.category).toBe('groceries');
    });

    it('should handle null fields gracefully', () => {
      const transaction = createMockTransaction({ counterpartyName: null });
      const rule = createMockRule({
        conditions: JSON.stringify({
          operator: 'AND',
          rules: [{ field: 'counterpartyName', matchType: 'contains', value: 'john' }],
        }),
        propertyId: 'prop_001',
      });

      const result = evaluateRules(transaction, [rule]);

      expect(result.propertyId).toBeUndefined();
    });
  });

  describe('AND operator logic', () => {
    it('should match only when all conditions are true', () => {
      const transaction = createMockTransaction({
        description: 'Coffee Shop',
        amount: -50.00,
      });
      const rule = createMockRule({
        conditions: JSON.stringify({
          operator: 'AND',
          rules: [
            { field: 'description', matchType: 'contains', value: 'coffee' },
            { field: 'amount', matchType: 'lessThan', value: 0 },
          ],
        }),
        propertyId: 'prop_001',
      });

      const result = evaluateRules(transaction, [rule]);

      expect(result.propertyId).toBe('prop_001');
    });

    it('should not match when any condition is false', () => {
      const transaction = createMockTransaction({
        description: 'Coffee Shop',
        amount: 50.00, // Positive amount
      });
      const rule = createMockRule({
        conditions: JSON.stringify({
          operator: 'AND',
          rules: [
            { field: 'description', matchType: 'contains', value: 'coffee' },
            { field: 'amount', matchType: 'lessThan', value: 0 }, // This will fail
          ],
        }),
        propertyId: 'prop_001',
      });

      const result = evaluateRules(transaction, [rule]);

      expect(result.propertyId).toBeUndefined();
    });
  });

  describe('OR operator logic', () => {
    it('should match when any condition is true', () => {
      const transaction = createMockTransaction({
        description: 'Restaurant Bill',
        merchant: 'Coffee Shop',
      });
      const rule = createMockRule({
        conditions: JSON.stringify({
          operator: 'OR',
          rules: [
            { field: 'description', matchType: 'contains', value: 'coffee' }, // False
            { field: 'merchant', matchType: 'contains', value: 'coffee' }, // True
          ],
        }),
        category: 'dining',
      });

      const result = evaluateRules(transaction, [rule]);

      expect(result.category).toBe('dining');
    });

    it('should not match when all conditions are false', () => {
      const transaction = createMockTransaction({
        description: 'Restaurant Bill',
        merchant: 'Tesco',
      });
      const rule = createMockRule({
        conditions: JSON.stringify({
          operator: 'OR',
          rules: [
            { field: 'description', matchType: 'contains', value: 'coffee' },
            { field: 'merchant', matchType: 'contains', value: 'coffee' },
          ],
        }),
        category: 'dining',
      });

      const result = evaluateRules(transaction, [rule]);

      expect(result.category).toBeUndefined();
    });
  });

  describe('Field accumulation', () => {
    it('should accumulate fields from multiple rules until all three are set', () => {
      const transaction = createMockTransaction({
        description: 'Rent Payment',
        amount: 1500.00,
      });

      const rules = [
        createMockRule({
          id: 'rule_001',
          priority: 0,
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'rent' }],
          }),
          propertyId: 'prop_001',
          type: null,
          category: null,
        }),
        createMockRule({
          id: 'rule_002',
          priority: 1,
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'amount', matchType: 'greaterThan', value: 0 }],
          }),
          propertyId: null,
          type: 'INCOME',
          category: null,
        }),
        createMockRule({
          id: 'rule_003',
          priority: 2,
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'payment' }],
          }),
          propertyId: null,
          type: null,
          category: 'rent_received',
        }),
      ];

      const result = evaluateRules(transaction, rules);

      expect(result.propertyId).toBe('prop_001');
      expect(result.type).toBe('INCOME');
      expect(result.category).toBe('rent_received');
      expect(result.matchedRules).toEqual(['rule_001', 'rule_002', 'rule_003']);
      expect(result.isFullyMatched).toBe(true);
    });

    it('should not override fields once set', () => {
      const transaction = createMockTransaction({
        description: 'Rent Payment',
      });

      const rules = [
        createMockRule({
          id: 'rule_001',
          priority: 0,
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'rent' }],
          }),
          propertyId: 'prop_001',
          type: 'INCOME',
        }),
        createMockRule({
          id: 'rule_002',
          priority: 1,
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'payment' }],
          }),
          propertyId: 'prop_002', // Should be ignored
          type: 'EXPENSE', // Should be ignored
          category: 'utilities',
        }),
      ];

      const result = evaluateRules(transaction, rules);

      expect(result.propertyId).toBe('prop_001'); // Not overridden
      expect(result.type).toBe('INCOME'); // Not overridden
      expect(result.category).toBe('utilities'); // Set by second rule
      expect(result.matchedRules).toEqual(['rule_001', 'rule_002']);
    });

    it('should skip rules that do not provide any new fields', () => {
      const transaction = createMockTransaction({
        description: 'Coffee',
      });

      const rules = [
        createMockRule({
          id: 'rule_001',
          priority: 0,
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'coffee' }],
          }),
          propertyId: 'prop_001',
        }),
        createMockRule({
          id: 'rule_002',
          priority: 1,
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'coffee' }],
          }),
          propertyId: null, // No new fields
          type: null,
          category: null,
        }),
        createMockRule({
          id: 'rule_003',
          priority: 2,
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'coffee' }],
          }),
          propertyId: null,
          type: 'EXPENSE',
        }),
      ];

      const result = evaluateRules(transaction, rules);

      expect(result.propertyId).toBe('prop_001');
      expect(result.type).toBe('EXPENSE');
      expect(result.matchedRules).toEqual(['rule_001', 'rule_003']); // rule_002 not included
    });

    it('should stop processing once all three fields are set', () => {
      const transaction = createMockTransaction({
        description: 'Rent Payment',
      });

      const rules = [
        createMockRule({
          id: 'rule_001',
          priority: 0,
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'rent' }],
          }),
          propertyId: 'prop_001',
          type: 'INCOME',
          category: 'rent_received',
        }),
        createMockRule({
          id: 'rule_002',
          priority: 1,
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'payment' }],
          }),
          propertyId: 'prop_002',
          type: 'EXPENSE',
          category: 'utilities',
        }),
      ];

      const result = evaluateRules(transaction, rules);

      expect(result.propertyId).toBe('prop_001');
      expect(result.type).toBe('INCOME');
      expect(result.category).toBe('rent_received');
      expect(result.matchedRules).toEqual(['rule_001']); // Second rule not evaluated
      expect(result.isFullyMatched).toBe(true);
    });
  });

  describe('Priority ordering', () => {
    it('should process rules in ascending priority order', () => {
      const transaction = createMockTransaction({
        description: 'Payment',
      });

      const rules = [
        createMockRule({
          id: 'rule_low',
          priority: 10,
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'payment' }],
          }),
          propertyId: 'prop_low',
        }),
        createMockRule({
          id: 'rule_high',
          priority: 0,
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'payment' }],
          }),
          propertyId: 'prop_high',
        }),
        createMockRule({
          id: 'rule_mid',
          priority: 5,
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'payment' }],
          }),
          propertyId: 'prop_mid',
        }),
      ];

      const result = evaluateRules(transaction, rules);

      // Should use rule_high (priority 0) first
      expect(result.propertyId).toBe('prop_high');
      expect(result.matchedRules).toEqual(['rule_high']);
    });

    it('should mix account-specific and global rules by priority', () => {
      const transaction = createMockTransaction({
        description: 'Rent',
        bankAccountId: 'acc_001',
      });

      const rules = [
        createMockRule({
          id: 'global_rule',
          priority: 5,
          bankAccountId: null, // Global rule
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'rent' }],
          }),
          propertyId: 'prop_global',
        }),
        createMockRule({
          id: 'account_rule',
          priority: 0,
          bankAccountId: 'acc_001', // Account-specific
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'rent' }],
          }),
          propertyId: 'prop_account',
        }),
      ];

      const result = evaluateRules(transaction, rules);

      // Should use account_rule (priority 0) even though it's account-specific
      expect(result.propertyId).toBe('prop_account');
    });
  });

  describe('Disabled rules', () => {
    it('should skip disabled rules', () => {
      const transaction = createMockTransaction({
        description: 'Coffee',
      });

      const rules = [
        createMockRule({
          id: 'rule_disabled',
          priority: 0,
          enabled: false,
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'coffee' }],
          }),
          propertyId: 'prop_001',
        }),
        createMockRule({
          id: 'rule_enabled',
          priority: 1,
          enabled: true,
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'coffee' }],
          }),
          type: 'EXPENSE',
        }),
      ];

      const result = evaluateRules(transaction, rules);

      expect(result.propertyId).toBeUndefined();
      expect(result.type).toBe('EXPENSE');
      expect(result.matchedRules).toEqual(['rule_enabled']);
    });
  });

  describe('Edge cases', () => {
    it('should handle no rules', () => {
      const transaction = createMockTransaction();
      const result = evaluateRules(transaction, []);

      expect(result.propertyId).toBeUndefined();
      expect(result.type).toBeUndefined();
      expect(result.category).toBeUndefined();
      expect(result.matchedRules).toEqual([]);
      expect(result.isFullyMatched).toBe(false);
    });

    it('should handle no matching rules', () => {
      const transaction = createMockTransaction({ description: 'Something else' });
      const rule = createMockRule({
        conditions: JSON.stringify({
          operator: 'AND',
          rules: [{ field: 'description', matchType: 'contains', value: 'coffee' }],
        }),
        propertyId: 'prop_001',
      });

      const result = evaluateRules(transaction, [rule]);

      expect(result.propertyId).toBeUndefined();
      expect(result.matchedRules).toEqual([]);
      expect(result.isFullyMatched).toBe(false);
    });

    it('should handle malformed conditions JSON gracefully', () => {
      const transaction = createMockTransaction();
      const rule = createMockRule({
        conditions: 'invalid json',
        propertyId: 'prop_001',
      });

      // Should not throw, just skip the rule
      expect(() => evaluateRules(transaction, [rule])).not.toThrow();

      const result = evaluateRules(transaction, [rule]);
      expect(result.propertyId).toBeUndefined();
      expect(result.matchedRules).toEqual([]);
    });

    it('should handle empty conditions rules array', () => {
      const transaction = createMockTransaction();
      const rule = createMockRule({
        conditions: JSON.stringify({
          operator: 'AND',
          rules: [],
        }),
        propertyId: 'prop_001',
      });

      const result = evaluateRules(transaction, [rule]);

      // Empty rules array should match (vacuous truth for AND)
      expect(result.propertyId).toBe('prop_001');
      expect(result.matchedRules).toEqual(['rule_test_001']);
    });

    it('should handle missing operator in conditions', () => {
      const transaction = createMockTransaction();
      const rule = createMockRule({
        conditions: JSON.stringify({
          rules: [{ field: 'description', matchType: 'contains', value: 'test' }],
        }),
        propertyId: 'prop_001',
      });

      // Should handle gracefully, possibly defaulting to AND
      expect(() => evaluateRules(transaction, [rule])).not.toThrow();
    });

    it('should return partial match when not all fields are set', () => {
      const transaction = createMockTransaction({
        description: 'Coffee',
      });
      const rule = createMockRule({
        conditions: JSON.stringify({
          operator: 'AND',
          rules: [{ field: 'description', matchType: 'contains', value: 'coffee' }],
        }),
        propertyId: 'prop_001',
        type: 'EXPENSE',
        // No category
      });

      const result = evaluateRules(transaction, [rule]);

      expect(result.propertyId).toBe('prop_001');
      expect(result.type).toBe('EXPENSE');
      expect(result.category).toBeUndefined();
      expect(result.isFullyMatched).toBe(false);
    });

    it('should handle special characters in string matching', () => {
      const transaction = createMockTransaction({
        description: 'Payment (Ref: #123-456)',
      });
      const rule = createMockRule({
        conditions: JSON.stringify({
          operator: 'AND',
          rules: [{ field: 'description', matchType: 'contains', value: '#123' }],
        }),
        propertyId: 'prop_001',
      });

      const result = evaluateRules(transaction, [rule]);

      expect(result.propertyId).toBe('prop_001');
    });

    it('should handle unicode characters', () => {
      const transaction = createMockTransaction({
        description: 'Café Mañana',
      });
      const rule = createMockRule({
        conditions: JSON.stringify({
          operator: 'AND',
          rules: [{ field: 'description', matchType: 'contains', value: 'café' }],
        }),
        propertyId: 'prop_001',
      });

      const result = evaluateRules(transaction, [rule]);

      expect(result.propertyId).toBe('prop_001');
    });

    it('should handle very large amounts', () => {
      const transaction = createMockTransaction({
        amount: 999999999.99,
      });
      const rule = createMockRule({
        conditions: JSON.stringify({
          operator: 'AND',
          rules: [{ field: 'amount', matchType: 'greaterThan', value: 1000000 }],
        }),
        type: 'INCOME',
      });

      const result = evaluateRules(transaction, [rule]);

      expect(result.type).toBe('INCOME');
    });

    it('should handle zero amount', () => {
      const transaction = createMockTransaction({
        amount: 0,
      });
      const rule = createMockRule({
        conditions: JSON.stringify({
          operator: 'AND',
          rules: [{ field: 'amount', matchType: 'greaterThan', value: -1 }],
        }),
        category: 'adjustment',
      });

      const result = evaluateRules(transaction, [rule]);

      expect(result.category).toBe('adjustment');
    });
  });

  describe('Complex scenarios', () => {
    it('should handle multiple rules with complex AND conditions', () => {
      const transaction = createMockTransaction({
        description: 'Rent Payment for Property A',
        amount: 1500.00,
        reference: 'MONTHLY-RENT',
      });

      const rule = createMockRule({
        conditions: JSON.stringify({
          operator: 'AND',
          rules: [
            { field: 'description', matchType: 'contains', value: 'rent' },
            { field: 'amount', matchType: 'greaterThan', value: 1000 },
            { field: 'reference', matchType: 'contains', value: 'monthly' },
          ],
        }),
        propertyId: 'prop_001',
        type: 'INCOME',
        category: 'rent_received',
      });

      const result = evaluateRules(transaction, [rule]);

      expect(result.isFullyMatched).toBe(true);
      expect(result.propertyId).toBe('prop_001');
      expect(result.type).toBe('INCOME');
      expect(result.category).toBe('rent_received');
    });

    it('should handle multiple rules with complex OR conditions', () => {
      const transaction = createMockTransaction({
        description: 'Utility Bill',
        merchant: 'British Gas',
      });

      const rule = createMockRule({
        conditions: JSON.stringify({
          operator: 'OR',
          rules: [
            { field: 'description', matchType: 'contains', value: 'utility' },
            { field: 'description', matchType: 'contains', value: 'gas' },
            { field: 'description', matchType: 'contains', value: 'electric' },
            { field: 'merchant', matchType: 'contains', value: 'british gas' },
          ],
        }),
        category: 'utilities',
        type: 'EXPENSE',
      });

      const result = evaluateRules(transaction, [rule]);

      expect(result.category).toBe('utilities');
      expect(result.type).toBe('EXPENSE');
    });

    it('should handle real-world rent payment scenario', () => {
      const transaction = createMockTransaction({
        description: 'Standing Order to John Smith',
        amount: 1200.00,
        counterpartyName: 'John Smith',
        reference: 'Rent - 123 Main St',
      });

      const rules = [
        createMockRule({
          id: 'rule_001',
          priority: 0,
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [
              { field: 'reference', matchType: 'contains', value: '123 main st' },
              { field: 'amount', matchType: 'greaterThan', value: 500 },
            ],
          }),
          propertyId: 'prop_123_main_st',
        }),
        createMockRule({
          id: 'rule_002',
          priority: 1,
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [
              { field: 'description', matchType: 'contains', value: 'standing order' },
            ],
          }),
          type: 'INCOME',
        }),
        createMockRule({
          id: 'rule_003',
          priority: 2,
          conditions: JSON.stringify({
            operator: 'OR',
            rules: [
              { field: 'reference', matchType: 'contains', value: 'rent' },
              { field: 'description', matchType: 'contains', value: 'rent' },
            ],
          }),
          category: 'rent_received',
        }),
      ];

      const result = evaluateRules(transaction, rules);

      expect(result.isFullyMatched).toBe(true);
      expect(result.propertyId).toBe('prop_123_main_st');
      expect(result.type).toBe('INCOME');
      expect(result.category).toBe('rent_received');
      expect(result.matchedRules).toEqual(['rule_001', 'rule_002', 'rule_003']);
    });
  });

  describe('Invalid/Unrecognized values', () => {
    it('should handle invalid matchType gracefully', () => {
      const transaction = createMockTransaction({
        description: 'Test Transaction',
      });
      const rule = createMockRule({
        conditions: JSON.stringify({
          operator: 'AND',
          rules: [{ field: 'description', matchType: 'invalidType', value: 'test' }],
        }),
        propertyId: 'prop_001',
      });

      const result = evaluateRules(transaction, [rule]);

      // Should not match with invalid matchType
      expect(result.propertyId).toBeUndefined();
      expect(result.matchedRules).toEqual([]);
    });

    it('should handle invalid field gracefully', () => {
      const transaction = createMockTransaction({
        description: 'Test Transaction',
      });
      const rule = createMockRule({
        conditions: JSON.stringify({
          operator: 'AND',
          rules: [{ field: 'invalidField', matchType: 'contains', value: 'test' }],
        }),
        propertyId: 'prop_001',
      });

      const result = evaluateRules(transaction, [rule]);

      // Should not match with invalid field
      expect(result.propertyId).toBeUndefined();
      expect(result.matchedRules).toEqual([]);
    });

    it('should handle invalid string matchType in evaluateStringMatch', () => {
      const transaction = createMockTransaction({
        description: 'Test Transaction',
      });
      const rule = createMockRule({
        conditions: JSON.stringify({
          operator: 'AND',
          rules: [{ field: 'description', matchType: 'invalidStringMatch', value: 'test' }],
        }),
        propertyId: 'prop_001',
      });

      const result = evaluateRules(transaction, [rule]);

      // Should not match with invalid matchType
      expect(result.propertyId).toBeUndefined();
      expect(result.matchedRules).toEqual([]);
    });

    it('should handle invalid numeric matchType in evaluateNumericMatch', () => {
      const transaction = createMockTransaction({
        amount: 100.00,
      });
      const rule = createMockRule({
        conditions: JSON.stringify({
          operator: 'AND',
          rules: [{ field: 'amount', matchType: 'invalidNumericMatch', value: 50 }],
        }),
        propertyId: 'prop_001',
      });

      const result = evaluateRules(transaction, [rule]);

      // Should not match with invalid matchType
      expect(result.propertyId).toBeUndefined();
      expect(result.matchedRules).toEqual([]);
    });
  });

  describe('OR operator with empty rules', () => {
    it('should return false for OR operator with empty rules array', () => {
      const transaction = createMockTransaction();
      const rule = createMockRule({
        conditions: JSON.stringify({
          operator: 'OR',
          rules: [],
        }),
        propertyId: 'prop_001',
      });

      const result = evaluateRules(transaction, [rule]);

      // Empty rules array with OR should not match
      expect(result.propertyId).toBeUndefined();
      expect(result.matchedRules).toEqual([]);
    });
  });

  describe('Combined AND/OR with all match types', () => {
    it('should handle OR with all string match types', () => {
      const transaction = createMockTransaction({
        description: 'Payment received',
        counterpartyName: 'John Doe',
        reference: 'RENT-2024',
        merchant: null,
      });

      const rule = createMockRule({
        conditions: JSON.stringify({
          operator: 'OR',
          rules: [
            { field: 'description', matchType: 'equals', value: 'no match' },
            { field: 'counterpartyName', matchType: 'startsWith', value: 'john' },
            { field: 'reference', matchType: 'endsWith', value: '2025' },
          ],
        }),
        propertyId: 'prop_001',
      });

      const result = evaluateRules(transaction, [rule]);

      // Should match because counterpartyName starts with 'john'
      expect(result.propertyId).toBe('prop_001');
      expect(result.matchedRules).toEqual(['rule_test_001']);
    });

    it('should handle AND with mixed string and numeric conditions', () => {
      const transaction = createMockTransaction({
        description: 'Large Rent Payment',
        amount: 2500.00,
      });

      const rule = createMockRule({
        conditions: JSON.stringify({
          operator: 'AND',
          rules: [
            { field: 'description', matchType: 'startsWith', value: 'large' },
            { field: 'description', matchType: 'endsWith', value: 'payment' },
            { field: 'description', matchType: 'contains', value: 'rent' },
            { field: 'amount', matchType: 'greaterThan', value: 2000 },
          ],
        }),
        propertyId: 'prop_001',
        type: 'INCOME',
        category: 'rent_received',
      });

      const result = evaluateRules(transaction, [rule]);

      expect(result.isFullyMatched).toBe(true);
      expect(result.propertyId).toBe('prop_001');
      expect(result.type).toBe('INCOME');
      expect(result.category).toBe('rent_received');
    });
  });

  describe('Additional edge cases for complete coverage', () => {
    it('should handle case sensitivity with all string match types', () => {
      const transaction = createMockTransaction({
        description: 'Coffee Shop',
      });

      // Test case-sensitive equals
      const ruleEquals = createMockRule({
        id: 'rule_equals',
        conditions: JSON.stringify({
          operator: 'AND',
          rules: [{ field: 'description', matchType: 'equals', value: 'Coffee Shop', caseSensitive: true }],
        }),
        propertyId: 'prop_001',
      });

      const resultEquals = evaluateRules(transaction, [ruleEquals]);
      expect(resultEquals.propertyId).toBe('prop_001');

      // Test case-sensitive startsWith
      const ruleStartsWith = createMockRule({
        id: 'rule_starts',
        conditions: JSON.stringify({
          operator: 'AND',
          rules: [{ field: 'description', matchType: 'startsWith', value: 'Coffee', caseSensitive: true }],
        }),
        type: 'EXPENSE',
      });

      const resultStartsWith = evaluateRules(transaction, [ruleStartsWith]);
      expect(resultStartsWith.type).toBe('EXPENSE');

      // Test case-sensitive endsWith
      const ruleEndsWith = createMockRule({
        id: 'rule_ends',
        conditions: JSON.stringify({
          operator: 'AND',
          rules: [{ field: 'description', matchType: 'endsWith', value: 'Shop', caseSensitive: true }],
        }),
        category: 'retail',
      });

      const resultEndsWith = evaluateRules(transaction, [ruleEndsWith]);
      expect(resultEndsWith.category).toBe('retail');
    });

    it('should handle boundary values for numeric comparisons', () => {
      const transaction = createMockTransaction({
        amount: 0.01,
      });

      // Test boundary: amount exactly 0.01, greaterThan 0
      const ruleGT = createMockRule({
        conditions: JSON.stringify({
          operator: 'AND',
          rules: [{ field: 'amount', matchType: 'greaterThan', value: 0 }],
        }),
        type: 'INCOME',
      });

      const resultGT = evaluateRules(transaction, [ruleGT]);
      expect(resultGT.type).toBe('INCOME');

      // Test boundary: amount exactly 0.01, lessThan 1
      const ruleLT = createMockRule({
        conditions: JSON.stringify({
          operator: 'AND',
          rules: [{ field: 'amount', matchType: 'lessThan', value: 1 }],
        }),
        category: 'small_transaction',
      });

      const resultLT = evaluateRules(transaction, [ruleLT]);
      expect(resultLT.category).toBe('small_transaction');
    });

    it('should handle negative amounts with comparisons', () => {
      const transaction = createMockTransaction({
        amount: -500.00,
      });

      const rules = [
        createMockRule({
          id: 'rule_001',
          priority: 0,
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [
              { field: 'amount', matchType: 'lessThan', value: 0 },
              { field: 'amount', matchType: 'greaterThan', value: -1000 },
            ],
          }),
          type: 'EXPENSE',
          category: 'moderate_expense',
        }),
      ];

      const result = evaluateRules(transaction, rules);
      expect(result.type).toBe('EXPENSE');
      expect(result.category).toBe('moderate_expense');
    });

    it('should handle empty string values in matching', () => {
      const transaction = createMockTransaction({
        description: '',
      });

      const rule = createMockRule({
        conditions: JSON.stringify({
          operator: 'AND',
          rules: [{ field: 'description', matchType: 'equals', value: '' }],
        }),
        propertyId: 'prop_001',
      });

      const result = evaluateRules(transaction, [rule]);
      expect(result.propertyId).toBe('prop_001');
    });

    it('should handle whitespace in string matching', () => {
      const transaction = createMockTransaction({
        description: '  Rent Payment  ',
      });

      const rule = createMockRule({
        conditions: JSON.stringify({
          operator: 'AND',
          rules: [{ field: 'description', matchType: 'contains', value: 'rent payment' }],
        }),
        propertyId: 'prop_001',
      });

      const result = evaluateRules(transaction, [rule]);
      expect(result.propertyId).toBe('prop_001');
    });

    it('should handle multiple conditions with OR where all match', () => {
      const transaction = createMockTransaction({
        description: 'Coffee Shop Payment',
      });

      const rule = createMockRule({
        conditions: JSON.stringify({
          operator: 'OR',
          rules: [
            { field: 'description', matchType: 'contains', value: 'coffee' },
            { field: 'description', matchType: 'contains', value: 'payment' },
          ],
        }),
        propertyId: 'prop_001',
      });

      const result = evaluateRules(transaction, [rule]);
      // Should still match even though both conditions are true
      expect(result.propertyId).toBe('prop_001');
    });

    it('should handle rules with only some fields set', () => {
      const transaction = createMockTransaction({
        description: 'Test',
      });

      const rules = [
        createMockRule({
          id: 'rule_001',
          priority: 0,
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'test' }],
          }),
          propertyId: 'prop_001',
          type: null,
          category: null,
        }),
        createMockRule({
          id: 'rule_002',
          priority: 1,
          conditions: JSON.stringify({
            operator: 'AND',
            rules: [{ field: 'description', matchType: 'contains', value: 'test' }],
          }),
          propertyId: null,
          type: 'EXPENSE',
          category: null,
        }),
      ];

      const result = evaluateRules(transaction, rules);
      expect(result.propertyId).toBe('prop_001');
      expect(result.type).toBe('EXPENSE');
      expect(result.category).toBeUndefined();
      expect(result.isFullyMatched).toBe(false);
    });

    it('should handle decimal amounts in comparisons', () => {
      const transaction = createMockTransaction({
        amount: 123.45,
      });

      const rule = createMockRule({
        conditions: JSON.stringify({
          operator: 'AND',
          rules: [
            { field: 'amount', matchType: 'greaterThan', value: 123.44 },
            { field: 'amount', matchType: 'lessThan', value: 123.46 },
          ],
        }),
        category: 'precise_amount',
      });

      const result = evaluateRules(transaction, [rule]);
      expect(result.category).toBe('precise_amount');
    });
  });
});
