# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack property management application for landlords. React frontend with Express backend, SQLite database via Prisma ORM.

## Development Commands

```bash
# Development
npm run dev              # Run client + server concurrently
npm run dev:server       # Server only (tsx)
npm run dev:client       # Client only (Vite dev server)

# Testing
npm test                 # Run Jest tests with coverage thresholds
npm run test:watch       # Jest watch mode
npm run test:coverage    # Generate coverage report

# Build & Production
npm run build            # Build both client and server
npm start                # Start production server

# Code Quality
npm run lint             # ESLint
npm run format           # Prettier

# Database
npm run db:seed          # Seed database with test data
npm run db:reset         # Reset database
```

## Architecture

### Monorepo Structure
```
├── client/              # React frontend (Vite, MUI, React Router)
│   └── src/
│       ├── pages/       # Route pages
│       ├── components/  # Reusable UI components
│       ├── contexts/    # React Context (Auth, Toast)
│       ├── services/    # API client (axios)
│       └── hooks/       # Custom React hooks
├── server/              # Express backend
│   └── src/
│       ├── routes/      # API route handlers
│       ├── services/    # Business logic (auth, storage)
│       ├── middleware/  # Express middleware (auth, upload)
│       └── db/          # Prisma client
├── shared/              # Shared code
│   ├── types/           # TypeScript interfaces
│   └── validation/      # Zod schemas (used by both client and server)
├── prisma/              # Database schema & migrations
└── docs/                # Documentation
```

### Data Model
Core entities: User, Property, Tenant, Lease, Transaction, Event, Document. See `prisma/schema.prisma` for full schema. Key relationships:
- Property has many Leases, Transactions, Events
- Lease connects Property and Tenant
- Transaction belongs to Property, optionally to Lease
- Document uses polymorphic association (entityType + entityId)

### Validation
Zod schemas in `shared/validation/` are shared between client and server. Import from `shared/validation/index.ts`. Each entity has Create, Update, and full schemas.

### Authentication
Session-based auth with express-session and SQLite session store. Protected routes use `requireAuth` middleware. Frontend uses AuthContext for user state.

### Testing
Jest tests in `server/src/**/__tests__/*.test.ts`. Coverage thresholds: 80% lines/functions/statements, 70% branches.

## Environment Setup

Copy `.env.example` to `.env`. Key variables:
- `DATABASE_URL`: SQLite path (e.g., `file:./data/landlord.db`)
- `SESSION_SECRET`: Required for production
- `CLIENT_URL`: Frontend URL for CORS (default: `http://localhost:5173`)
- `UPLOAD_DIR`: Document storage directory

## Issue Tracking

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```
