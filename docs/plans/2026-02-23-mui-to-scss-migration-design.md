# MUI to Native React + SCSS Migration Design

**Date:** 2026-02-23
**Status:** Draft

## Motivation

Migrate from MUI to native React + SCSS (CSS Modules) to gain full control over styling and improve developer experience. Replace MUI's `sx` prop / CSS-in-JS approach with SCSS modules that are easier to read, debug, and customize.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Styling approach | CSS Modules with SCSS | Locally scoped, no class collisions, full control |
| Icons | Lucide React | Lightweight (~1KB/icon), tree-shakeable, clean design |
| Date pickers | react-datepicker | Popular, customizable with SCSS, works with existing date-fns |
| Visual target | Match current MUI look | Confidence that migration is successful before any redesign |
| Storybook | Full coverage (all shared components) | Every reusable component gets stories with multiple variants |
| Reference designs | Pencil.dev | Create designs of current pages as verification targets |

## Migration Strategy

Replace MUI from the bottom up: build a new SCSS component library first, then swap components in pages. Use sub-agents working in parallel on independent components to maximize speed.

### Phase 1: Foundation

**SCSS Architecture:**

```
client/src/
├── styles/
│   ├── _variables.scss      # Design tokens from current MUI theme
│   ├── _mixins.scss          # Responsive breakpoints, common patterns
│   ├── _reset.scss           # Normalize/reset (replaces CssBaseline)
│   ├── _typography.scss      # Font definitions, heading scales
│   ├── global.scss           # Imports above partials, minimal global styles
│   └── calendar.css          # Existing (unchanged)
```

**Design tokens** extracted from current MUI theme:

- Colors: primary `#1976d2`, secondary `#616161`, background `#f5f5f5`, paper `#ffffff`
- Breakpoints: `sm: 600px`, `md: 900px`, `lg: 1200px`
- Spacing: 4px base unit (matching MUI `theme.spacing()`)
- Typography: system font stack (Roboto, Segoe UI, etc.), same size scale
- Shadows and border-radius matching current MUI defaults

**Storybook setup:**

- Storybook 8 with React/Vite builder
- SCSS support and global style imports configured
- Viewport addon for responsive testing
- Stories organized by category: Primitives, Composed, Layout

**Pencil.dev reference designs:**

- Recreate each current page layout as a pencil.dev design
- Cover all 16 pages, focusing on distinct layout patterns (dashboard grid, data tables, detail views, forms/dialogs)

### Phase 2: Component Library - Primitives (19 components)

Base building blocks replacing MUI's core components. Each gets a `.tsx`, `.module.scss`, and Storybook story.

**Form Controls (5):**

| Component | Replaces | Notes |
|-----------|----------|-------|
| `Button` | MUI Button, IconButton | primary, secondary, text, icon variants |
| `TextField` | MUI TextField, InputAdornment | label, placeholder, error, adornments |
| `Select` | MUI Select, FormControl, InputLabel | dropdown with label, error state |
| `DatePicker` | MUI DatePicker, DateTimePicker | wraps react-datepicker with SCSS |
| `FileUpload` | Current MUI-styled FileUpload | drag-and-drop zone with file list |

**Data Display (5):**

| Component | Replaces | Notes |
|-----------|----------|-------|
| `Card` | MUI Card, CardContent, CardActions | optional header, content, actions |
| `Table` | MUI Table family (8 components) | sortable headers, pagination built-in |
| `Chip` | MUI Chip | small label/tag |
| `Badge` | MUI Badge | notification count indicator |
| `Avatar` | MUI Avatar | user initials or image |

**Feedback (3):**

| Component | Replaces | Notes |
|-----------|----------|-------|
| `Dialog` | MUI Dialog, DialogTitle, DialogContent, DialogActions | modal with title, content, actions |
| `Toast` | MUI Snackbar, Alert | success/error/warning notifications |
| `Spinner` | MUI CircularProgress | loading indicator |

**Layout (4):**

| Component | Replaces | Notes |
|-----------|----------|-------|
| `AppBar` | MUI AppBar, Toolbar | top navigation bar |
| `Sidebar` | MUI Drawer, List family | collapsible nav menu |
| `Container` | MUI Container | max-width content wrapper |
| `Divider` | MUI Divider | horizontal/vertical separator |

**Utility (2):**

| Component | Replaces | Notes |
|-----------|----------|-------|
| `Tooltip` | MUI Tooltip | hover text |
| `ToggleGroup` | MUI ToggleButton, ToggleButtonGroup | segmented button group |

### Phase 3: Component Library - Composed Components

App-specific components rewritten to use new primitives instead of MUI directly.

**Shared (8):**

- `StatsCard` - dashboard metric card (value, trend icon, label)
- `PropertyCard` - property summary with address, tenant count, actions
- `TenantCard` - tenant info display
- `TransactionRow` - single transaction line item for tables
- `ConfirmDialog` - "Are you sure?" modal (wraps Dialog)
- `DateRangePicker` - from/to date selection (wraps DatePicker)
- `PropertySelector` - dropdown to filter by property (wraps Select)
- `EventBadge` - calendar event indicator (wraps Badge + Chip)

**Domain-specific (9):**

- `SplitSection` + `SplitInput` - transaction cost splitting UI
- `SettlementForm` + `SettlementHistory` + `BalanceCard` - owner settlement workflow
- `OwnershipSection` + `OwnerInput` - property ownership management
- `EventDialog` - calendar event create/edit modal
- `BankAccountsList`, `ImportProgressDialog`, `RuleEditor`, `WebhookStatusWidget` - banking admin

Each composed component gets a Storybook story with realistic mock data.

### Phase 4: Page Migration (16 pages)

Each page gets its own `.module.scss` file. Replace MUI imports with new components, remove `sx` props, apply SCSS classes. Verify against pencil.dev reference design.

**Layout.tsx migrates first** (all pages depend on it - AppBar, Sidebar, Container).

**Pages (all independent, parallel):**

- `Dashboard`, `Properties`, `PropertyDetail`, `Transactions`
- `Tenants`, `Leases`, `Events`, `Documents`
- `Reports`, `Settings`, `Users`, `Login`, `NotFound`
- `admin/BankAccounts`, `admin/BankAccountRules`, `admin/PendingTransactions`

**Context updates:**

- `ToastContext.tsx` - swap MUI Snackbar/Alert for Toast component
- `AuthContext.tsx` - minimal changes (mostly logic)

### Phase 5: Cleanup & Verification

1. Remove packages: `@mui/material`, `@mui/icons-material`, `@mui/x-date-pickers`, `@emotion/react`, `@emotion/styled`
2. Delete `client/src/theme.ts`
3. Verify all 36 MUI icons replaced with Lucide React equivalents
4. Full build verification - no MUI imports remain
5. Run existing tests, fix any breakage
6. Visual comparison against pencil.dev designs for every page

## Sub-Agent Parallelism Plan

| Phase | Work Items | Agents | Parallel? |
|-------|-----------|--------|-----------|
| 1a: Foundation | SCSS architecture, Storybook, design tokens | 1 | Sequential - must finish first |
| 1b: Reference designs | Pencil.dev designs for all pages | 1 | Parallel with 1a |
| 2: Primitives | 19 components + stories | Up to 19 | Yes - all independent |
| 3: Composed | 17 components + stories | Up to 17 | Yes - after primitives done |
| 4a: Layout | Layout.tsx migration | 1 | Sequential - before pages |
| 4b: Pages | 16 pages + 2 contexts | Up to 18 | Yes - after Layout done |
| 5: Cleanup | Package removal, verification | 1 | Sequential - must be last |

**Peak parallelism:** ~19 concurrent sub-agents during the primitives phase.

## Icon Mapping

MUI Icon → Lucide React equivalent for all 36 icons currently used:

| MUI Icon | Lucide Icon |
|----------|-------------|
| Home | Home |
| Dashboard | LayoutDashboard |
| People | Users |
| Description | FileText |
| AttachMoney | DollarSign |
| Assessment | BarChart3 |
| Event | Calendar |
| Folder | Folder |
| Settings | Settings |
| Logout | LogOut |
| AdminPanelSettings | ShieldCheck |
| RateReview | MessageSquare |
| Menu | Menu |
| Add | Plus |
| Delete | Trash2 |
| Edit | Pencil |
| Search | Search |
| TrendingUp | TrendingUp |
| TrendingDown | TrendingDown |
| AccountBalance | Landmark |
| PersonAdd | UserPlus |
| AddBusiness | Building2 |
| Close | X |
| CheckCircle | CheckCircle |
| Warning | AlertTriangle |
| Clear | XCircle |
| CloudUpload | Upload |
| AttachFile | Paperclip |
| ContactEmergency | Contact |
| History | History |
| RadioButtonUnchecked | Circle |
| PieChart | PieChart |
| BarChart | BarChart |
| Sync | RefreshCw |
| Error | AlertCircle |
| Schedule | Clock |
| Rule | Scale |

## New Dependencies

**Add:**
- `sass` - SCSS compilation
- `lucide-react` - icon library
- `react-datepicker` - date picker component
- `@storybook/react-vite` + addons - component development

**Remove:**
- `@mui/material`
- `@mui/icons-material`
- `@mui/x-date-pickers`
- `@emotion/react`
- `@emotion/styled`
