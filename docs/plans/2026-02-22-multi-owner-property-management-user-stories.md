# User Stories: Multi-Owner Property Management

**Design document:** docs/plans/2026-01-26-multi-owner-property-management-design.md
**Date:** 2026-02-22
**PR:** #8 — Add multi-owner property management feature

## Roles

- **Property Owner (Admin)**: A landlord who owns or co-owns properties. Admins are often also Property Owners and have full access to all ownership, transactions, settlements, and reports across the system.
- **Editor**: Can create/edit transactions on properties they own, record their own settlements, but cannot modify property ownership configuration.
- **Viewer**: Read-only access to their own properties, balances, and reports.

## Epic: Property Ownership Configuration

### US-001: Add co-owners to a property

**As a** Property Owner, **I want** to add other users as co-owners of my property with ownership percentages, **so that** income and expenses can be split correctly between us.

**Acceptance Criteria:**
- [ ] Can add an existing system user as a co-owner from the property edit page
- [ ] Must specify an ownership percentage (0.01% - 100%) for each owner
- [ ] Ownership percentages must sum to exactly 100% before saving
- [ ] Validation indicator shows current total and whether it equals 100%
- [ ] Save is disabled until percentages sum to 100%

**Priority:** High
**Complexity:** Medium
**Epic:** Property Ownership Configuration

### US-002: Edit ownership percentages

**As a** Property Owner, **I want** to change the ownership percentages on a property, **so that** future transactions reflect updated ownership splits.

**Acceptance Criteria:**
- [ ] Can edit any owner's percentage from the property ownership section
- [ ] Existing transaction splits are NOT retroactively changed
- [ ] Warning shown if property has unsettled balances: "This only affects future transactions"
- [ ] Percentages must still sum to 100% after editing

**Priority:** Medium
**Complexity:** Small
**Epic:** Property Ownership Configuration

### US-003: Remove a co-owner from a property

**As an** Admin, **I want** to remove a co-owner from a property, **so that** they are no longer part of future splits.

**Acceptance Criteria:**
- [ ] Can remove an owner via a remove button next to their entry
- [ ] Cannot remove an owner who has existing transaction splits or settlements (error shown)
- [ ] Remaining owners' percentages must be adjusted to sum to 100%
- [ ] Past transactions involving the removed owner remain unchanged

**Priority:** Medium
**Complexity:** Small
**Epic:** Property Ownership Configuration

### US-004: Properties without owners work normally

**As a** Property Owner, **I want** properties without co-owners to function as before, **so that** the multi-owner feature doesn't break my existing workflow.

**Acceptance Criteria:**
- [ ] Properties without owners can still have transactions created normally
- [ ] No split section appears for properties without owners
- [ ] Existing transactions without splits continue to display correctly
- [ ] Banner suggests "Add owners to enable profit splitting" on unowned properties

**Priority:** High
**Complexity:** Small
**Epic:** Property Ownership Configuration

## Epic: Transaction Splits

### US-005: Auto-generate splits from ownership when creating a transaction

**As a** Property Owner, **I want** transaction splits to be automatically generated from the property's ownership percentages, **so that** I don't have to manually enter splits every time.

**Acceptance Criteria:**
- [ ] When a property is selected in the transaction form, ownership splits are loaded automatically
- [ ] Each owner's percentage and calculated amount are shown (e.g. "Alice: 60% = £600")
- [ ] Split amounts recalculate in real-time when the transaction amount changes
- [ ] Splits are saved as TransactionSplit records when the transaction is created

**Priority:** High
**Complexity:** Medium
**Epic:** Transaction Splits

### US-006: Specify who paid for an expense transaction

**As a** Property Owner, **I want** to record which owner actually paid for an expense, **so that** the system can calculate who owes whom.

**Acceptance Criteria:**
- [ ] "Paid By" dropdown appears for expense transactions on properties with owners
- [ ] Dropdown only lists the property's co-owners
- [ ] Defaults to the current logged-in user if they are an owner
- [ ] Paid By is optional for income transactions (income comes from tenants)
- [ ] paidByUserId must be a valid property owner (server-side validation)

**Priority:** High
**Complexity:** Small
**Epic:** Transaction Splits

### US-007: Customize transaction splits

**As a** Property Owner, **I want** to override the default ownership split on a specific transaction, **so that** I can handle cases where costs are shared differently.

**Acceptance Criteria:**
- [ ] Split percentages are editable per-transaction in the transaction form
- [ ] Amounts recalculate in real-time as percentages are changed
- [ ] Customized splits show a visual indicator distinguishing them from defaults
- [ ] Percentages must still sum to 100% (validation enforced)
- [ ] Split section is collapsed by default to reduce clutter for the common case

**Priority:** Medium
**Complexity:** Medium
**Epic:** Transaction Splits

### US-008: View transaction splits on existing transactions

**As a** Property Owner, **I want** to see how an existing transaction was split between owners, **so that** I can verify the amounts are correct.

**Acceptance Criteria:**
- [ ] Transaction detail/list includes split information for each owner
- [ ] Shows each owner's percentage and amount
- [ ] Shows who paid the transaction
- [ ] Splits are visible when editing a transaction

**Priority:** Medium
**Complexity:** Small
**Epic:** Transaction Splits

## Epic: Balance Tracking

### US-009: View running balances between co-owners

**As a** Property Owner, **I want** to see how much each co-owner owes or is owed on a property, **so that** I know who needs to settle up.

**Acceptance Criteria:**
- [ ] Property detail page shows a balances section with pairwise balances (e.g. "Bob owes Alice: £1,250")
- [ ] Balances are calculated from transaction splits (who paid vs who owes) and settlements
- [ ] Balances are sorted by amount with largest debts first
- [ ] Balance of £0 between two owners is either hidden or shown as "Settled"

**Priority:** High
**Complexity:** Medium
**Epic:** Balance Tracking

### US-010: Balance calculation considers both splits and settlements

**As a** Property Owner, **I want** balances to account for all transactions and past settlements, **so that** the amounts shown are accurate.

**Acceptance Criteria:**
- [ ] When owner A pays an expense, other owners' split amounts are added to what they owe A
- [ ] Recorded settlements reduce the outstanding balance between the two parties
- [ ] Income transactions split correctly (each owner's share attributed to them)
- [ ] Balances recalculate after any transaction or settlement is created, edited, or deleted

**Priority:** High
**Complexity:** Large
**Epic:** Balance Tracking

### US-011: View my current balance as the logged-in user

**As a** Property Owner, **I want** to quickly see whether I owe money or am owed money on a property, **so that** I can decide whether to initiate a settlement.

**Acceptance Criteria:**
- [ ] Current user's balance is visually prominent (e.g. a balance card)
- [ ] Clearly states direction: "You are owed £400" or "You owe £400"
- [ ] Balance is shown per co-owner so I know exactly who to settle with

**Priority:** Medium
**Complexity:** Small
**Epic:** Balance Tracking

## Epic: Settlement Management

### US-012: Record a settlement between co-owners

**As a** Property Owner, **I want** to record when money changes hands between co-owners, **so that** the running balances stay accurate.

**Acceptance Criteria:**
- [ ] "Record Settlement" button on the property detail page opens a settlement form
- [ ] Form includes: From (who is paying), To (who is being paid), Amount, Date, Notes (optional)
- [ ] Amount field suggests the current outstanding balance as a default
- [ ] Date defaults to today
- [ ] Cannot settle with yourself (fromUserId !== toUserId validated)
- [ ] Balances recalculate immediately after saving

**Priority:** High
**Complexity:** Medium
**Epic:** Settlement Management

### US-013: View settlement history for a property

**As a** Property Owner, **I want** to see a history of all settlements on a property, **so that** I have an audit trail of payments between owners.

**Acceptance Criteria:**
- [ ] Settlement history table shown below the balances section
- [ ] Columns: Date, From, To, Amount, Notes
- [ ] Sorted by date (most recent first)
- [ ] All co-owners can view the full settlement history for properties they own

**Priority:** Medium
**Complexity:** Small
**Epic:** Settlement Management

### US-014: Warn when settling more than owed

**As a** Property Owner, **I want** to be warned if I record a settlement for more than the outstanding balance, **so that** I don't accidentally overpay.

**Acceptance Criteria:**
- [ ] Warning displayed (not blocking) if settlement amount exceeds the current balance between the two parties
- [ ] Message: "You're settling £X but [owner] only owes you £Y"
- [ ] User can still proceed — warning only, not a hard block
- [ ] Settlement is recorded at the entered amount regardless

**Priority:** Low
**Complexity:** Small
**Epic:** Settlement Management

## Epic: Per-Owner Reporting

### US-015: Generate a per-owner profit & loss report

**As a** Property Owner, **I want** to see a profit & loss report showing only my share of income and expenses, **so that** I have accurate figures for tax filing.

**Acceptance Criteria:**
- [ ] Report shows income and expenses broken down by category
- [ ] Amounts reflect the owner's split percentage, not the full transaction amounts
- [ ] Both the owner's share and the total amount are shown for transparency (e.g. "Rent: £12,000 (60% of £20,000)")
- [ ] Net profit/loss is calculated as owner's income share minus owner's expense share
- [ ] Balance summary with other co-owners shown at the bottom

**Priority:** High
**Complexity:** Large
**Epic:** Per-Owner Reporting

### US-016: Filter P&L report by property and date range

**As a** Property Owner, **I want** to filter my P&L report by property and date range, **so that** I can generate reports for specific tax periods or properties.

**Acceptance Criteria:**
- [ ] Filter by property (single property or all properties)
- [ ] Filter by date range (start date, end date)
- [ ] Filters apply to all figures in the report
- [ ] Default date range is the current calendar year

**Priority:** High
**Complexity:** Medium
**Epic:** Per-Owner Reporting

### US-017: View aggregated P&L across multiple properties

**As a** Property Owner, **I want** to see a combined P&L report across all properties I co-own, **so that** I can see my total rental income and expenses in one place.

**Acceptance Criteria:**
- [ ] When "All Properties" is selected, report aggregates across all properties the user owns
- [ ] Each property's contribution is shown separately with its ownership percentage
- [ ] Total income, total expenses, and net profit are summed across all properties
- [ ] Balances section shows net position across all properties

**Priority:** Medium
**Complexity:** Medium
**Epic:** Per-Owner Reporting

### US-018: Admin can view any owner's P&L report

**As an** Admin, **I want** to view P&L reports for any property owner, **so that** I can review financials across the entire portfolio.

**Acceptance Criteria:**
- [ ] Admin can select any user from an owner filter on the report page
- [ ] Report generates using the selected owner's split percentages
- [ ] Non-admin users can only view their own reports
- [ ] Viewers have read-only access to their own reports

**Priority:** Medium
**Complexity:** Small
**Epic:** Per-Owner Reporting

## Summary

| ID | Story | Priority | Complexity | Epic |
|----|-------|----------|------------|------|
| US-001 | Add co-owners to a property | High | Medium | Property Ownership Configuration |
| US-002 | Edit ownership percentages | Medium | Small | Property Ownership Configuration |
| US-003 | Remove a co-owner from a property | Medium | Small | Property Ownership Configuration |
| US-004 | Properties without owners work normally | High | Small | Property Ownership Configuration |
| US-005 | Auto-generate splits from ownership | High | Medium | Transaction Splits |
| US-006 | Specify who paid for an expense | High | Small | Transaction Splits |
| US-007 | Customize transaction splits | Medium | Medium | Transaction Splits |
| US-008 | View transaction splits on existing transactions | Medium | Small | Transaction Splits |
| US-009 | View running balances between co-owners | High | Medium | Balance Tracking |
| US-010 | Balance calculation considers splits and settlements | High | Large | Balance Tracking |
| US-011 | View my current balance as logged-in user | Medium | Small | Balance Tracking |
| US-012 | Record a settlement between co-owners | High | Medium | Settlement Management |
| US-013 | View settlement history for a property | Medium | Small | Settlement Management |
| US-014 | Warn when settling more than owed | Low | Small | Settlement Management |
| US-015 | Generate a per-owner P&L report | High | Large | Per-Owner Reporting |
| US-016 | Filter P&L report by property and date range | High | Medium | Per-Owner Reporting |
| US-017 | View aggregated P&L across multiple properties | Medium | Medium | Per-Owner Reporting |
| US-018 | Admin can view any owner's P&L report | Medium | Small | Per-Owner Reporting |
