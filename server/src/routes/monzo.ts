import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import prisma from '../db/client.js';
import { z } from 'zod';
import * as monzoService from '../services/monzo.service.js';
import { encryptToken } from '../services/encryption.js';

const router = Router();

// Validation schema for connect request
const ConnectRequestSchema = z.object({
  syncFromDays: z.number().int().min(1).max(1825).optional().default(90),
});

/**
 * POST /api/bank/monzo/connect
 * Initiate Monzo OAuth flow by generating authorization URL
 */
router.post('/connect', requireAuth, async (req, res) => {
  try {
    // Validate request body
    const validationResult = ConnectRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.issues[0].message,
      });
    }

    const { syncFromDays } = validationResult.data;

    // Generate authorization URL
    const authUrl = monzoService.generateAuthUrl(syncFromDays);

    return res.json({
      success: true,
      authUrl,
    });
  } catch (error) {
    console.error('Monzo connect error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate Monzo authorization URL',
    });
  }
});

/**
 * GET /api/bank/monzo/callback
 * OAuth callback endpoint - exchanges code for tokens and saves bank account
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    // Handle OAuth error response
    if (error) {
      console.error('Monzo OAuth error:', error);
      return res.redirect(`/settings?error=${error}`);
    }

    // Validate required parameters
    if (!code || typeof code !== 'string') {
      return res.redirect('/settings?error=missing_code');
    }

    if (!state || typeof state !== 'string') {
      return res.redirect('/settings?error=missing_state');
    }

    // Validate state and get syncFromDate
    const syncFromDate = monzoService.validateState(state);

    // Exchange code for tokens
    const tokenResponse = await monzoService.exchangeCodeForTokens(code);

    // Get account information
    const accountInfo = await monzoService.getAccountInfo(tokenResponse.access_token);

    // Calculate token expiry date
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + tokenResponse.expires_in);

    // Encrypt tokens before storing
    const encryptedAccessToken = encryptToken(tokenResponse.access_token);
    const encryptedRefreshToken = tokenResponse.refresh_token
      ? encryptToken(tokenResponse.refresh_token)
      : null;

    // Save or update bank account
    const bankAccount = await prisma.bankAccount.upsert({
      where: { accountId: accountInfo.accountId },
      create: {
        accountId: accountInfo.accountId,
        accountName: accountInfo.accountName,
        accountType: accountInfo.accountType,
        provider: 'monzo',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt,
        syncFromDate,
        syncEnabled: true,
        lastSyncStatus: 'never_synced',
      },
      update: {
        accountName: accountInfo.accountName,
        accountType: accountInfo.accountType,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt,
        syncFromDate,
        syncEnabled: true,
      },
    });

    // Start background import immediately (don't await - fire and forget)
    // This must complete within 5 minutes of OAuth completion (Monzo API restriction)
    monzoService.importFullHistory(bankAccount.id).catch((error) => {
      console.error('Background import failed:', error);
    });

    // Redirect to settings page with success message
    return res.redirect('/settings?success=monzo_connected');
  } catch (error) {
    console.error('Monzo callback error:', error);
    return res.redirect('/settings?error=oauth_failed');
  }
});

export default router;
