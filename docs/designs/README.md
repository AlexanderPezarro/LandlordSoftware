# Reference Designs: Current MUI Layout Documentation

This document captures the exact layout, component inventory, and responsive behavior of every page in the application. It serves as the visual verification target for the MUI-to-SCSS migration. Every migrated page must match the structure, spacing, and behavior described here.

> **Breakpoint reference (MUI defaults):**
> - `xs`: 0px+
> - `sm`: 600px+
> - `md`: 900px+
> - `lg`: 1200px+
> - `xl`: 1536px+

---

## Layout Shell

**Source:** `client/src/components/Layout.tsx`

### Structure

```
Box (display: flex)
  +-- CssBaseline
  +-- AppBar (position: fixed)
  |     +-- Toolbar
  |           +-- IconButton (hamburger, md:hidden)
  |           +-- Typography "Landlord Management System" (flexGrow:1)
  |           +-- Box (flex, alignItems:center, gap:2)
  |                 +-- Typography user.email (xs:hidden, sm:block)
  |                 +-- Button "Logout" (startIcon: LogoutIcon, size:small)
  +-- Box component="nav" (width: md:240px, flexShrink: md:0)
  |     +-- Drawer (temporary, xs:block md:none) -- mobile
  |     +-- Drawer (permanent, xs:none md:block) -- desktop
  |           +-- Toolbar with Typography "Landlord System"
  |           +-- List of navigation items (11 items)
  +-- Box component="main" (flexGrow:1, p:3, mt:8, width: md:calc(100%-240px))
        +-- {children}
```

### Key Details

- **Drawer width:** 240px constant
- **AppBar offset:** On md+, AppBar left-margin = 240px and width = calc(100% - 240px)
- **Mobile behavior (<900px):** Drawer is temporary (overlay), toggled by hamburger icon. AppBar spans full width. User email is hidden on xs.
- **Navigation items:** Dashboard, Properties, Tenants, Leases, Transactions, Reports, Events, Documents, Pending Review (admin+badge), Users (admin), Settings
- **Active item styling:** Background = primary.main, text/icon = primary.contrastText
- **Pending Review badge:** Red Badge with count on the icon, only visible to admin users when count > 0
- **Main content area:** padding 24px (p:3), margin-top 64px (mt:8) to clear fixed AppBar

---

## Page: Dashboard

**Source:** `client/src/pages/Dashboard.tsx`
**Path:** `/dashboard`
**Container:** `maxWidth="lg"`

### Layout

```
Container maxWidth="lg"
  +-- Box (mb:4)
        +-- Typography h4 "Dashboard"
        +-- Overview Cards (CSS Grid, 4 columns)
        +-- Quick Actions (Paper, p:3, mb:4)
        +-- Two-Column Layout (CSS Grid, 2 columns)
              +-- Upcoming Events (Paper, p:3)
              +-- Recent Transactions (Paper, p:3 + Pagination)
```

### Components

1. **Overview Cards** -- CSS Grid
   - Grid: xs:1col, sm:2col, md:4col, gap:3, mb:4
   - 4x Card > CardContent, each with icon (fontSize:40) + label + value
   - Cards: Properties (HomeIcon, primary), Income (TrendingUpIcon, success), Expenses (TrendingDownIcon, error), Net (AccountBalanceIcon, primary/conditional color)

2. **Quick Actions** -- Paper with 4 buttons
   - Grid: xs:1col, sm:2col, md:4col, gap:2
   - 4x Button variant="contained" color="primary" fullWidth with startIcon
   - Buttons: Add Property, Add Tenant, Add Transaction, Add Event

3. **Upcoming Events** -- Paper with List
   - Up to 5 events, each as ListItem with Chip (eventType, primary outlined) + date + description
   - Dividers between items

4. **Recent Transactions** -- Paper with List + Pagination
   - Paginated (10 per page), each ListItem shows type Chip (success/error), category, amount, description, date
   - MUI Pagination component at bottom when >1 page

### Loading State
- Container with centered CircularProgress (minHeight:400)

### Error State
- Typography h4 "Dashboard" + Alert severity="error"

### Mobile Behavior (<900px)
- Overview cards stack to 1 column (xs) or 2 columns (sm)
- Quick action buttons stack to 1 column (xs) or 2 columns (sm)
- Events and Transactions panels stack vertically (1 column)

---

## Page: Properties

**Source:** `client/src/pages/Properties.tsx`
**Path:** `/properties`
**Container:** `maxWidth="lg"`

### Layout

```
Container maxWidth="lg"
  +-- Box (mb:4)
        +-- Header row (flex, space-between, mb:3)
        |     +-- Typography h4 "Properties"
        |     +-- Button "Add Property" (if canWrite)
        +-- Search & Filters (mb:3)
        |     +-- Stack spacing:2
        |           +-- TextField search with SearchIcon adornment
        |           +-- Stack row (filters): Status select, Type select, Sort select
        +-- Properties Grid (CSS Grid)
              +-- PropertyCard for each property
```

### Components

1. **Search bar:** TextField fullWidth size="small" with InputAdornment SearchIcon
2. **Filter row:** 3x TextField select (Status, Property Type, Sort By) in horizontal Stack (column on mobile)
3. **Properties Grid:** CSS Grid xs:1col, sm:2col, md:3col, gap:3
4. **PropertyCard:** Card with name, status Chip, address, propertyType, active lease rent or "No active lease". Edit/Delete IconButtons in CardActions.

### Dialogs

1. **Create/Edit Property Dialog** (maxWidth="md", fullWidth)
   - Fields: Property Name, Street Address, City+County (2-col grid), Postcode, Property Type (select), Status (select), Purchase Date+Price (2-col grid), Notes (multiline 3 rows)
   - OwnershipSection component at bottom (separated by borderTop)
   - Actions: Cancel, Create/Save

2. **Delete Property Dialog** (maxWidth="sm", fullWidth)
   - Options: Archive (warning outlined) or Permanently Delete (error contained)

### Empty State
- Centered text "No properties found" + "Add First Property" button (if canWrite)

### Mobile Behavior
- Filter selects stack vertically
- Property cards go to 1 column

---

## Page: PropertyDetail

**Source:** `client/src/pages/PropertyDetail.tsx`
**Path:** `/properties/:id`
**Container:** `maxWidth="lg"`

### Layout

```
Container maxWidth="lg"
  +-- Box (mb:4)
        +-- Button "Back to Properties" (startIcon: ArrowBackIcon, mb:2)
        +-- Property Header (Paper, p:3, mb:3)
        |     +-- flex row: property info (left) + Edit button (right)
        |     +-- Name (h4), Address, Status Chip + Type Chip
        +-- Tabs (borderBottom:1, mb:2)
        |     +-- Tab: Overview (icon: DescriptionIcon)
        |     +-- Tab: Leases (count)
        |     +-- Tab: Transactions (count)
        |     +-- Tab: Events (count)
        |     +-- Tab: Balances & Settlements
        +-- TabPanels (5 panels)
```

### Tab Panels

1. **Overview (Tab 0):** Paper with property details in 2-col grid (xs:1col, md:2col). Fields: Property Type, Status, Purchase Date, Purchase Price. Notes section below.

2. **Leases (Tab 1):** Table with columns: Tenant, Start Date, End Date, Rent Amount, Security Deposit, Status (Chip). Empty state: "No leases found."

3. **Transactions (Tab 2):** Table with columns: Date, Type (Chip success/error), Category, Description, Amount (colored). Empty state: "No transactions found."

4. **Events (Tab 3):** Table with columns: Event Type (EventBadge), Title, Scheduled Date, Status (Chip completed/pending), Description. Empty state: "No events found."

5. **Balances & Settlements (Tab 4):** Loaded on tab switch. Shows BalanceCard + SettlementHistory. "Record Settlement" button if 2+ owners. SettlementForm dialog.

### Dialogs

1. **Edit Property Dialog** (maxWidth="md", fullWidth) -- same form fields as Properties create/edit

### Mobile Behavior
- Tab icons may wrap; property details grid goes to 1 column
- Tables scroll horizontally via TableContainer

---

## Page: Transactions

**Source:** `client/src/pages/Transactions.tsx`
**Path:** `/transactions`
**Container:** `maxWidth="xl"`

### Layout

```
Container maxWidth="xl"
  +-- Box (mb:4)
        +-- Header row (flex, space-between, mb:3)
        +-- Error Alert (if error)
        +-- Summary Cards (CSS Grid, 3 columns, mb:3)
        +-- Filters (Paper, p:2, mb:3)
        +-- Transactions Table (Paper, p:2)
```

### Components

1. **Summary Cards:** CSS Grid xs:1col, sm:2col, md:3col, gap:3
   - 3x StatsCard: Total Income (success), Total Expenses (error), Net Income (conditional)

2. **Filters Paper:**
   - Row 1: PropertySelector, Type select, Category select (with grouped Income/Expense categories)
   - Row 2: DateRangePicker
   - Row 3: "Clear Filters" button (right-aligned, shown when active)

3. **Transactions Table:**
   - Columns: Date, Property, Type, Category, Amount, Actions
   - TransactionRow component per row
   - Empty state with "Create First Transaction" button

### Dialogs

1. **Create/Edit Transaction Dialog** (maxWidth="md", fullWidth)
   - Stack spacing:2: PropertySelector, Type Select, Category Select, Amount, Date, Description (multiline 3 rows)
   - Conditional: PaidBy Select (for expenses with ownership), SplitSection accordion
   - FileUpload component for receipt attachment
   - Actions: Cancel, Create/Update (with loading spinner)

2. **Delete Confirmation** via ConfirmDialog

### Mobile Behavior
- Summary cards stack to 1-2 columns
- Filter selects stack vertically
- "New Transaction" button uses size="small"

---

## Page: Tenants

**Source:** `client/src/pages/Tenants.tsx`
**Path:** `/tenants`
**Container:** `maxWidth="lg"`

### Layout

```
Container maxWidth="lg"
  +-- Box (mb:4)
        +-- Header row (flex, space-between, mb:3)
        +-- Tabs (borderBottom:1, mb:2)
        |     +-- All (count), Active (count), Prospective (count), Former (count)
        +-- TabPanels (4 panels, each with tenant grid)
```

### Components

1. **Tenant Grid:** CSS Grid xs:1col, sm:2col, md:3col, lg:4col, gap:3
2. **TenantCard:** Card with name, status Chip (info/success/error), email, phone, emergency contact icon, current property name

### Dialogs

1. **Create/Edit Tenant Dialog** (maxWidth="sm", fullWidth)
   - Fields: First Name, Last Name, Email, Phone, Status (select), Emergency Contact Name, Emergency Contact Phone, Notes (multiline 3 rows)
   - Edit mode includes Delete button in DialogActions

2. **Delete Tenant Dialog** (maxWidth="sm", fullWidth)
   - Archive (warning outlined) or Permanently Delete (error contained)

### Mobile Behavior
- Tenant cards stack to 1-2 columns

---

## Page: Leases

**Source:** `client/src/pages/Leases.tsx`
**Path:** `/leases`
**Container:** `maxWidth="lg"`

### Layout

```
Container maxWidth="lg"
  +-- Box (mb:4)
        +-- Header row (flex, space-between, mb:3)
        +-- Search & Filters (mb:3)
        |     +-- TextField search with SearchIcon
        |     +-- Property select + Status select (row on desktop)
        +-- Leases Grid (CSS Grid)
```

### Components

1. **Lease Card:** Card with property name (h6), status Chip (success/warning/default/error), tenant name, monthly rent (/month, primary color), date range. Edit + Delete IconButtons in CardActions.

2. **Grid:** xs:1col, sm:2col, md:3col, gap:3

### Dialogs

1. **Create/Edit Lease Dialog** (maxWidth="md", fullWidth)
   - Fields: Property (select), Tenant (select), Start+End Date (2-col grid), Monthly Rent+Security Deposit (2-col grid with GBP adornment), Security Deposit Paid Date+Status (2-col grid)

2. **Terminate Lease** via ConfirmDialog

### Mobile Behavior
- Filters stack vertically
- Lease cards go to 1 column

---

## Page: Events

**Source:** `client/src/pages/Events.tsx`
**Path:** `/events`
**Container:** `maxWidth="xl"`

### Layout

```
Container maxWidth="xl"
  +-- Box (mb:4)
        +-- Header row (flex, space-between, mb:3)
        +-- Error Alert
        +-- Filters (Paper, p:2, mb:3)
        +-- Calendar Controls (Paper, p:2, mb:2)
        |     +-- Event count + Refresh + View buttons (Month/Week/Day/Agenda)
        +-- Calendar (Paper, p:2, height: mobile 500px / desktop 700px)
```

### Components

1. **Filters Paper:** PropertySelector, Event Type select, Status select (row), DateRangePicker, Clear Filters button
2. **Calendar Controls:** flex row with event count, Refresh IconButton, 4x view toggle Buttons (contained when active, outlined when not)
3. **Calendar:** react-big-calendar with date-fns localizer, custom EventComponent using EventBadge, color-coded by event type, completed events at 60% opacity with line-through

### Dialogs

1. **EventDialog** (maxWidth="sm", fullWidth) -- 3 modes: create, edit, view
   - Fields: PropertySelector, Event Type select, Title, DateTimePicker, Description (multiline 4 rows)
   - View mode: completion status Chip, Mark Complete/Incomplete button, Delete button, Edit button

2. **Delete Confirmation** via ConfirmDialog

### Mobile Behavior
- Calendar height reduces to 500px
- Filter selects stack vertically
- "New Event" button uses size="small"

---

## Page: Documents

**Source:** `client/src/pages/Documents.tsx`
**Path:** `/documents`
**Container:** `maxWidth="lg"`

### Layout

```
Container maxWidth="lg"
  +-- Box (mb:4)
        +-- Header row (flex, space-between, mb:3)
        +-- Filters (mb:3)
        |     +-- Entity Type select + Entity select (row on desktop)
        +-- Documents Grid (CSS Grid)
```

### Components

1. **Document Card:** Card with file icon (PDF=red, image=primary, other=action), filename (truncated), file size, entity type Chip (color-coded), entity name, upload date. Download + Delete IconButtons in top-right corner (absolute positioned, top:8, right:8).

2. **Grid:** xs:1col, sm:2col, md:3col, gap:3

### Empty State
- Large DescriptionIcon (64px), "No documents found" text, upload instruction, "Upload First Document" button

### Dialogs

1. **Upload Document Dialog** (maxWidth="sm", fullWidth)
   - Fields: Entity Type select, Entity select (dependent on type), hidden file input with "Choose File" Button
   - File type info: "Allowed formats: PDF, JPG, PNG (max 10MB)"
   - Actions: Cancel, Upload (with loading)

2. **Delete Confirmation** via ConfirmDialog

### Mobile Behavior
- Filter selects stack vertically
- Document cards go to 1 column

---

## Page: Reports

**Source:** `client/src/pages/Reports.tsx`
**Path:** `/finances/reports`
**Container:** `maxWidth="xl"`

### Layout

```
Container maxWidth="xl"
  +-- Box (mb:4)
        +-- Header row (flex, space-between)
        |     +-- AssessmentIcon + Typography h4 "Financial Reports"
        |     +-- Export dropdown (TextField select)
        +-- Error Alert
        +-- Filters (Paper, p:2, mb:3)
        +-- Loading or Report Content:
              +-- Owner P&L Report (Paper, p:3, mb:3) -- if owner selected
              +-- Summary Cards (CSS Grid, 3 columns, mb:3)
              +-- P&L Monthly Breakdown (Paper, p:3, mb:3)
              +-- Category Breakdown Charts (Paper, p:3, mb:3)
              +-- Property Performance Table (Paper, p:3)
```

### Components

1. **Filters Paper:**
   - Row 1: PropertySelector + Owner Select (with PersonIcon adornment)
   - Row 2: DateRangePicker
   - Row 3: 5x date preset Buttons (Last 30 Days, Last Quarter, Last Year, Current Year, All Time)

2. **Owner P&L Report Section:**
   - 3x StatsCard (Owner's Income Share, Expense Share, Net Profit)
   - Per-property breakdown: Paper with property name, ownership % Chip, address, Table (Category, Owner's Share) with INCOME/EXPENSES/Net Profit sections, Balance Summary

3. **Overall Summary Cards:** 3x StatsCard (Total Income, Total Expenses, Net Income)

4. **P&L Monthly Breakdown:** Sticky-header Table (small, maxHeight:600, overflow-x auto). Rows: INCOME header (green bg), income categories, Total Income, EXPENSES header (red bg), expense categories, Total Expenses, Net Income (primary bg, conditional color)

5. **Category Breakdown Charts:** ToggleButtonGroup (pie/bar), 2-col grid with Income + Expense charts. Uses Recharts PieChart/BarChart with ResponsiveContainer (height:300)

6. **Property Performance Table:** Sortable columns (TableSortLabel): Property Name, Total Revenue, Total Expenses, Net Income. Color-coded amounts.

### Mobile Behavior
- Charts and tables stack to 1 column
- Filter selects stack vertically
- Date preset buttons wrap

---

## Page: Settings

**Source:** `client/src/pages/Settings.tsx`
**Path:** `/settings`
**Container:** `maxWidth="lg"`

### Layout

```
Container maxWidth="lg"
  +-- Box (mb:4)
        +-- Typography h4 "Settings"
        +-- Change Password (Paper, p:3)
        +-- Bank Accounts (Paper, p:3, mb:4)
        +-- User Management (Paper, p:3)
```

### Sections

1. **Change Password:** Paper with h6 title, Divider, column of 3 password TextFields (maxWidth:400) + "Change Password" Button

2. **Bank Accounts:** Paper with h6 + "Connect Monzo" Button. Lists connected accounts with provider info, sync status Chip with icon, last sync time, reconnect IconButton. Empty state: descriptive text.

3. **User Management:** Paper with h6 + "Add User" Button, Divider, Table (Email, Created, Actions with delete IconButton). Current user shown with "(you)" badge, delete disabled.

### Dialogs

1. **Create User Dialog** (maxWidth="sm", fullWidth): Email + Password fields
2. **Delete User** via ConfirmDialog
3. **Connect Monzo Dialog** (maxWidth="sm", fullWidth): Import History Select (30d to 5y) + Connect button
4. **SCA Pending Approval Dialog** (maxWidth="sm", fullWidth): BankIcon, instruction text, Alert, "I've Approved It" button
5. **ImportProgressDialog** (separate component)

---

## Page: Users

**Source:** `client/src/pages/Users.tsx`
**Path:** `/users`
**Container:** `maxWidth="lg"`

### Layout

```
Container maxWidth="lg"
  +-- Box (mb:4)
        +-- Header row (flex, space-between, mb:3)
        |     +-- Typography h4 "Users"
        |     +-- Button "Add User"
        +-- Table (TableContainer + Paper)
              +-- Columns: Email, Role (inline Select), Created At, Actions (delete)
```

### Components

- **Role Select:** Inline MUI Select (size="small", minWidth:120) with ADMIN/LANDLORD/VIEWER options. Disabled for current user.
- **Delete button:** IconButton color="error", disabled for self

### Dialogs

1. **Create User Dialog** (maxWidth="sm", fullWidth): Email, Password (with validation text), Role select
2. **Delete User** via ConfirmDialog

### Access Control
- Redirects non-admin users to "/" with toast error

---

## Page: Login

**Source:** `client/src/pages/Login.tsx`
**Path:** `/login`
**Container:** `maxWidth="xs"` (no Layout shell)

### Layout

```
Container maxWidth="xs"
  +-- Box (mt:8, flex column, alignItems:center)
        +-- Paper (elevation:3, p:4, flex column, center, width:100%)
              +-- Typography h5 "Landlord Management System"
              +-- Typography h6 "Sign In" / "Create Admin Account"
              +-- Alert info (setup mode only)
              +-- Alert error (if error)
              +-- Form (email TextField, password TextField, submit Button)
```

### Key Details

- Uses react-hook-form with Zod validation
- Dual mode: Login or Admin Setup (first-time setup)
- Submit button: fullWidth, mt:3 mb:2
- Password field shows validation hint in setup mode

---

## Page: NotFound

**Source:** `client/src/pages/NotFound.tsx`
**Path:** `*` (catch-all)
**Container:** `maxWidth="md"` (no Layout shell for unauthenticated)

### Layout

```
Container maxWidth="md"
  +-- Box (mt:8, flex column, center)
        +-- Paper (elevation:3, p:4, flex column, center, width:100%)
              +-- Typography h1 "404"
              +-- Typography h5 "Page Not Found"
              +-- Typography body1 (description)
              +-- Button "Go to Dashboard" (startIcon: HomeIcon)
```

---

## Page: admin/BankAccounts

**Source:** `client/src/pages/admin/BankAccounts.tsx`
**Path:** `/admin/bank-accounts`
**Container:** `maxWidth="lg"`

### Layout

```
Container maxWidth="lg"
  +-- Box (mb:4)
        +-- Header row (flex, space-between, mb:3)
        |     +-- Typography h4 "Bank Accounts"
        |     +-- Button "Connect New Account"
        +-- WebhookStatusWidget (if accounts exist)
        +-- BankAccountsList grid or empty state
```

### Components

1. **BankAccountsList:** CSS Grid xs:1col, sm:2col, md:3col, gap:3
   - Card per account: name, type/provider, sync status Chip+icon, last sync time, webhook status Chip, pending count Chip, sync enabled status
   - CardActions: "Rules" Button + Settings IconButton (disabled)

2. **Empty State:** BankIcon (64px), "No bank accounts connected" text, "Connect Your First Account" button

### Dialogs

1. **Connect Monzo Dialog** (maxWidth="sm", fullWidth): Import History Select + Connect button
2. **ImportProgressDialog** for sync progress

---

## Page: admin/BankAccountRules

**Source:** `client/src/pages/admin/BankAccountRules.tsx`
**Path:** `/admin/bank-accounts/:id/rules`
**Container:** `maxWidth="lg"`

### Layout

```
Container maxWidth="lg"
  +-- Box (mb:4)
        +-- Header (flex, alignItems:center, gap:2, mb:2)
        |     +-- Back IconButton (to /admin/bank-accounts)
        |     +-- Typography h4 "Matching Rules"
        +-- [If not editing:]
        |     +-- Description + "Create Rule" Button (flex, space-between, mb:3)
        |     +-- Rules List (Paper, p:2) with DnD sortable items
        +-- [If editing:]
              +-- RuleEditor component (inline, replaces list)
```

### Components

1. **SortableRuleItem:** ListItem with DragIndicator handle, rule name (bold), enabled/disabled Chip, Global Chip (if no bankAccountId), conditions summary, type/category Chips. Edit + Delete IconButtons.

2. **DnD:** Uses @dnd-kit/core + @dnd-kit/sortable for drag-to-reorder

3. **RuleEditor:** Inline form component (replaces list view when open)

### Dialogs

1. **Delete Rule Dialog:** Simple confirm with rule name
2. **Test Rule Dialog** (maxWidth="sm", fullWidth): 5 test fields (description, amount, counterpartyName, merchant, reference), result Alert (success/info)

### Empty State
- Paper with "No rules configured" + "Create Your First Rule" button

---

## Page: admin/PendingTransactions

**Source:** `client/src/pages/admin/PendingTransactions.tsx`
**Path:** `/admin/pending-transactions`
**Container:** `maxWidth="xl"`

### Layout

```
Container maxWidth="xl"
  +-- Box (mb:4)
        +-- Typography h4 "Pending Transactions Review"
        +-- Typography body1 description (mb:3)
        +-- Filters (Paper, p:2, mb:3)
        |     +-- flex row with gap:2, flexWrap:wrap
        |           +-- Search TextField (flex:1 1 300px)
        |           +-- Bank Account Select (flex:0 0 200px)
        |           +-- Status Select (flex:0 0 200px)
        +-- Bulk Actions Toolbar (Paper, mb:2) -- if selections
        |     +-- Toolbar: count text + Approve/Update/Reject buttons
        +-- Transactions Table (TableContainer + Paper)
```

### Components

1. **Transactions Table:** Wide table with:
   - Checkbox column (header with select-all)
   - Date, Description (with counterparty sub-text), Amount (colored), Bank Account
   - Inline editable: Property (PropertySelector), Type (Select), Category (Select)
   - Actions: Approve Button (disabled until complete) or "Reviewed" Chip
   - Reviewed rows have backgroundColor: action.hover

2. **Filters:** Search with InputAdornment, Bank Account FormControl, Status FormControl

3. **Bulk Actions Toolbar:** Approve Selected (primary contained), Update Selected (outlined), Reject Selected (error outlined)

### Dialogs

1. **Bulk Update Dialog** (maxWidth="sm", fullWidth): PropertySelector, Type Select, Category Select
2. **Bulk Reject Dialog:** Simple confirmation with count

### Empty State
- BankIcon (64px), "No pending transactions", context-aware message based on filter

---

## Shared Components Reference

### PropertyCard
**Source:** `client/src/components/shared/PropertyCard.tsx`
- Card (elevation:2, height:100%, hover shadow:4)
- CardContent: name (h6 bold), status Chip (color-coded), address, propertyType, lease rent or "No active lease"
- CardActions: Edit (primary) + Delete (error) IconButtons

### StatsCard
**Source:** `client/src/components/shared/StatsCard.tsx`
- Card (height:100%, minHeight:120)
- CardContent: flex row, left side (title body2, value h4 bold, optional trend), right side Avatar (56x56, colored bg) with icon

### TenantCard
**Source:** `client/src/components/shared/TenantCard.tsx`
- Card (elevation:2, height:100%, hover shadow:4)
- CardContent: name (h6 bold), status Chip + emergency icon, email, phone, current property (below divider)

### TransactionRow
**Source:** `client/src/components/shared/TransactionRow.tsx`
- TableRow (hover): Date, Property, Type, Category, Amount (colored), Edit+Delete IconButtons

### ConfirmDialog
**Source:** `client/src/components/shared/ConfirmDialog.tsx`
- Dialog (maxWidth:"xs", fullWidth)
- Title with WarningIcon, message in body2, Cancel + Confirm (error contained) buttons

### DateRangePicker
**Source:** `client/src/components/shared/DateRangePicker.tsx`
- MUI X DatePicker pair (From/To) with en-GB locale, dd/MM/yyyy format
- Stack: row on desktop, column on mobile (<600px)
- Clear IconButton when either date is set

### PropertySelector
**Source:** `client/src/components/shared/PropertySelector.tsx`
- FormControl with Select, size="small"
- Options from PropertiesContext (format: "Name - Street, Postcode")
- Optional "All Properties" option

### FileUpload
**Source:** `client/src/components/shared/FileUpload.tsx`
- Drag-and-drop zone (Paper, dashed border, centered UploadIcon)
- Selected state: filename + size + clear button
- Error Alert for validation failures

### EventBadge
**Source:** `client/src/components/shared/EventBadge.tsx`
- Chip with color-coded by event type, CheckIcon if completed
- Tooltip with event details on hover

### SplitSection
**Source:** `client/src/components/Transaction/SplitSection.tsx`
- Accordion (default collapsed) with "Transaction Splits" title
- "Customized" badge when splits differ from ownership defaults
- Per-owner SplitInput rows with percentage + amount
- Total display + "Reset to Ownership" button
- Validation error Alert when percentages do not sum to 100%

### OwnershipSection
**Source:** `client/src/components/PropertyOwnership/OwnershipSection.tsx`
- h6 "Property Ownership" + description text
- Stack of OwnerInput rows (user select + percentage + remove button)
- "Add Owner" button (outlined, small)
- Total percentage display + validation Alerts

### BalanceCard
**Source:** `client/src/components/Settlement/BalanceCard.tsx`
- Card with AccountBalanceIcon + "Current Balances" title
- Per-balance row: "X owes Y" text + amount Chip (highlighted if involves current user)

### SettlementHistory
**Source:** `client/src/components/Settlement/SettlementHistory.tsx`
- Card with HistoryIcon + "Settlement History" title
- Table: Date, From, To, Amount (success Chip), Notes

### EventDialog
**Source:** `client/src/components/events/EventDialog.tsx`
- Dialog (maxWidth:"sm", fullWidth) with 3 modes
- Form: PropertySelector, Event Type select, Title, DateTimePicker (dd/MM/yyyy HH:mm), Description (4 rows)
- View mode: completion Chip, Mark Complete/Edit/Delete actions

### BankAccountsList
**Source:** `client/src/components/bank/BankAccountsList.tsx`
- CSS Grid xs:1col, sm:2col, md:3col, gap:3
- Per-account Card: name, type/provider, status Chip+icon, last sync, webhook status, pending count, sync enabled
- CardActions: Rules button + Settings button (disabled)

---

## Color Usage Summary

| Context | Color | MUI Token |
|---------|-------|-----------|
| Income amounts | Green | `success.main` |
| Expense amounts | Red | `error.main` |
| Primary actions | Blue | `primary.main` |
| Active nav item bg | Blue | `primary.main` |
| Active nav item text | White | `primary.contrastText` |
| Property status: Available | Orange | `warning` Chip |
| Property status: Occupied | Green | `success` Chip |
| Property status: For Sale | Blue | `info` Chip |
| Property status: Under Maintenance | Red | `error` Chip |
| Tenant status: Prospective | Blue | `info` Chip |
| Tenant status: Active | Green | `success` Chip |
| Tenant status: Former | Red | `error` Chip |
| Lease status: Active | Green | `success` Chip |
| Lease status: Draft | Orange | `warning` Chip |
| Lease status: Expired | Grey | `default` Chip |
| Lease status: Terminated | Red | `error` Chip |
| Event: Maintenance | Orange | `warning.main` |
| Event: Inspection | Light Orange | `warning.light` |
| Event: Repair | Red | `error.main` |
| Event: Viewing | Blue | `info.main` |
| Event: Meeting | Purple | `secondary.main` |
| Event: Rent Due Date | Green | `success.main` |
| Event: Lease Renewal | Blue | `primary.main` |
| Document entity: Property | Blue | `primary` Chip |
| Document entity: Tenant | Purple | `secondary` Chip |
| Document entity: Lease | Green | `success` Chip |
| Document entity: Transaction | Orange | `warning` Chip |

---

## Common Patterns

### Page Header Pattern
Most pages follow this header pattern:
```
Box (display:flex, justifyContent:space-between, alignItems:center, mb:3)
  +-- Typography variant="h4" component="h1"
  +-- Button variant="contained" startIcon={<AddIcon />} (conditional on canWrite)
```

### Loading Pattern
```
Container maxWidth="lg"
  +-- Box (display:flex, justifyContent:center, alignItems:center, minHeight:400)
        +-- CircularProgress
```

### Error Pattern
```
Container maxWidth="lg"
  +-- Box (mb:4)
        +-- Typography variant="h4" component="h1" gutterBottom
        +-- Alert severity="error"
```

### Dialog Form Pattern
```
Dialog (maxWidth, fullWidth)
  +-- DialogTitle
  +-- DialogContent
  |     +-- Box/Stack (flex column, gap:2, mt:1)
  |           +-- Form fields
  +-- DialogActions
        +-- Cancel Button (color:"inherit")
        +-- Submit Button (variant:"contained", color:"primary")
```

### CSS Grid Pattern (replaces MUI Grid v5)
```
Box sx={{
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(N, 1fr)' },
  gap: 3,
}}
```

### Filter Section Pattern
```
Paper sx={{ p: 2, mb: 3 }}
  +-- Typography variant="subtitle2" gutterBottom "Filters"
  +-- Stack spacing:2
        +-- Stack direction={isMobile?'column':'row'} spacing:2
        |     +-- Filter selects
        +-- DateRangePicker (if applicable)
        +-- "Clear Filters" button (right-aligned, conditional)
```
