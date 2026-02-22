# Bank Account Integration Design

**Date:** 2026-01-20
**Status:** Approved
**Target Bank:** Monzo (UK)

## Overview

Automatic bank account integration to import transactions and create Transaction records with intelligent property/category matching.

## Design Decisions

### Automation Level
**Fully Automatic Sync** - Transactions imported automatically (daily) and either:
- Auto-approved if fully matched by rules
- Placed in pending review queue if unmatched

### Property Matching
**Smart Matching with Rules** - Configurable pattern-based rules match transactions to properties. Rules support:
- Multiple bank transaction fields (description, counterparty, reference, merchant, amount)
- Pattern matching (contains, equals, startsWith, endsWith, comparisons)
- AND/OR logic for complex conditions
- Priority-based evaluation with field accumulation

Unmatched transactions require manual assignment by admin.

### Categorization
**Rule-Based Auto-Categorization** - Same rule system assigns type (Income/Expense) and category. Ships with sensible defaults:
- Description contains "rent" → Income/Rent
- Description contains "deposit" → Income/Security Deposit
- Description contains "maintenance" → Expense/Maintenance
- Description contains "repair" → Expense/Repair
- Amount < 0 AND no match → Expense/Other

Users can remove/modify default rules.

### Authentication
**Admin-Only OAuth with Confidential Client** - Only admins connect Monzo accounts via OAuth. Application registered as **confidential client** (server-side) to receive refresh tokens for long-lived access. All users benefit from imported transactions. Credentials stored securely per bank account.

**Strong Customer Authentication (SCA)**: During OAuth flow, users receive push notification in Monzo app requiring approval via PIN/fingerprint/Face ID. Access tokens have no permissions until user approves in-app.

### Duplicate Handling
**Skip Duplicates** - Detect duplicates by:
1. External ID (Monzo transaction ID)
2. Fuzzy match (same amount, date ±1 day, description similarity >80%)

Skip importing duplicates, log skipped count.

### Unmatched Transactions
**Pending Review Queue** - Transactions that can't be fully matched go to pending state. Admins review in dedicated UI, assign missing fields, then approve. Only approved transactions appear in reports.

### Sync Frequency
**Webhook-Driven with Manual Fallback** - Real-time updates via Monzo webhooks (`transaction.created` event) trigger immediate import. Manual "Sync Now" button available for initial backfill, webhook failures, or on-demand refresh. No scheduled polling (hosting platform spins down when idle; webhooks wake service).

### Historical Data
**Immediate Full Import with Range Selection** - Admin selects date range during OAuth setup (default 90 days, max depends on user's transaction history). **Critical**: Monzo API restricts historical fetching to 90 days after 5 minutes post-authentication. Full history **must** be fetched immediately during OAuth callback. Range cannot be extended retroactively beyond this window.

### Sync Failures
**Retry with Alerts** - Automatic retry with exponential backoff. Alert admins if failures persist. Dashboard shows sync status/errors.

### Transaction Editability
**Partially Editable with Audit Trail** - Imported transactions:
- **Locked:** amount (preserves bank accuracy)
- **Editable:** propertyId, leaseId, type, category, transactionDate, description
- **Tracked:** Flag showing bank-imported + audit log of all changes

### Matching Rules
**Pattern Matching with AND/OR Logic** - Simple but powerful:
- Pattern types: contains, equals, startsWith, endsWith, greaterThan, lessThan
- Multiple fields: description, counterpartyName, reference, merchant, amount
- Boolean logic: AND/OR operators
- Rule accumulation: Multiple rules contribute fields until complete (propertyId + type + category)

### Multiple Accounts
**Multiple Accounts Supported** - Connect multiple Monzo accounts, each with independent rules and sync settings.

### Transaction Detection
**Webhooks Primary** - Monzo sends `transaction.created` webhook immediately when transactions occur. Webhook handler validates signature, processes transaction through matching rules. Monzo retries failed webhooks up to 5 times with exponential backoff. Manual "Sync Now" available as fallback for webhook failures or gaps.

### Rule Processing
**Auto-Reprocess Pending** - When rules change, automatically reapply to all pending transactions. Newly matched transactions auto-approve.

---

## Monzo API Specifics

### API Endpoints

**Transactions:**
```
GET /transactions
  Query params:
    - account_id (required): Monzo account ID
    - since (optional): RFC3339 timestamp or transaction ID
    - before (optional): RFC3339 timestamp
    - limit (optional): Results per page (default 30, max 100)

  Returns: { transactions: Transaction[] }
```

**Webhooks:**
```
POST /webhooks
  Body: { account_id, url }
  Returns: { webhook: { id, account_id, url } }

DELETE /webhooks/:webhook_id
  Removes webhook registration
```

### Response Format

Monzo transactions include:
- `id`: Unique transaction ID (external ID for us)
- `amount`: Integer in **pence** (divide by 100 for pounds)
- `currency`: e.g., "GBP"
- `created`: RFC3339 timestamp
- `description`: Human-readable description
- `merchant`: Merchant object (name, category, etc.)
- `counterparty`: Object with account details
- `notes`: User-added notes
- `metadata`: Key-value pairs
- `is_load`: Boolean (true for top-ups)
- `settled`: RFC3339 timestamp (when transaction settled)
- `category`: Monzo's category (not our category system)

### Critical Constraints

1. **5-Minute Window**: Full transaction history only accessible for 5 minutes after OAuth. After that, only 90 days of history.

2. **Pagination**: Default 30 results, max 100. Always set `limit=100`.

3. **Client Type**: Must register as **confidential client** to receive refresh tokens.

4. **Strong Customer Authentication**: Users must approve in Monzo app (push notification) with PIN/fingerprint/Face ID before token has permissions.

5. **Webhook Retries**: Monzo retries failed webhooks up to 5 times with exponential backoff.

6. **Rate Limits**: Not publicly documented. Implement conservative retry logic and monitor for 429 responses.

### Webhook Payload

```typescript
interface MonzoWebhookPayload {
  type: "transaction.created";
  data: {
    account_id: string;
    amount: number; // pence
    created: string; // RFC3339
    currency: string;
    description: string;
    id: string; // transaction ID
    merchant?: string;
    metadata: Record<string, any>;
    notes: string;
    is_load: boolean;
    settled: string;
    category: string;
  };
}
```

### Type Definitions

```typescript
// Add to server/src/services/monzo/types.ts
interface MonzoTransaction {
  id: string;
  account_id: string;
  amount: number; // pence
  currency: string;
  created: string;
  description: string;
  merchant?: {
    id: string;
    name: string;
    logo?: string;
  };
  counterparty?: {
    account_id?: string;
    name?: string;
    user_id?: string;
  };
  metadata: Record<string, any>;
  notes: string;
  is_load: boolean;
  settled?: string;
  category: string;
}

interface MonzoTransactionsResponse {
  transactions: MonzoTransaction[];
}

interface MonzoWebhookRegistration {
  account_id: string;
  url: string;
}

interface MonzoWebhookResponse {
  webhook: {
    id: string;
    account_id: string;
    url: string;
  };
}
```

---

## Architecture

### Database Schema

#### BankAccount
Stores connected Monzo accounts.

```prisma
model BankAccount {
  id              String   @id @default(uuid())
  accountId       String   @unique // Monzo account ID
  accountName     String   // User-friendly name
  accountType     String   // e.g., "uk_retail", "uk_business"
  provider        String   @default("monzo")
  accessToken     String   // Encrypted OAuth token
  refreshToken    String?  // Encrypted refresh token
  tokenExpiresAt  DateTime?
  syncEnabled     Boolean  @default(true)
  syncFromDate    DateTime // Historical import start date
  lastSyncAt      DateTime?
  lastSyncStatus  String   @default("never_synced") // success, failed, in_progress
  webhookId       String?  @unique // Monzo webhook ID
  webhookUrl      String?  // Registered webhook URL
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  bankTransactions BankTransaction[]
  matchingRules    MatchingRule[]
  syncLogs         SyncLog[]

  @@map("bank_accounts")
}
```

#### BankTransaction
Raw imported transaction data from Monzo (read-only).

```prisma
model BankTransaction {
  id                  String    @id @default(uuid())
  bankAccountId       String    @map("bank_account_id")
  externalId          String    @map("external_id") // Monzo transaction ID
  amount              Float     // Positive for income, negative for expense
  currency            String    @default("GBP")
  description         String
  counterpartyName    String?   @map("counterparty_name")
  reference           String?
  merchant            String?
  category            String?   // Monzo's category (not ours)
  transactionDate     DateTime  @map("transaction_date")
  settledDate         DateTime? @map("settled_date")
  importedAt          DateTime  @default(now()) @map("imported_at")

  transactionId       String?   @unique @map("transaction_id") // Link to approved Transaction
  pendingTransactionId String?  @unique @map("pending_transaction_id")

  bankAccount         BankAccount @relation(fields: [bankAccountId], references: [id], onDelete: Cascade)
  transaction         Transaction? @relation(fields: [transactionId], references: [id])
  pendingTransaction  PendingTransaction?

  @@unique([bankAccountId, externalId]) // Prevent duplicate imports
  @@index([bankAccountId, transactionDate])
  @@map("bank_transactions")
}
```

#### MatchingRule
Admin-configured rules for automatic property/category assignment.

```prisma
model MatchingRule {
  id              String   @id @default(uuid())
  bankAccountId   String?  @map("bank_account_id") // Null = applies to all accounts
  priority        Int      // Lower number = higher priority
  enabled         Boolean  @default(true)
  name            String   // User-friendly name

  // Conditions (JSON for AND/OR logic)
  // Format: {"operator": "AND", "rules": [{field, matchType, value}, ...]}
  conditions      String

  // Actions (fields to set when matched)
  propertyId      String?  @map("property_id") // Auto-assign to this property
  type            String?  // Income or Expense
  category        String?  // Transaction category

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  bankAccount     BankAccount? @relation(fields: [bankAccountId], references: [id], onDelete: Cascade)

  @@index([bankAccountId, priority])
  @@map("matching_rules")
}
```

**Rule Conditions JSON Structure:**
```typescript
interface RuleCondition {
  operator: "AND" | "OR";
  rules: Array<{
    field: "description" | "counterpartyName" | "reference" | "merchant" | "amount";
    matchType: "contains" | "equals" | "startsWith" | "endsWith" | "greaterThan" | "lessThan";
    value: string | number;
    caseSensitive?: boolean; // Default false for strings
  }>;
}
```

#### PendingTransaction
Staging area for transactions awaiting admin review.

```prisma
model PendingTransaction {
  id                String   @id @default(uuid())
  bankTransactionId String   @unique @map("bank_transaction_id")

  // Editable fields (admin fills in)
  propertyId        String?  @map("property_id")
  leaseId           String?  @map("lease_id")
  type              String?  // Income or Expense
  category          String?
  transactionDate   DateTime @map("transaction_date") // Can be adjusted
  description       String   // Can be edited

  // Audit fields
  createdAt         DateTime @default(now()) @map("created_at")
  reviewedAt        DateTime? @map("reviewed_at")
  reviewedBy        String?  @map("reviewed_by") // User ID

  bankTransaction   BankTransaction @relation(fields: [bankTransactionId], references: [id], onDelete: Cascade)

  @@map("pending_transactions")
}
```

#### SyncLog
Audit trail of sync operations.

```prisma
model SyncLog {
  id                    String   @id @default(uuid())
  bankAccountId         String   @map("bank_account_id")
  syncType              String   @map("sync_type") // "webhook", "manual", "initial"
  status                String   // "success", "failed", "partial"
  startedAt             DateTime @default(now()) @map("started_at")
  completedAt           DateTime? @map("completed_at")

  transactionsFetched   Int      @default(0) @map("transactions_fetched")
  transactionsSkipped   Int      @default(0) @map("transactions_skipped") // Duplicates
  transactionsMatched   Int      @default(0) @map("transactions_matched") // Auto-approved
  transactionsPending   Int      @default(0) @map("transactions_pending") // Need review

  errorMessage          String?  @map("error_message")
  errorDetails          String?  @map("error_details") // JSON
  webhookEventId        String?  @map("webhook_event_id") // Monzo webhook event ID

  bankAccount           BankAccount @relation(fields: [bankAccountId], references: [id], onDelete: Cascade)

  @@index([bankAccountId, startedAt])
  @@map("sync_logs")
}
```

#### TransactionAuditLog
Track changes to imported transactions.

```prisma
model TransactionAuditLog {
  id            String   @id @default(uuid())
  transactionId String   @map("transaction_id")
  userId        String   @map("user_id") // Who made the change
  field         String   // "propertyId", "category", etc.
  oldValue      String?  @map("old_value")
  newValue      String?  @map("new_value")
  changedAt     DateTime @default(now()) @map("changed_at")

  @@index([transactionId, changedAt])
  @@map("transaction_audit_logs")
}
```

#### Transaction (Updates)
Add bank integration fields to existing model.

```prisma
model Transaction {
  // ... existing fields ...

  bankTransactionId String?  @unique @map("bank_transaction_id")
  isImported        Boolean  @default(false) @map("is_imported")
  importedAt        DateTime? @map("imported_at")

  bankTransaction   BankTransaction?

  // ... existing relations ...
}
```

---

## Data Flow

### Initial Import Process (OAuth Callback)

1. **Immediate Full History Fetch**
   - **Critical**: Must occur within 5 minutes of OAuth completion
   - User selects historical range during connection (default 90 days)
   - Call Monzo API: `GET /transactions?account_id={accountId}&since={selectedDate}&limit=100`
   - Handle pagination (default 30, set `limit=100` for efficiency)
   - Create SyncLog (syncType="initial")

2. **Register Webhook**
   - Call Monzo API: `POST /webhooks` with callback URL
   - Store webhookId in BankAccount
   - Webhook URL format: `https://yourdomain.com/api/bank/webhooks/monzo`

3. **Process Fetched Transactions**
   - Continue to duplicate detection and matching (see below)

### Webhook-Driven Sync Process

1. **Webhook Receipt**
   - Monzo sends POST to registered webhook URL
   - Verify webhook signature (HMAC validation)
   - Extract transaction data from payload
   - Create SyncLog (syncType="webhook")

2. **Process Single Transaction**
   - No API call needed (transaction data in webhook payload)
   - Continue to duplicate detection and matching (see below)

### Manual Sync Process

1. **Initiation**
   - Admin clicks "Sync Now" button
   - Create SyncLog (syncType="manual")
   - Call Monzo API: `GET /transactions?account_id={accountId}&since={lastSyncAt}&limit=100`
   - Handle pagination and rate limits (retry with backoff)
   - Refresh token if expired

### Common Transaction Processing

1. **Duplicate Detection**
   - Check BankTransaction by (bankAccountId + externalId)
   - Check Transaction by fuzzy match (amount, date ±1 day, description similarity >80%)
   - Skip duplicates, increment transactionsSkipped

2. **Create BankTransaction Records**
   - Insert for each non-duplicate
   - Convert Monzo amount (pence → pounds)

3. **Apply Matching Rules**
   - Fetch all MatchingRule (account-specific + global)
   - Sort by priority ASC
   - For each BankTransaction:
     - Initialize: propertyId=null, type=null, category=null
     - Evaluate each rule:
       - If conditions match AND any target field is null:
         - Apply rule actions to null fields
       - If all three fields set, stop
     - Result: fully matched, partially matched, or unmatched

4. **Create Transactions or Pending**
   - **Fully matched** (all three fields set):
     - Validate property exists, status != "For Sale"
     - Validate type/category match
     - Create Transaction, link BankTransaction
     - Increment transactionsMatched
   - **Partially/Unmatched**:
     - Create PendingTransaction with matched fields
     - Link BankTransaction
     - Increment transactionsPending

5. **Complete Sync**
   - Update SyncLog (counts, status, completedAt)
   - Update BankAccount (lastSyncAt, lastSyncStatus)
   - If errors but some processed: status="partial"
   - If complete failure: status="failed"

### Pending Transaction Approval

1. **Admin Reviews**
   - View pending in UI
   - Edit propertyId, leaseId, type, category, date, description
   - Click "Approve"

2. **Validation**
   - Check all required fields present
   - Validate property exists, status != "For Sale"
   - Validate type/category match
   - Validate lease belongs to property (if specified)

3. **Create Transaction**
   - Amount from BankTransaction (locked)
   - Other fields from PendingTransaction (admin-assigned)
   - Set isImported=true, importedAt=now, bankTransactionId
   - Create TransactionAuditLog: "Created from bank import by [admin]"

4. **Cleanup**
   - Delete PendingTransaction
   - Update BankTransaction.transactionId

### Rule Reprocessing

When admin creates/updates/deletes a MatchingRule:

1. Find all PendingTransaction for affected bankAccountId
2. Re-run rule matching on linked BankTransactions
3. Update PendingTransaction with newly matched fields
4. If now fully matched:
   - Auto-approve (create Transaction)
   - Delete PendingTransaction
   - Notify admin

---

## API Endpoints

### Bank Account Management

```
POST   /api/bank/monzo/connect
  - Initiates OAuth flow
  - Returns: { authUrl, state }

GET    /api/bank/monzo/callback
  - OAuth callback, exchanges code for tokens
  - Prompts user for historical import range
  - **Immediately** fetches full transaction history (must complete within 5 minutes)
  - Registers webhook with Monzo
  - Creates BankAccount
  - Redirects to admin UI with import status

GET    /api/bank/accounts
  - List all connected accounts
  - Returns: { accounts: BankAccount[] }

GET    /api/bank/accounts/:id
  - Get account details + recent syncs

PATCH  /api/bank/accounts/:id
  - Update settings (name, syncEnabled, syncFromDate)
  - Auth: requireAuth, requireAdmin

DELETE /api/bank/accounts/:id
  - Disconnect (soft delete) or hard delete
  - Auth: requireAuth, requireAdmin

POST   /api/bank/accounts/:id/sync
  - Manual sync trigger (backfill or on-demand)
  - Auth: requireAuth, requireAdmin

POST   /api/bank/webhooks/monzo
  - Webhook endpoint for Monzo transaction.created events
  - Validates HMAC signature
  - Processes transaction asynchronously
  - Public endpoint (validated via signature)
```

### Matching Rules

```
GET    /api/bank/accounts/:accountId/rules
  - List rules (account + global), sorted by priority

POST   /api/bank/accounts/:accountId/rules
  - Create rule, auto-reprocess pending
  - Auth: requireAuth, requireAdmin

PUT    /api/bank/rules/:id
  - Update rule, auto-reprocess pending
  - Auth: requireAuth, requireAdmin

DELETE /api/bank/rules/:id
  - Delete rule
  - Auth: requireAuth, requireAdmin

POST   /api/bank/rules/reorder
  - Bulk priority reordering
  - Auth: requireAuth, requireAdmin

POST   /api/bank/rules/:id/test
  - Preview rule matches (doesn't apply)
  - Auth: requireAuth, requireAdmin
```

### Pending Transactions

```
GET    /api/bank/pending
  - List with filters (accountId, propertyId, dates, etc.)
  - Returns: { pending: PendingTransaction[], total }

GET    /api/bank/pending/:id
  - Get single pending with full details

PATCH  /api/bank/pending/:id
  - Update fields (propertyId, type, category, etc.)
  - Auth: requireAuth, requireAdmin

POST   /api/bank/pending/:id/approve
  - Approve → create Transaction
  - Auth: requireAuth, requireAdmin

POST   /api/bank/pending/:id/reject
  - Reject and delete
  - Auth: requireAuth, requireAdmin

POST   /api/bank/pending/bulk-approve
  - Approve multiple
  - Auth: requireAuth, requireAdmin

POST   /api/bank/pending/bulk-update
  - Update multiple with same values
  - Auth: requireAuth, requireAdmin
```

### Sync Logs & Monitoring

```
GET    /api/bank/sync-logs
  - List sync history with filters

GET    /api/bank/sync-logs/:id
  - Get detailed log with errors

GET    /api/bank/sync-status
  - Dashboard overview
  - Returns: { totalAccounts, pendingCount, lastSyncAt, failedAccounts }
```

### Transaction Audit

```
GET    /api/transactions/:id/audit-log
  - Get change history for imported transaction
```

---

## Security

### Token Protection
- OAuth tokens encrypted at rest (AES-256-GCM)
- Encryption key from env var: `BANK_TOKEN_ENCRYPTION_KEY`
- Unique IV per token
- Tokens never logged or exposed in responses

### Webhook Security
- HMAC signature verification on all webhook requests
- Webhook secret from env var: `MONZO_WEBHOOK_SECRET`
- Reject requests with invalid signatures (403)
- Idempotency handling via webhook event ID
- Rate limiting on webhook endpoint

### OAuth Security
- Cryptographically secure state tokens (32 bytes)
- State tokens stored in Redis with 5-minute expiry
- Single-use state validation
- CSRF protection on callback

### Access Control
- All bank endpoints require authentication
- Admin-only endpoints check user role
- Rate limiting on sync endpoints

### Audit Logging
Log all sensitive operations:
- Account connections/disconnections
- Token refreshes
- Webhook registrations/deletions
- Webhook signature validation failures
- Rule changes
- Approvals/rejections
- Manual syncs

### Data Retention
- BankTransaction: indefinite (audit)
- PendingTransaction: 90 days if unresolved
- SyncLog: 1 year
- TransactionAuditLog: indefinite
- Tokens: delete on disconnect

---

## Error Handling

### Error Categories

1. **Network/Timeout** - Retry 3x with exponential backoff (1s, 2s, 4s)
2. **Rate Limiting (429)** - Back off per Retry-After header
3. **Auth Errors (401)** - Attempt token refresh; if fails, disable sync and alert admin
4. **API Errors (4xx/5xx)** - Log, no retry, status="failed"
5. **Validation Errors** - Skip transaction, log warning, status="partial"

### Retry Logic

```typescript
interface RetryConfig {
  maxAttempts: 3;
  baseDelay: 1000; // ms
  maxDelay: 30000; // 30s
  retryableStatuses: [408, 429, 500, 502, 503, 504];
}
```

### Admin Notifications

Alert when:
- Webhook delivery fails repeatedly (Monzo exhausts retries)
- Token refresh fails (immediate action required)
- Manual sync fails after all retries
- Webhook signature validation fails (security concern)
- Large pending queue (>50)

Channels:
- In-app notification badge
- Email to admins
- Dashboard "System Health" widget

---

## Frontend Components

### Admin Pages

**`/admin/bank-accounts`**
- BankAccountsList (cards with status, pending count, webhook status)
- "Connect New Account" button (with historical range selector)
- BankAccountSettings modal
- WebhookStatusWidget (last event, health)
- Manual sync button (for troubleshooting)

**`/admin/bank-accounts/:id/rules`**
- RulesList (draggable for reordering)
- RuleEditor modal (visual condition builder)
- DefaultRulesTemplate (one-click setup)

**`/admin/pending-transactions`**
- PendingTransactionsList (table with filters)
- Inline editing (property, type, category)
- Bulk selection and actions
- PendingCountBadge in nav

### Enhanced Components

**Transaction Row**
- "Imported from Bank" badge
- BankTransaction details popover
- Audit log icon for edited imports

**Dashboard Widget**
- Bank webhook status overview
- Pending count
- Last transaction received timestamp
- Webhook health indicator
- Quick actions

---

## Implementation Plan

### Phase 1: Foundation (Week 1-2)
- Database schema and migrations (add webhook fields)
- OAuth flow with historical range selector
- **Immediate** full history import in OAuth callback
- Token encryption service
- Basic BankAccount CRUD
- Manual sync trigger

### Phase 2: Webhook Infrastructure (Week 2-3)
- Webhook endpoint (`POST /api/bank/webhooks/monzo`)
- HMAC signature verification
- Webhook registration with Monzo during OAuth
- Webhook deletion on account disconnect
- Idempotency handling (event ID tracking)

### Phase 3: Core Transaction Logic (Week 3)
- Monzo API client with type definitions
- Transaction processing (webhook payload + manual sync)
- Duplicate detection (external ID + fuzzy match)
- BankTransaction storage
- Amount conversion (pence → pounds)
- SyncLog creation

### Phase 4: Matching System (Week 4)
- MatchingRule CRUD
- Rule evaluation engine
- Transaction/PendingTransaction creation
- Default rules setup
- Rule reprocessing

### Phase 5: Admin UI (Week 5)
- Bank accounts management page
- OAuth connection flow with range selection
- Historical import progress indicator
- Webhook status monitoring
- Matching rules editor
- Pending review interface
- Bulk operations

### Phase 6: Polish & Monitoring (Week 6)
- Error handling and retry logic (manual sync)
- Admin notifications (webhook failures)
- Transaction audit logging
- Webhook health dashboard
- Security audit (signature validation)

### Phase 7: Testing & Documentation (Week 7)
- Comprehensive test suite
- Webhook integration tests
- Monzo sandbox testing
- User documentation
- Admin guide

---

## Configuration

### Environment Variables

```bash
# Monzo API Credentials
MONZO_CLIENT_ID=
MONZO_CLIENT_SECRET=
MONZO_REDIRECT_URI=http://localhost:5000/api/bank/monzo/callback
MONZO_ENVIRONMENT=sandbox  # or 'production'

# Security
BANK_TOKEN_ENCRYPTION_KEY=  # 32-byte hex: openssl rand -hex 32
MONZO_WEBHOOK_SECRET=       # From Monzo developer console

# Webhook Settings
BANK_WEBHOOK_BASE_URL=https://yourdomain.com  # Public-facing URL

# Import Settings
BANK_IMPORT_DEFAULT_DAYS=90  # Default historical import range
BANK_IMPORT_MAX_DAYS=1825    # Max 5 years
```

### Dependencies

```json
{
  "dependencies": {
    "node-fetch": "^3.3.2",
    "string-similarity": "^4.0.4",
    "crypto": "built-in"
  },
  "devDependencies": {
    "nock": "^13.3.8"
  }
}
```

**Note:** Removed `node-cron` as sync is webhook-driven, not scheduled.

---

## Testing Strategy

### Unit Tests (90% coverage target)
- Rule matching logic (conditions, AND/OR, accumulation)
- Duplicate detection (exact + fuzzy)
- Token management (encryption, refresh)
- Data validation

### Integration Tests
- Webhook flow (receive → verify → process → match → create)
- OAuth flow with immediate history import
- Manual sync flow (fetch → match → create)
- Pending approval workflow
- Rule reprocessing
- Webhook signature verification

### API Tests (100% endpoint coverage)
- All CRUD operations
- Error scenarios
- Validation rules
- Bulk operations

### E2E Tests
- Complete user journey (connect → immediate import → webhook → review → approve)
- Webhook delivery and processing
- Error recovery (token expiry, refresh failure, webhook retry)

### Test Environment
- Use Monzo sandbox for dev/testing
- Mock API responses for unit/integration tests
- Test database separate from development

---

## Future Enhancements

1. **Multi-Bank Support** - Abstract into adapters, add Starling, Revolut (each with own webhook handlers)
2. **Machine Learning** - Learn from manual categorizations, suggest rules
3. **Advanced Matching** - Link to tenants, detect recurring, split transactions
4. **Enhanced Reports** - Bank reconciliation, transaction source breakdown
5. **Webhook Monitoring Dashboard** - Visual timeline of webhook deliveries, latency tracking

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Monzo API changes | High | Version calls, monitor changelog, fallback |
| Token security breach | Critical | Encrypt tokens, rotate keys, audit logs |
| Webhook signature forgery | Critical | HMAC validation, reject invalid signatures |
| Duplicate imports | Medium | Robust dedup, unique constraints, review queue |
| Rule complexity confusion | Medium | Clear UI/UX, testing/preview, docs |
| Webhook delivery failures | Medium | Monzo retries 5x, manual sync fallback |
| Hosting platform cold start | Low | Webhooks wake service, keep-alive pings |
| Performance (large imports) | Low | Pagination, batching, background jobs |

---

## Success Metrics

- Time saved: Reduce manual transaction entry by 80%+
- Accuracy: 90%+ of transactions auto-matched and approved
- User satisfaction: Admins find review queue intuitive and efficient
- Reliability: 99%+ webhook delivery success rate
- Latency: Transactions appear in system within 5 seconds of webhook receipt
- Performance: Process webhook payload in <2 seconds
