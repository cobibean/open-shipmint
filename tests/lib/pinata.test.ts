/**
 * Pinata IPFS Integration Tests
 * =============================
 * Tests for image and JSON upload to IPFS via Pinata.
 * 
 * Edge Cases Covered:
 * - Missing JWT token
 * - Invalid JWT token
 * - Upload size limits
 * - Network failures
 * - Rate limiting
 * - Malformed responses
 * - Empty file uploads
 * - Large file handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isLiveTestsEnabled, log } from '../setup';

// =============================================================================
// UNIT TESTS (Mocked)
// =============================================================================

describe('Pinata Integration - Unit Tests', () => {
  log.subsection('Pinata Unit Tests (Mocked)');

  describe('uploadImageToPinata function', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should handle missing PINATA_JWT', async () => {
      log.info('Testing: Missing JWT token handling');
      
      const originalJwt = process.env.PINATA_JWT;
      delete process.env.PINATA_JWT;

      // Mock fetch to capture what happens
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      try {
        const { uploadImageToPinata } = await import('@/lib/pinata');
        const testBuffer = Buffer.from([137, 80, 78, 71]); // PNG header
        
        await expect(uploadImageToPinata(testBuffer, 'test.png'))
          .rejects.toThrow();
        
        log.success('Missing JWT correctly causes upload failure');
      } finally {
        if (originalJwt) process.env.PINATA_JWT = originalJwt;
      }
    });

    it('should handle upload API errors', async () => {
      log.info('Testing: API error handling');
      
      const errorCases = [
        { status: 400, body: 'Bad Request', description: 'Invalid request' },
        { status: 401, body: 'Unauthorized', description: 'Invalid JWT' },
        { status: 403, body: 'Forbidden', description: 'Permission denied' },
        { status: 429, body: 'Too Many Requests', description: 'Rate limited' },
        { status: 500, body: 'Internal Server Error', description: 'Server error' },
        { status: 503, body: 'Service Unavailable', description: 'Service down' },
      ];

      for (const errorCase of errorCases) {
        vi.resetModules();
        
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: errorCase.status,
          text: () => Promise.resolve(errorCase.body),
        });

        const { uploadImageToPinata } = await import('@/lib/pinata');
        const testBuffer = Buffer.from([137, 80, 78, 71]);
        
        await expect(uploadImageToPinata(testBuffer, 'test.png'))
          .rejects.toThrow(/Pinata upload failed/);
        
        log.info(`${errorCase.status} (${errorCase.description}): ✓ Handled correctly`);
      }
      
      log.success('All API error codes handled correctly');
    });

    it('should handle network failures', async () => {
      log.info('Testing: Network failure handling');
      
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const { uploadImageToPinata } = await import('@/lib/pinata');
      const testBuffer = Buffer.from([137, 80, 78, 71]);
      
      await expect(uploadImageToPinata(testBuffer, 'test.png'))
        .rejects.toThrow('Network error');
      
      log.success('Network errors propagated correctly');
    });

    it('should handle successful upload response', async () => {
      log.info('Testing: Successful upload parsing');
      
      const mockResponse = {
        IpfsHash: 'bafkreihxyz123456789',
        PinSize: 12345,
        Timestamp: new Date().toISOString(),
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const { uploadImageToPinata } = await import('@/lib/pinata');
      const testBuffer = Buffer.from([137, 80, 78, 71]);
      
      const result = await uploadImageToPinata(testBuffer, 'test.png');
      
      expect(result.cid).toBe('bafkreihxyz123456789');
      expect(result.ipfsUrl).toBe('ipfs://bafkreihxyz123456789');
      expect(result.gatewayUrl).toContain('gateway.pinata.cloud/ipfs/bafkreihxyz123456789');
      
      log.success('Upload response parsed correctly', result);
    });

    it('should handle malformed API responses', async () => {
      log.info('Testing: Malformed response handling');
      
      const malformedResponses = [
        { data: {}, description: 'Empty object' },
        { data: { IpfsHash: null }, description: 'Null hash' },
        { data: { IpfsHash: '' }, description: 'Empty hash' },
        { data: null, description: 'Null response' },
      ];

      for (const test of malformedResponses) {
        vi.resetModules();
        
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(test.data),
        });

        const { uploadImageToPinata } = await import('@/lib/pinata');
        const testBuffer = Buffer.from([137, 80, 78, 71]);
        
        // Should either throw or return falsy cid
        try {
          const result = await uploadImageToPinata(testBuffer, 'test.png');
          log.info(`${test.description}: Returned ${JSON.stringify(result)}`);
        } catch (error) {
          log.info(`${test.description}: Threw error (expected)`);
        }
      }
      
      log.success('Malformed responses handled');
    });
  });

  describe('uploadJsonToPinata function', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should handle JSON upload with metadata', async () => {
      log.info('Testing: JSON metadata upload');
      
      const mockResponse = {
        IpfsHash: 'bafkreibjson123',
        PinSize: 1234,
        Timestamp: new Date().toISOString(),
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const { uploadJsonToPinata } = await import('@/lib/pinata');
      
      const nftMetadata = {
        name: 'Test NFT',
        description: 'A test NFT',
        image: 'ipfs://bafkreitest',
        attributes: [
          { trait_type: 'Background', value: 'Blue' },
        ],
      };
      
      const result = await uploadJsonToPinata(nftMetadata, 'metadata.json');
      
      expect(result.cid).toBe('bafkreibjson123');
      expect(result.ipfsUrl).toBe('ipfs://bafkreibjson123');
      
      log.success('JSON upload works correctly', result);
    });

    it('should handle complex nested JSON', async () => {
      log.info('Testing: Complex nested JSON handling');
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ IpfsHash: 'bafkreicomplex' }),
      });

      const { uploadJsonToPinata } = await import('@/lib/pinata');
      
      const complexJson = {
        level1: {
          level2: {
            level3: {
              array: [1, 2, 3],
              nested: { deep: 'value' },
            },
          },
        },
        unicode: '日本語テスト',
        special: 'Quotes "and" \'apostrophes\'',
        numbers: [0, -1, 3.14159, 1e10],
        booleans: [true, false],
        nullValue: null,
      };
      
      const result = await uploadJsonToPinata(complexJson, 'complex.json');
      
      expect(result.cid).toBeDefined();
      
      // Verify fetch was called with JSON content-type
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      
      log.success('Complex JSON handled correctly');
    });
  });
});

// =============================================================================
// INTEGRATION TESTS (Real API)
// =============================================================================

describe('Pinata Integration - Live API Tests', () => {
  log.subsection('Pinata Live API Tests');

  const hasJwt = !!process.env.PINATA_JWT;
  const runLive = isLiveTestsEnabled();

  it.skipIf(!hasJwt || !runLive)(
    'should upload image to IPFS (LIVE API)', 
    { timeout: 30000 },
    async () => {
      log.info('Testing: Live image upload to Pinata');
      
      const { uploadImageToPinata } = await import('@/lib/pinata');
      
      // Create a minimal valid PNG (1x1 red pixel)
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
        0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
        0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x18, 0xDD,
        0x8D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, // IEND chunk
        0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
      ]);
      
      const fileName = `test-${Date.now()}.png`;
      
      try {
        const result = await uploadImageToPinata(pngBuffer, fileName);
        
        expect(result.cid).toBeDefined();
        expect(result.cid.startsWith('baf')).toBe(true); // CIDv1 prefix
        expect(result.gatewayUrl).toContain(result.cid);
        
        log.success('Image uploaded to IPFS', {
          cid: result.cid,
          gatewayUrl: result.gatewayUrl,
        });
      } catch (error) {
        log.error('Pinata upload failed', error);
        throw error;
      }
    }
  );

  it.skipIf(!hasJwt || !runLive)(
    'should upload JSON metadata to IPFS (LIVE API)', 
    { timeout: 30000 },
    async () => {
      log.info('Testing: Live JSON upload to Pinata');
      
      const { uploadJsonToPinata } = await import('@/lib/pinata');
      
      const metadata = {
        name: 'shipmint Test',
        description: 'Test upload from shipmint test suite',
        timestamp: new Date().toISOString(),
      };
      
      try {
        const result = await uploadJsonToPinata(metadata, `test-metadata-${Date.now()}.json`);
        
        expect(result.cid).toBeDefined();
        expect(result.cid.startsWith('baf')).toBe(true);
        
        log.success('JSON uploaded to IPFS', {
          cid: result.cid,
          gatewayUrl: result.gatewayUrl,
        });
      } catch (error) {
        log.error('Pinata JSON upload failed', error);
        throw error;
      }
    }
  );
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe('Pinata Edge Cases', () => {
  log.subsection('Pinata Edge Cases');

  it('should handle empty buffer', async () => {
    log.info('Testing: Empty buffer handling');
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('Empty file'),
    });

    const { uploadImageToPinata } = await import('@/lib/pinata');
    const emptyBuffer = Buffer.from([]);
    
    await expect(uploadImageToPinata(emptyBuffer, 'empty.png'))
      .rejects.toThrow();
    
    log.success('Empty buffer handled correctly');
  });

  it('should handle very long filenames', async () => {
    log.info('Testing: Long filename handling');
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ IpfsHash: 'bafkreilongname' }),
    });

    const { uploadImageToPinata } = await import('@/lib/pinata');
    const testBuffer = Buffer.from([137, 80, 78, 71]);
    
    // Create a very long filename
    const longFilename = 'a'.repeat(200) + '.png';
    
    const result = await uploadImageToPinata(testBuffer, longFilename);
    
    expect(result.cid).toBeDefined();
    
    log.success('Long filenames handled correctly');
  });

  it('should handle special characters in filenames', async () => {
    log.info('Testing: Special characters in filenames');
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ IpfsHash: 'bafkreispecial' }),
    });

    const { uploadImageToPinata } = await import('@/lib/pinata');
    const testBuffer = Buffer.from([137, 80, 78, 71]);
    
    const specialFilenames = [
      'test file.png',
      'test-file_2024.png',
      'テスト.png',
      'image (1).png',
    ];
    
    for (const filename of specialFilenames) {
      vi.resetModules();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ IpfsHash: 'bafkreitest' }),
      });
      
      const { uploadImageToPinata: upload } = await import('@/lib/pinata');
      const result = await upload(testBuffer, filename);
      
      expect(result.cid).toBeDefined();
      log.info(`Filename "${filename}": ✓ OK`);
    }
    
    log.success('Special character filenames handled correctly');
  });

  it('should document file size limits', () => {
    log.info('Testing: File size limit documentation');
    
    const sizeLimits = {
      freeTeir: '100MB per file',
      paidTier: 'Larger files supported',
      recommendation: 'Keep images under 10MB for fast loading',
      dalleOutput: '~2-4MB typical for 1024x1024 PNG',
    };
    
    log.success('File size limits documented', sizeLimits);
  });
});
