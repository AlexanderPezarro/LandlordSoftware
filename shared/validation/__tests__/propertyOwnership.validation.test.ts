import { describe, it, expect } from '@jest/globals';
import {
  PropertyOwnershipCreateSchema,
  validateOwnershipSum,
} from '../propertyOwnership.validation';

describe('PropertyOwnershipCreateSchema', () => {
  it('should validate correct ownership data', () => {
    const data = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      propertyId: '123e4567-e89b-12d3-a456-426614174001',
      ownershipPercentage: 50,
    };
    expect(() => PropertyOwnershipCreateSchema.parse(data)).not.toThrow();
  });

  it('should reject ownership percentage below 0.01', () => {
    const data = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      propertyId: '123e4567-e89b-12d3-a456-426614174001',
      ownershipPercentage: 0,
    };
    expect(() => PropertyOwnershipCreateSchema.parse(data)).toThrow();
  });

  it('should reject ownership percentage above 100', () => {
    const data = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      propertyId: '123e4567-e89b-12d3-a456-426614174001',
      ownershipPercentage: 101,
    };
    expect(() => PropertyOwnershipCreateSchema.parse(data)).toThrow();
  });

  it('should reject invalid UUIDs', () => {
    const data = {
      userId: 'not-a-uuid',
      propertyId: '123e4567-e89b-12d3-a456-426614174001',
      ownershipPercentage: 50,
    };
    expect(() => PropertyOwnershipCreateSchema.parse(data)).toThrow();
  });
});

describe('validateOwnershipSum', () => {
  it('should validate when sum equals 100', () => {
    const ownerships = [
      { ownershipPercentage: 60 },
      { ownershipPercentage: 40 },
    ];
    const result = validateOwnershipSum(ownerships);
    expect(result.valid).toBe(true);
    expect(result.sum).toBe(100);
  });

  it('should reject when sum is not 100', () => {
    const ownerships = [
      { ownershipPercentage: 60 },
      { ownershipPercentage: 30 },
    ];
    const result = validateOwnershipSum(ownerships);
    expect(result.valid).toBe(false);
    expect(result.sum).toBe(90);
  });

  it('should handle floating point precision', () => {
    const ownerships = [
      { ownershipPercentage: 33.33 },
      { ownershipPercentage: 33.33 },
      { ownershipPercentage: 33.34 },
    ];
    const result = validateOwnershipSum(ownerships);
    expect(result.valid).toBe(true);
  });
});
