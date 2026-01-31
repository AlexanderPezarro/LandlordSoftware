# Client Tests Setup

This directory contains tests for the client-side contexts. To run these tests, you need to set up the testing infrastructure.

## Required Dependencies

Install the following packages:

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom
```

## Jest Configuration

Update `jest.config.js` in the root directory to include client tests:

```javascript
/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  projects: [
    // Server tests
    {
      displayName: 'server',
      testEnvironment: 'node',
      roots: ['<rootDir>/server/src'],
      testMatch: ['**/__tests__/**/*.test.ts'],
      moduleFileExtensions: ['ts', 'js', 'json'],
      collectCoverageFrom: [
        'server/src/**/*.ts',
        '!server/src/**/*.test.ts',
        '!server/src/**/__tests__/**',
        '!server/src/server.ts',
        '!server/src/db/**',
      ],
      extensionsToTreatAsEsm: ['.ts'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
      transform: {
        '^.+\\.ts$': [
          'ts-jest',
          {
            useESM: true,
          },
        ],
      },
    },
    // Client tests
    {
      displayName: 'client',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/client/src'],
      testMatch: ['**/__tests__/**/*.test.tsx', '**/__tests__/**/*.test.ts'],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      setupFilesAfterEnv: ['<rootDir>/client/src/setupTests.ts'],
      moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      },
      transform: {
        '^.+\\.(ts|tsx)$': [
          'ts-jest',
          {
            tsconfig: {
              jsx: 'react',
              esModuleInterop: true,
            },
          },
        ],
      },
    },
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

## Setup File

Create `client/src/setupTests.ts`:

```typescript
import '@testing-library/jest-dom';
```

## Running Tests

```bash
# Run all tests (server + client)
npm test

# Run only client tests
npm test -- --selectProjects=client

# Run with watch mode
npm run test:watch -- --selectProjects=client

# Run specific test file
npm test -- AuthContext.canWrite.test.tsx
```

## Test Structure

Tests use:
- **@testing-library/react**: For rendering React components and hooks
- **jest-dom**: For additional DOM matchers
- **renderHook**: For testing custom hooks in isolation

## Current Tests

- `AuthContext.canWrite.test.tsx`: Tests for the `canWrite()` method
  - Role-based permissions (ADMIN, LANDLORD, VIEWER)
  - Unauthenticated user handling
  - Role transitions
  - Consistency with `isAdmin()`
