# UAT Plan: MUI to Native React + SCSS Migration

**User stories:** docs/plans/2026-02-23-mui-to-scss-migration-user-stories.md
**Date:** 2026-02-23

## Test Environment

- **Start app:** `npm run dev`
- **Start Storybook:** `cd client && npm run storybook`
- **Seed data:** `npm run db:seed`
- **Base URL:** http://localhost:5173
- **Storybook URL:** http://localhost:6006
- **Reference designs:** `docs/designs/`

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@test.com | password123 |
| Landlord | user@test.com | password123 |

## Scenarios

### Epic: Foundation

#### UAT-001: SCSS architecture loads correctly

**User Story:** US-001 - SCSS Architecture Setup
**Acceptance Criteria Tested:** All

**Preconditions:**
- App built and running (`npm run dev`)

**Steps:**
1. Navigate to http://localhost:5173/login
2. Inspect the page in browser DevTools

**Expected Results:**
- Page background is light gray (#f5f5f5)
- Text color is dark (rgba(0,0,0,0.87))
- Font is system font stack (-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, etc.)
- No MUI CssBaseline class names in DOM
- `global.scss` styles applied (check `<body>` computed styles)

---

#### UAT-002: Storybook launches with SCSS support

**User Story:** US-002 - Storybook Setup
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running (`cd client && npm run storybook`)

**Steps:**
1. Navigate to http://localhost:6006
2. Check the sidebar for story categories
3. Click the viewport toggle in the toolbar
4. Select "Mobile" viewport

**Expected Results:**
- Storybook UI loads without errors
- Stories organized under: Primitives, Composed, Layout categories
- Global SCSS styles (background color, typography) applied in preview panel
- Viewport addon available with Mobile, Tablet, Desktop presets
- Switching viewport resizes the preview panel correctly

---

#### UAT-003: Pencil.dev reference designs exist

**User Story:** US-003 - Pencil.dev Reference Designs
**Acceptance Criteria Tested:** All

**Preconditions:**
- Reference designs created in `docs/designs/`

**Steps:**
1. Open `docs/designs/README.md`
2. Verify all 16 pages listed
3. Open at least 3 reference designs (Dashboard, Transactions, PropertyDetail)

**Expected Results:**
- README indexes all 16 page designs
- Dashboard desktop and mobile designs exist
- Transactions desktop and mobile designs exist
- PropertyDetail desktop and mobile designs exist
- Designs clearly show layout structure, colors, and component placement

---

#### UAT-004: New dependencies installed alongside MUI

**User Story:** US-004 - Install New Dependencies
**Acceptance Criteria Tested:** All

**Preconditions:**
- Dependencies installed

**Steps:**
1. Run `cd client && npm run build`
2. Run `cd client && npm run storybook` (if not already running)
3. Check `client/package.json` for new dependencies

**Expected Results:**
- Build completes with zero errors
- `sass`, `lucide-react`, `react-datepicker` present in package.json
- Storybook packages present in devDependencies
- Existing MUI code still functions (during migration period)

---

### Epic: Primitive Components

#### UAT-005: Spinner component renders in Storybook

**User Story:** US-017 - Spinner Component
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to Storybook
2. Find "Primitives / Spinner" in sidebar
3. View each story variant

**Expected Results:**
- Small spinner renders at ~16px
- Medium spinner renders at ~32px
- Large spinner renders at ~48px
- Spinner animates smoothly (CSS rotation)
- Label variant shows text below spinner
- No JavaScript timer warnings in console

---

#### UAT-006: Button component renders all variants in Storybook

**User Story:** US-005 - Button Component
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to "Primitives / Button" in Storybook
2. View Primary variant
3. View Secondary variant
4. View Text variant
5. View Icon variant
6. View Loading variant
7. View Disabled variant
8. View with startIcon and endIcon

**Expected Results:**
- Primary: blue (#1976d2) background, white text, no uppercase
- Secondary: outlined, gray border
- Text: no background, blue text
- Icon: circular button, transparent background
- Loading: shows spinner, button disabled
- Disabled: reduced opacity, not clickable
- Icons render correctly (Lucide icons)
- Hover states visible on mouse over
- Visual match to current MUI Button styling

---

#### UAT-007: TextField component renders all states in Storybook

**User Story:** US-006 - TextField Component
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to "Primitives / TextField" in Storybook
2. View default with label
3. Click into the field (focus state)
4. Type text (filled state)
5. View error state with helper text
6. View with start and end adornments
7. View multiline variant
8. View disabled variant

**Expected Results:**
- Label floats above input on focus/fill
- Border changes to blue (#1976d2) on focus (2px)
- Error state: red border, red label, red helper text
- Adornments render inside input container
- Multiline renders a textarea
- Disabled: grayed out, not-allowed cursor
- Visual match to current MUI outlined TextField

---

#### UAT-008: Select component renders in Storybook

**User Story:** US-007 - Select Component
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to "Primitives / Select" in Storybook
2. View default with options
3. Click to open dropdown
4. Select an option
5. View error state
6. View disabled state

**Expected Results:**
- Label displays above select
- Dropdown arrow visible
- Options render in dropdown on click
- Selected value displayed
- Error: red border, red helper text
- Disabled: grayed out
- Visual match to current MUI Select

---

#### UAT-009: DatePicker component renders in Storybook

**User Story:** US-008 - DatePicker Component
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to "Primitives / DatePicker" in Storybook
2. Click the date input
3. Select a date from the calendar popup
4. View datetime mode (with time select)
5. View error state
6. View disabled state

**Expected Results:**
- Calendar popup opens on click
- Date selection updates the input value
- Datetime mode shows time selection below calendar
- Calendar styled to match MUI DatePicker look (not default react-datepicker)
- Error state shows red border/helper text
- Disabled state prevents interaction

---

#### UAT-010: FileUpload component renders in Storybook

**User Story:** US-009 - FileUpload Component
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to "Primitives / FileUpload" in Storybook
2. View empty state
3. Simulate drag over (or use populated story)
4. View populated state with files listed

**Expected Results:**
- Drop zone shows dashed border with upload icon
- Drag hover: visual highlight (border color change or background tint)
- File list shows file names with size and remove button (X)
- Click on zone opens file picker
- Visual match to current FileUpload component

---

#### UAT-011: Card component renders in Storybook

**User Story:** US-010 - Card Component
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to "Primitives / Card" in Storybook
2. View minimal card (content only)
3. View full card (header + content + actions)
4. View clickable card variant

**Expected Results:**
- White background, subtle shadow, rounded corners (4px)
- Header section with bottom padding/border
- Content section with 16px padding
- Actions section aligned right
- Clickable variant: cursor pointer, hover shadow increase

---

#### UAT-012: Table component renders in Storybook

**User Story:** US-011 - Table Component
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to "Primitives / Table" in Storybook
2. View basic table with data
3. Click a sortable column header
4. Click again to reverse sort
5. Navigate pagination (next page, change page size)
6. View empty state
7. View loading state

**Expected Results:**
- Table renders with clean borders and row hover highlight
- Sortable columns show sort indicator arrow
- Clicking toggles between asc/desc/none
- Pagination shows page numbers and rows-per-page selector
- Empty state shows centered "No data" message
- Loading state shows Spinner overlay
- Visual match to current MUI Table

---

#### UAT-013: Chip component renders in Storybook

**User Story:** US-012 - Chip Component
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to "Primitives / Chip" in Storybook
2. View all color variants
3. View with delete button
4. View both sizes

**Expected Results:**
- Default: gray background
- Primary: blue background
- Success: green, Warning: orange, Error: red
- Delete button shows X icon, clickable
- Small: 24px height, Medium: 32px height
- Pill shape (rounded ends)

---

#### UAT-014: Badge component renders in Storybook

**User Story:** US-013 - Badge Component
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to "Primitives / Badge" in Storybook
2. View zero count
3. View low count (e.g., 5)
4. View overflow count (e.g., 150 with max=99)

**Expected Results:**
- Zero count: badge hidden, child visible
- Low count: red bubble at top-right with number
- Overflow: shows "99+" text in bubble

---

#### UAT-015: Avatar component renders in Storybook

**User Story:** US-014 - Avatar Component
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to "Primitives / Avatar" in Storybook
2. View initials variant
3. View image variant
4. View image fallback (broken src)
5. View all three sizes

**Expected Results:**
- Initials: circular, colored background, white initials text
- Image: circular with image filling the circle
- Fallback: shows initials when image fails to load
- Sizes: small ~32px, medium ~40px, large ~56px
- Same name always produces same background color

---

#### UAT-016: Dialog component renders in Storybook

**User Story:** US-015 - Dialog Component
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to "Primitives / Dialog" in Storybook
2. Open a dialog (click trigger button in story)
3. Verify backdrop overlay appears
4. Press Escape key
5. Reopen and click backdrop
6. Test Tab key cycling (focus trap)
7. View small, medium, and large sizes

**Expected Results:**
- Dialog centered in viewport with dark backdrop overlay
- Escape key closes the dialog
- Backdrop click closes (unless disableBackdropClose)
- Tab cycles through focusable elements within dialog only
- Title, Content, Actions sections render with proper spacing
- Sizes: small ~400px, medium ~600px, large ~800px max-width

---

#### UAT-017: Toast component renders in Storybook

**User Story:** US-016 - Toast Component
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to "Primitives / Toast" in Storybook
2. View success variant
3. View error variant
4. View warning variant
5. View info variant
6. Click close button
7. Wait for auto-dismiss

**Expected Results:**
- Success: green background with check icon
- Error: red background with alert icon
- Warning: orange background with triangle icon
- Info: blue background with info icon
- Position: bottom-right of viewport
- Close button dismisses immediately
- Auto-dismiss after configured duration (~5s)

---

#### UAT-018: AppBar component renders in Storybook

**User Story:** US-018 - AppBar Component
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to "Primitives / AppBar" in Storybook
2. View desktop variant
3. View mobile variant

**Expected Results:**
- Blue (#1976d2) background, white text
- Fixed to top of preview area
- Content aligned center vertically
- Shadow below appbar

---

#### UAT-019: Sidebar component renders in Storybook

**User Story:** US-019 - Sidebar Component
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to "Primitives / Sidebar" in Storybook
2. View expanded desktop variant
3. Verify active item highlighting
4. View mobile overlay variant
5. Verify badge on navigation item

**Expected Results:**
- Desktop: 240px wide permanent sidebar with navigation items
- Active item: blue background, white text/icon
- Mobile: overlay with dark backdrop, slides from left
- Items show icon + label
- Badge count visible on items with badge prop
- Clicking item in mobile overlay closes it

---

#### UAT-020: Container component renders in Storybook

**User Story:** US-020 - Container Component
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to "Primitives / Container" in Storybook
2. View with different maxWidth settings

**Expected Results:**
- Content centered horizontally
- sm: max-width 600px
- md: max-width 900px
- lg: max-width 1200px (default)
- xl: max-width 1536px
- Responsive padding on sides

---

#### UAT-021: Divider component renders in Storybook

**User Story:** US-021 - Divider Component
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to "Primitives / Divider" in Storybook
2. View horizontal variant
3. View vertical variant

**Expected Results:**
- Horizontal: thin line spanning full width
- Vertical: thin line spanning full height
- Custom spacing applied as margin

---

#### UAT-022: Tooltip component renders in Storybook

**User Story:** US-022 - Tooltip Component
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to "Primitives / Tooltip" in Storybook
2. Hover over trigger element
3. Wait ~200ms
4. Move mouse away
5. Test all four placements

**Expected Results:**
- Tooltip appears after short delay on hover
- Dark background, white text, small rounded box
- Disappears on mouse leave
- Placements: top (above), bottom (below), left, right correctly positioned

---

#### UAT-023: ToggleGroup component renders in Storybook

**User Story:** US-023 - ToggleGroup Component
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to "Primitives / ToggleGroup" in Storybook
2. Click different options
3. View text-only variant
4. View icon+text variant
5. View disabled variant

**Expected Results:**
- Connected button group (shared borders)
- Selected option: blue background, white text
- Clicking an option selects it and deselects previous
- Disabled: all options grayed out, not clickable

---

### Epic: Composed Components

#### UAT-024: StatsCard renders with trends in Storybook

**User Story:** US-024 - StatsCard Component
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to "Composed / StatsCard" in Storybook
2. View positive trend variant
3. View negative trend variant
4. View neutral variant

**Expected Results:**
- Title, value displayed prominently
- Positive trend: green arrow up icon with trend value
- Negative trend: red arrow down icon with trend value
- Neutral: no trend icon
- Card styling (white bg, shadow) from Card primitive

---

#### UAT-025: PropertyCard renders property info in Storybook

**User Story:** US-025 - PropertyCard Component
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to "Composed / PropertyCard" in Storybook
2. View occupied property variant
3. View vacant property variant
4. View multi-owner variant

**Expected Results:**
- Address displayed prominently
- Tenant count shown
- Action buttons (edit, view) visible and clickable
- Multi-owner variant shows ownership info

---

#### UAT-026: TenantCard renders tenant info in Storybook

**User Story:** US-026 - TenantCard Component
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to "Composed / TenantCard" in Storybook
2. View active lease variant
3. View expired lease variant
4. View no lease variant

**Expected Results:**
- Tenant name with Avatar showing initials
- Contact info displayed
- Lease status clearly indicated
- Card styling from Card primitive

---

#### UAT-027: TransactionRow renders in table context in Storybook

**User Story:** US-027 - TransactionRow Component
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to "Composed / TransactionRow" in Storybook
2. View income row
3. View expense row
4. View split transaction row

**Expected Results:**
- Date, description, amount, type, property columns
- Income amounts in green
- Expense amounts in red
- Action icons (edit, delete) visible
- Renders correctly inside Table wrapper

---

#### UAT-028: ConfirmDialog works in Storybook

**User Story:** US-028 - ConfirmDialog Component
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to "Composed / ConfirmDialog" in Storybook
2. Open warning severity dialog
3. Open danger severity dialog

**Expected Results:**
- Title and message displayed
- Warning: confirm button has warning styling
- Danger: confirm button has red/danger styling
- Cancel button closes dialog
- Built on Dialog primitive (backdrop, escape key work)

---

#### UAT-029: DateRangePicker validates range in Storybook

**User Story:** US-029 - DateRangePicker Component
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to "Composed / DateRangePicker" in Storybook
2. Select a start date
3. Select an end date after start
4. Try selecting end date before start

**Expected Results:**
- Two date pickers side by side (Start / End)
- Valid range accepted and both dates shown
- Invalid range (end < start) shows error state

---

#### UAT-030: PropertySelector includes "All Properties" in Storybook

**User Story:** US-030 - PropertySelector Component
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to "Composed / PropertySelector" in Storybook
2. Open the dropdown
3. Verify "All Properties" option exists
4. Select a specific property

**Expected Results:**
- "All Properties" is the first option
- Individual properties listed below
- Selection updates the display value

---

#### UAT-031: EventBadge shows event types in Storybook

**User Story:** US-031 - EventBadge Component
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to "Composed / EventBadge" in Storybook
2. View each event type

**Expected Results:**
- Maintenance: warning-colored chip
- Inspection: info-colored chip
- Lease renewal: primary-colored chip
- Custom: default-colored chip

---

#### UAT-032: SplitSection validates percentages in Storybook

**User Story:** US-032 - SplitSection and SplitInput Components
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to "Composed / SplitSection" in Storybook
2. View two-way split
3. View three-way split
4. View validation error (percentages not 100%)
5. Try adding/removing split rows

**Expected Results:**
- Each row shows owner select, percentage input, calculated amount
- Add button adds a new row
- Remove button removes a row
- Percentages totaling 100% shows no error
- Percentages not totaling 100% shows validation error

---

#### UAT-033: Settlement components render in Storybook

**User Story:** US-033 - Settlement Components
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to "Composed / BalanceCard" story
2. Navigate to "Composed / SettlementForm" story
3. Navigate to "Composed / SettlementHistory" story

**Expected Results:**
- BalanceCard: shows owner balance, color-coded (green positive, red negative)
- SettlementForm: amount input with settle button
- SettlementHistory: table of past settlements with dates and amounts
- Empty history shows "No settlements" message

---

#### UAT-034: Ownership components validate percentages in Storybook

**User Story:** US-034 - Ownership Components
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to "Composed / OwnershipSection" in Storybook
2. View single owner (100%)
3. View multi-owner
4. View validation error

**Expected Results:**
- Owner select + percentage input per row
- Add/remove buttons for rows
- 100% total shows no error
- Non-100% total shows validation error

---

#### UAT-035: EventDialog renders create/edit modes in Storybook

**User Story:** US-035 - EventDialog Component
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to "Composed / EventDialog" in Storybook
2. View create mode (empty form)
3. View edit mode (pre-filled form)
4. View with validation errors

**Expected Results:**
- Create mode: empty fields, "Create Event" title
- Edit mode: fields pre-filled with event data, "Edit Event" title
- Form includes: title, type select, date/time picker, property select, description
- Validation errors shown on required fields

---

#### UAT-036: Banking admin components render in Storybook

**User Story:** US-036 - Banking Admin Components
**Acceptance Criteria Tested:** All

**Preconditions:**
- Storybook running

**Steps:**
1. Navigate to "Composed / BankAccountsList" story
2. Navigate to "Composed / ImportProgressDialog" story
3. Navigate to "Composed / RuleEditor" story
4. Navigate to "Composed / WebhookStatusWidget" story

**Expected Results:**
- BankAccountsList: table with accounts, status chips
- ImportProgressDialog: spinner with status messages
- RuleEditor: form fields for rule configuration
- WebhookStatusWidget: connection status indicator

---

### Epic: Page Migration

#### UAT-037: Layout renders with new AppBar, Sidebar, and Container

**User Story:** US-037 - Layout.tsx Migration
**Acceptance Criteria Tested:** All

**Preconditions:**
- App running, logged in as admin

**Steps:**
1. Navigate to http://localhost:5173/dashboard
2. Verify top AppBar is visible
3. Verify sidebar navigation is visible on desktop
4. Click "Properties" in sidebar
5. Resize browser to mobile width (<900px)
6. Verify sidebar collapses
7. Click hamburger menu icon
8. Verify sidebar opens as overlay
9. Click a navigation item in mobile sidebar

**Expected Results:**
- AppBar: blue background, "Landlord Management System" title, user email, logout button
- Sidebar: all navigation items visible, active item highlighted blue
- Navigation works (clicking items changes page)
- Mobile: sidebar hidden, hamburger icon visible in AppBar
- Mobile sidebar: slides in as overlay with backdrop
- Clicking nav item closes mobile sidebar
- Pending review badge shows count for admin users
- No MUI class names in DOM (no "Mui" prefixed classes)
- Visual match to pencil.dev reference design

---

#### UAT-038: ToastContext notifications work

**User Story:** US-051 - ToastContext Migration
**Acceptance Criteria Tested:** All

**Preconditions:**
- App running, logged in

**Steps:**
1. Trigger a success action (e.g., create a transaction)
2. Observe toast notification
3. Trigger an error (e.g., submit invalid form)
4. Click the close button on a toast
5. Wait for auto-dismiss on next toast

**Expected Results:**
- Success toast: green, bottom-right, with check icon
- Error toast: red, bottom-right, with alert icon
- Close button dismisses immediately
- Auto-dismiss after ~6 seconds
- `useToast()` API unchanged (no regressions in consuming components)

---

#### UAT-039: Dashboard page renders correctly

**User Story:** US-038 - Dashboard Page Migration
**Acceptance Criteria Tested:** All

**Preconditions:**
- App running, logged in, seed data loaded

**Steps:**
1. Navigate to http://localhost:5173/dashboard
2. Verify stats cards at top
3. Verify grid layout of dashboard sections
4. Resize to mobile
5. Compare to pencil.dev reference

**Expected Results:**
- Stats cards show metric values with trend icons (Lucide TrendingUp/Down)
- Grid layout matches reference (cards arranged in responsive grid)
- No MUI imports or sx prop artifacts
- Mobile: cards stack vertically
- Visual match to pencil.dev reference design

---

#### UAT-040: Properties and PropertyDetail pages render correctly

**User Story:** US-039 - Properties and PropertyDetail Page Migration
**Acceptance Criteria Tested:** All

**Preconditions:**
- App running, logged in, seed data with properties

**Steps:**
1. Navigate to http://localhost:5173/properties
2. Verify property cards display
3. Click "Add Property" button
4. Verify create dialog opens
5. Close dialog
6. Click a property card to view detail
7. Verify PropertyDetail page sections (details, ownership, transactions, settlements)
8. Compare both pages to pencil.dev reference

**Expected Results:**
- Properties: property cards in grid, search/filter visible
- Add button opens create dialog with form fields
- PropertyDetail: tabbed/sectioned layout with property info
- Ownership section shows owners with percentages
- Settlement section shows balances and history
- All icons are Lucide (no MUI icons)
- Visual match to reference designs

---

#### UAT-041: Transactions page renders and functions correctly

**User Story:** US-040 - Transactions Page Migration
**Acceptance Criteria Tested:** All

**Preconditions:**
- App running, logged in, seed data with transactions

**Steps:**
1. Navigate to http://localhost:5173/transactions
2. Verify transaction table renders
3. Use PropertySelector to filter by property
4. Use DateRangePicker to filter by date range
5. Click column header to sort
6. Navigate pagination
7. Click "Add Transaction" button
8. Verify create dialog with SplitSection
9. Compare to pencil.dev reference

**Expected Results:**
- Table shows transactions with date, description, amount (color-coded), type, property
- PropertySelector dropdown includes "All Properties"
- DateRangePicker filters table data
- Sort arrows appear on sortable columns
- Pagination works (page navigation, rows-per-page)
- Create dialog shows form with split section for cost splitting
- Visual match to reference design

---

#### UAT-042: Tenants page renders correctly

**User Story:** US-041 - Tenants Page Migration
**Acceptance Criteria Tested:** All

**Preconditions:**
- App running, logged in, seed data with tenants

**Steps:**
1. Navigate to http://localhost:5173/tenants
2. Verify tenant cards display
3. Click "Add Tenant" button
4. Verify create dialog
5. Compare to pencil.dev reference

**Expected Results:**
- Tenant cards with avatar, name, contact info, lease status
- Add button opens create dialog
- Dialog uses new form primitives (TextField, Select)
- Visual match to reference design

---

#### UAT-043: Leases page renders correctly

**User Story:** US-042 - Leases Page Migration
**Acceptance Criteria Tested:** All

**Preconditions:**
- App running, logged in, seed data with leases

**Steps:**
1. Navigate to http://localhost:5173/leases
2. Verify lease table renders
3. Verify lease status chips
4. Click "Add Lease"
5. Verify create dialog with DatePicker fields
6. Compare to pencil.dev reference

**Expected Results:**
- Table shows leases with property, tenant, dates, status, rent
- Status displayed as Chip (active=green, expired=red, etc.)
- Create dialog has DatePicker for start/end dates, Select for property/tenant
- Visual match to reference design

---

#### UAT-044: Events page renders correctly

**User Story:** US-043 - Events Page Migration
**Acceptance Criteria Tested:** All

**Preconditions:**
- App running, logged in, seed data with events

**Steps:**
1. Navigate to http://localhost:5173/events
2. Verify calendar renders (react-big-calendar)
3. Click on a date to create event
4. Verify EventDialog opens
5. Verify EventBadge on calendar events
6. Compare to pencil.dev reference

**Expected Results:**
- Calendar displays correctly (react-big-calendar styles preserved)
- Event badges show color-coded event types
- EventDialog opens with form fields for create/edit
- Calendar navigation (month/week/day) works
- Visual match to reference design

---

#### UAT-045: Documents page renders correctly

**User Story:** US-044 - Documents Page Migration
**Acceptance Criteria Tested:** All

**Preconditions:**
- App running, logged in, seed data with documents

**Steps:**
1. Navigate to http://localhost:5173/documents
2. Verify document table renders
3. Verify upload area (FileUpload component)
4. Compare to pencil.dev reference

**Expected Results:**
- Table shows documents with name, type, entity, date
- FileUpload zone visible with drag-and-drop area
- Visual match to reference design

---

#### UAT-046: Reports page renders correctly

**User Story:** US-045 - Reports Page Migration
**Acceptance Criteria Tested:** All

**Preconditions:**
- App running, logged in, seed data

**Steps:**
1. Navigate to http://localhost:5173/finances/reports
2. Verify ToggleGroup for report type selection
3. Verify PropertySelector filter
4. Verify DateRangePicker filter
5. Verify report data table
6. Switch between report types
7. Compare to pencil.dev reference

**Expected Results:**
- ToggleGroup shows report type options, selected highlighted
- PropertySelector and DateRangePicker filters work
- Table displays report data
- Switching report type updates the data
- Visual match to reference design

---

#### UAT-047: Settings page renders correctly

**User Story:** US-046 - Settings Page Migration
**Acceptance Criteria Tested:** All

**Preconditions:**
- App running, logged in

**Steps:**
1. Navigate to http://localhost:5173/settings
2. Verify card layout with form fields
3. Compare to pencil.dev reference

**Expected Results:**
- Settings form in Card components
- Form fields use TextField and Select primitives
- Visual match to reference design

---

#### UAT-048: Users page renders correctly

**User Story:** US-047 - Users Page Migration
**Acceptance Criteria Tested:** All

**Preconditions:**
- App running, logged in as admin

**Steps:**
1. Navigate to http://localhost:5173/users
2. Verify user table renders
3. Verify Avatar and Chip components in table
4. Click "Add User"
5. Verify create dialog
6. Compare to pencil.dev reference

**Expected Results:**
- Table shows users with Avatar, name, email, role (Chip)
- Create dialog with form fields
- Visual match to reference design

---

#### UAT-049: Login page renders correctly

**User Story:** US-048 - Login Page Migration
**Acceptance Criteria Tested:** All

**Preconditions:**
- App running, logged out

**Steps:**
1. Navigate to http://localhost:5173/login
2. Verify centered card layout
3. Enter credentials
4. Click login button
5. Verify redirect to dashboard on success
6. Enter wrong credentials
7. Verify error display

**Expected Results:**
- Centered Card with TextField for email and password
- Button for login
- Successful login redirects to dashboard
- Failed login shows error message (inline or toast)
- Visual match to reference design

---

#### UAT-050: NotFound page renders correctly

**User Story:** US-049 - NotFound Page Migration
**Acceptance Criteria Tested:** All

**Preconditions:**
- App running, logged in

**Steps:**
1. Navigate to http://localhost:5173/nonexistent-page
2. Verify 404 content displays

**Expected Results:**
- "Page not found" message or similar
- Button to navigate back to dashboard
- Visual match to reference design

---

#### UAT-051: Admin pages render correctly

**User Story:** US-050 - Admin Pages Migration
**Acceptance Criteria Tested:** All

**Preconditions:**
- App running, logged in as admin

**Steps:**
1. Navigate to http://localhost:5173/admin/bank-accounts
2. Verify BankAccountsList and WebhookStatusWidget
3. Navigate to http://localhost:5173/admin/bank-account-rules
4. Verify RuleEditor and table
5. Navigate to http://localhost:5173/admin/pending-transactions
6. Verify pending transactions table
7. Compare all three to pencil.dev references

**Expected Results:**
- BankAccounts: table with status chips, webhook widget
- BankAccountRules: rule table with editor
- PendingTransactions: table with review actions
- All icons are Lucide
- Visual match to reference designs

---

### Epic: Cleanup & Verification

#### UAT-052: No MUI dependencies remain

**User Story:** US-052 - Remove MUI Dependencies
**Acceptance Criteria Tested:** All

**Preconditions:**
- Migration complete

**Steps:**
1. Run `grep -r "@mui" client/src/ --include="*.ts" --include="*.tsx"`
2. Run `grep -r "@emotion" client/src/ --include="*.ts" --include="*.tsx"`
3. Check `client/package.json` for MUI/Emotion packages
4. Verify `client/src/theme.ts` does not exist

**Expected Results:**
- grep returns zero results for both commands
- No MUI or Emotion packages in package.json
- theme.ts deleted
- No "Mui" prefixed CSS class names in browser DevTools on any page

---

#### UAT-053: Build, lint, and tests pass

**User Story:** US-053 - Build and Test Verification
**Acceptance Criteria Tested:** All

**Preconditions:**
- Migration complete

**Steps:**
1. Run `cd client && npm run build`
2. Run `npm run lint`
3. Run `npm test`
4. Run `npm run dev` and navigate all pages

**Expected Results:**
- Build: zero errors, zero warnings about missing chunks
- Lint: no new warnings
- Tests: all pass, coverage meets thresholds (80% lines/functions/statements, 70% branches)
- Dev server: starts successfully, all 16 pages load without console errors

---

#### UAT-054: Visual parity with reference designs

**User Story:** US-054 - Visual Verification Against Reference Designs
**Acceptance Criteria Tested:** All

**Preconditions:**
- Migration complete, app running, pencil.dev reference designs available

**Steps:**
1. Open each of the 16 pages at desktop width (1280px+)
2. Compare side-by-side with pencil.dev reference design
3. Check Dashboard at mobile width (375px)
4. Check Transactions at mobile width
5. Check PropertyDetail at mobile width
6. Open transaction create dialog, compare to reference
7. Open event create dialog, compare to reference
8. Open confirm delete dialog, compare to reference

**Expected Results:**
- All 16 pages match their desktop reference designs (layout, colors, spacing, typography)
- Key pages match mobile reference designs (responsive behavior correct)
- Dialogs render centered with backdrop, matching reference styling
- No significant visual regressions (minor pixel differences acceptable)
- Colors match: primary blue #1976d2, backgrounds, text colors
- Typography matches: font family, sizes, weights

---

## Summary

| UAT ID | Story | Scenario | Status |
|--------|-------|----------|--------|
| UAT-001 | US-001 | SCSS architecture loads correctly | pending |
| UAT-002 | US-002 | Storybook launches with SCSS support | pending |
| UAT-003 | US-003 | Pencil.dev reference designs exist | pending |
| UAT-004 | US-004 | New dependencies installed alongside MUI | pending |
| UAT-005 | US-017 | Spinner component renders in Storybook | pending |
| UAT-006 | US-005 | Button component renders all variants | pending |
| UAT-007 | US-006 | TextField component renders all states | pending |
| UAT-008 | US-007 | Select component renders | pending |
| UAT-009 | US-008 | DatePicker component renders | pending |
| UAT-010 | US-009 | FileUpload component renders | pending |
| UAT-011 | US-010 | Card component renders | pending |
| UAT-012 | US-011 | Table component renders with sort/pagination | pending |
| UAT-013 | US-012 | Chip component renders all variants | pending |
| UAT-014 | US-013 | Badge component renders | pending |
| UAT-015 | US-014 | Avatar component renders | pending |
| UAT-016 | US-015 | Dialog component renders with focus trap | pending |
| UAT-017 | US-016 | Toast component renders all severities | pending |
| UAT-018 | US-018 | AppBar component renders | pending |
| UAT-019 | US-019 | Sidebar component renders responsively | pending |
| UAT-020 | US-020 | Container component renders | pending |
| UAT-021 | US-021 | Divider component renders | pending |
| UAT-022 | US-022 | Tooltip component renders | pending |
| UAT-023 | US-023 | ToggleGroup component renders | pending |
| UAT-024 | US-024 | StatsCard renders with trends | pending |
| UAT-025 | US-025 | PropertyCard renders property info | pending |
| UAT-026 | US-026 | TenantCard renders tenant info | pending |
| UAT-027 | US-027 | TransactionRow renders in table | pending |
| UAT-028 | US-028 | ConfirmDialog works | pending |
| UAT-029 | US-029 | DateRangePicker validates range | pending |
| UAT-030 | US-030 | PropertySelector includes All Properties | pending |
| UAT-031 | US-031 | EventBadge shows event types | pending |
| UAT-032 | US-032 | SplitSection validates percentages | pending |
| UAT-033 | US-033 | Settlement components render | pending |
| UAT-034 | US-034 | Ownership components validate | pending |
| UAT-035 | US-035 | EventDialog create/edit modes | pending |
| UAT-036 | US-036 | Banking admin components render | pending |
| UAT-037 | US-037 | Layout renders with AppBar, Sidebar, Container | pending |
| UAT-038 | US-051 | ToastContext notifications work | pending |
| UAT-039 | US-038 | Dashboard page renders correctly | pending |
| UAT-040 | US-039 | Properties and PropertyDetail render correctly | pending |
| UAT-041 | US-040 | Transactions page renders and functions | pending |
| UAT-042 | US-041 | Tenants page renders correctly | pending |
| UAT-043 | US-042 | Leases page renders correctly | pending |
| UAT-044 | US-043 | Events page renders correctly | pending |
| UAT-045 | US-044 | Documents page renders correctly | pending |
| UAT-046 | US-045 | Reports page renders correctly | pending |
| UAT-047 | US-046 | Settings page renders correctly | pending |
| UAT-048 | US-047 | Users page renders correctly | pending |
| UAT-049 | US-048 | Login page renders correctly | pending |
| UAT-050 | US-049 | NotFound page renders correctly | pending |
| UAT-051 | US-050 | Admin pages render correctly | pending |
| UAT-052 | US-052 | No MUI dependencies remain | pending |
| UAT-053 | US-053 | Build, lint, and tests pass | pending |
| UAT-054 | US-054 | Visual parity with reference designs | pending |

## Results

<!-- Filled in during execution -->
| UAT ID | Status | Notes |
|--------|--------|-------|
