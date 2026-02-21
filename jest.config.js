/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
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
