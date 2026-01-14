# Database Seeding

This directory contains the database schema and seeding scripts for the Landlord Software application.

## Seed Script

The `seed.ts` file provides realistic test data for development and demonstration purposes.

### Running the Seed Script

```bash
# Seed the database with sample data
npm run db:seed

# Or reset and seed (same as above)
npm run db:reset
```

### What Gets Seeded

The seed script creates the following sample data:

- **2 Users** - Admin and manager accounts for testing authentication
- **7 Properties** - Variety of property types (apartments, houses, studio, bungalow) with different statuses:
  - Occupied properties with active leases
  - Vacant properties ready for new tenants
  - Properties under maintenance
- **10 Tenants** - Mix of active, inactive, and pending tenants with realistic contact information
- **8 Leases** - Various lease statuses:
  - Active leases with current tenants
  - Expired leases
  - Pending leases for upcoming move-ins
- **19 Transactions** - Income and expense records:
  - Monthly rent payments
  - Security deposits
  - Maintenance and repair expenses
  - Insurance and tax payments
  - Utility bills
  - Management fees
- **15 Events** - Calendar events including:
  - Completed property inspections
  - Upcoming maintenance tasks
  - Property showings
  - Lease renewals
  - Safety checks

### Features

- **Idempotent**: The script clears all existing data before seeding, so it can be run multiple times safely
- **Realistic Data**: All sample data uses realistic UK addresses, phone numbers, and scenarios
- **Relationships**: Data maintains proper relationships (leases link tenants to properties, transactions reference leases, etc.)
- **Variety**: Includes various statuses, types, and categories to demonstrate all features of the application

### Sample Data Overview

#### Properties
- Located across major UK cities (Manchester, Birmingham, Leeds, Liverpool, Bristol, Sheffield, Newcastle)
- Various property types demonstrating different rental scenarios
- Mix of occupied, vacant, and under-maintenance properties

#### Tenants
- Diverse tenant profiles with emergency contacts
- Various statuses (Active, Inactive, Pending)
- Realistic email addresses and UK phone numbers

#### Leases
- Active leases with different rent amounts
- Expired and pending leases for workflow testing
- Properly linked to properties and tenants

#### Transactions
- Income: Rent payments, security deposits
- Expenses: Maintenance, insurance, utilities, property tax, management fees, cleaning, gardening
- Realistic amounts and descriptions

#### Events
- Past completed events for historical data
- Upcoming events for calendar/scheduling features
- Various event types: Inspection, Maintenance, Showing, Other

### Notes

- The seed script uses the same database adapter configuration as the main application
- All data is fictional and created for testing purposes only
- User passwords in the seed data are placeholder hashes and should be updated for actual use
