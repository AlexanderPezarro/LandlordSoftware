import { convertPenceToPounds } from '../monzo';

describe('convertPenceToPounds', () => {
  describe('positive amounts (expenses)', () => {
    it('should convert 1234 pence to 12.34 pounds', () => {
      expect(convertPenceToPounds(1234)).toBe(12.34);
    });

    it('should convert 10000 pence to 100.00 pounds', () => {
      expect(convertPenceToPounds(10000)).toBe(100);
    });

    it('should convert 1 pence to 0.01 pounds', () => {
      expect(convertPenceToPounds(1)).toBe(0.01);
    });

    it('should convert 99 pence to 0.99 pounds', () => {
      expect(convertPenceToPounds(99)).toBe(0.99);
    });
  });

  describe('negative amounts (income)', () => {
    it('should convert -1234 pence to -12.34 pounds', () => {
      expect(convertPenceToPounds(-1234)).toBe(-12.34);
    });

    it('should convert -10000 pence to -100.00 pounds', () => {
      expect(convertPenceToPounds(-10000)).toBe(-100);
    });

    it('should convert -1 pence to -0.01 pounds', () => {
      expect(convertPenceToPounds(-1)).toBe(-0.01);
    });

    it('should convert -99 pence to -0.99 pounds', () => {
      expect(convertPenceToPounds(-99)).toBe(-0.99);
    });
  });

  describe('zero amount', () => {
    it('should convert 0 pence to 0 pounds', () => {
      expect(convertPenceToPounds(0)).toBe(0);
    });
  });

  describe('large amounts', () => {
    it('should convert 123456789 pence to 1234567.89 pounds', () => {
      expect(convertPenceToPounds(123456789)).toBe(1234567.89);
    });

    it('should convert -123456789 pence to -1234567.89 pounds', () => {
      expect(convertPenceToPounds(-123456789)).toBe(-1234567.89);
    });
  });
});
