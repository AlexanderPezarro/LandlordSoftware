/**
 * Converts Monzo transaction amounts from integer pence to decimal pounds.
 *
 * Monzo API returns amounts as integers representing pence (e.g., 1234 = £12.34).
 * Positive values represent expenses (money out), negative values represent income (money in).
 *
 * @param amountInPence - Transaction amount in pence from Monzo API
 * @returns Amount in pounds as a decimal number
 *
 * @example
 * convertPenceToPounds(1234)   // 12.34 (expense)
 * convertPenceToPounds(-1234)  // -12.34 (income)
 * convertPenceToPounds(0)      // 0
 */
export function convertPenceToPounds(amountInPence: number): number {
  return amountInPence / 100;
}
