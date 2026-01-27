import { describe, it, expect } from '@jest/globals';
import { SettlementCreateSchema } from '../settlement.validation';

describe('SettlementCreateSchema', () => {
  it('should validate correct settlement data', () => {
    const data = {
      fromUserId: '123e4567-e89b-12d3-a456-426614174000',
      toUserId: '123e4567-e89b-12d3-a456-426614174001',
      propertyId: '123e4567-e89b-12d3-a456-426614174002',
      amount: 1000,
      settlementDate: new Date('2025-01-15'),
      notes: 'Payment for repairs',
    };
    expect(() => SettlementCreateSchema.parse(data)).not.toThrow();
  });

  it('should reject negative amount', () => {
    const data = {
      fromUserId: '123e4567-e89b-12d3-a456-426614174000',
      toUserId: '123e4567-e89b-12d3-a456-426614174001',
      propertyId: '123e4567-e89b-12d3-a456-426614174002',
      amount: -100,
      settlementDate: new Date(),
    };
    expect(() => SettlementCreateSchema.parse(data)).toThrow();
  });

  it('should reject when fromUserId equals toUserId', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    const data = {
      fromUserId: userId,
      toUserId: userId,
      propertyId: '123e4567-e89b-12d3-a456-426614174002',
      amount: 1000,
      settlementDate: new Date(),
    };
    expect(() => SettlementCreateSchema.parse(data)).toThrow('Cannot settle with yourself');
  });
});
