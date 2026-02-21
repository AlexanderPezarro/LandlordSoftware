/**
 * Monzo API Client
 *
 * This file contains functions for interacting with the Monzo API.
 * See Monzo API documentation: https://docs.monzo.com/
 */

import type {
  MonzoTransactionsResponse,
  MonzoAccountsResponse,
  MonzoTokenResponse,
  MonzoWebhookRegistrationResponse,
} from './types.js';

/**
 * Monzo API base URL
 */
const MONZO_API_BASE_URL = 'https://api.monzo.com';

/**
 * Monzo OAuth base URL
 */
const MONZO_AUTH_BASE_URL = 'https://auth.monzo.com';

/**
 * Exchange authorization code for access tokens
 * @param code - Authorization code from OAuth callback
 * @param clientId - Monzo client ID
 * @param clientSecret - Monzo client secret
 * @param redirectUri - OAuth redirect URI
 * @returns Token response with access_token, refresh_token, and expires_in
 * @throws Error if token exchange fails
 */
export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<MonzoTokenResponse> {
  const response = await fetch(`${MONZO_API_BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Monzo token exchange error:', errorText);
    throw new Error('Failed to exchange authorization code for tokens');
  }

  const data = (await response.json()) as MonzoTokenResponse;

  return data;
}

/**
 * Refresh an expired access token
 * @param refreshToken - Refresh token
 * @param clientId - Monzo client ID
 * @param clientSecret - Monzo client secret
 * @returns Token response with new access_token and expires_in
 * @throws Error if token refresh fails
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<MonzoTokenResponse> {
  const response = await fetch(`${MONZO_API_BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Monzo token refresh error:', errorText);
    throw new Error('Failed to refresh access token');
  }

  const data = (await response.json()) as MonzoTokenResponse;

  return data;
}

/**
 * Get all accounts for the authenticated user
 * @param accessToken - Monzo access token
 * @returns Array of account objects
 * @throws Error if request fails
 */
export async function getAccounts(accessToken: string): Promise<MonzoAccountsResponse> {
  const response = await fetch(`${MONZO_API_BASE_URL}/accounts`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Monzo get accounts error:', errorText);
    throw new Error('Failed to fetch account information');
  }

  const data = (await response.json()) as MonzoAccountsResponse;

  return data;
}

/**
 * Get transactions for a specific account
 * @param accessToken - Monzo access token
 * @param accountId - Monzo account ID
 * @param since - RFC3339 timestamp to fetch transactions from
 * @param before - RFC3339 timestamp to fetch transactions before (optional, for pagination)
 * @param limit - Maximum number of transactions to return (default 100)
 * @returns Transactions response
 * @throws Error if request fails
 */
export async function getTransactions(
  accessToken: string,
  accountId: string,
  since: string,
  before?: string,
  limit: number = 100
): Promise<MonzoTransactionsResponse> {
  const params = new URLSearchParams({
    account_id: accountId,
    since,
    limit: limit.toString(),
  });

  if (before) {
    params.append('before', before);
  }

  const url = `${MONZO_API_BASE_URL}/transactions?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Monzo transactions fetch error:', errorText);
    throw new Error(`Failed to fetch transactions: ${errorText}`);
  }

  const data = (await response.json()) as MonzoTransactionsResponse;

  return data;
}

/**
 * Register a webhook with Monzo API
 * @param accessToken - Monzo access token
 * @param accountId - Monzo account ID
 * @param webhookUrl - The URL where Monzo will send webhook events
 * @returns Webhook registration response
 * @throws Error if webhook registration fails
 */
export async function registerWebhook(
  accessToken: string,
  accountId: string,
  webhookUrl: string
): Promise<MonzoWebhookRegistrationResponse> {
  const response = await fetch(`${MONZO_API_BASE_URL}/webhooks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      account_id: accountId,
      url: webhookUrl,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Monzo webhook registration error:', errorText);
    throw new Error('Failed to register webhook with Monzo');
  }

  const data = (await response.json()) as MonzoWebhookRegistrationResponse;

  return data;
}

/**
 * Delete a webhook from Monzo API
 * @param accessToken - Monzo access token
 * @param webhookId - The webhook ID to delete
 * @throws Error if webhook deletion fails
 */
export async function deleteWebhook(accessToken: string, webhookId: string): Promise<void> {
  const response = await fetch(`${MONZO_API_BASE_URL}/webhooks/${webhookId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Monzo webhook deletion error:', errorText);
    throw new Error('Failed to delete webhook from Monzo');
  }
}

/**
 * Generate Monzo OAuth authorization URL
 * @param clientId - Monzo client ID
 * @param redirectUri - OAuth redirect URI
 * @param state - CSRF protection state parameter
 * @returns Authorization URL to redirect user to
 */
export function generateAuthUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
  });

  return `${MONZO_AUTH_BASE_URL}/?${params.toString()}`;
}
