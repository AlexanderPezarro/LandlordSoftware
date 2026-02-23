# Implementation Plan: MUI to Native React + SCSS Migration

**User stories:** docs/plans/2026-02-23-mui-to-scss-migration-user-stories.md
**Design:** docs/plans/2026-02-23-mui-to-scss-migration-design.md
**Date:** 2026-02-23

## Task Overview

| # | Task | User Story | Dependencies | Parallel Group |
|---|------|------------|--------------|----------------|
| 1 | Install new dependencies | US-004 | none | Foundation |
| 2 | SCSS architecture setup | US-001 | Task 1 | Foundation |
| 3 | Storybook 10 setup | US-002 | Task 2 | Foundation |
| 4 | Pencil.dev reference designs | US-003 | none | Foundation (parallel w/ 1-3) |
| 5 | Spinner component | US-017 | Task 2, 3 | Primitives |
| 6 | Button component | US-005 | Task 5 | Primitives |
| 7 | TextField component | US-006 | Task 2, 3 | Primitives |
| 8 | Select component | US-007 | Task 2, 3 | Primitives |
| 9 | DatePicker component | US-008 | Task 2, 3 | Primitives |
| 10 | FileUpload component | US-009 | Task 2, 3 | Primitives |
| 11 | Card component | US-010 | Task 2, 3 | Primitives |
| 12 | Table component | US-011 | Task 2, 3 | Primitives |
| 13 | Chip component | US-012 | Task 2, 3 | Primitives |
| 14 | Badge component | US-013 | Task 2, 3 | Primitives |
| 15 | Avatar component | US-014 | Task 2, 3 | Primitives |
| 16 | Dialog component | US-015 | Task 2, 3 | Primitives |
| 17 | Toast component | US-016 | Task 2, 3 | Primitives |
| 18 | AppBar component | US-018 | Task 2, 3 | Primitives |
| 19 | Sidebar component | US-019 | Task 14 | Primitives |
| 20 | Container component | US-020 | Task 2, 3 | Primitives |
| 21 | Divider component | US-021 | Task 2, 3 | Primitives |
| 22 | Tooltip component | US-022 | Task 2, 3 | Primitives |
| 23 | ToggleGroup component | US-023 | Task 2, 3 | Primitives |
| 24 | StatsCard component | US-024 | Task 11 | Composed |
| 25 | PropertyCard component | US-025 | Task 6, 11 | Composed |
| 26 | TenantCard component | US-026 | Task 11, 15 | Composed |
| 27 | TransactionRow component | US-027 | Task 6, 12 | Composed |
| 28 | ConfirmDialog component | US-028 | Task 6, 16 | Composed |
| 29 | DateRangePicker component | US-029 | Task 9 | Composed |
| 30 | PropertySelector component | US-030 | Task 8 | Composed |
| 31 | EventBadge component | US-031 | Task 13 | Composed |
| 32 | SplitSection + SplitInput | US-032 | Task 6, 7, 8 | Composed |
| 33 | Settlement components | US-033 | Task 6, 7, 11, 12 | Composed |
| 34 | Ownership components | US-034 | Task 6, 7, 8 | Composed |
| 35 | EventDialog component | US-035 | Task 7, 8, 9, 16 | Composed |
| 36 | Banking admin components | US-036 | Task 5, 6, 7, 11, 12, 13, 16 | Composed |
| 37 | App.tsx + Layout.tsx migration | US-037 | Task 18, 19, 20 | Page Migration |
| 38 | ToastContext migration | US-051 | Task 17 | Page Migration |
| 39 | Dashboard page migration | US-038 | Task 24, 37 | Pages (parallel) |
| 40 | Properties + PropertyDetail migration | US-039 | Task 25, 33, 34, 37 | Pages (parallel) |
| 41 | Transactions page migration | US-040 | Task 27, 29, 30, 32, 37 | Pages (parallel) |
| 42 | Tenants page migration | US-041 | Task 26, 37 | Pages (parallel) |
| 43 | Leases page migration | US-042 | Task 6, 8, 9, 12, 13, 37 | Pages (parallel) |
| 44 | Events page migration | US-043 | Task 31, 35, 37 | Pages (parallel) |
| 45 | Documents page migration | US-044 | Task 10, 12, 37 | Pages (parallel) |
| 46 | Reports page migration | US-045 | Task 12, 23, 29, 30, 37 | Pages (parallel) |
| 47 | Settings page migration | US-046 | Task 6, 7, 11, 37 | Pages (parallel) |
| 48 | Users page migration | US-047 | Task 12, 15, 16, 37 | Pages (parallel) |
| 49 | Login page migration | US-048 | Task 6, 7, 11 | Pages (parallel) |
| 50 | NotFound page migration | US-049 | Task 6, 37 | Pages (parallel) |
| 51 | Admin pages migration | US-050 | Task 36, 37 | Pages (parallel) |
| 52 | Remove MUI dependencies | US-052 | Tasks 37-51 | Cleanup |
| 53 | Update Vite config | US-052 | Task 52 | Cleanup |
| 54 | Build and test verification | US-053 | Task 53 | Cleanup |
| 55 | Visual verification | US-054 | Task 54 | Cleanup |

## Sub-Agent Parallelism

```
Phase 1: Foundation (sequential chain, Task 4 in parallel)
  Task 1 → Task 2 → Task 3
  Task 4 (parallel with 1-3)

Phase 2: Primitives (up to 17 parallel agents after Task 3 completes)
  Tasks 5-23 (all parallel except: 6 waits on 5, 19 waits on 14)

Phase 3: Composed (up to 13 parallel agents after primitives complete)
  Tasks 24-36 (all parallel)

Phase 4: Page Migration
  Tasks 37-38 (Layout + ToastContext, parallel)
  Tasks 39-51 (all 13 pages in parallel after 37 completes)

Phase 5: Cleanup (sequential)
  Task 52 → Task 53 → Task 54 → Task 55
```

## Tasks

### Task 1: Install New Dependencies

**User Story:** US-004
**Dependencies:** none

#### Overview
Install all new packages needed for the migration: `sass` for SCSS compilation, `lucide-react` for icons, `react-datepicker` for date pickers, and Storybook 10 for component development.

#### Files
- Modify: `client/package.json`

#### Implementation Steps

1. Install production dependencies in `client/`:
```bash
cd client && npm install lucide-react react-datepicker @types/react-datepicker
```

2. Install dev dependencies in `client/`:
```bash
cd client && npm install -D sass
```

3. Initialize Storybook 10 in `client/`:
```bash
cd client && npx storybook@latest init --builder @storybook/builder-vite
```

4. Verify existing build still works:
```bash
cd client && npm run build
```

#### Verification
- `npm run dev` starts without errors
- `npm run build` completes successfully
- `npm run storybook` launches Storybook UI

---

### Task 2: SCSS Architecture Setup

**User Story:** US-001
**Dependencies:** Task 1

#### Overview
Create the SCSS foundation: design tokens, mixins, reset, typography, and global stylesheet. Extract all values from the current MUI theme in `client/src/theme.ts`.

#### Files
- Create: `client/src/styles/_variables.scss`
- Create: `client/src/styles/_mixins.scss`
- Create: `client/src/styles/_reset.scss`
- Create: `client/src/styles/_typography.scss`
- Create: `client/src/styles/global.scss`

#### Implementation Steps

**Step 1: Create `_variables.scss`**

Extract from `client/src/theme.ts`:
```scss
// Colors
$color-primary: #1976d2;
$color-primary-light: #42a5f5;
$color-primary-dark: #1565c0;
$color-primary-contrast: #ffffff;
$color-secondary: #616161;
$color-secondary-light: #9e9e9e;
$color-secondary-dark: #424242;
$color-secondary-contrast: #ffffff;
$color-background: #f5f5f5;
$color-paper: #ffffff;
$color-text-primary: rgba(0, 0, 0, 0.87);
$color-text-secondary: rgba(0, 0, 0, 0.6);
$color-error: #d32f2f;
$color-warning: #ed6c02;
$color-info: #0288d1;
$color-success: #2e7d32;

// Breakpoints
$breakpoint-sm: 600px;
$breakpoint-md: 900px;
$breakpoint-lg: 1200px;
$breakpoint-xl: 1536px;

// Spacing (4px base unit, matching MUI)
$spacing-unit: 4px;
$spacing-1: 4px;
$spacing-2: 8px;
$spacing-3: 12px;
$spacing-4: 16px;
$spacing-5: 20px;
$spacing-6: 24px;
$spacing-8: 32px;

// Shadows (matching MUI elevation)
$shadow-1: 0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12);
$shadow-2: 0px 3px 1px -2px rgba(0,0,0,0.2), 0px 2px 2px 0px rgba(0,0,0,0.14), 0px 1px 5px 0px rgba(0,0,0,0.12);
$shadow-4: 0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12);
$shadow-8: 0px 5px 5px -3px rgba(0,0,0,0.2), 0px 8px 10px 1px rgba(0,0,0,0.14), 0px 3px 14px 2px rgba(0,0,0,0.12);

// Border radius
$radius-sm: 4px;
$radius-md: 8px;
$radius-lg: 12px;
$radius-full: 50%;

// Typography
$font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

// Z-index
$z-drawer: 1200;
$z-appbar: 1100;
$z-modal: 1300;
$z-snackbar: 1400;
$z-tooltip: 1500;

// Layout
$drawer-width: 240px;
$appbar-height: 64px;
```

**Step 2: Create `_mixins.scss`**

```scss
@use 'variables' as *;

@mixin respond-to($breakpoint) {
  @if $breakpoint == sm { @media (min-width: $breakpoint-sm) { @content; } }
  @else if $breakpoint == md { @media (min-width: $breakpoint-md) { @content; } }
  @else if $breakpoint == lg { @media (min-width: $breakpoint-lg) { @content; } }
  @else if $breakpoint == xl { @media (min-width: $breakpoint-xl) { @content; } }
}

@mixin respond-down($breakpoint) {
  @if $breakpoint == sm { @media (max-width: #{$breakpoint-sm - 1px}) { @content; } }
  @else if $breakpoint == md { @media (max-width: #{$breakpoint-md - 1px}) { @content; } }
  @else if $breakpoint == lg { @media (max-width: #{$breakpoint-lg - 1px}) { @content; } }
}

@mixin elevation($level) {
  @if $level == 1 { box-shadow: $shadow-1; }
  @else if $level == 2 { box-shadow: $shadow-2; }
  @else if $level == 4 { box-shadow: $shadow-4; }
  @else if $level == 8 { box-shadow: $shadow-8; }
}

@mixin truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

**Step 3: Create `_reset.scss`** (replaces MUI CssBaseline)

Standard CSS reset: box-sizing border-box, margin/padding reset, font smoothing.

**Step 4: Create `_typography.scss`**

Define heading scales (h1-h6), body1, body2, caption, overline matching MUI's default typography.

**Step 5: Create `global.scss`**

```scss
@use 'reset';
@use 'typography';

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background-color: #f5f5f5;
  color: rgba(0, 0, 0, 0.87);
}
```

#### Verification
- Create a test `.module.scss` file importing variables; verify Vite compiles it
- All SCSS partials import without errors
- `npm run build` passes

---

### Task 3: Storybook 10 Setup

**User Story:** US-002
**Dependencies:** Task 2

#### Overview
Configure Storybook 10 with SCSS support, global styles, viewport addon, and story directory structure.

#### Files
- Modify: `client/.storybook/main.ts`
- Modify: `client/.storybook/preview.ts`
- Create: `client/src/components/primitives/.gitkeep`
- Create: `client/src/components/composed/.gitkeep`
- Modify: `client/package.json` (add `storybook` script)

#### Implementation Steps

1. Configure `client/.storybook/main.ts` to find stories in `client/src/components/**/*.stories.tsx`
2. Configure `client/.storybook/preview.ts` to import `../src/styles/global.scss`
3. Add viewport addon with mobile (375px), tablet (768px), desktop (1280px) presets
4. Create directory structure:
   ```
   client/src/components/
   ├── primitives/    # Primitive components go here
   ├── composed/      # Composed components go here
   └── layout/        # Layout components go here
   ```
5. Add to `client/package.json` scripts: `"storybook": "storybook dev -p 6006"`

#### Verification
- `npm run storybook` launches and shows empty UI
- Global SCSS styles are applied in Storybook preview
- Viewport switcher works in toolbar

---

### Task 4: Pencil.dev Reference Designs

**User Story:** US-003
**Dependencies:** none (parallel with Tasks 1-3)

#### Overview
Create pencil.dev reference designs of all current pages as visual verification targets. Run the app, capture each page's layout at desktop and mobile breakpoints.

#### Files
- Create: `docs/designs/` directory with reference designs or links

#### Implementation Steps

1. Start the dev server: `npm run dev`
2. Log in and navigate to each of the 16 pages
3. For each page, create a pencil.dev design capturing:
   - Desktop layout (1280px+)
   - Mobile layout (375px) for key pages (Dashboard, Transactions, PropertyDetail)
   - Any open dialogs/modals for pages that use them
4. Organize designs with clear naming: `dashboard-desktop.pencil`, etc.
5. Store designs or link URLs in `docs/designs/README.md`

#### Verification
- All 16 pages have desktop reference designs
- Key pages have mobile reference designs
- Designs are accessible in `docs/designs/`

---

### Task 5: Spinner Component

**User Story:** US-017
**Dependencies:** Task 2, 3

#### Overview
Build the Spinner loading indicator. This is built first because Button depends on it for its `loading` state.

#### Files
- Create: `client/src/components/primitives/Spinner/Spinner.tsx`
- Create: `client/src/components/primitives/Spinner/Spinner.module.scss`
- Create: `client/src/components/primitives/Spinner/Spinner.stories.tsx`
- Create: `client/src/components/primitives/Spinner/index.ts`

#### Implementation Steps

1. Create `Spinner.tsx`:
   - Props: `size?: 'small' | 'medium' | 'large'`, `label?: string`, `className?: string`
   - Render a `<div>` with CSS-animated circular border
   - If `label`, render text below spinner

2. Create `Spinner.module.scss`:
   - Use `@keyframes spin` for rotation animation
   - Size map: small=16px, medium=32px, large=48px
   - Use `$color-primary` for spinner color
   - Border-based spinner (transparent + colored border)

3. Create Storybook story showing all sizes with and without labels

4. Export from `index.ts`

#### Verification
- `npm run storybook` shows Spinner stories
- All three sizes render correctly
- Animation is smooth CSS-only

---

### Task 6: Button Component

**User Story:** US-005
**Dependencies:** Task 5

#### Overview
Build the Button primitive replacing MUI Button and IconButton. Supports primary, secondary, text, and icon-only variants.

#### Files
- Create: `client/src/components/primitives/Button/Button.tsx`
- Create: `client/src/components/primitives/Button/Button.module.scss`
- Create: `client/src/components/primitives/Button/Button.stories.tsx`
- Create: `client/src/components/primitives/Button/index.ts`

#### Implementation Steps

1. Create `Button.tsx`:
   - Props: `variant?: 'primary' | 'secondary' | 'text' | 'icon'`, `size?: 'small' | 'medium' | 'large'`, `disabled?: boolean`, `loading?: boolean`, `fullWidth?: boolean`, `startIcon?: ReactNode`, `endIcon?: ReactNode`, `onClick`, `type`, `children`, `className`
   - When `loading`, show Spinner and disable the button
   - Extends `ButtonHTMLAttributes<HTMLButtonElement>` for native props
   - `variant='icon'` renders circular button with icon only

2. Create `Button.module.scss`:
   - Match MUI button styles: no text-transform (matching current theme override), proper padding, border-radius
   - Primary: `$color-primary` background, white text
   - Secondary: outlined with `$color-secondary` border
   - Text: no background, primary text color
   - Icon: circular, transparent background, hover highlight
   - Disabled: reduced opacity
   - Loading: spinner centered, text hidden

3. Create Storybook stories for all variants, sizes, with icons, loading, disabled, fullWidth

#### Verification
- All button variants render and match MUI visual style
- Loading state shows spinner
- Disabled state prevents clicks

---

### Tasks 7-23: Remaining Primitive Components

Each follows the same pattern as Tasks 5-6. One component per task, each creating:
- `client/src/components/primitives/<Name>/<Name>.tsx`
- `client/src/components/primitives/<Name>/<Name>.module.scss`
- `client/src/components/primitives/<Name>/<Name>.stories.tsx`
- `client/src/components/primitives/<Name>/index.ts`

**Task 7: TextField** (US-006) - label, placeholder, helperText, error, disabled, adornments, multiline, type. Use `<input>` and `<textarea>` with SCSS styling matching MUI outlined TextField.

**Task 8: Select** (US-007) - label, error, helperText, disabled. Native `<select>` styled to match MUI Select. Accepts `options: Array<{value, label}>`.

**Task 9: DatePicker** (US-008) - Wraps `react-datepicker`. Props: `showTimeSelect`, `label`, `error`, `helperText`, `disabled`. Style the react-datepicker popup with SCSS to match MUI look. Uses `date-fns` for formatting.

**Task 10: FileUpload** (US-009) - Drag-and-drop zone using `onDragOver`/`onDrop` handlers. Shows file list with remove buttons. Props: `accept`, `multiple`, `onFilesChange`.

**Task 11: Card** (US-010) - Compound component: `Card`, `Card.Header`, `Card.Content`, `Card.Actions`. Paper-white background, `$shadow-1`, `$radius-sm`.

**Task 12: Table** (US-011) - Compound component: `Table`, `Table.Container`, `Table.Head`, `Table.Body`, `Table.Row`, `Table.Cell`. Sortable headers with `onSort` + sort direction arrow. Built-in `Table.Pagination` with page size selector and page controls.

**Task 13: Chip** (US-012) - Color variants (default, primary, success, warning, error). Optional `onDelete` with X icon. Size prop (small, medium).

**Task 14: Badge** (US-013) - Wraps children, positions count at top-right. Hides at zero. `max` prop for overflow display.

**Task 15: Avatar** (US-014) - Initials from `name` prop, `src` for image with fallback. Size prop. Deterministic background color from name hash.

**Task 16: Dialog** (US-015) - Compound: `Dialog`, `Dialog.Title`, `Dialog.Content`, `Dialog.Actions`. Portal-rendered. Backdrop, Escape key, focus trap. Props: `open`, `onClose`, `size?: 'small' | 'medium' | 'large'`, `disableBackdropClose`.

**Task 17: Toast** (US-016) - Severity variants (success, error, warning, info). Auto-dismiss with configurable duration. Close button. Fixed position bottom-right (matching current Snackbar). Uses Lucide icons for severity indicators.

**Task 18: AppBar** (US-018) - Fixed top, z-index 1100. Primary color background. Accepts children. Flexbox layout with gap.

**Task 19: Sidebar** (US-019, depends on Task 14 Badge) - Props: `items: Array<{label, icon, path, badge?}>`, `open`, `onClose`. Highlights active route via `useLocation()`. Desktop: permanent, 240px. Mobile: overlay with backdrop.

**Task 20: Container** (US-020) - Max-width wrapper. Props: `maxWidth?: 'sm' | 'md' | 'lg' | 'xl'`. Centers content, responsive padding.

**Task 21: Divider** (US-021) - Horizontal/vertical `<hr>`. Props: `orientation`, `spacing`.

**Task 22: Tooltip** (US-022) - Hover/focus triggered. Props: `content`, `placement`. 200ms show delay. CSS positioned relative to trigger.

**Task 23: ToggleGroup** (US-023) - Segmented buttons. Props: `options: Array<{value, label, icon?}>`, `value`, `onChange`. Connected button group styling.

---

### Tasks 24-36: Composed Components

Each creates files in `client/src/components/composed/<Name>/` or modifies existing files in `client/src/components/shared/`, `client/src/components/Transaction/`, etc. Each uses new primitives and includes Storybook stories.

**Task 24: StatsCard** (US-024) - Uses Card. Props: `title`, `value`, `trend`, `trendValue`. Lucide TrendingUp/TrendingDown icons.

**Task 25: PropertyCard** (US-025) - Uses Card, Button. Displays property address, tenant count, actions.

**Task 26: TenantCard** (US-026) - Uses Card, Avatar. Displays tenant name, contact, lease status.

**Task 27: TransactionRow** (US-027) - Table row component. Color-coded amounts. Action icons using Button variant="icon".

**Task 28: ConfirmDialog** (US-028) - Uses Dialog, Button. Props: `title`, `message`, `severity`, `onConfirm`, `onCancel`.

**Task 29: DateRangePicker** (US-029) - Uses two DatePicker primitives. Validates end >= start.

**Task 30: PropertySelector** (US-030) - Uses Select. Adds "All Properties" option.

**Task 31: EventBadge** (US-031) - Uses Chip. Color-maps event types.

**Task 32: SplitSection + SplitInput** (US-032) - Uses TextField, Select, Button. Add/remove rows, percentage validation.

**Task 33: Settlement Components** (US-033) - BalanceCard (Card), SettlementForm (TextField, Button), SettlementHistory (Table).

**Task 34: Ownership Components** (US-034) - OwnershipSection + OwnerInput. Uses Select, TextField, Button. Percentage validation.

**Task 35: EventDialog** (US-035) - Uses Dialog, TextField, Select, DatePicker. Create/edit modes.

**Task 36: Banking Admin Components** (US-036) - BankAccountsList (Table, Chip), ImportProgressDialog (Dialog, Spinner), RuleEditor (TextField, Select, Button), WebhookStatusWidget (Card, Chip).

---

### Task 37: App.tsx + Layout.tsx Migration

**User Story:** US-037
**Dependencies:** Tasks 18, 19, 20

#### Overview
Migrate the application shell. Remove MUI ThemeProvider and CssBaseline from App.tsx, replace with global SCSS import. Rewrite Layout.tsx to use AppBar, Sidebar, and Container primitives.

#### Files
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/Layout.tsx`
- Create: `client/src/components/Layout.module.scss`

#### Implementation Steps

1. **App.tsx**: Remove `ThemeProvider`, `CssBaseline`, and `theme` import. Add `import './styles/global.scss'`.

2. **Layout.tsx**: Replace all MUI imports with new primitives. Replace `useTheme()` and `useMediaQuery()` with a custom `useMediaQuery` hook or CSS-based responsive approach. Map `navigationItems` icons from MUI to Lucide. Rewrite drawer logic to use Sidebar component.

3. **Layout.module.scss**: Replicate the flex layout, appbar offset, and responsive sidebar behavior.

#### Verification
- App loads with global SCSS styles
- Sidebar navigation works on desktop and mobile
- Active route highlighting works
- Pending review badge count shows for admins

---

### Task 38: ToastContext Migration

**User Story:** US-051
**Dependencies:** Task 17

#### Overview
Replace MUI Snackbar/Alert in ToastContext with the new Toast primitive.

#### Files
- Modify: `client/src/contexts/ToastContext.tsx`

#### Implementation Steps

1. Remove MUI imports (`Snackbar`, `Alert`, `AlertColor`, `IconButton`, `CloseIcon`)
2. Import Toast from `../components/primitives/Toast`
3. Replace `<Snackbar><Alert>...</Alert></Snackbar>` with `<Toast severity={toast.type} message={toast.message} onClose={handleClose} />`
4. Keep `useToast()` hook API identical

#### Verification
- `useToast().success('test')` shows green toast notification
- All four severity levels display correctly
- Auto-dismiss and close button work

---

### Tasks 39-51: Page Migrations

Each page migration follows the same pattern:
1. Replace all MUI component imports with new primitives/composed components
2. Replace all Lucide icons (see Icon Mapping in design doc)
3. Remove all `sx` props, replace with SCSS module classes
4. Create a `<PageName>.module.scss` file for page-specific layout
5. Verify against pencil.dev reference design

**Task 39: Dashboard** (US-038) - StatsCards, grid layout via SCSS.

**Task 40: Properties + PropertyDetail** (US-039) - PropertyCards, OwnershipSection, Settlement components, Tabs via custom SCSS.

**Task 41: Transactions** (US-040) - Table with TransactionRow, filters (PropertySelector, DateRangePicker), create/edit Dialog with SplitSection.

**Task 42: Tenants** (US-041) - TenantCards, create/edit Dialog.

**Task 43: Leases** (US-042) - Table, create/edit Dialog with DatePicker, Chip for status.

**Task 44: Events** (US-043) - EventDialog, EventBadge, preserve react-big-calendar.

**Task 45: Documents** (US-044) - Table, FileUpload.

**Task 46: Reports** (US-045) - PropertySelector, DateRangePicker, ToggleGroup, Table.

**Task 47: Settings** (US-046) - Card, form primitives.

**Task 48: Users** (US-047) - Table, Avatar, Chip, create/edit Dialog.

**Task 49: Login** (US-048) - Card, TextField, Button. Centered SCSS layout.

**Task 50: NotFound** (US-049) - Simple text + Button.

**Task 51: Admin Pages** (US-050) - BankAccountsList, RuleEditor, Table for PendingTransactions.

---

### Task 52: Remove MUI Dependencies

**User Story:** US-052
**Dependencies:** Tasks 37-51

#### Overview
Uninstall all MUI and Emotion packages now that no code references them.

#### Files
- Modify: `client/package.json`
- Modify: `package.json` (root - has `@mui/x-date-pickers`)
- Delete: `client/src/theme.ts`

#### Implementation Steps

1. Verify no MUI imports remain:
```bash
grep -r "@mui" client/src/ --include="*.ts" --include="*.tsx"
grep -r "@emotion" client/src/ --include="*.ts" --include="*.tsx"
```

2. Uninstall from client:
```bash
cd client && npm uninstall @mui/material @mui/icons-material @mui/x-date-pickers @emotion/react @emotion/styled
```

3. Uninstall from root:
```bash
npm uninstall @mui/x-date-pickers
```

4. Delete `client/src/theme.ts`

5. Verify clean install:
```bash
cd client && npm install
```

#### Verification
- `grep -r "@mui" client/src/` returns no results
- `grep -r "@emotion" client/src/` returns no results
- `client/src/theme.ts` no longer exists

---

### Task 53: Update Vite Config

**User Story:** US-052
**Dependencies:** Task 52

#### Overview
Update Vite config to remove MUI-specific chunk splitting now that MUI is gone.

#### Files
- Modify: `client/vite.config.ts`

#### Implementation Steps

1. Remove `'mui-core'` and `'mui-icons'` from `manualChunks` in `client/vite.config.ts`
2. Optionally add `'lucide'` chunk for `lucide-react`

#### Verification
- `npm run build` completes without warnings about missing chunks

---

### Task 54: Build and Test Verification

**User Story:** US-053
**Dependencies:** Task 53

#### Overview
Full build, lint, and test pass verification.

#### Implementation Steps

1. `cd client && npm run build` - zero errors
2. `npm run lint` - no new warnings
3. `npm test` - passes with coverage thresholds
4. `npm run dev` - starts and all pages load
5. Fix any breakages found

#### Verification
- All commands pass
- No TypeScript errors
- Coverage thresholds met

---

### Task 55: Visual Verification Against Reference Designs

**User Story:** US-054
**Dependencies:** Task 54

#### Overview
Compare every page against pencil.dev reference designs.

#### Implementation Steps

1. Start dev server
2. Navigate each page, compare against reference design
3. Check desktop layout for all 16 pages
4. Check mobile layout for Dashboard, Transactions, PropertyDetail
5. Open key dialogs (transaction create, event create, confirm delete)
6. Document any discrepancies
7. Fix or accept each discrepancy

#### Verification
- All pages match reference designs within acceptable tolerance
- Dialogs render correctly with backdrop
- Mobile responsive behavior works
