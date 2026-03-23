/**
 * Test Setup File
 * ================
 * Configures the test environment and provides utilities for all tests.
 */

import dotenv from 'dotenv';
import path from 'path';
import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });

const originalFetch = globalThis.fetch;

// =============================================================================
// LOGGING UTILITIES
// =============================================================================

export const log = {
  info: (msg: string, data?: unknown) => {
    console.log(`\n  ℹ️  ${msg}`);
    if (data) console.log(`      ${JSON.stringify(data, null, 2).replace(/\n/g, '\n      ')}`);
  },
  success: (msg: string, data?: unknown) => {
    console.log(`\n  ✅ ${msg}`);
    if (data) console.log(`      ${JSON.stringify(data, null, 2).replace(/\n/g, '\n      ')}`);
  },
  error: (msg: string, error?: unknown) => {
    console.log(`\n  ❌ ${msg}`);
    if (error instanceof Error) {
      console.log(`      Error: ${error.message}`);
      if (error.stack) {
        const stackLines = error.stack.split('\n').slice(1, 4);
        console.log(`      Stack: ${stackLines.join('\n             ')}`);
      }
    } else if (error) {
      console.log(`      ${JSON.stringify(error, null, 2).replace(/\n/g, '\n      ')}`);
    }
  },
  warn: (msg: string, data?: unknown) => {
    console.log(`\n  ⚠️  ${msg}`);
    if (data) console.log(`      ${JSON.stringify(data, null, 2).replace(/\n/g, '\n      ')}`);
  },
  section: (title: string) => {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  ${title}`);
    console.log(`${'═'.repeat(60)}`);
  },
  subsection: (title: string) => {
    console.log(`\n  ${'─'.repeat(50)}`);
    console.log(`  ${title}`);
    console.log(`  ${'─'.repeat(50)}`);
  },
};

// =============================================================================
// MOCK FACTORIES
// =============================================================================

export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  walletAddress: '7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q',
  creditBalance: 10,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockGeneration = (overrides = {}) => ({
  id: 'test-generation-id',
  userId: 'test-user-id',
  prompt: 'A beautiful sunset over mountains',
  modelId: 'openai-dalle3',
  modelName: 'DALL-E 3',
  creditCost: 1,
  ipfsCid: 'bafkreitest123',
  ipfsUrl: 'https://gateway.pinata.cloud/ipfs/bafkreitest123',
  isMinted: false,
  mintedAt: null,
  nftAddress: null,
  mintTxHash: null,
  nftTitle: null,
  createdAt: new Date(),
  ...overrides,
});

export const createMockJWT = (payload = {}) => {
  // This creates a mock JWT structure - for real testing use actual JWT signing
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({
    userId: 'test-user-id',
    walletAddress: '7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...payload,
  })).toString('base64url');
  const signature = 'mock-signature';
  return `${header}.${body}.${signature}`;
};

// =============================================================================
// ENVIRONMENT HELPERS
// =============================================================================

export const isLiveTestsEnabled = () => {
  const flag = process.env.RUN_LIVE_TESTS;
  return flag === '1' || flag?.toLowerCase() === 'true';
};

export const checkEnvVars = () => {
  const required = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    PINATA_JWT: process.env.PINATA_JWT,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
  };

  const missing: string[] = [];
  const present: string[] = [];

  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      missing.push(key);
    } else {
      present.push(key);
    }
  }

  return { missing, present, allPresent: missing.length === 0 };
};

// =============================================================================
// GLOBAL HOOKS
// =============================================================================

beforeAll(() => {
  log.section('🧪 SHIPMINT TEST SUITE - EPIC 4: IMAGE GENERATION');
  
  const envCheck = checkEnvVars();
  if (envCheck.present.length > 0) {
    log.info('Environment variables detected:', envCheck.present);
  }
  if (envCheck.missing.length > 0) {
    log.warn('Missing environment variables (some tests will be skipped):', envCheck.missing);
  }

  if (isLiveTestsEnabled()) {
    log.warn('RUN_LIVE_TESTS enabled: live API tests may run and incur costs.');
  }
});

afterAll(() => {
  log.section('🏁 TEST SUITE COMPLETE');
});

// =============================================================================
// GLOBAL SANITY RESTORES
// =============================================================================

afterEach(() => {
  // Some tests stub/overwrite `global.fetch`. Restore it so "LIVE API" tests
  // actually hit the network when enabled.
  if (typeof originalFetch === 'function') {
    globalThis.fetch = originalFetch;
  } else {
    // @ts-expect-error - allow cleanup if fetch didn't exist originally
    delete globalThis.fetch;
  }

  vi.unstubAllGlobals();
});
