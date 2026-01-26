# Multi-Owner Property Management Design

**Date:** 2026-01-26
**Status:** Approved

## Overview

This design adds support for properties with multiple beneficial owners, where profits and expenses need to be split between multiple people. The system will track ownership percentages, attribute transactions to specific payers, calculate running balances, and generate per-owner profit/loss reports.

## Target Use Case

Landlords who:
- Own properties in beneficial ownership with partners
- Need to split income and expenses according to ownership percentages
- Want to track who actually pays expenses vs who should pay their share
- Need individual profit/loss reports for tax filing
- Want to track and settle debts between owners

## Design Decisions

### 1. Ownership Model
**Approach:** Flexible per-transaction ownership
- Ownership percentages set at property level (defaults)
- Transactions inherit these defaults but can be overridden per-transaction
- Handles real-world scenarios where splits may vary (e.g., one owner covers specific costs)

### 2. Payment Tracking
**Approach:** Single payer with automatic settlement tracking
- Record who paid the full transaction amount
- System calculates what each owner owes based on their split percentage
- Tracks running balance of "who owes who"
- Example: Alice pays £1000 repair on 60/40 property, Bob owes Alice £400

### 3. Ownership Configuration
**Approach:** Property-level defaults with transaction override
- Set default ownership percentages at property level
- Transactions inherit property's ownership split
- Can override on per-transaction basis if needed
- Simple setup, covers most cases while maintaining flexibility

### 4. Tax Reporting
**Approach:** Pre-tax reporting only
- Reports show each owner's share of income and expenses
- Calculate net profit/loss per owner
- Users handle tax calculations separately with their accountants
- System focuses on accurate income/expense tracking

### 5. Settlement Tracking
**Approach:** Manual settlement records
- System displays running balances between owners
- Users record settlements when money changes hands
- Settlement transactions adjust running balances
- Clear audit trail of all settlements

### 6. Owner-User Relationship
**Approach:** Owners are system users
- Property owners must be users in the system
- Ownership links User to Property with percentage
- Each owner can log in and see their properties
- Integrates with existing authentication and permissions

## Data Model

### New Models

#### PropertyOwnership
Links users to properties with their ownership percentage.

```prisma
model PropertyOwnership {
  id                  String   @id @default(uuid())
  userId              String   @map("user_id")
  propertyId          String   @map("property_id")
  ownershipPercentage Float    @map("ownership_percentage")
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  property Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)

  @@unique([userId, propertyId])
  @@map("property_ownership")
}
```

**Validation:**
- `ownershipPercentage` must be between 0.01 and 100
- Sum of all ownership percentages for a property must equal 100%

#### TransactionSplit
Defines how a specific transaction is split among owners.

```prisma
model TransactionSplit {
  id            String   @id @default(uuid())
  transactionId String   @map("transaction_id")
  userId        String   @map("user_id")
  percentage    Float
  amount        Float
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  transaction Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([transactionId, userId])
  @@map("transaction_splits")
}
```

**Behavior:**
- Created automatically when transaction is saved (copying from PropertyOwnership defaults)
- Can be manually overridden before saving transaction
- `amount` field caches the calculated split: `transaction.amount * (percentage / 100)`

#### Settlement
Tracks when owners settle their debts.

```prisma
model Settlement {
  id             String   @id @default(uuid())
  fromUserId     String   @map("from_user_id")
  toUserId       String   @map("to_user_id")
  propertyId     String   @map("property_id")
  amount         Float
  settlementDate DateTime @map("settlement_date")
  notes          String?
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  fromUser User     @relation("SettlementsFrom", fields: [fromUserId], references: [id], onDelete: Cascade)
  toUser   User     @relation("SettlementsTo", fields: [toUserId], references: [id], onDelete: Cascade)
  property Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)

  @@map("settlements")
}
```

**Purpose:**
- Records money changing hands between owners
- Adjusts running balance calculations
- Provides audit trail of all settlements

### Modified Models

#### Transaction
Add field to track who actually paid the transaction.

```prisma
model Transaction {
  // ... existing fields ...
  paidByUserId String? @map("paid_by_user_id")

  paidBy User? @relation(fields: [paidByUserId], references: [id], onDelete: SetNull)
  splits TransactionSplit[]

  // ... rest of model ...
}
```

**New behavior:**
- `paidByUserId` identifies who physically paid the money
- Required for expenses, optional for income (income typically "paid by" the tenant/lease)
- Must be one of the property owners

#### User
Add relations for ownership and settlements.

```prisma
model User {
  // ... existing fields ...

  propertyOwnerships PropertyOwnership[]
  transactionSplits  TransactionSplit[]
  paidTransactions   Transaction[]
  settlementsFrom    Settlement[] @relation("SettlementsFrom")
  settlementsTo      Settlement[] @relation("SettlementsTo")

  // ... rest of model ...
}
```

#### Property
Add relation to ownerships and settlements.

```prisma
model Property {
  // ... existing fields ...

  ownerships  PropertyOwnership[]
  settlements Settlement[]

  // ... rest of model ...
}
```

## Balance Calculation Logic

### Per-Transaction Calculation

For each transaction, calculate what each owner owes:

**Example:**
- Transaction amount: £1,000 (expense)
- Ownership split: Alice 60%, Bob 40%
- Paid by: Alice
- Calculation:
  - Alice's split: £600 (60% of £1,000)
  - Bob's split: £400 (40% of £1,000)
  - Alice paid: £1,000
  - Result: Bob owes Alice £400 (his £400 share - £0 paid)

### Running Balance Calculation

Aggregate across all transactions and settlements for a property:

```typescript
function calculateBalance(propertyId: string, userA: string, userB: string): number {
  // Amount userB owes userA
  let balance = 0;

  // For all transactions on this property:
  for (const transaction of transactions) {
    const userASplit = transaction.splits.find(s => s.userId === userA);
    const userBSplit = transaction.splits.find(s => s.userId === userB);

    if (transaction.paidByUserId === userA && userBSplit) {
      // A paid, B had a split -> B owes A
      balance += userBSplit.amount;
    } else if (transaction.paidByUserId === userB && userASplit) {
      // B paid, A had a split -> A owes B (negative)
      balance -= userASplit.amount;
    }
  }

  // Subtract settlements from B to A
  balance -= sumSettlements(fromUserId: userB, toUserId: userA);

  // Add settlements from A to B (if B paid A back, that's negative for B's debt)
  balance += sumSettlements(fromUserId: userA, toUserId: userB);

  return balance;
}
```

### Balance View

For a property with multiple owners, show pairwise balances:
- "Bob owes Alice: £1,250"
- "Charlie owes Alice: £300"
- "Bob owes Charlie: £150"

This avoids complex multi-party netting (simpler to understand and settle).

### Settlement Effect

When Bob pays Alice £1,250:
1. Create Settlement record: `{ fromUserId: Bob, toUserId: Alice, amount: 1250 }`
2. Recalculate balance: now shows £0 owed
3. Historical settlements visible for audit trail

## Profit & Loss Reporting

### Per-Owner P&L Report

Generate profit/loss statements filtered by owner and date range.

**Report Structure:**
```
Property: 123 Main Street
Owner: Alice Johnson (60% ownership)
Period: Jan 1 - Dec 31, 2025

INCOME
  Rent: £12,000 (60% of £20,000 total)
  Late Fees: £180 (60% of £300 total)
  Total Income: £12,180

EXPENSES
  Mortgage: £6,000 (60% of £10,000 total)
  Repairs: £900 (60% of £1,500 total)
  Insurance: £360 (60% of £600 total)
  Total Expenses: £7,260

NET PROFIT: £4,920

BALANCE WITH OTHER OWNERS
  Bob owes you: £1,250
```

**Key Features:**
- Filter by property, owner, date range
- Show both owner's share and total amounts (transparency)
- Breakdown by category (matches tax categories)
- Include balance summary at bottom
- Export to CSV/PDF for accountants

### Multi-Property Aggregation

Allow viewing aggregated P&L across all properties for one owner.

**Use case:** User owns 60% of Property A and 40% of Property B - wants combined P&L.

**Report Structure:**
```
All Properties - Alice Johnson
Period: Jan 1 - Dec 31, 2025

INCOME
  Property A (60%): £12,180
  Property B (40%): £8,400
  Total Income: £20,580

EXPENSES
  Property A (60%): £7,260
  Property B (40%): £5,200
  Total Expenses: £12,460

NET PROFIT: £8,120

BALANCES
  Property A: Bob owes you £1,250
  Property B: You owe Charlie £300
  Net: £950 in your favor
```

## User Interface & Workflows

### Property Setup - Ownership Configuration

On property create/edit page, add "Ownership" section:

**UI Elements:**
- "Add Owner" button
- List of owners with:
  - User selector (dropdown/autocomplete of existing users)
  - Percentage input (numeric, 0-100)
  - Remove button
- Validation indicator: "Total: 95% - Must equal 100%"
- Save disabled until percentages sum to 100%

**Edge Cases:**
- Show warning if property has no owners set
- Allow saving property without owners (for migration/setup in progress)
- Block transactions on properties without owners

### Transaction Create/Edit Flow

**Step-by-step:**

1. **Select Property** (existing field)
   - Loads default ownership splits from PropertyOwnership

2. **Core Transaction Fields** (existing)
   - Type: Income/Expense
   - Category: dropdown
   - Amount: numeric input
   - Date: date picker
   - Description: text area

3. **Paid By Field** (new)
   - Dropdown of property owners only
   - Required for expenses
   - Optional for income (defaults to null/"tenant")

4. **Ownership Split Section** (new, expandable)
   - Collapsed by default with summary: "Split: Alice 60%, Bob 40%"
   - Expand to show detailed split:
     - Each owner listed with percentage and calculated amount
     - Example: "Alice: 60% = £600"
     - Editable percentages with real-time amount recalculation
     - Warning badge if overridden from property defaults
   - Validation: percentages must sum to 100%

5. **Save**
   - Creates Transaction record
   - Creates TransactionSplit records for each owner

**UX Considerations:**
- Most users won't need to change splits (use defaults)
- Keep split section collapsed to reduce cognitive load
- Show clear visual indicator when splits are customized
- Validate on blur and on submit

### Settlement Recording

**Location:** Property detail page, new "Settlements" tab or "Balances" section

**Balance Display:**
- Card/section showing current balances:
  ```
  Balances
  Bob owes Alice: £1,250
  Alice owes Charlie: £300
  ```
- Sorted by amount (largest debts first)

**Settlement Form:**
- "Record Settlement" button opens modal/form
- Fields:
  - From: dropdown (users who owe money)
  - To: dropdown (users who are owed money)
  - Amount: numeric input with suggested amount (current balance)
  - Date: date picker (defaults to today)
  - Notes: optional text area
- Save button creates Settlement record
- Success message + balances recalculate

**Settlement History:**
- Table below balances showing past settlements
- Columns: Date, From, To, Amount, Notes
- Filterable/searchable

### Owner Dashboard

Each user sees personalized dashboard when they log in.

**Sections:**

1. **My Properties**
   - Cards for each property they own
   - Shows: Property name, ownership percentage, current balance
   - Click to view property detail

2. **Current Balances**
   - Aggregated view: "You are owed: £1,250" or "You owe: £300"
   - Expandable to see breakdown per property and per person

3. **Recent Activity**
   - Recent transactions that affect this user
   - Shows: Property, transaction type, their split amount, who paid

4. **Quick P&L Summary**
   - Year-to-date income, expenses, net profit across all properties
   - Link to detailed P&L reports

## Validation & Business Rules

### Validation Rules (Zod Schemas)

Located in `shared/validation/`:

#### PropertyOwnership Validation

```typescript
// propertyOwnership.validation.ts
import { z } from 'zod';

export const PropertyOwnershipCreateSchema = z.object({
  userId: z.string().uuid(),
  propertyId: z.string().uuid(),
  ownershipPercentage: z.number()
    .min(0.01, 'Ownership must be at least 0.01%')
    .max(100, 'Ownership cannot exceed 100%'),
});

export const PropertyOwnershipUpdateSchema = PropertyOwnershipCreateSchema.partial();

// Server-side aggregate validation
export function validateOwnershipSum(ownerships: Array<{ percentage: number }>): boolean {
  const sum = ownerships.reduce((acc, o) => acc + o.ownershipPercentage, 0);
  return Math.abs(sum - 100) < 0.01; // Allow for floating point precision
}
```

#### TransactionSplit Validation

```typescript
// transactionSplit.validation.ts
import { z } from 'zod';

export const TransactionSplitSchema = z.object({
  userId: z.string().uuid(),
  percentage: z.number()
    .min(0.01, 'Split must be at least 0.01%')
    .max(100, 'Split cannot exceed 100%'),
  amount: z.number().positive(),
});

export const TransactionWithSplitsSchema = z.object({
  // ... existing transaction fields ...
  paidByUserId: z.string().uuid().nullable(),
  splits: z.array(TransactionSplitSchema)
    .min(1, 'At least one split required')
    .refine(
      (splits) => {
        const sum = splits.reduce((acc, s) => acc + s.percentage, 0);
        return Math.abs(sum - 100) < 0.01;
      },
      { message: 'Split percentages must sum to 100%' }
    ),
});
```

#### Settlement Validation

```typescript
// settlement.validation.ts
import { z } from 'zod';

export const SettlementCreateSchema = z.object({
  fromUserId: z.string().uuid(),
  toUserId: z.string().uuid(),
  propertyId: z.string().uuid(),
  amount: z.number().positive('Amount must be positive'),
  settlementDate: z.coerce.date(),
  notes: z.string().optional(),
}).refine(
  (data) => data.fromUserId !== data.toUserId,
  { message: 'Cannot settle with yourself' }
);
```

### Business Rules

#### Ownership Changes
- **Can't delete owner if they have transaction splits or settlements**
  - Show error: "Cannot remove owner with existing transactions"
  - Suggest: Transfer ownership to 0% instead, or delete/reassign transactions first

- **Changing ownership percentage with unsettled balances**
  - Show warning: "This property has unsettled balances. Changing ownership will not affect past transactions."
  - Require confirmation checkbox: "I understand this only affects future transactions"

#### Historical Integrity
- **Existing transaction splits are NOT retroactively changed**
  - When property ownership changes, past transactions remain as-is
  - Maintains historical accuracy and audit trail
  - New transactions use updated ownership percentages

- **Editing transactions with settlements**
  - Show warning: "This transaction has related settlements. Editing may affect balances."
  - Still allow edit (users may need to fix mistakes)
  - Recalculate balances after save

#### Transaction Rules
- **Paid By validation**
  - `paidByUserId` must be one of the property owners
  - For income transactions, can be null (income comes from tenant/lease)
  - For expense transactions, required (someone had to pay)

- **Split ownership validation**
  - All `userId` values in splits must be property owners
  - If property owners change, can't create transaction with non-owner splits

#### Settlement Rules
- **Amount validation**
  - Must be positive
  - Warn (don't block) if settling more than owed: "You're settling £1,500 but Bob only owes you £1,250"

- **User validation**
  - Both `fromUserId` and `toUserId` must be property owners
  - Must be different users

### Permission Rules

Using existing permission system (OWNER, EDITOR, VIEWER):

#### Property Ownership Management
- **OWNER/ADMIN:**
  - Can add/edit/remove property owners
  - Can change ownership percentages
  - Can view all properties and all owner information

- **EDITOR:**
  - Cannot modify property ownership
  - Can view ownership information for properties they own

- **VIEWER:**
  - Can view ownership information for properties they own
  - Read-only access

#### Transaction Management
- **OWNER/ADMIN:**
  - Can create/edit/delete any transaction
  - Can override ownership splits on any transaction

- **EDITOR:**
  - Can create transactions on properties they own
  - Can edit their own transactions
  - Can override splits on transactions they create

- **VIEWER:**
  - Read-only access to transactions

#### Settlement Management
- **OWNER/ADMIN:**
  - Can record settlements between any owners
  - Can delete/edit settlements

- **EDITOR:**
  - Can record settlements involving themselves
  - Can edit settlements they created

- **VIEWER:**
  - Can view settlements involving themselves
  - Cannot create settlements

#### Reporting
- **All Users:**
  - Can view their own P&L reports (for properties they own)
  - Can view balances for properties they own
  - Can export their own reports

- **OWNER/ADMIN:**
  - Can view any owner's P&L reports
  - Can view all balances
  - Full report access

## Implementation Phases

### Phase 1: Data Model & API
1. Create database migrations for new models
2. Add Zod validation schemas
3. Create API endpoints:
   - `POST /api/properties/:id/owners` - Add owner
   - `PUT /api/properties/:id/owners/:userId` - Update ownership %
   - `DELETE /api/properties/:id/owners/:userId` - Remove owner
   - `GET /api/properties/:id/balances` - Get balance calculations
   - `POST /api/settlements` - Record settlement
   - `GET /api/reports/profit-loss` - P&L report with owner filter

### Phase 2: Transaction Splits
1. Modify transaction creation/edit to handle splits
2. Auto-generate splits from property ownership defaults
3. Allow split override in transaction form
4. Update existing transaction validation

### Phase 3: Balance Calculations
1. Implement balance calculation service
2. Create balance view components
3. Add settlement recording UI
4. Display balances on property detail page

### Phase 4: Reporting
1. Build per-owner P&L report generator
2. Create report UI with filters (owner, property, date range)
3. Add export functionality (CSV/PDF)
4. Multi-property aggregation view

### Phase 5: Owner Dashboard
1. Create personalized dashboard for property owners
2. My Properties section
3. Current balances widget
4. Recent activity feed
5. Quick P&L summary

## Migration Strategy

For existing properties without owners:

1. **Optional migration script:**
   - Prompt: "Assign default owner to all properties?"
   - Creates PropertyOwnership with 100% for selected user
   - Leaves properties unowned if user skips

2. **Graceful degradation:**
   - Properties without owners function as before
   - Show banner on property detail: "Add owners to enable profit splitting"
   - Transactions on properties without owners work normally (no splits)

3. **No breaking changes:**
   - Existing transactions continue working
   - `paidByUserId` is nullable (existing transactions have null)
   - TransactionSplits are optional (only created for owned properties)

## Testing Strategy

### Unit Tests
- Balance calculation logic with various scenarios
- Split percentage validation
- Settlement effect on balances
- P&L report calculations

### Integration Tests
- Property ownership CRUD with validation
- Transaction creation with splits
- Settlement recording and balance updates
- Report generation with real data

### Edge Cases to Test
- Property with 3+ owners
- Ownership changes mid-period (historical integrity)
- Multiple settlements between same users
- Floating point precision in percentages (99.99% vs 100%)
- Deleting owner with existing data
- Editing old transactions after settlements

## Open Questions / Future Enhancements

### Potential Future Features (Not in Scope)
1. **Multi-party netting:** Calculate optimal settlements (minimize transactions)
2. **Settlement reminders:** Email notifications when balances exceed threshold
3. **Payment integration:** Link settlements to actual bank transfers
4. **Tax rate tracking:** Store tax rates per owner for estimation (explicitly deferred)
5. **Historical ownership:** Track ownership changes over time with effective dates
6. **Ownership transfer:** Transfer ownership percentage to another user
7. **Property groups:** Group properties into portfolios with aggregate reporting

### Questions to Validate During Implementation
1. Should settlements require approval from both parties?
2. Should we prevent editing transactions after X days?
3. How to handle property sale/dissolution (final settlement)?
4. Should balance calculations cache results or compute on-demand?

## Success Metrics

Post-launch, track:
- Number of properties with multiple owners
- Average number of owners per property
- Frequency of settlement recordings
- P&L report generation (per-owner vs. property-level)
- User feedback on balance calculation accuracy

---

**Document Status:** Approved and ready for implementation
**Next Steps:** Create implementation plan and begin Phase 1 (Data Model & API)
