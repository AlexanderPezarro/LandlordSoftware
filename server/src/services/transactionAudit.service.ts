import prisma from '../db/client.js';

/**
 * Fields that should be audited when a transaction is updated
 */
const AUDITED_FIELDS = [
  'propertyId',
  'leaseId',
  'type',
  'category',
  'amount',
  'transactionDate',
  'description',
] as const;

/**
 * Converts a value to a string for storage in audit log
 */
function valueToString(value: any): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

/**
 * Creates audit log entries for changed fields in a transaction update
 *
 * @param transactionId - The ID of the transaction being updated
 * @param userId - The ID of the user making the update
 * @param oldTransaction - The transaction data before the update
 * @param newData - The new data being applied to the transaction
 */
export async function createAuditLogs(
  transactionId: string,
  userId: string,
  oldTransaction: any,
  newData: any
): Promise<void> {
  const auditEntries: Array<{
    transactionId: string;
    userId: string;
    field: string;
    oldValue: string | null;
    newValue: string | null;
  }> = [];

  // Check each audited field for changes
  for (const field of AUDITED_FIELDS) {
    // Skip if field is not in the update data
    if (!(field in newData)) {
      continue;
    }

    const oldValue = oldTransaction[field];
    const newValue = newData[field];

    // Convert to strings for comparison
    const oldValueStr = valueToString(oldValue);
    const newValueStr = valueToString(newValue);

    // Only create audit log if value actually changed
    if (oldValueStr !== newValueStr) {
      auditEntries.push({
        transactionId,
        userId,
        field,
        oldValue: oldValueStr,
        newValue: newValueStr,
      });
    }
  }

  // Create all audit log entries in a single operation
  if (auditEntries.length > 0) {
    await prisma.transactionAuditLog.createMany({
      data: auditEntries,
    });
  }
}

/**
 * Retrieves audit logs for a transaction
 *
 * @param transactionId - The ID of the transaction
 * @returns Array of audit log entries, ordered by changedAt DESC (newest first)
 */
export async function getAuditLogs(transactionId: string) {
  return prisma.transactionAuditLog.findMany({
    where: { transactionId },
    orderBy: { changedAt: 'desc' },
  });
}

export default {
  createAuditLogs,
  getAuditLogs,
};
