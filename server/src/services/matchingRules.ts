import prisma from '../db/client.js';

/**
 * Create default global matching rules for bank transaction categorization
 *
 * This function creates 5 sensible default rules:
 * 1. rent → Income/Rent (priority 100)
 * 2. deposit → Income/Security Deposit (priority 101)
 * 3. maintenance → Expense/Maintenance (priority 102)
 * 4. repair → Expense/Repair (priority 103)
 * 5. amount<0 → Expense/Other (priority 1000, catch-all)
 *
 * Rules are global (bankAccountId = null) and apply as fallback defaults
 * to all bank accounts.
 *
 * This function is idempotent - it will check if default rules already exist
 * and return early if they do.
 *
 * @returns The number of rules created (0 if they already exist, 5 if created)
 */
export async function createDefaultMatchingRules(): Promise<number> {
  // Check if default rules already exist
  const existingRules = await prisma.matchingRule.findMany({
    where: {
      bankAccountId: null,
      name: {
        startsWith: 'Default:',
      },
    },
  });

  // If all default rules exist, return early
  if (existingRules.length >= 5) {
    return 0;
  }

  // Define the default rules
  const defaultRules = [
    {
      name: 'Default: Rent',
      priority: 100,
      enabled: true,
      bankAccountId: null,
      propertyId: null,
      type: 'INCOME',
      category: 'Rent',
      conditions: JSON.stringify({
        operator: 'AND',
        rules: [
          {
            field: 'description',
            matchType: 'contains',
            value: 'rent',
            caseSensitive: false,
          },
        ],
      }),
    },
    {
      name: 'Default: Security Deposit',
      priority: 101,
      enabled: true,
      bankAccountId: null,
      propertyId: null,
      type: 'INCOME',
      category: 'Security Deposit',
      conditions: JSON.stringify({
        operator: 'AND',
        rules: [
          {
            field: 'description',
            matchType: 'contains',
            value: 'deposit',
            caseSensitive: false,
          },
        ],
      }),
    },
    {
      name: 'Default: Maintenance',
      priority: 102,
      enabled: true,
      bankAccountId: null,
      propertyId: null,
      type: 'EXPENSE',
      category: 'Maintenance',
      conditions: JSON.stringify({
        operator: 'AND',
        rules: [
          {
            field: 'description',
            matchType: 'contains',
            value: 'maintenance',
            caseSensitive: false,
          },
        ],
      }),
    },
    {
      name: 'Default: Repair',
      priority: 103,
      enabled: true,
      bankAccountId: null,
      propertyId: null,
      type: 'EXPENSE',
      category: 'Repair',
      conditions: JSON.stringify({
        operator: 'AND',
        rules: [
          {
            field: 'description',
            matchType: 'contains',
            value: 'repair',
            caseSensitive: false,
          },
        ],
      }),
    },
    {
      name: 'Default: Negative Amount',
      priority: 1000,
      enabled: true,
      bankAccountId: null,
      propertyId: null,
      type: 'EXPENSE',
      category: 'Other',
      conditions: JSON.stringify({
        operator: 'AND',
        rules: [
          {
            field: 'amount',
            matchType: 'lessThan',
            value: 0,
          },
        ],
      }),
    },
  ];

  // Create all default rules
  await prisma.matchingRule.createMany({
    data: defaultRules,
  });

  return defaultRules.length;
}
