# User Stories: MUI to Native React + SCSS Migration

**Design document:** docs/plans/2026-02-23-mui-to-scss-migration-design.md
**Date:** 2026-02-23

## Roles

- **Developer**: The person building, testing, and maintaining the UI components and pages

## Epic: Foundation

### US-001: SCSS Architecture Setup

**As a** developer, **I want** a well-structured SCSS foundation with design tokens, mixins, reset, and typography partials, **so that** all new components share consistent styling variables.

**Acceptance Criteria:**
- [ ] `_variables.scss` contains color, spacing, breakpoint, shadow, and border-radius tokens matching current MUI theme values
- [ ] `_mixins.scss` provides responsive breakpoint mixins (`sm`, `md`, `lg`) and common patterns
- [ ] `_reset.scss` normalizes browser defaults (replaces MUI CssBaseline)
- [ ] `_typography.scss` defines font families, size scale, and heading styles matching current theme
- [ ] `global.scss` imports all partials and is loaded at app root
- [ ] Existing `calendar.css` remains unchanged

**Priority:** High
**Complexity:** Small
**Epic:** Foundation

---

### US-002: Storybook Setup

**As a** developer, **I want** Storybook 10 configured with SCSS support and viewport testing, **so that** I can develop and preview components in isolation.

**Acceptance Criteria:**
- [ ] Storybook 10 installed with React/Vite builder
- [ ] SCSS modules compile correctly in Storybook
- [ ] Global styles (`global.scss`) load in Storybook preview
- [ ] Viewport addon configured for responsive testing (mobile, tablet, desktop)
- [ ] Stories organized by category directories: Primitives, Composed, Layout
- [ ] `npm run storybook` script added to package.json

**Priority:** High
**Complexity:** Small
**Epic:** Foundation

---

### US-003: Pencil.dev Reference Designs

**As a** developer, **I want** pencil.dev reference designs capturing the current look of all pages, **so that** I can verify visual parity after migration.

**Acceptance Criteria:**
- [ ] Reference designs created for all 16 pages
- [ ] Designs capture key layout patterns: dashboard grid, data tables, detail views, forms, dialogs
- [ ] Responsive variants captured for mobile and desktop breakpoints
- [ ] Designs stored or linked in `docs/plans/` for easy access during migration

**Priority:** High
**Complexity:** Medium
**Epic:** Foundation

---

### US-004: Install New Dependencies

**As a** developer, **I want** `sass`, `lucide-react`, `react-datepicker`, and Storybook packages installed, **so that** component development can begin.

**Acceptance Criteria:**
- [ ] `sass` added as dev dependency and Vite compiles `.module.scss` files
- [ ] `lucide-react` added and a test icon renders correctly
- [ ] `react-datepicker` added with its type definitions
- [ ] All new dependencies listed in `client/package.json`
- [ ] `npm run dev` and `npm run build` still pass with new dependencies alongside existing MUI

**Priority:** High
**Complexity:** Small
**Epic:** Foundation

---

## Epic: Primitive Components

### US-005: Button Component

**As a** developer, **I want** a Button component with primary, secondary, text, and icon-only variants, **so that** I can replace all MUI Button and IconButton usage.

**Acceptance Criteria:**
- [ ] Supports variants: `primary`, `secondary`, `text`, `icon`
- [ ] Supports `disabled`, `loading` (shows Spinner), and `fullWidth` props
- [ ] Accepts `startIcon` and `endIcon` props for Lucide icons
- [ ] Storybook story shows all variants, sizes, and states
- [ ] Visual match to current MUI Button styling

**Priority:** High
**Complexity:** Small
**Epic:** Primitive Components

---

### US-006: TextField Component

**As a** developer, **I want** a TextField component with label, error state, and adornment support, **so that** I can replace all MUI TextField and InputAdornment usage.

**Acceptance Criteria:**
- [ ] Supports `label`, `placeholder`, `helperText`, `error`, and `disabled` props
- [ ] Supports `startAdornment` and `endAdornment` for icons or text
- [ ] Supports `type` prop (text, password, number, email)
- [ ] Supports `multiline` with configurable rows
- [ ] Storybook story shows all states including error with helper text
- [ ] Visual match to current MUI TextField styling

**Priority:** High
**Complexity:** Small
**Epic:** Primitive Components

---

### US-007: Select Component

**As a** developer, **I want** a Select dropdown with label and error state, **so that** I can replace MUI Select, FormControl, and InputLabel.

**Acceptance Criteria:**
- [ ] Supports `label`, `placeholder`, `error`, `helperText`, and `disabled` props
- [ ] Accepts `options` array of `{ value, label }` objects
- [ ] Supports controlled value via `value` and `onChange`
- [ ] Storybook story shows default, populated, error, and disabled states
- [ ] Visual match to current MUI Select styling

**Priority:** High
**Complexity:** Small
**Epic:** Primitive Components

---

### US-008: DatePicker Component

**As a** developer, **I want** a DatePicker component wrapping react-datepicker with our SCSS styling, **so that** I can replace MUI DatePicker and DateTimePicker.

**Acceptance Criteria:**
- [ ] Supports date-only and datetime modes via `showTimeSelect` prop
- [ ] Supports `label`, `error`, `helperText`, and `disabled` props
- [ ] Styled with SCSS module to match current MUI date picker look
- [ ] Works with `date-fns` for formatting and locale
- [ ] Storybook story shows date-only, datetime, error, and disabled states

**Priority:** High
**Complexity:** Medium
**Epic:** Primitive Components

---

### US-009: FileUpload Component

**As a** developer, **I want** a FileUpload component with drag-and-drop and file list, **so that** I can replace the current MUI-styled upload component.

**Acceptance Criteria:**
- [ ] Supports drag-and-drop zone with visual feedback on hover
- [ ] Displays list of selected files with remove option
- [ ] Supports `accept` prop for file type filtering
- [ ] Supports `multiple` prop for multi-file selection
- [ ] Storybook story shows empty, dragging, and populated states
- [ ] Visual match to current FileUpload styling

**Priority:** High
**Complexity:** Small
**Epic:** Primitive Components

---

### US-010: Card Component

**As a** developer, **I want** a Card component with optional header, content, and actions sections, **so that** I can replace MUI Card, CardContent, and CardActions.

**Acceptance Criteria:**
- [ ] Supports `Card`, `Card.Header`, `Card.Content`, and `Card.Actions` compound pattern
- [ ] Renders with paper-white background, shadow, and border-radius matching MUI defaults
- [ ] Actions section aligns content to the right
- [ ] Storybook story shows minimal, full, and clickable card variants
- [ ] Visual match to current MUI Card styling

**Priority:** High
**Complexity:** Small
**Epic:** Primitive Components

---

### US-011: Table Component

**As a** developer, **I want** a Table component with sortable headers and built-in pagination, **so that** I can replace the 8 MUI Table components.

**Acceptance Criteria:**
- [ ] Supports `Table`, `Table.Head`, `Table.Body`, `Table.Row`, `Table.Cell` compound pattern
- [ ] Sortable columns via `onSort` callback with visual sort indicator
- [ ] Built-in pagination footer with page size and page number controls
- [ ] Supports `Table.Container` wrapper for horizontal scroll on narrow screens
- [ ] Storybook story shows sortable, paginated, empty state, and loading variants
- [ ] Visual match to current MUI Table styling

**Priority:** High
**Complexity:** Medium
**Epic:** Primitive Components

---

### US-012: Chip Component

**As a** developer, **I want** a Chip component for small labels and tags, **so that** I can replace MUI Chip.

**Acceptance Criteria:**
- [ ] Supports `color` prop for semantic variants (default, primary, success, warning, error)
- [ ] Supports optional `onDelete` prop showing a remove icon
- [ ] Supports `size` prop (small, medium)
- [ ] Storybook story shows all color and size variants
- [ ] Visual match to current MUI Chip styling

**Priority:** Medium
**Complexity:** Small
**Epic:** Primitive Components

---

### US-013: Badge Component

**As a** developer, **I want** a Badge component for notification counts, **so that** I can replace MUI Badge.

**Acceptance Criteria:**
- [ ] Wraps a child element and positions a count indicator at top-right
- [ ] Hides when count is zero
- [ ] Supports `max` prop to show "99+" style overflow
- [ ] Storybook story shows zero, low count, and overflow states
- [ ] Visual match to current MUI Badge styling

**Priority:** Medium
**Complexity:** Small
**Epic:** Primitive Components

---

### US-014: Avatar Component

**As a** developer, **I want** an Avatar component showing user initials or an image, **so that** I can replace MUI Avatar.

**Acceptance Criteria:**
- [ ] Shows initials derived from a `name` prop when no `src` provided
- [ ] Shows image when `src` prop provided, with fallback to initials on load error
- [ ] Supports `size` prop (small, medium, large)
- [ ] Generates consistent background color from the name string
- [ ] Storybook story shows initials, image, fallback, and size variants

**Priority:** Medium
**Complexity:** Small
**Epic:** Primitive Components

---

### US-015: Dialog Component

**As a** developer, **I want** a Dialog component with title, content, and actions sections, **so that** I can replace MUI Dialog, DialogTitle, DialogContent, and DialogActions.

**Acceptance Criteria:**
- [ ] Supports `Dialog`, `Dialog.Title`, `Dialog.Content`, `Dialog.Actions` compound pattern
- [ ] Opens/closes via `open` and `onClose` props
- [ ] Renders a backdrop overlay that closes dialog on click (unless `disableBackdropClose`)
- [ ] Closes on Escape key press
- [ ] Traps focus within the dialog when open
- [ ] Storybook story shows small, medium, and large dialog variants with form content

**Priority:** High
**Complexity:** Medium
**Epic:** Primitive Components

---

### US-016: Toast Component

**As a** developer, **I want** a Toast notification component with success, error, warning, and info variants, **so that** I can replace MUI Snackbar and Alert.

**Acceptance Criteria:**
- [ ] Supports `severity` prop: `success`, `error`, `warning`, `info`
- [ ] Auto-dismisses after configurable duration (default 5s)
- [ ] Shows a close button for manual dismissal
- [ ] Positions at bottom-center of viewport (matching current Snackbar placement)
- [ ] Storybook story shows all severity variants and auto-dismiss behavior

**Priority:** High
**Complexity:** Small
**Epic:** Primitive Components

---

### US-017: Spinner Component

**As a** developer, **I want** a Spinner loading indicator, **so that** I can replace MUI CircularProgress.

**Acceptance Criteria:**
- [ ] Supports `size` prop (small, medium, large)
- [ ] Supports optional `label` text displayed below the spinner
- [ ] Uses CSS animation (no JavaScript timers)
- [ ] Storybook story shows all sizes with and without labels

**Priority:** Medium
**Complexity:** Small
**Epic:** Primitive Components

---

### US-018: AppBar Component

**As a** developer, **I want** an AppBar top navigation bar, **so that** I can replace MUI AppBar and Toolbar.

**Acceptance Criteria:**
- [ ] Fixed to top of viewport with correct z-index
- [ ] Accepts `children` for flexible content (title, icons, actions)
- [ ] Supports a hamburger menu button slot for mobile sidebar toggle
- [ ] Uses primary theme color background
- [ ] Storybook story shows desktop and mobile variants

**Priority:** High
**Complexity:** Small
**Epic:** Primitive Components

---

### US-019: Sidebar Component

**As a** developer, **I want** a Sidebar navigation with collapsible menu items, **so that** I can replace MUI Drawer and List family.

**Acceptance Criteria:**
- [ ] Accepts `items` array of `{ label, icon, path, badge? }` objects
- [ ] Highlights the active item based on current route
- [ ] Collapses to icons-only on desktop via toggle, slides in as overlay on mobile
- [ ] Supports `open` and `onClose` props for mobile overlay control
- [ ] Storybook story shows expanded, collapsed, and mobile overlay states

**Priority:** High
**Complexity:** Medium
**Epic:** Primitive Components

---

### US-020: Container Component

**As a** developer, **I want** a Container component with max-width content wrapping, **so that** I can replace MUI Container.

**Acceptance Criteria:**
- [ ] Centers content horizontally with responsive horizontal padding
- [ ] Supports `maxWidth` prop matching breakpoints (`sm`, `md`, `lg`, `xl`)
- [ ] Defaults to `lg` max-width
- [ ] Storybook story shows different max-width settings

**Priority:** High
**Complexity:** Small
**Epic:** Primitive Components

---

### US-021: Divider Component

**As a** developer, **I want** a Divider component for horizontal and vertical separation, **so that** I can replace MUI Divider.

**Acceptance Criteria:**
- [ ] Supports `orientation` prop: `horizontal` (default), `vertical`
- [ ] Supports optional `spacing` prop to control margin above/below
- [ ] Storybook story shows horizontal, vertical, and custom spacing variants

**Priority:** Low
**Complexity:** Small
**Epic:** Primitive Components

---

### US-022: Tooltip Component

**As a** developer, **I want** a Tooltip component for hover text, **so that** I can replace MUI Tooltip.

**Acceptance Criteria:**
- [ ] Wraps a child element and shows tooltip on hover/focus
- [ ] Supports `placement` prop: `top`, `bottom`, `left`, `right`
- [ ] Appears after a short delay (200ms) and disappears on mouse leave
- [ ] Storybook story shows all placement variants

**Priority:** Medium
**Complexity:** Small
**Epic:** Primitive Components

---

### US-023: ToggleGroup Component

**As a** developer, **I want** a ToggleGroup segmented button component, **so that** I can replace MUI ToggleButton and ToggleButtonGroup.

**Acceptance Criteria:**
- [ ] Accepts `options` array of `{ value, label, icon? }` objects
- [ ] Supports single-select via `value` and `onChange` props
- [ ] Visually highlights the selected option
- [ ] Storybook story shows text-only, icon-with-text, and disabled variants

**Priority:** Medium
**Complexity:** Small
**Epic:** Primitive Components

---

## Epic: Composed Components

### US-024: StatsCard Component

**As a** developer, **I want** a StatsCard showing a metric value with trend icon and label, **so that** I can replace the current MUI-based dashboard stats cards.

**Acceptance Criteria:**
- [ ] Accepts `title`, `value`, `trend` (up/down/neutral), and `trendValue` props
- [ ] Shows appropriate Lucide trend icon with color (green up, red down)
- [ ] Built on the Card primitive
- [ ] Storybook story shows positive trend, negative trend, and neutral variants

**Priority:** High
**Complexity:** Small
**Epic:** Composed Components

---

### US-025: PropertyCard Component

**As a** developer, **I want** a PropertyCard showing property summary with actions, **so that** I can replace the current MUI-based property cards.

**Acceptance Criteria:**
- [ ] Displays address, tenant count, and key property info
- [ ] Supports action buttons (edit, view detail)
- [ ] Built on Card and Button primitives
- [ ] Storybook story shows occupied, vacant, and multi-owner property variants

**Priority:** High
**Complexity:** Small
**Epic:** Composed Components

---

### US-026: TenantCard Component

**As a** developer, **I want** a TenantCard displaying tenant information, **so that** I can replace the current MUI-based tenant cards.

**Acceptance Criteria:**
- [ ] Displays tenant name, contact info, and lease status
- [ ] Uses Avatar primitive for tenant initials/photo
- [ ] Built on Card primitive
- [ ] Storybook story shows active lease, expired lease, and no lease variants

**Priority:** High
**Complexity:** Small
**Epic:** Composed Components

---

### US-027: TransactionRow Component

**As a** developer, **I want** a TransactionRow for displaying transaction line items, **so that** I can replace the current MUI-based transaction rows.

**Acceptance Criteria:**
- [ ] Displays date, description, amount, type, and property
- [ ] Color-codes amounts (green income, red expense)
- [ ] Supports action icons (edit, delete)
- [ ] Designed to work within the Table primitive
- [ ] Storybook story shows income, expense, and split transaction variants

**Priority:** High
**Complexity:** Small
**Epic:** Composed Components

---

### US-028: ConfirmDialog Component

**As a** developer, **I want** a ConfirmDialog for destructive action confirmation, **so that** I can replace the current MUI-based confirm dialog.

**Acceptance Criteria:**
- [ ] Accepts `title`, `message`, `onConfirm`, and `onCancel` props
- [ ] Supports `severity` prop (warning, danger) to style the confirm button
- [ ] Built on Dialog and Button primitives
- [ ] Storybook story shows warning and danger severity variants

**Priority:** High
**Complexity:** Small
**Epic:** Composed Components

---

### US-029: DateRangePicker Component

**As a** developer, **I want** a DateRangePicker for from/to date selection, **so that** I can replace the current MUI-based date range picker.

**Acceptance Criteria:**
- [ ] Accepts `startDate`, `endDate`, `onStartChange`, `onEndChange` props
- [ ] Validates that end date is not before start date
- [ ] Built on DatePicker primitive
- [ ] Storybook story shows empty, populated, and invalid range states

**Priority:** High
**Complexity:** Small
**Epic:** Composed Components

---

### US-030: PropertySelector Component

**As a** developer, **I want** a PropertySelector dropdown for filtering by property, **so that** I can replace the current MUI-based property selector.

**Acceptance Criteria:**
- [ ] Accepts `properties` array and `value`/`onChange` props
- [ ] Includes an "All Properties" option
- [ ] Built on Select primitive
- [ ] Storybook story shows single property, all properties, and empty list states

**Priority:** Medium
**Complexity:** Small
**Epic:** Composed Components

---

### US-031: EventBadge Component

**As a** developer, **I want** an EventBadge for calendar event indicators, **so that** I can replace the current MUI-based event badge.

**Acceptance Criteria:**
- [ ] Displays event type with color-coded Chip
- [ ] Supports event types: maintenance, inspection, lease renewal, custom
- [ ] Built on Chip primitive
- [ ] Storybook story shows all event type variants

**Priority:** Medium
**Complexity:** Small
**Epic:** Composed Components

---

### US-032: SplitSection and SplitInput Components

**As a** developer, **I want** SplitSection and SplitInput components for transaction cost splitting, **so that** I can replace the current MUI-based split UI.

**Acceptance Criteria:**
- [ ] SplitSection renders a list of SplitInput rows with add/remove controls
- [ ] SplitInput shows owner select, percentage, and calculated amount
- [ ] Validates that split percentages total 100%
- [ ] Built on TextField, Select, and Button primitives
- [ ] Storybook story shows two-way split, three-way split, and validation error states

**Priority:** High
**Complexity:** Medium
**Epic:** Composed Components

---

### US-033: Settlement Components (SettlementForm, SettlementHistory, BalanceCard)

**As a** developer, **I want** settlement workflow components, **so that** I can replace the current MUI-based settlement UI.

**Acceptance Criteria:**
- [ ] BalanceCard displays owner balance with overpayment/underpayment styling
- [ ] SettlementForm provides amount input with settle action button
- [ ] SettlementHistory shows a table of past settlements with dates and amounts
- [ ] All built on Card, TextField, Button, and Table primitives
- [ ] Storybook stories for each component showing key states (positive balance, negative balance, empty history)

**Priority:** High
**Complexity:** Medium
**Epic:** Composed Components

---

### US-034: Ownership Components (OwnershipSection, OwnerInput)

**As a** developer, **I want** property ownership management components, **so that** I can replace the current MUI-based ownership UI.

**Acceptance Criteria:**
- [ ] OwnershipSection renders a list of OwnerInput rows with add/remove controls
- [ ] OwnerInput shows owner select and ownership percentage
- [ ] Validates that ownership percentages total 100%
- [ ] Built on Select, TextField, and Button primitives
- [ ] Storybook story shows single owner, multi-owner, and validation error states

**Priority:** High
**Complexity:** Small
**Epic:** Composed Components

---

### US-035: EventDialog Component

**As a** developer, **I want** an EventDialog for creating and editing calendar events, **so that** I can replace the current MUI-based event dialog.

**Acceptance Criteria:**
- [ ] Supports create and edit modes via `event` prop (null for create)
- [ ] Form fields: title, type, date/time, property, description
- [ ] Built on Dialog, TextField, Select, and DatePicker primitives
- [ ] Storybook story shows create mode, edit mode, and validation error states

**Priority:** High
**Complexity:** Small
**Epic:** Composed Components

---

### US-036: Banking Admin Components (BankAccountsList, ImportProgressDialog, RuleEditor, WebhookStatusWidget)

**As a** developer, **I want** banking admin components migrated to new primitives, **so that** I can replace the current MUI-based banking UI.

**Acceptance Criteria:**
- [ ] BankAccountsList displays accounts in a Table with status Chips
- [ ] ImportProgressDialog shows import progress with Spinner and status messages
- [ ] RuleEditor provides form for creating/editing bank transaction rules
- [ ] WebhookStatusWidget shows connection status with visual indicator
- [ ] All built on Table, Dialog, TextField, Chip, Spinner, and Card primitives
- [ ] Storybook stories for each component with key states

**Priority:** Medium
**Complexity:** Medium
**Epic:** Composed Components

---

## Epic: Page Migration

### US-037: Layout.tsx Migration

**As a** developer, **I want** the main Layout wrapper migrated to new components, **so that** all pages render within the new AppBar, Sidebar, and Container.

**Acceptance Criteria:**
- [ ] AppBar primitive replaces MUI AppBar/Toolbar
- [ ] Sidebar primitive replaces MUI Drawer and List family
- [ ] Container primitive replaces MUI Container
- [ ] Mobile responsive behavior preserved (hamburger menu, sidebar overlay)
- [ ] All MUI imports removed from Layout.tsx
- [ ] Visual match to pencil.dev reference design

**Priority:** High
**Complexity:** Medium
**Epic:** Page Migration

---

### US-038: Dashboard Page Migration

**As a** developer, **I want** the Dashboard page migrated to new components, **so that** it renders without any MUI dependencies.

**Acceptance Criteria:**
- [ ] StatsCard components replace MUI-based stat cards
- [ ] Dashboard grid layout reproduced with SCSS module
- [ ] All MUI imports and `sx` props removed
- [ ] Lucide icons replace MUI icons
- [ ] Visual match to pencil.dev reference design

**Priority:** High
**Complexity:** Medium
**Epic:** Page Migration

---

### US-039: Properties and PropertyDetail Page Migration

**As a** developer, **I want** the Properties list and PropertyDetail pages migrated, **so that** they render without any MUI dependencies.

**Acceptance Criteria:**
- [ ] PropertyCard components replace MUI-based cards on Properties page
- [ ] PropertyDetail uses Card, Table, and Chip primitives for detail sections
- [ ] OwnershipSection and settlement components integrated on PropertyDetail
- [ ] All MUI imports and `sx` props removed from both pages
- [ ] Lucide icons replace MUI icons
- [ ] Visual match to pencil.dev reference designs for both pages

**Priority:** High
**Complexity:** Large
**Epic:** Page Migration

---

### US-040: Transactions Page Migration

**As a** developer, **I want** the Transactions page migrated to new components, **so that** it renders without any MUI dependencies.

**Acceptance Criteria:**
- [ ] Table primitive with TransactionRow replaces MUI Table
- [ ] PropertySelector and DateRangePicker replace MUI filter controls
- [ ] Transaction create/edit dialog uses Dialog, TextField, Select, and SplitSection
- [ ] All MUI imports and `sx` props removed
- [ ] Lucide icons replace MUI icons
- [ ] Visual match to pencil.dev reference design

**Priority:** High
**Complexity:** Large
**Epic:** Page Migration

---

### US-041: Tenants Page Migration

**As a** developer, **I want** the Tenants page migrated to new components, **so that** it renders without any MUI dependencies.

**Acceptance Criteria:**
- [ ] TenantCard components replace MUI-based tenant display
- [ ] Create/edit tenant dialog uses Dialog and form primitives
- [ ] All MUI imports and `sx` props removed
- [ ] Lucide icons replace MUI icons
- [ ] Visual match to pencil.dev reference design

**Priority:** High
**Complexity:** Medium
**Epic:** Page Migration

---

### US-042: Leases Page Migration

**As a** developer, **I want** the Leases page migrated to new components, **so that** it renders without any MUI dependencies.

**Acceptance Criteria:**
- [ ] Table primitive replaces MUI Table for lease listing
- [ ] Create/edit lease dialog uses Dialog, TextField, Select, and DatePicker
- [ ] Lease status displayed with Chip primitive
- [ ] All MUI imports and `sx` props removed
- [ ] Visual match to pencil.dev reference design

**Priority:** High
**Complexity:** Medium
**Epic:** Page Migration

---

### US-043: Events Page Migration

**As a** developer, **I want** the Events page migrated to new components, **so that** it renders without any MUI dependencies.

**Acceptance Criteria:**
- [ ] EventDialog and EventBadge components integrated
- [ ] Calendar view (react-big-calendar) styling preserved
- [ ] All MUI imports and `sx` props removed
- [ ] Lucide icons replace MUI icons
- [ ] Visual match to pencil.dev reference design

**Priority:** High
**Complexity:** Medium
**Epic:** Page Migration

---

### US-044: Documents Page Migration

**As a** developer, **I want** the Documents page migrated to new components, **so that** it renders without any MUI dependencies.

**Acceptance Criteria:**
- [ ] Table primitive replaces MUI Table for document listing
- [ ] FileUpload component integrated for document uploads
- [ ] All MUI imports and `sx` props removed
- [ ] Lucide icons replace MUI icons
- [ ] Visual match to pencil.dev reference design

**Priority:** High
**Complexity:** Medium
**Epic:** Page Migration

---

### US-045: Reports Page Migration

**As a** developer, **I want** the Reports page migrated to new components, **so that** it renders without any MUI dependencies.

**Acceptance Criteria:**
- [ ] PropertySelector and DateRangePicker replace MUI filter controls
- [ ] ToggleGroup replaces MUI ToggleButtonGroup for report type selection
- [ ] Table primitive replaces MUI Table for report data
- [ ] All MUI imports and `sx` props removed
- [ ] Visual match to pencil.dev reference design

**Priority:** High
**Complexity:** Medium
**Epic:** Page Migration

---

### US-046: Settings Page Migration

**As a** developer, **I want** the Settings page migrated to new components, **so that** it renders without any MUI dependencies.

**Acceptance Criteria:**
- [ ] Card and form primitives replace MUI components
- [ ] All MUI imports and `sx` props removed
- [ ] Visual match to pencil.dev reference design

**Priority:** Medium
**Complexity:** Small
**Epic:** Page Migration

---

### US-047: Users Page Migration

**As a** developer, **I want** the Users page migrated to new components, **so that** it renders without any MUI dependencies.

**Acceptance Criteria:**
- [ ] Table primitive replaces MUI Table for user listing
- [ ] Avatar and Chip primitives used for user display
- [ ] Create/edit user dialog uses Dialog and form primitives
- [ ] All MUI imports and `sx` props removed
- [ ] Visual match to pencil.dev reference design

**Priority:** Medium
**Complexity:** Medium
**Epic:** Page Migration

---

### US-048: Login Page Migration

**As a** developer, **I want** the Login page migrated to new components, **so that** it renders without any MUI dependencies.

**Acceptance Criteria:**
- [ ] Card, TextField, and Button primitives replace MUI components
- [ ] Centered layout reproduced with SCSS module
- [ ] Error display uses Toast or inline error state
- [ ] All MUI imports and `sx` props removed
- [ ] Visual match to pencil.dev reference design

**Priority:** High
**Complexity:** Small
**Epic:** Page Migration

---

### US-049: NotFound Page Migration

**As a** developer, **I want** the NotFound page migrated to new components, **so that** it renders without any MUI dependencies.

**Acceptance Criteria:**
- [ ] Typography and Button primitives replace MUI components
- [ ] All MUI imports and `sx` props removed
- [ ] Visual match to pencil.dev reference design

**Priority:** Low
**Complexity:** Small
**Epic:** Page Migration

---

### US-050: Admin Pages Migration (BankAccounts, BankAccountRules, PendingTransactions)

**As a** developer, **I want** the three admin pages migrated to new components, **so that** they render without any MUI dependencies.

**Acceptance Criteria:**
- [ ] BankAccounts page uses BankAccountsList and WebhookStatusWidget composed components
- [ ] BankAccountRules page uses Table and RuleEditor composed components
- [ ] PendingTransactions page uses Table and form primitives
- [ ] All MUI imports and `sx` props removed from all three pages
- [ ] Lucide icons replace MUI icons
- [ ] Visual match to pencil.dev reference designs

**Priority:** Medium
**Complexity:** Medium
**Epic:** Page Migration

---

### US-051: ToastContext Migration

**As a** developer, **I want** the ToastContext updated to use the new Toast component, **so that** notifications render without MUI Snackbar/Alert.

**Acceptance Criteria:**
- [ ] MUI Snackbar and Alert replaced with Toast primitive
- [ ] `useToast()` hook API unchanged (no changes needed in consuming components)
- [ ] All four severity levels work correctly
- [ ] All MUI imports removed from ToastContext.tsx

**Priority:** High
**Complexity:** Small
**Epic:** Page Migration

---

## Epic: Cleanup & Verification

### US-052: Remove MUI Dependencies

**As a** developer, **I want** all MUI and Emotion packages removed from the project, **so that** the bundle no longer includes unused dependencies.

**Acceptance Criteria:**
- [ ] `@mui/material`, `@mui/icons-material`, `@mui/x-date-pickers` uninstalled
- [ ] `@emotion/react` and `@emotion/styled` uninstalled
- [ ] `client/src/theme.ts` deleted
- [ ] No MUI or Emotion imports remain in any source file (verified by grep)
- [ ] `package.json` and `package-lock.json` updated cleanly

**Priority:** High
**Complexity:** Small
**Epic:** Cleanup & Verification

---

### US-053: Build and Test Verification

**As a** developer, **I want** the full application to build and pass all tests after migration, **so that** I can confirm nothing is broken.

**Acceptance Criteria:**
- [ ] `npm run build` completes with zero errors
- [ ] `npm run lint` passes with no new warnings
- [ ] `npm test` passes with existing coverage thresholds (80% lines/functions/statements, 70% branches)
- [ ] `npm run dev` starts successfully and all pages load
- [ ] No TypeScript errors related to missing MUI types

**Priority:** High
**Complexity:** Medium
**Epic:** Cleanup & Verification

---

### US-054: Visual Verification Against Reference Designs

**As a** developer, **I want** every page visually compared against its pencil.dev reference design, **so that** I can confirm the migration preserves the existing look.

**Acceptance Criteria:**
- [ ] All 16 pages compared at desktop breakpoint
- [ ] Key pages (Dashboard, Transactions, PropertyDetail) compared at mobile breakpoint
- [ ] Dialog/modal components verified for correct overlay and positioning
- [ ] Discrepancies documented and resolved or accepted

**Priority:** High
**Complexity:** Medium
**Epic:** Cleanup & Verification

---

## Summary

| ID | Story | Priority | Complexity | Epic |
|----|-------|----------|------------|------|
| US-001 | SCSS Architecture Setup | High | Small | Foundation |
| US-002 | Storybook Setup | High | Small | Foundation |
| US-003 | Pencil.dev Reference Designs | High | Medium | Foundation |
| US-004 | Install New Dependencies | High | Small | Foundation |
| US-005 | Button Component | High | Small | Primitive Components |
| US-006 | TextField Component | High | Small | Primitive Components |
| US-007 | Select Component | High | Small | Primitive Components |
| US-008 | DatePicker Component | High | Medium | Primitive Components |
| US-009 | FileUpload Component | High | Small | Primitive Components |
| US-010 | Card Component | High | Small | Primitive Components |
| US-011 | Table Component | High | Medium | Primitive Components |
| US-012 | Chip Component | Medium | Small | Primitive Components |
| US-013 | Badge Component | Medium | Small | Primitive Components |
| US-014 | Avatar Component | Medium | Small | Primitive Components |
| US-015 | Dialog Component | High | Medium | Primitive Components |
| US-016 | Toast Component | High | Small | Primitive Components |
| US-017 | Spinner Component | Medium | Small | Primitive Components |
| US-018 | AppBar Component | High | Small | Primitive Components |
| US-019 | Sidebar Component | High | Medium | Primitive Components |
| US-020 | Container Component | High | Small | Primitive Components |
| US-021 | Divider Component | Low | Small | Primitive Components |
| US-022 | Tooltip Component | Medium | Small | Primitive Components |
| US-023 | ToggleGroup Component | Medium | Small | Primitive Components |
| US-024 | StatsCard Component | High | Small | Composed Components |
| US-025 | PropertyCard Component | High | Small | Composed Components |
| US-026 | TenantCard Component | High | Small | Composed Components |
| US-027 | TransactionRow Component | High | Small | Composed Components |
| US-028 | ConfirmDialog Component | High | Small | Composed Components |
| US-029 | DateRangePicker Component | High | Small | Composed Components |
| US-030 | PropertySelector Component | Medium | Small | Composed Components |
| US-031 | EventBadge Component | Medium | Small | Composed Components |
| US-032 | SplitSection and SplitInput | High | Medium | Composed Components |
| US-033 | Settlement Components | High | Medium | Composed Components |
| US-034 | Ownership Components | High | Small | Composed Components |
| US-035 | EventDialog Component | High | Small | Composed Components |
| US-036 | Banking Admin Components | Medium | Medium | Composed Components |
| US-037 | Layout.tsx Migration | High | Medium | Page Migration |
| US-038 | Dashboard Page Migration | High | Medium | Page Migration |
| US-039 | Properties and PropertyDetail | High | Large | Page Migration |
| US-040 | Transactions Page Migration | High | Large | Page Migration |
| US-041 | Tenants Page Migration | High | Medium | Page Migration |
| US-042 | Leases Page Migration | High | Medium | Page Migration |
| US-043 | Events Page Migration | High | Medium | Page Migration |
| US-044 | Documents Page Migration | High | Medium | Page Migration |
| US-045 | Reports Page Migration | High | Medium | Page Migration |
| US-046 | Settings Page Migration | Medium | Small | Page Migration |
| US-047 | Users Page Migration | Medium | Medium | Page Migration |
| US-048 | Login Page Migration | High | Small | Page Migration |
| US-049 | NotFound Page Migration | Low | Small | Page Migration |
| US-050 | Admin Pages Migration | Medium | Medium | Page Migration |
| US-051 | ToastContext Migration | High | Small | Page Migration |
| US-052 | Remove MUI Dependencies | High | Small | Cleanup & Verification |
| US-053 | Build and Test Verification | High | Medium | Cleanup & Verification |
| US-054 | Visual Verification | High | Medium | Cleanup & Verification |
