import prisma from '../db/client.js';
import type { BankTransaction } from '@prisma/client';

/**
 * Similarity threshold percentage for fuzzy matching
 * Descriptions with similarity >= this threshold are considered duplicates
 */
const FUZZY_MATCH_SIMILARITY_THRESHOLD = 80;

/**
 * Maximum number of transactions to evaluate for fuzzy matching
 * Prevents performance issues with large transaction volumes
 */
const FUZZY_MATCH_QUERY_LIMIT = 100;

/**
 * Result of duplicate detection check
 */
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchType: 'exact' | 'fuzzy' | null;
  matchedTransaction: BankTransaction | null;
}

/**
 * Input parameters for duplicate detection
 */
export interface DuplicateCheckInput {
  bankAccountId: string;
  externalId: string;
  amount: number;
  description: string;
  transactionDate: Date;
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching of transaction descriptions
 *
 * @param str1 First string
 * @param str2 Second string
 * @returns The minimum number of single-character edits (insertions, deletions, or substitutions)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // Create 2D array for dynamic programming
  const dp: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // Initialize first column (deletion)
  for (let i = 0; i <= len1; i++) {
    dp[i][0] = i;
  }

  // Initialize first row (insertion)
  for (let j = 0; j <= len2; j++) {
    dp[0][j] = j;
  }

  // Fill the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;

      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // Deletion
        dp[i][j - 1] + 1,      // Insertion
        dp[i - 1][j - 1] + cost // Substitution
      );
    }
  }

  return dp[len1][len2];
}

/**
 * Calculate similarity percentage between two strings using Levenshtein distance
 *
 * @param str1 First string
 * @param str2 Second string
 * @returns Similarity percentage (0-100)
 */
function calculateSimilarity(str1: string, str2: string): number {
  // Normalize strings: lowercase and collapse multiple spaces
  const normalized1 = str1.toLowerCase().replace(/\s+/g, ' ').trim();
  const normalized2 = str2.toLowerCase().replace(/\s+/g, ' ').trim();

  // Handle empty strings
  if (normalized1.length === 0 && normalized2.length === 0) {
    return 100;
  }
  if (normalized1.length === 0 || normalized2.length === 0) {
    return 0;
  }

  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);
  const similarity = ((maxLength - distance) / maxLength) * 100;

  return similarity;
}

/**
 * Check for duplicate bank transactions
 *
 * Uses two levels of duplicate detection:
 * 1. Exact match: Same bankAccountId + externalId
 * 2. Fuzzy match: Same bankAccountId, amount, date ±1 day, and description similarity >80%
 *
 * @param input Transaction data to check
 * @returns Duplicate check result with match type and matched transaction
 */
export async function checkForDuplicate(
  input: DuplicateCheckInput
): Promise<DuplicateCheckResult> {
  // Validate required parameters
  if (!input.bankAccountId || !input.externalId || !input.description || !input.transactionDate) {
    throw new Error('Missing required parameters for duplicate detection');
  }

  const { bankAccountId, externalId, amount, description, transactionDate } = input;

  // 1. Check for exact duplicate by externalId
  const exactMatch = await prisma.bankTransaction.findFirst({
    where: {
      bankAccountId,
      externalId,
    },
  });

  if (exactMatch) {
    return {
      isDuplicate: true,
      matchType: 'exact',
      matchedTransaction: exactMatch,
    };
  }

  // 2. Check for fuzzy duplicate
  // Calculate date range: ±1 day from transaction date
  const oneDayMs = 24 * 60 * 60 * 1000;
  const dateFrom = new Date(transactionDate.getTime() - oneDayMs);
  const dateTo = new Date(transactionDate.getTime() + oneDayMs);

  // Find potential fuzzy matches: same bankAccountId, amount, and within date range
  const potentialMatches = await prisma.bankTransaction.findMany({
    where: {
      bankAccountId,
      amount,
      transactionDate: {
        gte: dateFrom,
        lte: dateTo,
      },
    },
    orderBy: {
      transactionDate: 'desc',
    },
    take: FUZZY_MATCH_QUERY_LIMIT,
  });

  // Check description similarity for each potential match
  for (const match of potentialMatches) {
    const similarity = calculateSimilarity(description, match.description);

    if (similarity >= FUZZY_MATCH_SIMILARITY_THRESHOLD) {
      return {
        isDuplicate: true,
        matchType: 'fuzzy',
        matchedTransaction: match,
      };
    }
  }

  // No duplicate found
  return {
    isDuplicate: false,
    matchType: null,
    matchedTransaction: null,
  };
}
