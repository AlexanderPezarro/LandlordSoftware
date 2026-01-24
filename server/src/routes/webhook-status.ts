import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/permissions.js';
import prisma from '../db/client.js';

const router = Router();

interface WebhookEvent {
  id: string;
  accountId: string;
  accountName: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  webhookEventId: string | null;
  transactionsFetched: number;
}

interface AccountWebhookStatus {
  accountId: string;
  accountName: string;
  lastWebhookAt: string | null;
  lastWebhookStatus: string | null;
  webhookId: string | null;
}

interface WebhookStatusResponse {
  lastEventTimestamp: string | null;
  recentEvents: WebhookEvent[];
  failedCount24h: number;
  failedCount1h: number;
  accountStatuses: AccountWebhookStatus[];
}

/**
 * GET /api/bank/webhooks/status
 *
 * Get webhook health status across all bank accounts.
 * Returns last event timestamp, recent events, failure counts, and per-account status.
 *
 * Auth: Requires admin role
 *
 * Response:
 * - 200: Webhook status data
 * - 401: Not authenticated
 * - 403: Not authorized (admin only)
 * - 500: Server error
 */
router.get('/', requireAuth, requireAdmin(), async (_req, res) => {
  try {
    // Get all bank accounts with webhooks configured
    const accountsWithWebhooks = await prisma.bankAccount.findMany({
      where: {
        webhookId: { not: null },
      },
      select: {
        id: true,
        accountName: true,
        webhookId: true,
      },
      orderBy: {
        accountName: 'asc',
      },
    });

    // Get recent webhook events (last 20)
    const recentWebhookLogs = await prisma.syncLog.findMany({
      where: {
        syncType: 'webhook',
      },
      include: {
        bankAccount: {
          select: {
            id: true,
            accountName: true,
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
      take: 20,
    });

    // Calculate last event timestamp
    const lastEventTimestamp =
      recentWebhookLogs.length > 0 ? recentWebhookLogs[0].startedAt.toISOString() : null;

    // Format recent events
    const recentEvents: WebhookEvent[] = recentWebhookLogs.map((log) => ({
      id: log.id,
      accountId: log.bankAccount.id,
      accountName: log.bankAccount.accountName,
      status: log.status,
      startedAt: log.startedAt.toISOString(),
      completedAt: log.completedAt ? log.completedAt.toISOString() : null,
      errorMessage: log.errorMessage,
      webhookEventId: log.webhookEventId,
      transactionsFetched: log.transactionsFetched,
    }));

    // Calculate failure counts
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const failedCount24h = await prisma.syncLog.count({
      where: {
        syncType: 'webhook',
        status: 'failed',
        startedAt: {
          gte: oneDayAgo,
        },
      },
    });

    const failedCount1h = await prisma.syncLog.count({
      where: {
        syncType: 'webhook',
        status: 'failed',
        startedAt: {
          gte: oneHourAgo,
        },
      },
    });

    // Get per-account webhook status
    const accountStatuses: AccountWebhookStatus[] = await Promise.all(
      accountsWithWebhooks.map(async (account) => {
        const lastWebhook = await prisma.syncLog.findFirst({
          where: {
            bankAccountId: account.id,
            syncType: 'webhook',
          },
          orderBy: {
            startedAt: 'desc',
          },
        });

        return {
          accountId: account.id,
          accountName: account.accountName,
          lastWebhookAt: lastWebhook ? lastWebhook.startedAt.toISOString() : null,
          lastWebhookStatus: lastWebhook ? lastWebhook.status : null,
          webhookId: account.webhookId,
        };
      })
    );

    const responseData: WebhookStatusResponse = {
      lastEventTimestamp,
      recentEvents,
      failedCount24h,
      failedCount1h,
      accountStatuses,
    };

    return res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('Get webhook status error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while fetching webhook status',
    });
  }
});

export default router;
