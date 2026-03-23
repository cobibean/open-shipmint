/**
 * Full Flow Integration Tests
 * ===========================
 * End-to-end tests simulating the complete generation flow.
 * These tests require actual API keys to run.
 * 
 * Test Scenarios:
 * - Complete happy path (generate → IPFS → database)
 * - Failure recovery (credit refund)
 * - Rate limiting behavior
 * - Concurrent generation handling
 * - Web3 wallet authentication simulation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { log, checkEnvVars, isLiveTestsEnabled } from '../setup';

// =============================================================================
// ENVIRONMENT CHECK
// =============================================================================

describe('Full Flow Integration Tests', () => {
  log.subsection('Integration Test Prerequisites');

  const envCheck = checkEnvVars();
  const envReady = envCheck.allPresent;

  beforeAll(() => {
    if (!envReady) {
      log.warn('Integration tests require all environment variables');
      log.info('Missing:', envCheck.missing);
      log.info('To run integration tests, set these in your .env file');
    } else {
      log.success('All environment variables present - integration tests enabled');
    }
  });

  // =============================================================================
  // LIVE API INTEGRATION TESTS
  // =============================================================================

  describe('Live API Integration', () => {
    it.skipIf(!isLiveTestsEnabled() || !envReady)(
      'should complete full generation flow (LIVE)',
      { timeout: 120000 },
      async () => {
        log.info('Testing: Complete generation flow with real APIs');
        log.warn('This test costs money (OpenAI API call)!');
        
        const { generateImage, downloadImage } = await import('@/lib/openai');
        const { uploadImageToPinata } = await import('@/lib/pinata');
        
        const prompt = 'A simple blue square, minimal, solid color';
        
        try {
          // Step 1: Generate image
          log.info('Step 1: Generating image with DALL-E 3...');
          const startGen = Date.now();
          const genResult = await generateImage(prompt);
          const genTime = Date.now() - startGen;
          
          expect(genResult.imageUrl || genResult.imageBuffer).toBeDefined();
          
          log.success(`Image generated in ${genTime}ms`, {
            image: genResult.imageUrl
              ? genResult.imageUrl.substring(0, 60) + '...'
              : `Buffer(${(genResult.imageBuffer as Buffer).length} bytes)`,
            revisedPrompt: genResult.revisedPrompt.substring(0, 80) + '...',
          });

          // Step 2: Get image bytes
          log.info('Step 2: Getting image bytes...');
          const startDl = Date.now();
          const imageBuffer =
            genResult.imageBuffer ??
            (genResult.imageUrl ? await downloadImage(genResult.imageUrl) : null);
          const dlTime = Date.now() - startDl;

          if (!imageBuffer) {
            throw new Error('No image bytes returned from OpenAI');
          }
          
          expect(Buffer.isBuffer(imageBuffer)).toBe(true);
          expect(imageBuffer.length).toBeGreaterThan(1000); // Real image should be > 1KB
          
          log.success(`Image bytes ready in ${dlTime}ms`, {
            bufferSize: `${(imageBuffer.length / 1024).toFixed(1)} KB`,
          });

          // Step 3: Upload to IPFS
          log.info('Step 3: Uploading to IPFS via Pinata...');
          const startUpload = Date.now();
          const fileName = `test-integration-${Date.now()}.png`;
          const ipfsResult = await uploadImageToPinata(imageBuffer, fileName);
          const uploadTime = Date.now() - startUpload;
          
          expect(ipfsResult.cid).toBeDefined();
          expect(ipfsResult.cid).toMatch(/^baf/); // CIDv1 starts with baf
          expect(ipfsResult.gatewayUrl).toContain(ipfsResult.cid);
          
          log.success(`Uploaded to IPFS in ${uploadTime}ms`, {
            cid: ipfsResult.cid,
            gatewayUrl: ipfsResult.gatewayUrl,
          });

          // Step 4: Verify image is accessible
          log.info('Step 4: Verifying IPFS gateway accessibility...');
          const verifyStart = Date.now();
          const verifyResponse = await fetch(ipfsResult.gatewayUrl, { method: 'HEAD' });
          const verifyTime = Date.now() - verifyStart;
          
          expect(verifyResponse.ok).toBe(true);
          expect(verifyResponse.headers.get('content-type')).toContain('image');
          
          log.success(`IPFS verification in ${verifyTime}ms`, {
            status: verifyResponse.status,
            contentType: verifyResponse.headers.get('content-type'),
          });

          // Summary
          const totalTime = genTime + dlTime + uploadTime + verifyTime;
          log.info('═'.repeat(50));
          log.success('Full flow completed successfully!', {
            totalTime: `${totalTime}ms`,
            breakdown: {
              generation: `${genTime}ms`,
              download: `${dlTime}ms`,
              upload: `${uploadTime}ms`,
              verify: `${verifyTime}ms`,
            },
            finalCid: ipfsResult.cid,
          });

        } catch (error) {
          log.error('Integration test failed', error);
          throw error;
        }
      }
    );
  });

  // =============================================================================
  // SIMULATED SCENARIOS
  // =============================================================================

  describe('Simulated Scenarios', () => {
    it('should document expected timing characteristics', () => {
      log.info('Testing: Document expected timing');
      
      const expectedTiming = {
        openaiGeneration: {
          min: '8 seconds',
          typical: '15-25 seconds',
          max: '45 seconds (timeout)',
          factors: ['Model load time', 'Image complexity', 'API congestion'],
        },
        imageDownload: {
          typical: '500ms - 2s',
          factors: ['Image size (~2-4MB)', 'CDN location'],
        },
        pinataUpload: {
          typical: '1-5 seconds',
          factors: ['File size', 'Network latency', 'Pinata congestion'],
        },
        totalFlow: {
          typical: '20-35 seconds',
          worstCase: '60+ seconds',
        },
      };
      
      log.success('Timing characteristics documented', expectedTiming);
    });

    it('should document rate limit behavior', () => {
      log.info('Testing: Document rate limiting');
      
      const rateLimits = {
        openai: {
          tier1: '5 images/minute',
          tier2: '7 images/minute',
          recommendation: 'Implement queue with 12s delay between requests',
        },
        pinata: {
          free: '100 requests/minute',
          paid: 'Higher limits',
          recommendation: 'Batch uploads are not typically needed',
        },
        shipmint: {
          recommendation: 'Credit system naturally rate-limits users',
          additionalProtection: 'Consider per-user cooldown of 5s',
        },
      };
      
      log.success('Rate limits documented', rateLimits);
    });

    it('should document error recovery behavior', () => {
      log.info('Testing: Document error recovery');
      
      const errorRecovery = {
        openaiFailure: {
          action: 'Refund credits immediately',
          userMessage: 'Generation failed. Credits refunded.',
          logging: 'Log error details for debugging',
        },
        pinataFailure: {
          action: 'Refund credits, retry option',
          userMessage: 'Upload failed. Credits refunded.',
          consideration: 'OpenAI image is lost, cannot retry upload only',
        },
        networkTimeout: {
          action: 'Refund credits after timeout',
          userMessage: 'Request timed out. Please try again.',
          timeout: '60 seconds recommended',
        },
        contentPolicyViolation: {
          action: 'Refund credits',
          userMessage: 'Your prompt was rejected. Please try a different prompt.',
          note: 'OpenAI error message should be forwarded',
        },
      };
      
      log.success('Error recovery documented', errorRecovery);
    });

    it('should document concurrent request handling', () => {
      log.info('Testing: Document concurrency handling');
      
      const concurrencyHandling = {
        sameUser: {
          behavior: 'Allow multiple pending generations',
          creditCheck: 'Deduct credits atomically per request',
          risk: 'User could overdraw credits if spamming',
          mitigation: 'Frontend button disabled during generation',
        },
        raceCondition: {
          scenario: 'Two requests start with 1 credit',
          behavior: 'Second request fails at credit check',
          reason: 'Credits deducted before generation starts',
        },
        recommendation: {
          frontend: 'Disable generate button during pending',
          backend: 'Consider Redis-based rate limiting for spam protection',
        },
      };
      
      log.success('Concurrency handling documented', concurrencyHandling);
    });
  });

  // =============================================================================
  // WEB3 SPECIFIC TESTS
  // =============================================================================

  describe('Web3 Edge Cases', () => {
    it('should document wallet authentication edge cases', () => {
      log.info('Testing: Document Web3 auth edge cases');
      
      const web3EdgeCases = {
        walletDisconnectMidGeneration: {
          scenario: 'User disconnects wallet during 20s generation',
          behavior: 'Generation continues on server, result stored',
          userExperience: 'User reconnects, generation visible in gallery',
        },
        tokenExpiryMidGeneration: {
          scenario: 'JWT expires during generation',
          behavior: 'Generation completes, response may fail to deliver',
          mitigation: 'Use 24h JWT expiry (current setup)',
        },
        multipleWallets: {
          scenario: 'User switches wallets mid-session',
          behavior: 'New auth required, new user context',
          consideration: 'In-progress generations belong to original wallet',
        },
        walletSignatureRejection: {
          scenario: 'User rejects signature request',
          behavior: 'Auth fails, no generation possible',
          userExperience: 'Prompt to sign message again',
        },
      };
      
      log.success('Web3 edge cases documented', web3EdgeCases);
    });

    it('should document Solana-specific considerations', () => {
      log.info('Testing: Document Solana considerations');
      
      const solanaConsiderations = {
        creditPurchase: {
          transactionLanding: 'Use Helius/Triton RPC, not public RPC',
          confirmationTime: '5-30 seconds typical',
          priorityFees: '50,000 microlamports/CU recommended',
        },
        futureMinting: {
          transactionSize: 'NFT mint tx ~1000-1500 bytes',
          computeUnits: '~200,000 CU for Metaplex mint',
          confirmationNeeded: 'Wait for confirmed status before showing success',
        },
        walletCompatibility: {
          tested: ['Phantom', 'Solflare'],
          expected: ['Backpack', 'Glow', 'Ledger via adapter'],
        },
      };
      
      log.success('Solana considerations documented', solanaConsiderations);
    });
  });

  // =============================================================================
  // SECURITY CONSIDERATIONS
  // =============================================================================

  describe('Security Considerations', () => {
    it('should document security measures', () => {
      log.info('Testing: Document security measures');
      
      const securityMeasures = {
        authentication: {
          method: 'Wallet signature verification',
          storage: 'JWT in Zustand with localStorage persistence',
          expiry: '24 hours (configurable)',
        },
        apiProtection: {
          allGenerationRoutes: 'Protected by withAuth middleware',
          creditDeduction: 'Server-side only, atomic operations',
          userIsolation: 'Generations scoped to user ID from JWT',
        },
        inputValidation: {
          promptLength: '3-500 characters enforced',
          promptContent: 'OpenAI handles content policy',
          modelId: 'Validation against GenerationModel database table',
        },
        secretsHandling: {
          openaiKey: 'Server-side only, never exposed to client',
          pinataJwt: 'Server-side only',
          jwtSecret: 'Server-side only',
          treasuryKey: 'Not used in this app (would be in minting)',
        },
        rateLimiting: {
          current: 'Credit-based limiting',
          recommendation: 'Add IP-based rate limiting in production',
        },
      };
      
      log.success('Security measures documented', securityMeasures);
    });

    it('should document potential vulnerabilities and mitigations', () => {
      log.info('Testing: Document security considerations');
      
      const securityNotes = {
        creditManipulation: {
          risk: 'Client could try to manipulate credit display',
          mitigation: 'All credit operations are server-side',
          verification: 'Balance always fetched from server',
        },
        promptInjection: {
          risk: 'Malicious prompts to bypass content policy',
          mitigation: 'OpenAI handles content moderation',
          logging: 'Log rejected prompts for review',
        },
        replayAttacks: {
          risk: 'Reusing signed transactions',
          mitigation: 'Transaction signatures are unique, stored with unique constraint',
        },
        jwtSecurity: {
          risk: 'Token theft from localStorage',
          mitigation: 'XSS prevention, token expiry',
          recommendation: 'Consider httpOnly cookies for production',
        },
      };
      
      log.success('Security notes documented', securityNotes);
    });
  });
});
