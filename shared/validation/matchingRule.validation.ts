import { z } from 'zod';

// Rule condition schema matching the rule evaluation engine
const RuleConditionSchema = z.object({
  field: z.enum(['description', 'counterpartyName', 'reference', 'merchant', 'amount']),
  matchType: z.enum(['contains', 'equals', 'startsWith', 'endsWith', 'greaterThan', 'lessThan']),
  value: z.union([z.string(), z.number()]),
  caseSensitive: z.boolean().optional(),
});

const RuleConditionsSchema = z.object({
  operator: z.enum(['AND', 'OR']),
  rules: z.array(RuleConditionSchema),
});

// Transaction type enum
export const TransactionTypeSchema = z.enum(['INCOME', 'EXPENSE']);

// Base MatchingRule Schema (common fields)
const baseMatchingRuleSchema = {
  name: z.string().min(1, 'Rule name is required'),
  enabled: z.boolean().default(true),
  conditions: z.string().refine(
    (val) => {
      try {
        const parsed = JSON.parse(val);
        RuleConditionsSchema.parse(parsed);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Invalid conditions format' }
  ),
  propertyId: z.string().uuid().optional().nullable(),
  type: TransactionTypeSchema.optional().nullable(),
  category: z.string().optional().nullable(),
};

// Create MatchingRule Schema (without id, timestamps, priority, bankAccountId)
export const CreateMatchingRuleSchema = z.object(baseMatchingRuleSchema);

// Update MatchingRule Schema (all fields optional except id)
export const UpdateMatchingRuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Rule name is required').optional(),
  enabled: z.boolean().optional(),
  conditions: z.string().refine(
    (val) => {
      try {
        const parsed = JSON.parse(val);
        RuleConditionsSchema.parse(parsed);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Invalid conditions format' }
  ).optional(),
  propertyId: z.string().uuid().optional().nullable(),
  type: TransactionTypeSchema.optional().nullable(),
  category: z.string().optional().nullable(),
});

// Full MatchingRule Schema (with all fields including timestamps)
export const MatchingRuleSchema = z.object({
  id: z.string().uuid(),
  bankAccountId: z.string().uuid().nullable(),
  priority: z.number().int().min(0),
  ...baseMatchingRuleSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Reorder rules schema
export const ReorderRulesSchema = z.object({
  ruleIds: z.array(z.string().uuid()).min(1, 'At least one rule ID is required'),
});

// Test rule schema
export const TestRuleSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.number(),
  counterpartyName: z.string().optional(),
  merchant: z.string().optional(),
  reference: z.string().optional(),
});

// Inferred TypeScript types
export type TransactionType = z.infer<typeof TransactionTypeSchema>;
export type CreateMatchingRule = z.infer<typeof CreateMatchingRuleSchema>;
export type UpdateMatchingRule = z.infer<typeof UpdateMatchingRuleSchema>;
export type MatchingRule = z.infer<typeof MatchingRuleSchema>;
export type ReorderRules = z.infer<typeof ReorderRulesSchema>;
export type TestRule = z.infer<typeof TestRuleSchema>;
