/**
 * Validate that a type/category combination is valid
 *
 * Income categories: Rent, Security Deposit, Late Fee, Lease Fee
 * Expense categories: Maintenance, Repair, Utilities, Insurance, Property Tax,
 *                     Management Fee, Legal Fee, Transport, Other
 *
 * @param type - Transaction type (Income or Expense)
 * @param category - Transaction category
 * @returns True if combination is valid
 */
export function validateTypeCategoryCombo(type: string, category: string): boolean {
  const incomeCategories = ['Rent', 'Security Deposit', 'Late Fee', 'Lease Fee'];
  const expenseCategories = [
    'Maintenance',
    'Repair',
    'Utilities',
    'Insurance',
    'Property Tax',
    'Management Fee',
    'Legal Fee',
    'Transport',
    'Other',
  ];

  if (type === 'Income') {
    return incomeCategories.includes(category);
  } else if (type === 'Expense') {
    return expenseCategories.includes(category);
  }

  return false;
}
