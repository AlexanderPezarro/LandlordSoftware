# Email Notification System Design

**Date:** 2026-01-27
**Status:** Approved

## Overview

Comprehensive email notification system for the landlord software that sends emails to users and admins for event reminders, tenant communications, transaction alerts, and system notifications. Extends existing in-app notification infrastructure from the bank integration branch.

## Goals

- Send event reminders at configurable intervals before scheduled events
- Notify tenants about rent due dates and lease expiration
- Alert property owners about transactions and property-related activities
- Notify admins about integration failures and system issues
- Allow users to control email preferences by category
- Provide reliable delivery with retry logic and admin visibility into failures
- Remain platform-agnostic (not tied to Fly.io-specific solutions)

## Architecture & Data Model

The email system extends the existing notification infrastructure with four key components:

### 1. NotificationLog Table

Central audit trail for all outbound notifications:

- Tracks emails, in-app notifications, and future channels (SMS, push)
- Fields: `id`, `userId`, `notificationType`, `channel` (email/in_app/sms), `status` (pending/sent/failed/retrying), `sentAt`, `failureReason`, `retryCount`, `entityType`, `entityId`, `templateData` (JSON)
- Supports retry tracking and admin dashboard queries
- Links to User but not directly to Notification (in-app is separate)

### 2. NotificationPreference Table

User-controlled email preferences:

- Fields: `userId`, `category`, `emailEnabled`, `inAppEnabled`
- Categories: `EVENT_REMINDERS`, `TENANT_COMMUNICATIONS`, `TRANSACTION_ALERTS`, `SYSTEM_NOTIFICATIONS`
- Defaults created on user signup (all enabled for landlords/admins, tenant-specific for tenants)

### 3. EventReminder Table

Scheduled reminder configuration:

- Fields: `eventId`, `reminderOffset` (days before event), `sent` (boolean), `scheduledFor` (computed datetime)
- Created automatically when events are created (default: 7 days before)
- Allows future expansion to multiple reminders per event

### 4. Email Service Enhancement

Extends existing `email.service.ts`:

- Add template rendering with Handlebars
- Add retry logic with exponential backoff
- Add NotificationLog integration

## Notification Categories & Types

### EVENT_REMINDERS Category

- `event_reminder` - Sent based on EventReminder schedule (default 7 days before)
- `event_created` - Immediate notification when event is created (optional, off by default)
- `event_cancelled` - Immediate notification when event is cancelled
- **Recipients:** Property owner + related tenants (if event tied to lease/tenant)

### TENANT_COMMUNICATIONS Category

- `rent_due_reminder` - Sent 3 days before rent due date (derived from Lease)
- `lease_expiring_soon` - Sent 60 days and 30 days before lease end
- `lease_expired` - Sent on lease end date
- `payment_received` - Transaction confirmation when tenant payment recorded
- **Recipients:** Tenant on lease + property owner

### TRANSACTION_ALERTS Category

- `transaction_created` - Immediate notification for new transactions (for owners)
- `large_transaction_alert` - Triggered by transactions over configurable threshold
- `negative_balance_warning` - Property balance goes negative
- **Recipients:** Property owner(s)

### SYSTEM_NOTIFICATIONS Category

- `integration_failure` - Bank sync, webhook, or other integration failures (existing)
- `document_uploaded` - New document attached to property/lease/tenant
- `bulk_import_complete` - Data import job finished
- **Recipients:** Admins (and property owner for their properties)

## Email Templates & Structure

### Template Organization

```
server/src/templates/emails/
├── layouts/
│   └── base.hbs          # Shared HTML structure, header, footer
├── partials/
│   ├── event-details.hbs # Reusable event info block
│   ├── property-info.hbs # Property details block
│   └── button.hbs        # CTA button component
└── notifications/
    ├── event-reminder.hbs
    ├── event-reminder.txt.hbs
    ├── rent-due-reminder.hbs
    ├── rent-due-reminder.txt.hbs
    ├── lease-expiring.hbs
    ├── lease-expiring.txt.hbs
    ├── payment-received.hbs
    ├── payment-received.txt.hbs
    ├── integration-failure.hbs
    ├── integration-failure.txt.hbs
    └── ... (one per notification type)
```

### Template Data Structure

Each template receives consistent context:

```typescript
{
  user: { name, email },
  subject: string,
  preheader: string,           // Email preview text
  notificationType: string,
  data: {                      // Type-specific payload
    event?: { title, date, description, property },
    lease?: { tenant, property, startDate, endDate, rent },
    transaction?: { amount, date, type, property },
    property?: { address, name },
    actionUrl?: string         // Deep link to app
  }
}
```

### Text + HTML Support

- Each notification type has both `.hbs` (HTML) and `.txt.hbs` (plain text) versions
- Plain text templates use same data structure, just simplified formatting
- Ensures accessibility and spam filter compatibility

## Scheduling System

### HTTP Endpoint Approach

Platform-agnostic solution using HTTP cron endpoints instead of in-process schedulers:

**Cron Configuration** (external service like Fly.io Cron Manager, EasyCron, cron-job.org, etc.):

```json
{
  "email-reminders": {
    "schedule": "0 * * * *",  // Every hour
    "method": "POST",
    "url": "https://your-app.fly.dev/api/cron/email-reminders",
    "headers": {
      "X-Cron-Secret": "${CRON_SECRET}"
    }
  },
  "lease-notifications": {
    "schedule": "0 6 * * *",  // Daily at 6 AM
    "method": "POST",
    "url": "https://your-app.fly.dev/api/cron/lease-notifications",
    "headers": {
      "X-Cron-Secret": "${CRON_SECRET}"
    }
  }
}
```

### Cron Endpoints

Protected by `X-Cron-Secret` header authentication:

```typescript
// server/src/routes/cron.ts

POST /api/cron/email-reminders
  - Query EventReminder where sent = false and scheduledFor <= now + 1 hour
  - For each reminder:
    - Load Event + Property + related User(s)
    - Check user's NotificationPreference (EVENT_REMINDERS enabled?)
    - Skip if preference disabled
    - Create NotificationLog entry (status: pending)
    - Call email service to send
    - Update NotificationLog (status: sent/failed)
    - Mark EventReminder.sent = true
  - Returns: { sent: number, failed: number, skipped: number }

POST /api/cron/lease-notifications
  - Query Leases for:
    - Rent due reminders (rentDueDate - 3 days = today)
    - Lease expiring (endDate - 60/30 days = today)
    - Lease expired (endDate = today)
  - Send appropriate notifications
  - Returns: summary of notifications sent
```

### Computed Scheduling

- When Event is created/updated: create/update EventReminder with `scheduledFor = event.date - reminderOffset`
- When Lease is created: no records needed, cron job queries lease dates directly
- Keeps it simple, no need to pre-create all future reminder records

## Retry Logic & Error Handling

### Email Service Retry Implementation

```typescript
// server/src/services/email.service.ts

async function sendEmailWithRetry(
  notificationLogId: string,
  templateName: string,
  to: string,
  subject: string,
  data: any
): Promise<void> {
  const maxRetries = 3;
  const retryDelays = [1000, 5000, 15000]; // 1s, 5s, 15s

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await sendEmail(templateName, to, subject, data);

      // Success - update log
      await prisma.notificationLog.update({
        where: { id: notificationLogId },
        data: {
          status: 'sent',
          sentAt: new Date(),
          retryCount: attempt
        }
      });
      return;

    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1;

      if (isLastAttempt) {
        // Final failure - mark for admin review
        await prisma.notificationLog.update({
          where: { id: notificationLogId },
          data: {
            status: 'failed',
            failureReason: error.message,
            retryCount: attempt + 1
          }
        });
        console.error(`Email send failed after ${maxRetries} attempts:`, error);
      } else {
        // Retry - update status and wait
        await prisma.notificationLog.update({
          where: { id: notificationLogId },
          data: {
            status: 'retrying',
            retryCount: attempt + 1
          }
        });
        await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
      }
    }
  }
}
```

### Admin Dashboard

- New page: "Failed Notifications"
- Shows NotificationLog entries where status = 'failed'
- Displays: recipient, type, failureReason, retryCount, timestamp
- Action: "Retry Now" button to manually resend

## API Endpoints & Service Layer

### New Cron Endpoints

`server/src/routes/cron.ts`:

```typescript
POST /api/cron/email-reminders
  - Protected by X-Cron-Secret header
  - Triggers hourly reminder check
  - Returns: { sent: number, failed: number, skipped: number }

POST /api/cron/lease-notifications
  - Checks rent due, lease expiring/expired
  - Separate from events for different schedules (daily)
  - Returns: summary of notifications sent
```

### Notification Preference Endpoints

`server/src/routes/notification-preferences.ts`:

```typescript
GET /api/notification-preferences
  - Returns current user's preferences (all categories)

PUT /api/notification-preferences
  - Body: { category: string, emailEnabled: boolean, inAppEnabled: boolean }
  - Updates single category preference
  - Returns: updated preferences
```

### Admin Endpoints

`server/src/routes/admin/notifications.ts`:

```typescript
GET /api/admin/notification-logs?status=failed&limit=50
  - View notification history and failures
  - Filterable by status, type, date range

POST /api/admin/notification-logs/:id/retry
  - Manually retry a failed notification
  - Returns: new status after retry attempt
```

### Service Layer Organization

```
server/src/services/
├── email.service.ts           # SMTP, retry, template rendering
├── notification.service.ts    # Existing in-app notifications
├── notification-log.service.ts # NotificationLog CRUD + queries
├── email-notification.service.ts # High-level: check prefs, create log, send email
└── reminder.service.ts        # Business logic for finding pending reminders
```

## Database Schema

### New Prisma Models

```prisma
// NotificationLog - audit trail for all notifications
model NotificationLog {
  id               String   @id @default(uuid())
  userId           String   @map("user_id")
  notificationType String   @map("notification_type")
  channel          String   // email, in_app, sms
  status           String   // pending, sent, failed, retrying
  sentAt           DateTime? @map("sent_at")
  failureReason    String?  @map("failure_reason")
  retryCount       Int      @default(0) @map("retry_count")
  entityType       String?  @map("entity_type")
  entityId         String?  @map("entity_id")
  templateData     Json?    @map("template_data") // Payload for template rendering
  createdAt        DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, status, createdAt])
  @@index([status, createdAt])
  @@index([notificationType, entityType, entityId])
  @@map("notification_logs")
}

// NotificationPreference - user email preferences
model NotificationPreference {
  id           String  @id @default(uuid())
  userId       String  @map("user_id")
  category     String  // EVENT_REMINDERS, TENANT_COMMUNICATIONS, etc.
  emailEnabled Boolean @default(true) @map("email_enabled")
  inAppEnabled Boolean @default(true) @map("in_app_enabled")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, category])
  @@map("notification_preferences")
}

// EventReminder - scheduled event reminders
model EventReminder {
  id            String   @id @default(uuid())
  eventId       String   @map("event_id")
  reminderOffset Int     @default(7) @map("reminder_offset") // days before
  scheduledFor  DateTime @map("scheduled_for")
  sent          Boolean  @default(false)
  createdAt     DateTime @default(now()) @map("created_at")

  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@index([sent, scheduledFor])
  @@index([eventId])
  @@map("event_reminders")
}
```

### Migration Strategy

1. Create migration for three new tables
2. Seed default NotificationPreferences for existing users (all categories enabled)
3. Create EventReminders for existing future events (7 days before)
4. Update Event creation logic to auto-create EventReminder

### Environment Variables

```bash
# Email Configuration (already exists in bank branch)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# Cron Security
CRON_SECRET=  # Random secret for authenticating cron endpoints

# Optional
EMAIL_REMINDER_DEFAULT_OFFSET=7  # Days before event
```

## Implementation Phases

### Phase 1: Foundation (Core Infrastructure)

- Add three Prisma models (NotificationLog, NotificationPreference, EventReminder)
- Run migration and seed preferences for existing users
- Extend email.service.ts with template rendering (Handlebars)
- Add retry logic to email service
- Create notification-log.service.ts and email-notification.service.ts
- Add CRON_SECRET auth middleware

### Phase 2: Event Reminders

- Create email templates for event notifications (event-reminder.hbs, event-created.hbs, event-cancelled.hbs)
- Implement reminder.service.ts (query logic for pending reminders)
- Create POST /api/cron/email-reminders endpoint
- Update Event creation to auto-create EventReminder records
- Add EventReminder management (future: allow users to customize offset)

### Phase 3: Tenant Communications

- Create templates for rent/lease notifications
- Implement lease reminder logic in reminder.service.ts
- Create POST /api/cron/lease-notifications endpoint
- Schedule to run daily (early morning)

### Phase 4: Transaction & System Alerts

- Create templates for transaction and system notifications
- Hook into existing transaction creation flow
- Extend bank integration notification service to use new email templates
- Migrate existing admin notifications to new system

### Phase 5: User Preferences & Admin Tools

- Build notification preferences UI (user settings page)
- Create GET/PUT /api/notification-preferences endpoints
- Build admin dashboard for failed notifications
- Add manual retry capability

### Rollout Strategy

- Start with email disabled by default (feature flag or env var)
- Test in staging with real SMTP
- Enable for admin users first
- Gradually enable categories (events → tenant → transactions → system)

## Testing Strategy

### Unit Tests

```typescript
// email.service.test.ts
- Template rendering with various data
- Retry logic with mock SMTP failures
- HTML escaping and sanitization

// reminder.service.test.ts
- Query logic for pending reminders
- Date calculations for lease notifications
- Preference filtering

// email-notification.service.test.ts
- NotificationLog creation
- Preference checks
- Integration with email service
```

### Integration Tests

```typescript
// cron.test.ts
- Cron endpoint authentication (valid/invalid secret)
- End-to-end reminder sending flow
- Failed email handling and retry

// notification-preferences.test.ts
- CRUD operations
- Default preferences on user creation
- Category validation
```

### E2E Testing Scenarios

- Create event → verify EventReminder created → fast-forward time → trigger cron → verify email sent
- User disables EVENT_REMINDERS → create event → trigger cron → verify email NOT sent
- SMTP failure → verify retry attempts → verify admin dashboard shows failure

## Monitoring & Observability

### Logging & Metrics

- Log all email sends with structured logging (type, recipient, success/failure)
- Track metrics: emails sent per hour, failure rate, retry rate
- Alert on: high failure rate (>10%), SMTP connection failures, cron job not running
- Dashboard widgets: emails sent today, pending reminders, recent failures

### Local Development

- Use Ethereal Email (fake SMTP) or MailHog for testing without real email
- Seed script creates test events with various reminder dates
- Manual cron trigger via npm script: `npm run trigger-cron:reminders`

## Future Enhancements

### Multi-Owner Support

⚠️ **TODO:** After the `feature/multi-owner-property-management` branch is merged, implement multi-owner email notifications:

- Send notifications to all owners based on ownership percentages or roles
- Consider primary owner vs co-owner notification preferences
- Update transaction notifications to split by ownership
- Add settlement notifications when owners transfer funds

### Additional Features

- SMS notifications (requires Twilio integration)
- Push notifications for mobile app
- Per-event reminder customization (e.g., 3 days + 1 day before)
- Email digest mode (daily/weekly summary instead of individual emails)
- Template customization UI for admins
- Webhook support for third-party integrations

## Security Considerations

- Cron endpoints protected by secret token in header
- Rate limiting on cron endpoints to prevent abuse
- Validate all template data to prevent XSS in HTML emails
- Don't expose sensitive data in email templates (obfuscate account numbers, etc.)
- Use TLS for SMTP connections
- Store SMTP credentials in environment variables, never in code
- Log email sends but not email content (privacy)

## Dependencies

### New NPM Packages

```json
{
  "handlebars": "^4.7.8",        // Template rendering
  "nodemailer": "^6.9.0",        // Already in bank branch
  "@types/nodemailer": "^6.4.0", // Already in bank branch
  "@types/handlebars": "^4.1.0"
}
```

### External Services

- SMTP provider (Mailgun, SendGrid, AWS SES, or similar)
- Cron scheduler (Fly.io Cron Manager, EasyCron, cron-job.org, or similar)

## Success Criteria

- ✅ Users receive event reminders 7 days before scheduled events
- ✅ Tenants receive rent reminders 3 days before due date
- ✅ Users can enable/disable email categories
- ✅ Failed emails retry automatically and are visible to admins
- ✅ Email delivery rate > 95% (excluding invalid email addresses)
- ✅ System remains platform-agnostic (can deploy anywhere)
- ✅ All tests pass with >80% coverage
- ✅ No email is sent without user preference check
