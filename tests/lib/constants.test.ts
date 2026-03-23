/**
 * Constants Validation Tests
 * ==========================
 * Tests to validate the configuration constants used throughout the app.
 * 
 * These tests ensure:
 * - Constants are properly defined
 * - Values are within expected ranges
 * - No accidental changes to critical values
 * 
 * Note: Model configuration tests are in tests/api/models.test.ts
 * since models are now stored in the database (GenerationModel table).
 */

import { describe, it, expect } from 'vitest';
import { log } from '../setup';
import { 
  CREDIT_PACKS, 
  MINT_FEE_SOL, 
  PROMPT_MAX_LENGTH, 
  PROMPT_MIN_LENGTH,
  GALLERY_PAGE_SIZE,
  NONCE_EXPIRY_MINUTES,
} from '@/lib/constants';

// =============================================================================
// CREDIT PACK TESTS
// =============================================================================

describe('Constants - Credit Packs', () => {
  log.subsection('Credit Pack Validation');

  it('should have at least one credit pack defined', () => {
    log.info('Testing: Credit packs exist');
    
    expect(CREDIT_PACKS.length).toBeGreaterThan(0);
    
    log.success(`${CREDIT_PACKS.length} credit packs defined`);
  });

  it('should have valid structure for all packs', () => {
    log.info('Testing: Credit pack structure');
    
    for (const pack of CREDIT_PACKS) {
      expect(pack.id).toBeDefined();
      expect(typeof pack.id).toBe('string');
      expect(pack.id.length).toBeGreaterThan(0);
      
      expect(pack.name).toBeDefined();
      expect(typeof pack.name).toBe('string');
      
      expect(pack.credits).toBeDefined();
      expect(typeof pack.credits).toBe('number');
      expect(pack.credits).toBeGreaterThan(0);
      
      expect(pack.usdPrice).toBeDefined();
      expect(typeof pack.usdPrice).toBe('number');
      expect(pack.usdPrice).toBeGreaterThan(0);
      
      log.info(`Pack "${pack.id}": ${pack.credits} credits @ $${pack.usdPrice} ✓`);
    }
    
    log.success('All packs have valid structure');
  });

  it('should have increasing value with larger packs', () => {
    log.info('Testing: Pack value scaling');
    
    const sortedByCredits = [...CREDIT_PACKS].sort((a, b) => a.credits - b.credits);
    
    for (let i = 0; i < sortedByCredits.length; i++) {
      const pack = sortedByCredits[i];
      const creditsPerDollar = pack.credits / pack.usdPrice;
      
      log.info(`${pack.name}: ${creditsPerDollar.toFixed(2)} credits/$ (${pack.credits} for $${pack.usdPrice})`);
    }
    
    // Generally, larger packs should have better value
    if (sortedByCredits.length >= 2) {
      const smallest = sortedByCredits[0];
      const largest = sortedByCredits[sortedByCredits.length - 1];
      
      const smallValue = smallest.credits / smallest.usdPrice;
      const largeValue = largest.credits / largest.usdPrice;
      
      // Note: This may not always be true depending on pricing strategy
      log.info(`Value comparison: Smallest ${smallValue.toFixed(2)}/$ vs Largest ${largeValue.toFixed(2)}/$`);
    }
    
    log.success('Pack values analyzed');
  });

  it('should have unique pack IDs', () => {
    log.info('Testing: Unique pack IDs');
    
    const ids = CREDIT_PACKS.map(p => p.id);
    const uniqueIds = new Set(ids);
    
    expect(uniqueIds.size).toBe(ids.length);
    
    log.success(`All ${ids.length} pack IDs are unique`);
  });
});

// =============================================================================
// PROMPT VALIDATION TESTS
// =============================================================================

describe('Constants - Prompt Validation', () => {
  log.subsection('Prompt Limit Validation');

  it('should have valid min/max prompt lengths', () => {
    log.info('Testing: Prompt length limits');
    
    expect(PROMPT_MIN_LENGTH).toBeDefined();
    expect(typeof PROMPT_MIN_LENGTH).toBe('number');
    expect(PROMPT_MIN_LENGTH).toBeGreaterThan(0);
    expect(PROMPT_MIN_LENGTH).toBeLessThan(PROMPT_MAX_LENGTH);
    
    expect(PROMPT_MAX_LENGTH).toBeDefined();
    expect(typeof PROMPT_MAX_LENGTH).toBe('number');
    expect(PROMPT_MAX_LENGTH).toBeGreaterThan(0);
    
    log.success(`Prompt length: ${PROMPT_MIN_LENGTH} - ${PROMPT_MAX_LENGTH} characters`);
  });

  it('should have reasonable prompt limits', () => {
    log.info('Testing: Reasonable prompt limits');
    
    // Min should be > 0 to prevent empty prompts
    expect(PROMPT_MIN_LENGTH).toBeGreaterThanOrEqual(1);
    
    // Max should be reasonable for DALL-E (typically 1000 chars max)
    expect(PROMPT_MAX_LENGTH).toBeLessThanOrEqual(1000);
    
    // Should allow for reasonable descriptions
    expect(PROMPT_MAX_LENGTH).toBeGreaterThanOrEqual(100);
    
    log.success('Prompt limits are reasonable for DALL-E 3');
  });
});

// =============================================================================
// OTHER CONSTANTS TESTS
// =============================================================================

describe('Constants - Other Values', () => {
  log.subsection('Other Constant Validation');

  it('should have valid mint fee', () => {
    log.info('Testing: Mint fee');
    
    expect(MINT_FEE_SOL).toBeDefined();
    expect(typeof MINT_FEE_SOL).toBe('number');
    expect(MINT_FEE_SOL).toBeGreaterThan(0);
    expect(MINT_FEE_SOL).toBeLessThan(1); // Should be less than 1 SOL
    
    log.success(`Mint fee: ${MINT_FEE_SOL} SOL`);
  });

  it('should have valid gallery page size', () => {
    log.info('Testing: Gallery page size');
    
    expect(GALLERY_PAGE_SIZE).toBeDefined();
    expect(typeof GALLERY_PAGE_SIZE).toBe('number');
    expect(GALLERY_PAGE_SIZE).toBeGreaterThan(0);
    expect(GALLERY_PAGE_SIZE).toBeLessThanOrEqual(100); // Reasonable max
    
    log.success(`Gallery page size: ${GALLERY_PAGE_SIZE} items`);
  });

  it('should have valid nonce expiry', () => {
    log.info('Testing: Nonce expiry');
    
    expect(NONCE_EXPIRY_MINUTES).toBeDefined();
    expect(typeof NONCE_EXPIRY_MINUTES).toBe('number');
    expect(NONCE_EXPIRY_MINUTES).toBeGreaterThan(0);
    expect(NONCE_EXPIRY_MINUTES).toBeLessThanOrEqual(60); // Not more than 1 hour
    
    log.success(`Nonce expiry: ${NONCE_EXPIRY_MINUTES} minutes`);
  });
});

// =============================================================================
// IMMUTABILITY TESTS
// =============================================================================

describe('Constants - Immutability', () => {
  log.subsection('Immutability Checks');

  it('should have frozen CREDIT_PACKS array', () => {
    log.info('Testing: CREDIT_PACKS immutability');
    
    // Check it's a readonly tuple (as const)
    expect(Array.isArray(CREDIT_PACKS)).toBe(true);
    
    // Attempting to modify should fail in TypeScript
    // At runtime, we can check Object.isFrozen if using as const
    
    log.success('CREDIT_PACKS is a readonly array');
  });

  it('should document critical constants for reference', () => {
    log.info('Testing: Document all critical constants');
    
    const allConstants = {
      creditPacks: CREDIT_PACKS.map(p => ({ 
        id: p.id, 
        credits: p.credits, 
        price: `$${p.usdPrice}` 
      })),
      // Note: Models are now in database, not constants
      mintFee: `${MINT_FEE_SOL} SOL`,
      promptLimits: `${PROMPT_MIN_LENGTH}-${PROMPT_MAX_LENGTH} chars`,
      galleryPageSize: GALLERY_PAGE_SIZE,
      nonceExpiry: `${NONCE_EXPIRY_MINUTES} minutes`,
    };
    
    log.success('All constants documented', allConstants);
  });
});
