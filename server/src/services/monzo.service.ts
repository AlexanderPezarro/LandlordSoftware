import crypto from 'crypto';

// In-memory state storage (in production, use Redis or database)
// Maps state -> { syncFromDate: Date, createdAt: Date }
const stateStore = new Map<string, { syncFromDate: Date; createdAt: Date }>();

// Clean up expired states every 10 minutes
setInterval(() => {
  const now = Date.now();
  const expiryMs = 10 * 60 * 1000; // 10 minutes

  for (const [state, data] of stateStore.entries()) {
    if (now - data.createdAt.getTime() > expiryMs) {
      stateStore.delete(state);
    }
  }
}, 10 * 60 * 1000);

/**
 * Generates the Monzo OAuth authorization URL
 * @param syncFromDays - Number of days to sync transaction history from
 * @returns Authorization URL to redirect user to
 */
export function generateAuthUrl(syncFromDays: number): string {
  const clientId = process.env.MONZO_CLIENT_ID;
  const redirectUri = process.env.MONZO_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error('Monzo OAuth configuration missing');
  }

  // Calculate syncFromDate
  const syncFromDate = new Date();
  syncFromDate.setDate(syncFromDate.getDate() - syncFromDays);

  // Generate secure random state for CSRF protection
  const state = crypto.randomBytes(32).toString('hex');

  // Store state with syncFromDate for later validation
  stateStore.set(state, {
    syncFromDate,
    createdAt: new Date(),
  });

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
  });

  return `https://auth.monzo.com/?${params.toString()}`;
}

/**
 * Validates the OAuth state parameter and returns associated data
 * @param state - State parameter from OAuth callback
 * @returns syncFromDate associated with the state
 * @throws Error if state is invalid or expired
 */
export function validateState(state: string): Date {
  const stateData = stateStore.get(state);

  if (!stateData) {
    throw new Error('Invalid or expired state parameter');
  }

  // Check if state has expired (10 minutes)
  const now = Date.now();
  const expiryMs = 10 * 60 * 1000;

  if (now - stateData.createdAt.getTime() > expiryMs) {
    stateStore.delete(state);
    throw new Error('State parameter has expired');
  }

  // Delete state after successful validation (one-time use)
  stateStore.delete(state);

  return stateData.syncFromDate;
}

/**
 * Exchange authorization code for access tokens
 * @param code - Authorization code from OAuth callback
 * @returns Token response with access_token, refresh_token, and expires_in
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}> {
  const clientId = process.env.MONZO_CLIENT_ID;
  const clientSecret = process.env.MONZO_CLIENT_SECRET;
  const redirectUri = process.env.MONZO_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Monzo OAuth configuration missing');
  }

  const response = await fetch('https://api.monzo.com/oauth2/token', {
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

  const data = await response.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  };
}

/**
 * Get account information from Monzo API
 * @param accessToken - Monzo access token
 * @returns Account information (accountId, accountName, accountType)
 */
export async function getAccountInfo(accessToken: string): Promise<{
  accountId: string;
  accountName: string;
  accountType: string;
}> {
  const response = await fetch('https://api.monzo.com/accounts', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Monzo get accounts error:', errorText);
    throw new Error('Failed to fetch account information');
  }

  const data = await response.json() as {
    accounts: Array<{
      id: string;
      description?: string;
      type?: string;
    }>;
  };

  if (!data.accounts || data.accounts.length === 0) {
    throw new Error('No accounts found');
  }

  // Use first account (or primary if multiple)
  const account = data.accounts[0];

  return {
    accountId: account.id,
    accountName: account.description || account.type || 'Monzo Account',
    accountType: account.type || 'current',
  };
}
