import type { BankTransaction, MatchingRule } from '@prisma/client';

/**
 * Result of rule evaluation operation
 */
export interface RuleEvaluationResult {
  /** Property ID if matched by rules */
  propertyId?: string;
  /** Transaction type if matched by rules */
  type?: 'INCOME' | 'EXPENSE';
  /** Transaction category if matched by rules */
  category?: string;
  /** Array of rule IDs that matched */
  matchedRules: string[];
  /** True if all three fields (propertyId, type, category) are set */
  isFullyMatched: boolean;
}

/**
 * Rule condition structure stored in the conditions JSON field
 */
interface RuleConditions {
  operator: 'AND' | 'OR';
  rules: Array<{
    field: 'description' | 'counterpartyName' | 'reference' | 'merchant' | 'amount';
    matchType: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan';
    value: string | number;
    caseSensitive?: boolean;
  }>;
}

/**
 * Evaluate matching rules against a bank transaction
 *
 * This function processes rules in priority order (ascending) and accumulates
 * field values (propertyId, type, category) until all three are set. Once a
 * field is set, it cannot be overridden by later rules.
 *
 * Rules can use AND/OR operators with various match types:
 * - String fields: contains, equals, startsWith, endsWith (case-insensitive by default)
 * - Numeric fields (amount): greaterThan, lessThan
 *
 * @param transaction - Bank transaction to evaluate
 * @param rules - Array of matching rules to apply
 * @returns Evaluation result with matched fields and rule IDs
 */
export function evaluateRules(
  transaction: BankTransaction,
  rules: MatchingRule[]
): RuleEvaluationResult {
  const result: RuleEvaluationResult = {
    matchedRules: [],
    isFullyMatched: false,
  };

  // Sort rules by priority ascending (0 = highest priority)
  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    // Skip disabled rules
    if (!rule.enabled) {
      continue;
    }

    // Check if all three fields are already set
    if (result.propertyId && result.type && result.category) {
      result.isFullyMatched = true;
      break;
    }

    // Check if rule provides any new fields
    const providesNewField =
      (!result.propertyId && rule.propertyId) ||
      (!result.type && rule.type) ||
      (!result.category && rule.category);

    if (!providesNewField) {
      continue;
    }

    // Parse and evaluate conditions
    let conditions: RuleConditions;
    try {
      conditions = JSON.parse(rule.conditions);
    } catch {
      // Skip malformed rules
      continue;
    }

    // Evaluate the rule
    const matches = evaluateConditions(transaction, conditions);

    if (matches) {
      // Apply fields that haven't been set yet
      if (!result.propertyId && rule.propertyId) {
        result.propertyId = rule.propertyId;
      }
      if (!result.type && rule.type) {
        result.type = rule.type as 'INCOME' | 'EXPENSE';
      }
      if (!result.category && rule.category) {
        result.category = rule.category;
      }

      result.matchedRules.push(rule.id);
    }
  }

  // Check if fully matched
  result.isFullyMatched = !!(result.propertyId && result.type && result.category);

  return result;
}

/**
 * Evaluate rule conditions against a transaction
 */
function evaluateConditions(
  transaction: BankTransaction,
  conditions: RuleConditions
): boolean {
  // Handle missing operator (default to AND)
  const operator = conditions.operator || 'AND';

  // Handle empty rules array (vacuous truth for AND, false for OR)
  if (!conditions.rules || conditions.rules.length === 0) {
    return operator === 'AND';
  }

  if (operator === 'AND') {
    return conditions.rules.every((rule) => evaluateSingleRule(transaction, rule));
  } else {
    // OR
    return conditions.rules.some((rule) => evaluateSingleRule(transaction, rule));
  }
}

/**
 * Evaluate a single rule condition
 */
function evaluateSingleRule(
  transaction: BankTransaction,
  rule: RuleConditions['rules'][0]
): boolean {
  const fieldValue = getFieldValue(transaction, rule.field);

  // Handle null/undefined field values
  if (fieldValue === null || fieldValue === undefined) {
    return false;
  }

  const { matchType, value, caseSensitive = false } = rule;

  // String match types
  if (
    matchType === 'contains' ||
    matchType === 'equals' ||
    matchType === 'startsWith' ||
    matchType === 'endsWith'
  ) {
    return evaluateStringMatch(
      String(fieldValue),
      String(value),
      matchType,
      caseSensitive
    );
  }

  // Numeric match types
  if (matchType === 'greaterThan' || matchType === 'lessThan') {
    return evaluateNumericMatch(Number(fieldValue), Number(value), matchType);
  }

  return false;
}

/**
 * Get field value from transaction
 */
function getFieldValue(
  transaction: BankTransaction,
  field: RuleConditions['rules'][0]['field']
): string | number | null {
  switch (field) {
    case 'description':
      return transaction.description;
    case 'counterpartyName':
      return transaction.counterpartyName;
    case 'reference':
      return transaction.reference;
    case 'merchant':
      return transaction.merchant;
    case 'amount':
      return transaction.amount;
    default:
      return null;
  }
}

/**
 * Evaluate string match
 */
function evaluateStringMatch(
  fieldValue: string,
  ruleValue: string,
  matchType: 'contains' | 'equals' | 'startsWith' | 'endsWith',
  caseSensitive: boolean
): boolean {
  let field = fieldValue;
  let value = ruleValue;

  if (!caseSensitive) {
    field = field.toLowerCase();
    value = value.toLowerCase();
  }

  switch (matchType) {
    case 'contains':
      return field.includes(value);
    case 'equals':
      return field === value;
    case 'startsWith':
      return field.startsWith(value);
    case 'endsWith':
      return field.endsWith(value);
    default:
      return false;
  }
}

/**
 * Evaluate numeric match
 */
function evaluateNumericMatch(
  fieldValue: number,
  ruleValue: number,
  matchType: 'greaterThan' | 'lessThan'
): boolean {
  switch (matchType) {
    case 'greaterThan':
      return fieldValue > ruleValue;
    case 'lessThan':
      return fieldValue < ruleValue;
    default:
      return false;
  }
}
