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
**Admin-Only OAuth** - Only admins connect Monzo accounts via OAuth. All users benefit from imported transactions. Credentials stored securely per bank account.

### Duplicate Handling
**Skip Duplicates** - Detect duplicates by:
1. External ID (Monzo transaction ID)
2. Fuzzy match (same amount, date ±1 day, description similarity >80%)

Skip importing duplicates, log skipped count.

### Unmatched Transactions
**Pending Review Queue** - Transactions that can't be fully matched go to pending state. Admins review in dedicated UI, assign missing fields, then approve. Only approved transactions appear in reports.

### Sync Frequency
**Hybrid Approach** - Automatic daily sync (2 AM) plus manual "Sync Now" button for immediate updates.

### Historical Data
**Configurable Range** - Admin selects date range during setup (default 90 days). Range adjustable later to backfill older transactions.

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
**Polling Only** - Scheduled job fetches new transactions periodically. Simple, reliable, adequate for financial data.

### Rule Processing
**Auto-Reprocess Pending** - When rules change, automatically reapply to all pending transactions. Newly matched transactions auto-approve.

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
  syncFromDate    DateTime // Start date for fetching
  lastSyncAt      DateTime?
  lastSyncStatus  String   @default("never_synced") // success, failed, in_progress
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
  syncType              String   @map("sync_type") // "scheduled", "manual"
  status                String   // "success", "failed", "partial"
  startedAt             DateTime @default(now()) @map("started_at")
  completedAt           DateTime? @map("completed_at")

  transactionsFetched   Int      @default(0) @map("transactions_fetched")
  transactionsSkipped   Int      @default(0) @map("transactions_skipped") // Duplicates
  transactionsMatched   Int      @default(0) @map("transactions_matched") // Auto-approved
  transactionsPending   Int      @default(0) @map("transactions_pending") // Need review

  errorMessage          String?  @map("error_message")
  errorDetails          String?  @map("error_details") // JSON

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

### Sync Process

1. **Initiation**
   - Scheduled cron job (daily 2 AM) OR manual "Sync Now"
   - Create SyncLog (status="in_progress")
   - Process each enabled BankAccount

2. **Fetch Transactions**
   - Call Monzo API: `GET /transactions?since=syncFromDate`
   - Handle pagination (max 100 per page)
   - Handle rate limits (retry with backoff)
   - Refresh token if expired

3. **Duplicate Detection**
   - Check BankTransaction by (bankAccountId + externalId)
   - Check Transaction by fuzzy match (amount, date ±1 day, description similarity >80%)
   - Skip duplicates, increment transactionsSkipped

4. **Create BankTransaction Records**
   - Insert for each non-duplicate
   - Convert Monzo amount (pence → pounds)

5. **Apply Matching Rules**
   - Fetch all MatchingRule (account-specific + global)
   - Sort by priority ASC
   - For each BankTransaction:
     - Initialize: propertyId=null, type=null, category=null
     - Evaluate each rule:
       - If conditions match AND any target field is null:
         - Apply rule actions to null fields
       - If all three fields set, stop
     - Result: fully matched, partially matched, or unmatched

6. **Create Transactions or Pending**
   - **Fully matched** (all three fields set):
     - Validate property exists, status != "For Sale"
     - Validate type/category match
     - Create Transaction, link BankTransaction
     - Increment transactionsMatched
   - **Partially/Unmatched**:
     - Create PendingTransaction with matched fields
     - Link BankTransaction
     - Increment transactionsPending

7. **Complete Sync**
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
  - Creates BankAccount
  - Redirects to admin UI

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
  - Manual sync trigger
  - Auth: requireAuth, requireAdmin
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
- Sync fails after all retries
- Token refresh fails (immediate action required)
- Sync completes with warnings
- Large pending queue (>50)

Channels:
- In-app notification badge
- Email to admins
- Dashboard "System Health" widget

---

## Frontend Components

### Admin Pages

**`/admin/bank-accounts`**
- BankAccountsList (cards with status, pending count)
- "Connect New Account" button
- BankAccountSettings modal
- SyncStatusWidget

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
- Bank sync status overview
- Pending count
- Recent failures
- Quick actions

---

## Implementation Plan

### Phase 1: Foundation (Week 1-2)
- Database schema and migrations
- OAuth flow implementation
- Token encryption service
- Basic BankAccount CRUD
- Manual sync trigger

### Phase 2: Core Sync Logic (Week 2-3)
- Monzo API client
- Transaction fetching with pagination
- Duplicate detection
- BankTransaction storage
- SyncLog creation

### Phase 3: Matching System (Week 3-4)
- MatchingRule CRUD
- Rule evaluation engine
- Transaction/PendingTransaction creation
- Default rules setup
- Rule reprocessing

### Phase 4: Admin UI (Week 4-5)
- Bank accounts management page
- OAuth connection flow
- Matching rules editor
- Pending review interface
- Bulk operations

### Phase 5: Automation & Polish (Week 5-6)
- Scheduled background sync (cron)
- Error handling and retry logic
- Admin notifications
- Transaction audit logging
- Sync status dashboard

### Phase 6: Testing & Documentation (Week 6-7)
- Comprehensive test suite
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

# Sync Settings
BANK_SYNC_CRON=0 2 * * *  # Daily at 2 AM
BANK_SYNC_DEFAULT_DAYS=90
```

### Dependencies

```json
{
  "dependencies": {
    "node-cron": "^3.0.3",
    "node-fetch": "^3.3.2",
    "string-similarity": "^4.0.4"
  },
  "devDependencies": {
    "nock": "^13.3.8"
  }
}
```

---

## Testing Strategy

### Unit Tests (90% coverage target)
- Rule matching logic (conditions, AND/OR, accumulation)
- Duplicate detection (exact + fuzzy)
- Token management (encryption, refresh)
- Data validation

### Integration Tests
- Full sync flow (fetch → match → create)
- OAuth flow
- Pending approval workflow
- Rule reprocessing

### API Tests (100% endpoint coverage)
- All CRUD operations
- Error scenarios
- Validation rules
- Bulk operations

### E2E Tests
- Complete user journey (connect → sync → review → approve)
- Error recovery (token expiry, refresh failure)

### Test Environment
- Use Monzo sandbox for dev/testing
- Mock API responses for unit/integration tests
- Test database separate from development

---

## Future Enhancements

1. **Multi-Bank Support** - Abstract into adapters, add Starling, Revolut
2. **Webhooks** - Real-time notifications from Monzo
3. **Machine Learning** - Learn from manual categorizations, suggest rules
4. **Advanced Matching** - Link to tenants, detect recurring, split transactions
5. **Enhanced Reports** - Bank reconciliation, transaction source breakdown

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Monzo API changes | High | Version calls, monitor changelog, fallback |
| Token security breach | Critical | Encrypt tokens, rotate keys, audit logs |
| Duplicate imports | Medium | Robust dedup, unique constraints, review queue |
| Rule complexity confusion | Medium | Clear UI/UX, testing/preview, docs |
| Sync failures | Medium | Retry logic, alerting, manual option |
| Performance (large imports) | Low | Pagination, batching, background jobs |

---

## Success Metrics

- Time saved: Reduce manual transaction entry by 80%+
- Accuracy: 90%+ of transactions auto-matched and approved
- User satisfaction: Admins find review queue intuitive and efficient
- Reliability: 99%+ sync success rate
- Performance: Sync 1000 transactions in <60 seconds
