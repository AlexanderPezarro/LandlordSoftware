import prisma from '../db/client.js';
import { TransactionWithSplits, UpdateTransactionWithSplits } from '../../../shared/validation/index.js';

export class TransactionService {
  /**
   * Create a transaction with optional splits.
   * If splits are not provided, they will be auto-generated from property ownership.
   * Properties without owners will create transactions without splits (backward compatible).
   */
  async createTransaction(data: TransactionWithSplits) {
    const { paidByUserId, splits: providedSplits, ...transactionData } = data;

    // Check if property has owners
    const ownerships = await prisma.propertyOwnership.findMany({
      where: { propertyId: data.propertyId },
    });

    // If property has no owners, create transaction without splits (backward compatible)
    if (ownerships.length === 0) {
      return await prisma.transaction.create({
        data: {
          ...transactionData,
          paidByUserId,
        },
        include: {
          property: true,
          lease: true,
          paidBy: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });
    }

    // Property has owners - need to handle splits
    const ownerIdSet = new Set(ownerships.map((o) => o.userId));

    // Determine splits to use (provided or auto-generated)
    let splits = providedSplits;
    if (!splits) {
      // Auto-generate splits from property ownership
      splits = ownerships.map((o) => ({
        userId: o.userId,
        percentage: o.ownershipPercentage,
        amount: (data.amount * o.ownershipPercentage) / 100,
      }));
    }

    // Validate all split users are property owners
    for (const split of splits) {
      if (!ownerIdSet.has(split.userId)) {
        throw new Error(`User ${split.userId} is not a property owner`);
      }
    }

    // Validate paidByUserId is a property owner (if provided)
    if (paidByUserId && !ownerIdSet.has(paidByUserId)) {
      throw new Error('paidByUserId must be a property owner');
    }

    // Create transaction with splits
    const transaction = await prisma.transaction.create({
      data: {
        ...transactionData,
        paidByUserId,
        splits: {
          create: splits,
        },
      },
      include: {
        property: true,
        lease: true,
        splits: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        paidBy: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    return transaction;
  }

  /**
   * Update a transaction with optional splits.
   * If splits are provided, existing splits will be replaced.
   */
  async updateTransaction(transactionId: string, data: UpdateTransactionWithSplits) {
    const { paidByUserId, splits: providedSplits, ...transactionData } = data;

    // Get existing transaction
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        splits: true,
      },
    });

    if (!existingTransaction) {
      throw new Error('Transaction not found');
    }

    // Use existing propertyId if not provided in update
    const propertyId = transactionData.propertyId || existingTransaction.propertyId;

    // Check if property has owners
    const ownerships = await prisma.propertyOwnership.findMany({
      where: { propertyId },
    });

    // If property has no owners, update transaction without splits (backward compatible)
    if (ownerships.length === 0) {
      return await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          ...transactionData,
          paidByUserId,
        },
        include: {
          property: true,
          lease: true,
          paidBy: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });
    }

    // Property has owners
    const ownerIdSet = new Set(ownerships.map((o) => o.userId));

    // If splits are provided, validate them
    if (providedSplits) {
      // Validate all split users are property owners
      for (const split of providedSplits) {
        if (!ownerIdSet.has(split.userId)) {
          throw new Error(`User ${split.userId} is not a property owner`);
        }
      }
    }

    // Validate paidByUserId is a property owner (if provided)
    if (paidByUserId !== undefined && paidByUserId !== null && !ownerIdSet.has(paidByUserId)) {
      throw new Error('paidByUserId must be a property owner');
    }

    // Update transaction
    const updateData: any = {
      ...transactionData,
    };

    // Only update paidByUserId if it's explicitly provided (including null)
    if (paidByUserId !== undefined) {
      updateData.paidByUserId = paidByUserId;
    }

    // If splits are provided, replace them
    if (providedSplits) {
      // Delete existing splits and create new ones
      await prisma.transactionSplit.deleteMany({
        where: { transactionId },
      });

      updateData.splits = {
        create: providedSplits,
      };
    }

    const transaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: updateData,
      include: {
        property: true,
        lease: true,
        splits: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        paidBy: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    return transaction;
  }
}

export default new TransactionService();
