import prisma from '../db/client.js';
import { balanceService } from './balance.service.js';

interface OwnerPLReport {
  property: {
    id: string;
    name: string;
    address: string;
  };
  owner: {
    id: string;
    email: string;
    ownershipPercentage: number;
  };
  period: {
    startDate: Date;
    endDate: Date;
  };
  income: {
    byCategory: Record<string, { ownerShare: number; total: number }>;
    totalOwnerShare: number;
    totalOverall: number;
  };
  expenses: {
    byCategory: Record<string, { ownerShare: number; total: number }>;
    totalOwnerShare: number;
    totalOverall: number;
  };
  netProfit: number;
  balances: Array<{ userId: string; email: string; amount: number }>;
}

export class ReportService {
  async generateOwnerPLReport(
    propertyId: string,
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<OwnerPLReport> {
    // Get property details
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new Error('Property not found');
    }

    // Get owner's ownership percentage
    const ownership = await prisma.propertyOwnership.findUnique({
      where: {
        userId_propertyId: { userId, propertyId },
      },
      include: {
        user: {
          select: { id: true, email: true },
        },
      },
    });

    if (!ownership) {
      throw new Error('User is not an owner of this property');
    }

    // Get all transactions in date range with splits for this user
    const transactions = await prisma.transaction.findMany({
      where: {
        propertyId,
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
        splits: {
          some: { userId },
        },
      },
      include: {
        splits: {
          where: { userId },
        },
      },
    });

    // Aggregate income by category
    const incomeByCategory: Record<string, { ownerShare: number; total: number }> = {};
    let totalIncome = 0;
    let totalIncomeOwnerShare = 0;

    // Aggregate expenses by category
    const expensesByCategory: Record<string, { ownerShare: number; total: number }> = {};
    let totalExpenses = 0;
    let totalExpensesOwnerShare = 0;

    for (const transaction of transactions) {
      const ownerSplit = transaction.splits[0];

      if (transaction.type === 'INCOME') {
        if (!incomeByCategory[transaction.category]) {
          incomeByCategory[transaction.category] = { ownerShare: 0, total: 0 };
        }
        incomeByCategory[transaction.category].ownerShare += ownerSplit.amount;
        incomeByCategory[transaction.category].total += transaction.amount;
        totalIncome += transaction.amount;
        totalIncomeOwnerShare += ownerSplit.amount;
      } else {
        if (!expensesByCategory[transaction.category]) {
          expensesByCategory[transaction.category] = { ownerShare: 0, total: 0 };
        }
        expensesByCategory[transaction.category].ownerShare += ownerSplit.amount;
        expensesByCategory[transaction.category].total += transaction.amount;
        totalExpenses += transaction.amount;
        totalExpensesOwnerShare += ownerSplit.amount;
      }
    }

    // Get balances for this user on this property
    const allBalances = await balanceService.getPropertyBalances(propertyId);
    const userBalances = allBalances
      .filter((b) => b.userA === userId || b.userB === userId)
      .map((b) => {
        const otherUserId = b.userA === userId ? b.userB : b.userA;
        // If I'm userA and amount is positive, userB owes me (positive)
        // If I'm userB and amount is positive, I owe userA (negative)
        const amount = b.userA === userId ? b.amount : -b.amount;
        return { userId: otherUserId, amount };
      });

    // Enrich with user details
    const enrichedBalances = await Promise.all(
      userBalances.map(async (b) => {
        const user = await prisma.user.findUnique({
          where: { id: b.userId },
          select: { email: true },
        });
        return { ...b, email: user?.email || 'Unknown' };
      })
    );

    return {
      property: {
        id: property.id,
        name: property.name,
        address: `${property.street}, ${property.city}`,
      },
      owner: {
        id: ownership.user.id,
        email: ownership.user.email,
        ownershipPercentage: ownership.ownershipPercentage,
      },
      period: { startDate, endDate },
      income: {
        byCategory: incomeByCategory,
        totalOwnerShare: totalIncomeOwnerShare,
        totalOverall: totalIncome,
      },
      expenses: {
        byCategory: expensesByCategory,
        totalOwnerShare: totalExpensesOwnerShare,
        totalOverall: totalExpenses,
      },
      netProfit: totalIncomeOwnerShare - totalExpensesOwnerShare,
      balances: enrichedBalances,
    };
  }

  async generateMultiPropertyPLReport(userId: string, startDate: Date, endDate: Date) {
    // Get all properties this user owns
    const ownerships = await prisma.propertyOwnership.findMany({
      where: { userId },
      include: {
        property: true,
      },
    });

    const propertyReports = await Promise.all(
      ownerships.map((o) =>
        this.generateOwnerPLReport(o.propertyId, userId, startDate, endDate)
      )
    );

    // Aggregate across properties
    const totalIncome = propertyReports.reduce((sum, r) => sum + r.income.totalOwnerShare, 0);
    const totalExpenses = propertyReports.reduce(
      (sum, r) => sum + r.expenses.totalOwnerShare,
      0
    );
    const netProfit = totalIncome - totalExpenses;

    return {
      owner: propertyReports[0]?.owner,
      period: { startDate, endDate },
      properties: propertyReports,
      summary: {
        totalIncome,
        totalExpenses,
        netProfit,
      },
    };
  }
}

export const reportService = new ReportService();
