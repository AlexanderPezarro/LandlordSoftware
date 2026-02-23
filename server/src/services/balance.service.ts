import prisma from '../db/client.js';

interface Balance {
  userA: string;
  userB: string;
  amount: number; // positive means userB owes userA
}

export class BalanceService {
  /**
   * Calculate balance between two users for a property
   * Returns positive if userB owes userA, negative if userA owes userB
   */
  async calculatePairwiseBalance(
    propertyId: string,
    userAId: string,
    userBId: string
  ): Promise<number> {
    let balance = 0;

    // Get all transactions for this property with splits
    const transactions = await prisma.transaction.findMany({
      where: { propertyId },
      include: {
        splits: {
          where: {
            userId: { in: [userAId, userBId] },
          },
        },
      },
    });

    // Calculate balance from transactions
    for (const transaction of transactions) {
      const userASplit = transaction.splits.find((s) => s.userId === userAId);
      const userBSplit = transaction.splits.find((s) => s.userId === userBId);

      if (transaction.paidByUserId === userAId && userBSplit) {
        // A paid, B had a split -> B owes A
        balance += userBSplit.amount;
      } else if (transaction.paidByUserId === userBId && userASplit) {
        // B paid, A had a split -> A owes B (negative)
        balance -= userASplit.amount;
      }
    }

    // Get settlements between these users
    const settlementsFromBToA = await prisma.settlement.findMany({
      where: {
        propertyId,
        fromUserId: userBId,
        toUserId: userAId,
      },
      select: { amount: true },
    });

    const settlementsFromAToB = await prisma.settlement.findMany({
      where: {
        propertyId,
        fromUserId: userAId,
        toUserId: userBId,
      },
      select: { amount: true },
    });

    // Subtract settlements from B to A (reduces B's debt)
    balance -= settlementsFromBToA.reduce((sum, s) => sum + s.amount, 0);

    // Add settlements from A to B (increases B's debt)
    balance += settlementsFromAToB.reduce((sum, s) => sum + s.amount, 0);

    return balance;
  }

  /**
   * Get all balances for a property (pairwise between all owners)
   */
  async getPropertyBalances(propertyId: string): Promise<Balance[]> {
    // Get all owners for this property
    const ownerships = await prisma.propertyOwnership.findMany({
      where: { propertyId },
      include: {
        user: {
          select: { id: true, email: true },
        },
      },
      orderBy: { ownershipPercentage: 'desc' },
    });

    const ownerIds = ownerships.map((o) => o.userId);
    const balances: Balance[] = [];

    // Calculate pairwise balances
    for (let i = 0; i < ownerIds.length; i++) {
      for (let j = i + 1; j < ownerIds.length; j++) {
        const userA = ownerIds[i];
        const userB = ownerIds[j];

        const balance = await this.calculatePairwiseBalance(propertyId, userA, userB);

        // Only include non-zero balances
        if (Math.abs(balance) > 0.01) {
          balances.push({
            userA,
            userB,
            amount: balance,
          });
        }
      }
    }

    return balances;
  }

  /**
   * Get balances involving a specific user across all their properties
   */
  async getUserBalances(userId: string) {
    // Get all properties this user owns
    const ownerships = await prisma.propertyOwnership.findMany({
      where: { userId },
      include: {
        property: {
          select: { id: true, name: true, street: true, city: true },
        },
      },
    });

    const balancesByProperty = [];

    for (const ownership of ownerships) {
      const balances = await this.getPropertyBalances(ownership.propertyId);

      // Filter to only balances involving this user
      const userBalances = balances.filter(
        (b) => b.userA === userId || b.userB === userId
      );

      if (userBalances.length > 0) {
        balancesByProperty.push({
          property: ownership.property,
          balances: userBalances,
        });
      }
    }

    return balancesByProperty;
  }
}

export const balanceService = new BalanceService();
