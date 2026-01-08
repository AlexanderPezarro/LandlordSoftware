# Landlord Property Management System - Design Document

**Date:** 2026-01-08
**Status:** Approved
**Target User:** Single landlord managing personal rental properties

## Overview

A web-based property management system for tracking rental properties, tenants, finances, and scheduled events. Built as a Node.js monolith with React frontend, starting with local hosting and designed for future cloud deployment.

## Requirements

### Core Features
- Property management with status tracking (vacant, on market, rented, maintenance)
- Financial tracking: income and expenses per property with receipt storage
- Holistic financial reporting with categorized expenses
- Calendar system for scheduling repairs, renovations, rent changes, and tenant transitions
- Tenant information management (prospective and active)

### User Context
- Single user (landlord)
- UK-based (address formats, etc.)
- Advanced developer comfort with Node.js/TypeScript/React
- Local hosting initially, cloud deployment later for mobile access

## Architecture

### Technology Stack

**Backend:**
- Node.js with TypeScript
- Express.js for HTTP server
- SQLite database with Prisma ORM
- Express-session with better-sqlite3-session-store
- Bcrypt for password hashing

**Frontend:**
- React with TypeScript
- Vite for build tooling
- Material-UI component library
- React Hook Form with Zod validation
- Axios for API calls
- react-big-calendar or similar for calendar view

**Supporting Libraries:**
- date-fns or Day.js for date operations
- Helmet.js for security headers
- express-rate-limit for rate limiting
- Multer for file uploads

### Project Structure

```
/landlord-app
  /server
    /src
      /routes         # API endpoint handlers
      /services       # Business logic layer
      /models         # Prisma schema
      /middleware     # Auth, validation, error handling
      /utils          # Helper functions
      server.ts       # Express app setup
  /client
    /src
      /components     # Reusable React components
      /pages          # Main application views
      /hooks          # Custom React hooks
      /services       # API client functions
      /types          # Frontend TypeScript types
      App.tsx
      main.tsx
  /shared
    /types            # Shared TypeScript types
    /validation       # Shared Zod schemas
  /uploads            # File storage (receipts, documents)
  /data               # SQLite database file
  /docs               # Documentation
  prisma/             # Database schema & migrations
  package.json
```

## Database Schema

### Properties
```typescript
{
  id: string (UUID)
  name: string
  address: {
    street: string
    city: string
    county: string
    postcode: string
  }
  property_type: enum (house, apartment, condo, commercial, other)
  purchase_date: date (optional)
  purchase_price: decimal (optional)
  status: enum (vacant, on_market, rented, maintenance, other)
  notes: text (optional)
  created_at: timestamp
  updated_at: timestamp
}
```

### Tenants
```typescript
{
  id: string (UUID)
  first_name: string
  last_name: string
  email: string
  phone: string
  emergency_contact_name: string (optional)
  emergency_contact_phone: string (optional)
  status: enum (prospective, active, former)
  notes: text (optional)
  created_at: timestamp
  updated_at: timestamp
}
```

### Leases
```typescript
{
  id: string (UUID)
  property_id: FK -> Properties
  tenant_id: FK -> Tenants
  start_date: date
  end_date: date (optional)
  monthly_rent: decimal
  security_deposit_amount: decimal
  security_deposit_paid_date: date (optional)
  status: enum (active, ended, upcoming)
  created_at: timestamp
  updated_at: timestamp
}
```

### Transactions
```typescript
{
  id: string (UUID)
  property_id: FK -> Properties
  lease_id: FK -> Leases (optional)
  type: enum (income, expense)
  category: string (rent, maintenance, utilities, insurance, taxes, repairs, mortgage, other)
  amount: decimal
  transaction_date: date
  description: text
  created_at: timestamp
  updated_at: timestamp
}
```

### Documents
```typescript
{
  id: string (UUID)
  entity_type: enum (transaction, property, tenant)
  entity_id: string (FK to relevant table)
  file_name: string
  file_path: string
  file_type: string (MIME type)
  file_size: integer (bytes)
  uploaded_at: timestamp
}
```

### Events
```typescript
{
  id: string (UUID)
  property_id: FK -> Properties
  event_type: enum (repair, renovation, rent_change, tenant_change, inspection, other)
  title: string
  description: text (optional)
  scheduled_date: date
  completed: boolean
  completed_date: date (optional)
  created_at: timestamp
  updated_at: timestamp
}
```

## API Design

### REST Endpoints

**Authentication:**
- `POST /api/auth/login` - Authenticate user
- `POST /api/auth/logout` - End session
- `GET /api/auth/me` - Get current user session

**Properties:**
- `GET /api/properties` - List all properties with summary stats
- `GET /api/properties/:id` - Get property details
- `POST /api/properties` - Create property
- `PUT /api/properties/:id` - Update property
- `DELETE /api/properties/:id` - Delete property

**Tenants:**
- `GET /api/tenants?status=active|prospective|former` - List tenants
- `GET /api/tenants/:id` - Get tenant details with lease history
- `POST /api/tenants` - Create tenant
- `PUT /api/tenants/:id` - Update tenant
- `DELETE /api/tenants/:id` - Delete tenant

**Leases:**
- `GET /api/leases?property_id=&status=` - List leases with filters
- `GET /api/leases/:id` - Get lease details
- `POST /api/leases` - Create lease
- `PUT /api/leases/:id` - Update lease
- `DELETE /api/leases/:id` - Delete lease

**Transactions:**
- `GET /api/transactions?property_id=&type=&category=&start_date=&end_date=` - List transactions
- `GET /api/transactions/:id` - Get transaction with documents
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/transactions/summary?property_id=&start_date=&end_date=` - Financial summaries

**Events:**
- `GET /api/events?property_id=&completed=&start_date=&end_date=` - List events
- `GET /api/events/:id` - Get event details
- `POST /api/events` - Create event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

**Documents:**
- `POST /api/documents` - Upload document (multipart/form-data)
- `GET /api/documents/:id` - Download/view document
- `DELETE /api/documents/:id` - Delete document and file

### Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": { ... }
  }
}
```

## Frontend Application

### Pages & Navigation

**Dashboard (Home):**
- Overview cards: total properties, occupied/vacant counts, monthly income/expenses
- Upcoming events (next 7-14 days)
- Recent transactions (last 5-10)
- Quick actions (add property, record transaction, schedule event)

**Properties Page:**
- List view with status badges and search/filter
- Property detail view:
  - Property information with edit capability
  - Current and past tenants/leases
  - Financial summary for property
  - Upcoming events
  - Recent transactions

**Tenants Page:**
- Tabs for prospective/active/former tenants
- Search by name or contact
- Tenant detail view:
  - Contact information
  - Current and past leases
  - Payment history
  - Associated documents

**Finances Page:**
- Transaction list with comprehensive filters
- Summary section:
  - Overall income vs expenses (monthly, yearly)
  - Per-property breakdown
  - Category breakdown with charts
- Add transaction form
- Export to CSV

**Calendar Page:**
- Monthly calendar view with color-coded events
- Filter by property and event type
- Click to add/edit events
- Upcoming events list below calendar
- Mark events as completed

**Navigation:**
- Side navigation bar (collapsible on mobile)
- Links: Dashboard, Properties, Tenants, Finances, Calendar
- User menu with logout

### UI Components

**Shared Components:**
- PropertyCard - Summary card for property list
- TenantCard - Summary card for tenant list
- TransactionRow - Table row for transaction display
- EventBadge - Calendar event display
- FileUpload - Document upload with preview
- ConfirmDialog - Deletion confirmations
- StatsCard - Dashboard metric cards
- DateRangePicker - Filter by date range
- PropertySelector - Dropdown for filtering by property

## Financial Reporting

### Report Types

**Income Statement (P&L):**
- Time period selector (month, quarter, year, custom)
- Per-property or consolidated view
- Income: rent, other income
- Expenses: categorized (maintenance, utilities, insurance, taxes, repairs, management, mortgage, other)
- Net profit/loss calculation
- CSV export for tax purposes

**Transaction History:**
- Filterable and sortable table
- Quick stats for filtered view
- Pagination
- Inline receipt viewing

**Property Performance:**
- Total income vs expenses (lifetime and yearly)
- Occupancy rate calculation
- Average monthly income
- Maintenance cost trends
- ROI calculation (if purchase price available)

**Category Breakdown:**
- Pie charts and bar graphs
- Expense distribution analysis
- Time period and property filters

**Tax-Ready Reports:**
- Annual summary with categorized expenses
- Printable/PDF export

## Calendar & Event System

### Event Management

**Event Types:**
- Repair (orange)
- Renovation (blue)
- Rent change (green)
- Tenant change (purple)
- Inspection (yellow)
- Other (gray)

**Calendar View:**
- Monthly grid with color-coded events
- Click date to add event
- Click event to view/edit/complete

**Event List View:**
- Chronological list alternative to calendar
- Filters: property, type, completion status, date range
- Overdue events highlighted

**Property Timeline:**
- Shown on property detail page
- Lease periods and tenant changes
- Completed and planned events
- Vacancy period visualization

**Reminders:**
- Dashboard highlights upcoming events (3-7 days)
- Overdue events shown with warning styling
- No email/SMS in v1

## Validation & Error Handling

### Validation

**Shared Schemas (Zod):**
- UK postcode format validation
- Email and phone format validation
- Positive numbers for financial amounts
- Date range validation
- File type and size validation

**Backend Validation:**
- All API inputs validated with Zod
- File uploads: MIME type checking, 10MB size limit
- Proper error messages with field-specific details

**Frontend Validation:**
- React Hook Form with Zod resolver
- Real-time validation feedback
- Reuse backend validation schemas

### Error Handling

**Backend:**
- Standardized error response format
- HTTP status codes: 400 (validation), 401 (auth), 404 (not found), 500 (server error)
- Error logging for debugging

**Frontend:**
- Global error boundary for React crashes
- Toast notifications (Material-UI Snackbar) for API errors
- Loading states and error states in components

## File Management

### Storage Strategy

**Current (Local Filesystem):**
```
/uploads
  /{propertyId}
    /{transactionId|tenantId|propertyId}
      /{filename}
```

**Future (Cloud Storage):**
- Abstract storage behind service interface:
```typescript
interface StorageService {
  upload(file: Buffer, path: string): Promise<string>
  download(path: string): Promise<Buffer>
  delete(path: string): Promise<void>
}
```
- Implement `LocalStorageService` now
- Swap to `S3StorageService` (or Cloudflare R2) later

**File Management:**
- Metadata stored in Documents table
- Cascade delete: remove files when parent entity deleted
- Allowed types: jpg, png, pdf
- Size limit: 10MB per file
- Sanitization: check MIME types, not just extensions

## Security

### Authentication
- Single user account created during first setup
- Bcrypt password hashing (10 rounds)
- Express-session with SQLite session store
- Session cookies: httpOnly, secure (production), sameSite

### API Security
- All endpoints except `/api/auth/login` require authentication
- Helmet.js for security headers
- Rate limiting on API endpoints
- CSRF protection via sameSite cookies

### File Security
- MIME type validation
- Path sanitization to prevent directory traversal
- Access control: only authenticated user can access files

## Development & Deployment

### Local Development

**Setup:**
```bash
npm install
npx prisma migrate dev
npm run dev
```

**Development Mode:**
- Backend: tsx watch on port 3000
- Frontend: Vite dev server with proxy to backend
- Hot reload for both frontend and backend

### Production Build

**Build Process:**
```bash
npm run build        # Build both client and server
npm run start        # Start production server
```

**Environment Variables:**
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - production/development
- `SESSION_SECRET` - Secret for session signing
- `DATABASE_URL` - SQLite database path

### Deployment Options

**Local Network:**
- Run on home server/NAS
- Access via local IP from phone/computer

**Cloud Deployment (Future):**
- Deploy to Railway, Render, or DigitalOcean
- Use Caddy or nginx reverse proxy for HTTPS
- Let's Encrypt for SSL certificates

**Data Backup:**
- Database: `/data/landlord.db`
- Files: `/uploads/*`
- Simple backup: copy both folders
- Automate with cron job or manual exports

## Future Enhancements

Potential features for future versions:
- Email/SMS notifications for upcoming events
- Mobile app (React Native)
- Multi-user support with permissions
- Automated rent reminders
- Integration with accounting software
- Tenant portal for maintenance requests
- Document signing integration
- Automated lease renewals
- Property comparison analytics

## Implementation Plan

Implementation will proceed in phases:

1. **Project Setup & Database**
   - Initialize project structure
   - Configure Prisma with SQLite
   - Create database schema and migrations

2. **Backend API Core**
   - Authentication system
   - CRUD endpoints for all entities
   - File upload handling

3. **Frontend Foundation**
   - React app setup with Material-UI
   - Authentication flow
   - Navigation and layout

4. **Feature Implementation**
   - Properties management
   - Tenants management
   - Financial tracking
   - Calendar and events

5. **Reporting & Polish**
   - Financial reports and charts
   - Dashboard widgets
   - Testing and refinement

6. **Deployment**
   - Production build setup
   - Local deployment
   - Documentation
