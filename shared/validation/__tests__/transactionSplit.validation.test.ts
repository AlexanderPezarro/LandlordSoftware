import { describe, it, expect } from '@jest/globals';
import {
  TransactionSplitSchema,
  TransactionSplitsArraySchema,
} from '../transactionSplit.validation';

describe('TransactionSplitSchema', () => {
  it('should validate correct transaction split with all fields', () => {
    const data = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      percentage: 50.0,
      amount: 500.0,
    };
    expect(() => TransactionSplitSchema.parse(data)).not.toThrow();
  });

  it('should reject invalid userId (not a UUID)', () => {
    const data = {
      userId: 'not-a-uuid',
      percentage: 50.0,
      amount: 500.0,
    };
    expect(() => TransactionSplitSchema.parse(data)).toThrow('Invalid user ID');
  });

  it('should reject percentage below 0.01', () => {
    const data = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      percentage: 0.005,
      amount: 500.0,
    };
    expect(() => TransactionSplitSchema.parse(data)).toThrow(
      'Split must be at least 0.01%'
    );
  });

  it('should reject percentage above 100', () => {
    const data = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      percentage: 100.01,
      amount: 500.0,
    };
    expect(() => TransactionSplitSchema.parse(data)).toThrow(
      'Split cannot exceed 100%'
    );
  });

  it('should reject negative amount', () => {
    const data = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      percentage: 50.0,
      amount: -100,
    };
    expect(() => TransactionSplitSchema.parse(data)).toThrow(
      'Amount must be positive'
    );
  });

  it('should reject zero amount', () => {
    const data = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      percentage: 50.0,
      amount: 0,
    };
    expect(() => TransactionSplitSchema.parse(data)).toThrow(
      'Amount must be positive'
    );
  });
});

describe('TransactionSplitsArraySchema', () => {
  it('should reject empty splits array', () => {
    const data: any[] = [];
    expect(() => TransactionSplitsArraySchema.parse(data)).toThrow(
      'At least one split required'
    );
  });

  it('should validate single split at 100%', () => {
    const data = [
      {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        percentage: 100.0,
        amount: 1000.0,
      },
    ];
    expect(() => TransactionSplitsArraySchema.parse(data)).not.toThrow();
  });

  it('should validate multiple splits summing to 100%', () => {
    const data = [
      {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        percentage: 60.0,
        amount: 600.0,
      },
      {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        percentage: 40.0,
        amount: 400.0,
      },
    ];
    expect(() => TransactionSplitsArraySchema.parse(data)).not.toThrow();
  });

  it('should reject multiple splits NOT summing to 100%', () => {
    const data = [
      {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        percentage: 60.0,
        amount: 600.0,
      },
      {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        percentage: 30.0,
        amount: 300.0,
      },
    ];
    expect(() => TransactionSplitsArraySchema.parse(data)).toThrow(
      'Split percentages must sum to 100%'
    );
  });

  it('should handle floating-point precision (splits summing to ~100%)', () => {
    const data = [
      {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        percentage: 33.33,
        amount: 333.3,
      },
      {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        percentage: 33.33,
        amount: 333.3,
      },
      {
        userId: '123e4567-e89b-12d3-a456-426614174002',
        percentage: 33.34,
        amount: 333.4,
      },
    ];
    expect(() => TransactionSplitsArraySchema.parse(data)).not.toThrow();
  });

  it('should reject splits with sum slightly off (beyond tolerance)', () => {
    const data = [
      {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        percentage: 33.33,
        amount: 333.3,
      },
      {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        percentage: 33.33,
        amount: 333.3,
      },
      {
        userId: '123e4567-e89b-12d3-a456-426614174002',
        percentage: 33.33,
        amount: 333.3,
      },
    ];
    expect(() => TransactionSplitsArraySchema.parse(data)).toThrow(
      'Split percentages must sum to 100%'
    );
  });

  it('should validate complex multi-owner split', () => {
    const data = [
      {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        percentage: 25.0,
        amount: 250.0,
      },
      {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        percentage: 25.0,
        amount: 250.0,
      },
      {
        userId: '123e4567-e89b-12d3-a456-426614174002',
        percentage: 30.0,
        amount: 300.0,
      },
      {
        userId: '123e4567-e89b-12d3-a456-426614174003',
        percentage: 20.0,
        amount: 200.0,
      },
    ];
    expect(() => TransactionSplitsArraySchema.parse(data)).not.toThrow();
  });
});
