/**
 * Token refresh utility for Monzo OAuth tokens
 *
 * Handles automatic token refresh when access tokens expire (401 errors)
 */

import { refreshAccessToken } from '../services/monzo/client.js';
import { encryptToken } from '../services/encryption.js';
import prisma from '../db/client.js';

/**
 * Refresh an expired access token and update the database
 *
 * @param bankAccountId - ID of the bank account whose token needs refreshing
 * @returns New access token (decrypted)
 * @throws Error if refresh fails or if no refresh token is available
 */
export async function refreshBankAccountToken(bankAccountId: string): Promise<string> {
  // Get bank account with refresh token
  const bankAccount = await prisma.bankAccount.findUnique({
    where: { id: bankAccountId },
  });

  if (!bankAccount) {
    throw new Error('Bank account not found');
  }

  if (!bankAccount.refreshToken) {
    throw new Error('No refresh token available. Please reconnect your bank account.');
  }

  // Get OAuth credentials from environment
  const clientId = process.env.MONZO_CLIENT_ID;
  const clientSecret = process.env.MONZO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Monzo OAuth configuration missing');
  }

  // Decrypt refresh token
  const { decryptToken } = await import('../services/encryption.js');
  const refreshToken = decryptToken(bankAccount.refreshToken);

  console.log(`Refreshing access token for bank account ${bankAccountId}`);

  // Call Monzo API to refresh token
  const tokenResponse = await refreshAccessToken(refreshToken, clientId, clientSecret);

  // Calculate new expiry time
  const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

  // Encrypt new access token
  const encryptedAccessToken = encryptToken(tokenResponse.access_token);

  // Update database with new token
  // Note: Monzo may return a new refresh token, so update that too if present
  await prisma.bankAccount.update({
    where: { id: bankAccountId },
    data: {
      accessToken: encryptedAccessToken,
      refreshToken: tokenResponse.refresh_token
        ? encryptToken(tokenResponse.refresh_token)
        : bankAccount.refreshToken, // Keep existing if not provided
      tokenExpiresAt: expiresAt,
    },
  });

  console.log(`Successfully refreshed access token for bank account ${bankAccountId}`);

  return tokenResponse.access_token;
}

/**
 * Check if a token has expired or is about to expire
 *
 * @param tokenExpiresAt - Expiry timestamp
 * @param bufferSeconds - Number of seconds before expiry to consider token expired (default: 60)
 * @returns true if token is expired or about to expire
 */
export function isTokenExpired(tokenExpiresAt: Date | null, bufferSeconds: number = 60): boolean {
  if (!tokenExpiresAt) {
    return false; // No expiry time means token doesn't expire
  }

  const now = Date.now();
  const expiryWithBuffer = tokenExpiresAt.getTime() - (bufferSeconds * 1000);

  return now >= expiryWithBuffer;
}
