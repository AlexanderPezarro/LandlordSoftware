import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import prisma from '../../db/client.js';
import { balanceService } from '../balance.service.js';

describe('BalanceService', () => {
  let propertyId: string;
  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    // Create test users
    const userA = await prisma.user.create({
      data: {
        email: 'usera@test.com',
        password: 'password',
        role: 'LANDLORD',
      },
    });
    userAId = userA.id;

    const userB = await prisma.user.create({
      data: {
        email: 'userb@test.com',
        password: 'password',
        role: 'LANDLORD',
      },
    });
    userBId = userB.id;

    // Create test property
    const property = await prisma.property.create({
      data: {
        name: 'Test Property',
        street: '123 Test St',
        city: 'Test City',
        county: 'Test County',
        postcode: 'TS1 1ST',
        propertyType: 'HOUSE',
        status: 'OCCUPIED',
      },
    });
    propertyId = property.id;

    // Create ownerships (60/40 split)
    await prisma.propertyOwnership.createMany({
      data: [
        { userId: userAId, propertyId, ownershipPercentage: 60 },
        { userId: userBId, propertyId, ownershipPercentage: 40 },
      ],
    });
  });

  afterAll(async () => {
    await prisma.transactionSplit.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.settlement.deleteMany({});
    await prisma.propertyOwnership.deleteMany({});
    await prisma.property.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  it('should calculate balance when user A pays full amount', async () => {
    // Create transaction: A pays £1000
    const transaction = await prisma.transaction.create({
      data: {
        propertyId,
        type: 'EXPENSE',
        category: 'REPAIRS',
        amount: 1000,
        transactionDate: new Date(),
        description: 'Repair work',
        paidByUserId: userAId,
      },
    });

    // Create splits: A gets 60%, B gets 40%
    await prisma.transactionSplit.createMany({
      data: [
        { transactionId: transaction.id, userId: userAId, percentage: 60, amount: 600 },
        { transactionId: transaction.id, userId: userBId, percentage: 40, amount: 400 },
      ],
    });

    const balance = await balanceService.calculatePairwiseBalance(
      propertyId,
      userAId,
      userBId
    );

    // B owes A £400 (B's share of the expense A paid)
    expect(balance).toBe(400);
  });

  it('should reduce balance after settlement', async () => {
    // Record settlement: B pays A £200
    await prisma.settlement.create({
      data: {
        propertyId,
        fromUserId: userBId,
        toUserId: userAId,
        amount: 200,
        settlementDate: new Date(),
      },
    });

    const balance = await balanceService.calculatePairwiseBalance(
      propertyId,
      userAId,
      userBId
    );

    // B now owes A £200 (£400 - £200 settlement)
    expect(balance).toBe(200);
  });

  it('should get all balances for property', async () => {
    const balances = await balanceService.getPropertyBalances(propertyId);

    expect(balances.length).toBeGreaterThan(0);
    expect(balances[0].userA).toBe(userAId);
    expect(balances[0].userB).toBe(userBId);
    expect(balances[0].amount).toBeCloseTo(200, 2);
  });
});
