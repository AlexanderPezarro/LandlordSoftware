# UAT Plan: Multi-Owner Property Management

**User stories:** docs/plans/2026-02-22-multi-owner-property-management-user-stories.md
**Design document:** docs/plans/2026-01-26-multi-owner-property-management-design.md
**Date:** 2026-02-22
**PR:** #8 — Add multi-owner property management feature

## Test Environment

- **Start app:** `npm run dev`
- **Seed data:** `npm run db:seed`
- **Reset database:** `npm run db:reset && npm run db:seed`
- **Base URL:** http://localhost:5173

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | admin123 |
| Landlord | landlord@example.com | landlord123 |
| Viewer | viewer@example.com | viewer123 |

## Test Properties (from seed data)

| Property | City | Status |
|----------|------|--------|
| Sunset Apartments - Unit 1A | Manchester | Occupied |
| Oak Street House | Birmingham | Occupied |
| River View Flat | Leeds | Occupied |
| Garden Cottage | Liverpool | Vacant |
| City Centre Studio | Bristol | Occupied |
| Parkside Terrace - Unit 3 | Sheffield | Occupied |
| Hillside Bungalow | Newcastle | Under Maintenance |

## Scenarios

### Epic: Property Ownership Configuration

#### UAT-001: Add two co-owners to a property with 60/40 split

**User Story:** US-001 — Add co-owners to a property
**Acceptance Criteria Tested:** AC-1, AC-2, AC-3, AC-4, AC-5

**Preconditions:**
- Database seeded with `npm run db:seed`
- Logged in as admin@example.com (Admin role)
- "Sunset Apartments - Unit 1A" has no owners configured

**Steps:**
1. Navigate to http://localhost:5173/properties
2. Click on "Sunset Apartments - Unit 1A" to open the property detail page
3. Locate the "Ownership" section on the property detail/edit page
4. Click "Add Owner"
5. Select "admin@example.com" from the user dropdown
6. Enter "60" in the ownership percentage field
7. Click "Add Owner" again
8. Select "landlord@example.com" from the user dropdown
9. Enter "40" in the ownership percentage field
10. Observe the validation indicator showing "Total: 100%"
11. Click "Save" to save the ownership configuration

**Expected Results:**
- After step 6: Validation indicator shows "Total: 60%" and save is disabled
- After step 9: Validation indicator shows "Total: 100%"
- After step 10: Save button becomes enabled
- After step 11: Ownership is saved successfully; page shows two owners listed with their percentages

**Edge Cases:**
- Enter "60" for first owner and "50" for second owner (total 110%): Save should remain disabled, validation shows error
- Enter "0" as a percentage: Validation error shown (minimum 0.01%)
- Try to add the same user twice: Should show error or prevent duplicate selection

---

#### UAT-002: Edit ownership percentages on a property

**User Story:** US-002 — Edit ownership percentages
**Acceptance Criteria Tested:** AC-1, AC-4

**Preconditions:**
- UAT-001 completed (Sunset Apartments has admin@example.com 60%, landlord@example.com 40%)
- Logged in as admin@example.com

**Steps:**
1. Navigate to http://localhost:5173/properties
2. Click on "Sunset Apartments - Unit 1A"
3. Locate the "Ownership" section
4. Change admin@example.com's percentage from "60" to "70"
5. Observe the validation indicator (should show total != 100%)
6. Change landlord@example.com's percentage from "40" to "30"
7. Observe the validation indicator (should show total = 100%)
8. Click "Save"

**Expected Results:**
- After step 5: Total shows "110%" or similar, save disabled
- After step 7: Total shows "100%", save enabled
- After step 8: Updated percentages are saved and displayed correctly

**Edge Cases:**
- Change one percentage without adjusting the other: Save should remain disabled until total = 100%

---

#### UAT-003: Remove a co-owner from a property

**User Story:** US-003 — Remove a co-owner from a property
**Acceptance Criteria Tested:** AC-1, AC-2

**Preconditions:**
- Property has two owners configured (no transactions or settlements yet for clean removal)
- Logged in as admin@example.com

**Steps:**
1. Navigate to http://localhost:5173/properties
2. Click on a property with two configured owners (e.g. "Oak Street House" after setting up owners)
3. Locate the "Ownership" section
4. Click the remove button next to one of the owners
5. Observe the result

**Expected Results:**
- After step 4: Owner is removed from the list
- Remaining owner's percentage needs adjustment to sum to 100%
- If the owner has existing transaction splits or settlements, an error message is shown and removal is blocked

**Edge Cases:**
- Try removing an owner who has transaction splits: Error shown, removal blocked
- Try removing an owner who has settlements: Error shown, removal blocked

---

#### UAT-004: Property without owners functions normally

**User Story:** US-004 — Properties without owners work normally
**Acceptance Criteria Tested:** AC-1, AC-2, AC-3, AC-4

**Preconditions:**
- Database seeded with `npm run db:seed`
- Logged in as admin@example.com
- "Garden Cottage" has no owners configured

**Steps:**
1. Navigate to http://localhost:5173/properties
2. Click on "Garden Cottage" (a property with no owners)
3. Observe the property detail page — look for ownership section
4. Navigate to http://localhost:5173/transactions
5. Click "New Transaction"
6. Select "Garden Cottage" as the property
7. Fill in: Type = "Expense", Category = "Maintenance", Amount = "500", Date = today, Description = "Plumbing repair"
8. Observe whether a split section appears
9. Click "Create" to save the transaction

**Expected Results:**
- After step 3: Property page shows a banner or message suggesting "Add owners to enable profit splitting"
- After step 6: No ownership split section appears in the transaction form
- After step 8: No "Paid By" dropdown or split section is shown
- After step 9: Transaction is created successfully without any splits

---

### Epic: Transaction Splits

#### UAT-005: Auto-generate splits when creating a transaction on an owned property

**User Story:** US-005 — Auto-generate splits from ownership
**Acceptance Criteria Tested:** AC-1, AC-2, AC-3, AC-4

**Preconditions:**
- "Sunset Apartments - Unit 1A" has owners: admin@example.com (60%), landlord@example.com (40%)
- Logged in as admin@example.com

**Steps:**
1. Navigate to http://localhost:5173/transactions
2. Click "New Transaction"
3. Select "Sunset Apartments - Unit 1A" as the property
4. Observe the split section that appears
5. Set Type = "Expense", Category = "Maintenance"
6. Enter "1000" in the Amount field
7. Observe the split amounts update
8. Fill in Date = today, Description = "Boiler repair"
9. Click "Create"

**Expected Results:**
- After step 4: Split section appears showing admin@example.com and landlord@example.com with their ownership percentages
- After step 7: Splits show admin@example.com: 60% = £600.00 and landlord@example.com: 40% = £400.00
- After step 9: Transaction is created with two TransactionSplit records matching the ownership percentages

**Edge Cases:**
- Change amount from "1000" to "1500": Split amounts should update in real-time to £900 and £600

---

#### UAT-006: Specify who paid for an expense transaction

**User Story:** US-006 — Specify who paid for an expense
**Acceptance Criteria Tested:** AC-1, AC-2, AC-3, AC-4

**Preconditions:**
- "Sunset Apartments - Unit 1A" has owners: admin@example.com (60%), landlord@example.com (40%)
- Logged in as admin@example.com

**Steps:**
1. Navigate to http://localhost:5173/transactions
2. Click "New Transaction"
3. Select "Sunset Apartments - Unit 1A" as the property
4. Set Type = "Expense"
5. Observe the "Paid By" dropdown
6. Verify it defaults to admin@example.com (the logged-in user)
7. Open the dropdown and verify it only shows the two property owners
8. Change Type to "Income"
9. Observe whether the "Paid By" dropdown is still shown
10. Change Type back to "Expense"
11. Select "landlord@example.com" from the "Paid By" dropdown
12. Fill remaining fields: Category = "Repair", Amount = "500", Date = today, Description = "Window fix"
13. Click "Create"

**Expected Results:**
- After step 5: "Paid By" dropdown appears for expense type
- After step 6: Defaults to admin@example.com
- After step 7: Only admin@example.com and landlord@example.com are listed
- After step 9: "Paid By" dropdown is hidden or optional for income transactions
- After step 13: Transaction saved with paidByUserId = landlord@example.com

---

#### UAT-007: Customize transaction splits

**User Story:** US-007 — Customize transaction splits
**Acceptance Criteria Tested:** AC-1, AC-2, AC-3, AC-4, AC-5

**Preconditions:**
- "Sunset Apartments - Unit 1A" has owners: admin@example.com (60%), landlord@example.com (40%)
- Logged in as admin@example.com

**Steps:**
1. Navigate to http://localhost:5173/transactions
2. Click "New Transaction"
3. Select "Sunset Apartments - Unit 1A" as the property
4. Set Type = "Expense", Category = "Repair", Amount = "1000"
5. Observe the split section — should show default 60/40 split
6. Expand or interact with the split section to edit percentages
7. Change admin@example.com's split to "50"
8. Change landlord@example.com's split to "50"
9. Observe the amounts update (both should show £500.00)
10. Observe whether a visual indicator shows the split has been customized
11. Fill in Date = today, Description = "Shared equally repair", Paid By = admin@example.com
12. Click "Create"

**Expected Results:**
- After step 5: Default splits shown (60% / 40%)
- After step 9: Both amounts show £500.00
- After step 10: A visual indicator (badge, icon, or color change) shows the split differs from the property default
- After step 12: Transaction saved with 50/50 splits instead of the default 60/40

**Edge Cases:**
- Set splits to 70/40 (total 110%): Validation error, save disabled
- Set splits to 60/30 (total 90%): Validation error, save disabled

---

#### UAT-008: View splits on existing transactions

**User Story:** US-008 — View transaction splits on existing transactions
**Acceptance Criteria Tested:** AC-1, AC-2, AC-3, AC-4

**Preconditions:**
- Transaction created in UAT-005 exists (£1,000 boiler repair with 60/40 split)
- Logged in as admin@example.com

**Steps:**
1. Navigate to http://localhost:5173/transactions
2. Locate the "Boiler repair" transaction in the list
3. Observe whether split information is visible in the list view
4. Click to edit the transaction
5. Observe the split section in the edit form

**Expected Results:**
- After step 3: Transaction list shows split info or "Paid By" information
- After step 5: Edit form shows the existing splits (admin@example.com: 60% = £600, landlord@example.com: 40% = £400) and who paid

---

### Epic: Balance Tracking

#### UAT-009: View running balances between co-owners

**User Story:** US-009 — View running balances between co-owners
**Acceptance Criteria Tested:** AC-1, AC-2, AC-3, AC-4

**Preconditions:**
- "Sunset Apartments - Unit 1A" has owners: admin@example.com (60%), landlord@example.com (40%)
- At least one expense transaction exists where admin@example.com paid (e.g. £1,000 boiler repair from UAT-005)
- Logged in as admin@example.com

**Steps:**
1. Navigate to http://localhost:5173/properties
2. Click on "Sunset Apartments - Unit 1A"
3. Locate the "Balances" section on the property detail page
4. Observe the pairwise balance display

**Expected Results:**
- After step 4: Balance section shows "landlord@example.com owes admin@example.com: £400.00" (40% of the £1,000 expense that admin paid)
- Balances are calculated from transaction splits and who paid
- If balance is £0 between any pair, it is hidden or shown as "Settled"

---

#### UAT-010: Balance updates after multiple transactions

**User Story:** US-010 — Balance calculation considers both splits and settlements
**Acceptance Criteria Tested:** AC-1, AC-3, AC-4

**Preconditions:**
- "Sunset Apartments - Unit 1A" has owners and at least one expense (from UAT-005/009)
- Logged in as admin@example.com

**Steps:**
1. Navigate to http://localhost:5173/transactions
2. Create a new expense: Property = "Sunset Apartments", Type = "Expense", Category = "Insurance", Amount = "500", Paid By = landlord@example.com, Date = today, Description = "Building insurance"
3. Click "Create"
4. Navigate to http://localhost:5173/properties
5. Click on "Sunset Apartments - Unit 1A"
6. Check the balances section

**Expected Results:**
- After step 6: Balance should now reflect both transactions:
  - From first expense (£1,000 paid by admin): landlord owes admin £400
  - From second expense (£500 paid by landlord): admin owes landlord £300 (60% of £500)
  - Net: landlord owes admin £100 (£400 - £300)

---

#### UAT-011: View personal balance as logged-in user

**User Story:** US-011 — View my current balance as the logged-in user
**Acceptance Criteria Tested:** AC-1, AC-2, AC-3

**Preconditions:**
- Transactions exist from UAT-009 and UAT-010
- Logged in as admin@example.com

**Steps:**
1. Navigate to http://localhost:5173/properties
2. Click on "Sunset Apartments - Unit 1A"
3. Locate the balance card or summary for the current user

**Expected Results:**
- A prominent balance card or indicator shows the current user's position
- Shows direction clearly: "You are owed £100" (if landlord owes admin net £100)
- Shows the specific co-owner: "landlord@example.com owes you £100"

---

### Epic: Settlement Management

#### UAT-012: Record a settlement between co-owners

**User Story:** US-012 — Record a settlement between co-owners
**Acceptance Criteria Tested:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6

**Preconditions:**
- "Sunset Apartments - Unit 1A" has a non-zero balance between owners (from UAT-010)
- Logged in as admin@example.com

**Steps:**
1. Navigate to http://localhost:5173/properties
2. Click on "Sunset Apartments - Unit 1A"
3. Locate the balances/settlements section
4. Click "Record Settlement"
5. Observe the settlement form opens
6. Verify "From" dropdown contains the property owners
7. Select From = landlord@example.com, To = admin@example.com
8. Observe whether the Amount field is pre-populated with the outstanding balance
9. Verify Date defaults to today
10. Enter Notes = "Bank transfer for property expenses"
11. Click "Save" or "Record"
12. Observe the balances section after saving

**Expected Results:**
- After step 5: Form shows From, To, Amount, Date, Notes fields
- After step 8: Amount is suggested as the current balance (e.g. £100)
- After step 9: Date is today's date
- After step 12: Balance between the two owners is reduced (or shows £0 / "Settled")

**Edge Cases:**
- Set From and To to the same user: Validation error, save blocked
- Leave Amount empty or 0: Validation error

---

#### UAT-013: View settlement history

**User Story:** US-013 — View settlement history for a property
**Acceptance Criteria Tested:** AC-1, AC-2, AC-3, AC-4

**Preconditions:**
- Settlement recorded in UAT-012
- Logged in as admin@example.com

**Steps:**
1. Navigate to http://localhost:5173/properties
2. Click on "Sunset Apartments - Unit 1A"
3. Locate the settlement history section (below balances)
4. Observe the settlement history table

**Expected Results:**
- Table shows the settlement from UAT-012 with columns: Date, From, To, Amount, Notes
- Settlement shows: today's date, landlord@example.com, admin@example.com, £100, "Bank transfer for property expenses"
- Sorted by date with most recent first

---

#### UAT-014: Warning when settling more than owed

**User Story:** US-014 — Warn when settling more than owed
**Acceptance Criteria Tested:** AC-1, AC-2, AC-3, AC-4

**Preconditions:**
- "Sunset Apartments - Unit 1A" has a known balance between owners (e.g. landlord owes admin £100 after UAT-010, or £0 after UAT-012)
- Logged in as admin@example.com

**Steps:**
1. Navigate to http://localhost:5173/properties
2. Click on "Sunset Apartments - Unit 1A"
3. Click "Record Settlement"
4. Select From = landlord@example.com, To = admin@example.com
5. Enter Amount = "5000" (significantly more than owed)
6. Observe for a warning message
7. Click "Save" / "Record" to confirm

**Expected Results:**
- After step 6: Warning message displayed (e.g. "You're settling £5,000 but landlord@example.com only owes you £X")
- Warning is non-blocking — save button is still enabled
- After step 7: Settlement is recorded at the full £5,000 amount

---

### Epic: Per-Owner Reporting

#### UAT-015: Generate per-owner profit & loss report

**User Story:** US-015 — Generate a per-owner P&L report
**Acceptance Criteria Tested:** AC-1, AC-2, AC-3, AC-4, AC-5

**Preconditions:**
- "Sunset Apartments - Unit 1A" has owners and multiple transactions (from previous UATs)
- Logged in as admin@example.com

**Steps:**
1. Navigate to http://localhost:5173/finances/reports
2. Locate the P&L report section or per-owner report option
3. Select property = "Sunset Apartments - Unit 1A"
4. Select owner = admin@example.com (or the current user)
5. Observe the generated report

**Expected Results:**
- Report shows income and expenses broken down by category
- Amounts reflect admin's 60% share (not full transaction amounts)
- Both owner's share and total are shown (e.g. "Maintenance: £600 (60% of £1,000)")
- Net profit/loss is calculated correctly
- Balance summary with landlord@example.com is shown at the bottom

---

#### UAT-016: Filter P&L report by property and date range

**User Story:** US-016 — Filter P&L report by property and date range
**Acceptance Criteria Tested:** AC-1, AC-2, AC-3, AC-4

**Preconditions:**
- Multiple transactions exist across date ranges
- Logged in as admin@example.com

**Steps:**
1. Navigate to http://localhost:5173/finances/reports
2. Observe the default date range (should be current calendar year)
3. Select property = "Sunset Apartments - Unit 1A"
4. Set start date to 30 days ago
5. Set end date to today
6. Observe the report updates with filtered data
7. Change property to "All Properties"
8. Observe the report updates

**Expected Results:**
- After step 2: Date range defaults to current calendar year (2026-01-01 to 2026-12-31)
- After step 6: Report shows only transactions within the selected date range
- After step 8: Report aggregates across all properties the user owns

---

#### UAT-017: View aggregated P&L across multiple properties

**User Story:** US-017 — View aggregated P&L across multiple properties
**Acceptance Criteria Tested:** AC-1, AC-2, AC-3, AC-4

**Preconditions:**
- Admin owns shares in at least two properties (set up ownership on a second property, e.g. "Oak Street House" with admin 50%, landlord 50%)
- Transactions exist on both properties
- Logged in as admin@example.com

**Steps:**
1. First, set up ownership on "Oak Street House" (admin 50%, landlord 50%) and create a transaction
2. Navigate to http://localhost:5173/finances/reports
3. Select "All Properties" from the property filter
4. Observe the aggregated report

**Expected Results:**
- Report shows each property's contribution separately with ownership percentages
- "Sunset Apartments - Unit 1A" shows at 60% ownership
- "Oak Street House" shows at 50% ownership
- Total income, expenses, and net profit are summed across all properties
- Balance section shows net position across all properties

---

#### UAT-018: Admin views another owner's P&L report

**User Story:** US-018 — Admin can view any owner's P&L report
**Acceptance Criteria Tested:** AC-1, AC-2, AC-3, AC-4

**Preconditions:**
- Multiple owners have transactions on shared properties
- Logged in as admin@example.com

**Steps:**
1. Navigate to http://localhost:5173/finances/reports
2. Locate the owner filter/selector
3. Select "landlord@example.com" from the owner dropdown
4. Select property = "Sunset Apartments - Unit 1A"
5. Observe the report generates for landlord's perspective

**Expected Results:**
- After step 5: Report shows landlord@example.com's 40% share of income and expenses
- Amounts are calculated using landlord's split percentages
- Admin can see any owner's report

**Edge Cases:**
- Log in as landlord@example.com: Should only be able to see own reports, no owner selector to view other users' reports
- Log in as viewer@example.com: Read-only access to own reports only

---

## Summary

| UAT ID | Story | Scenario | Status |
|--------|-------|----------|--------|
| UAT-001 | US-001 | Add two co-owners with 60/40 split | pending |
| UAT-002 | US-002 | Edit ownership percentages | pending |
| UAT-003 | US-003 | Remove a co-owner | pending |
| UAT-004 | US-004 | Property without owners works normally | pending |
| UAT-005 | US-005 | Auto-generate splits on transaction creation | pending |
| UAT-006 | US-006 | Specify who paid for expense | pending |
| UAT-007 | US-007 | Customize transaction splits | pending |
| UAT-008 | US-008 | View splits on existing transactions | pending |
| UAT-009 | US-009 | View running balances between co-owners | pending |
| UAT-010 | US-010 | Balance updates after multiple transactions | pending |
| UAT-011 | US-011 | View personal balance as logged-in user | pending |
| UAT-012 | US-012 | Record a settlement | pending |
| UAT-013 | US-013 | View settlement history | pending |
| UAT-014 | US-014 | Warning when settling more than owed | pending |
| UAT-015 | US-015 | Generate per-owner P&L report | pending |
| UAT-016 | US-016 | Filter P&L by property and date range | pending |
| UAT-017 | US-017 | Aggregated P&L across multiple properties | pending |
| UAT-018 | US-018 | Admin views another owner's P&L | pending |

## Results

<!-- Filled in during execution -->
| UAT ID | Status | Notes |
|--------|--------|-------|
| UAT-001 | | |
| UAT-002 | | |
| UAT-003 | | |
| UAT-004 | | |
| UAT-005 | | |
| UAT-006 | | |
| UAT-007 | | |
| UAT-008 | | |
| UAT-009 | | |
| UAT-010 | | |
| UAT-011 | | |
| UAT-012 | | |
| UAT-013 | | |
| UAT-014 | | |
| UAT-015 | | |
| UAT-016 | | |
| UAT-017 | | |
| UAT-018 | | |
