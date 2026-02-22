import { describe, it, expect } from '@jest/globals';
import { isTokenExpired } from '../tokenRefresh.js';

describe('Token Refresh Utility', () => {
  describe('isTokenExpired', () => {
    it('should return true if token is expired', () => {
      const expiredDate = new Date(Date.now() - 1000); // 1 second ago
      expect(isTokenExpired(expiredDate)).toBe(true);
    });

    it('should return true if token expires within buffer time', () => {
      const almostExpiredDate = new Date(Date.now() + 30000); // 30 seconds from now
      expect(isTokenExpired(almostExpiredDate, 60)).toBe(true); // 60 second buffer
    });

    it('should return false if token is not expired', () => {
      const futureDate = new Date(Date.now() + 120000); // 2 minutes from now
      expect(isTokenExpired(futureDate, 60)).toBe(false); // 60 second buffer
    });

    it('should return false if tokenExpiresAt is null', () => {
      expect(isTokenExpired(null)).toBe(false);
    });

    it('should use default 60 second buffer', () => {
      const date = new Date(Date.now() + 59000); // 59 seconds from now
      expect(isTokenExpired(date)).toBe(true); // Within default 60s buffer

      const date2 = new Date(Date.now() + 61000); // 61 seconds from now
      expect(isTokenExpired(date2)).toBe(false); // Outside default 60s buffer
    });
  });
});
