/**
 * Generation API Route Tests
 * ==========================
 * Tests for /api/generate endpoint covering authentication, validation,
 * credit handling, and error scenarios.
 * 
 * Web2 Edge Cases:
 * - Missing/invalid auth token
 * - Malformed request body
 * - Prompt validation (length, content)
 * - Credit balance checks
 * - Database errors
 * - OpenAI failures
 * - Pinata failures
 * - Credit refund on failure
 * - Concurrent request handling
 * 
 * Web3 Edge Cases:
 * - JWT token expiry
 * - Wallet address validation
 * - User not in database
 * - Credit deduction atomicity
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { log, createMockUser, createMockGeneration, createMockJWT } from '../setup';
import { NextRequest } from 'next/server';

// =============================================================================
// MOCK SETUP
// =============================================================================

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  generation: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
};

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// Mock model service
const mockGetModelById = vi.fn();
const mockGetDefaultModel = vi.fn();

vi.mock('@/lib/modelService', () => ({
  getModelById: mockGetModelById,
  getDefaultModel: mockGetDefaultModel,
  getActiveModels: vi.fn(),
  getAllModels: vi.fn(),
  updateModelPricing: vi.fn(),
  setModelActive: vi.fn(),
  setDefaultModel: vi.fn(),
  updateModel: vi.fn(),
}));

// Mock OpenAI
const mockGenerateImage = vi.fn();
const mockDownloadImage = vi.fn();
class MockModerationError extends Error {}

vi.mock('@/lib/openai', () => ({
  generateImage: mockGenerateImage,
  downloadImage: mockDownloadImage,
  ModerationError: MockModerationError,
  supportsReferenceImage: (providerModelId: string) =>
    ['gpt-image-1', 'gpt-image-1-mini', 'gpt-image-1.5', 'dall-e-2'].includes(providerModelId),
}));

// Mock Pinata
const mockUploadImageToPinata = vi.fn();

vi.mock('@/lib/pinata', () => ({
  uploadImageToPinata: mockUploadImageToPinata,
}));

// Mock auth
const mockVerifyToken = vi.fn();

vi.mock('@/lib/auth', () => ({
  verifyToken: mockVerifyToken,
  getTokenFromHeader: (header: string | null) => header?.replace('Bearer ', '') || null,
}));

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function createMockRequest(
  body: object,
  options: { token?: string; method?: string } = {}
): NextRequest {
  const { token = 'valid-token', method = 'POST' } = options;
  
  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  headers.set('Content-Type', 'application/json');

  return {
    method,
    headers,
    json: () => Promise.resolve(body),
  } as unknown as NextRequest;
}

function createMockMultipartRequest(
  formData: FormData,
  options: { token?: string; method?: string } = {}
): NextRequest {
  const { token = 'valid-token', method = 'POST' } = options;

  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  headers.set('Content-Type', 'multipart/form-data; boundary=----test');

  return {
    method,
    headers,
    formData: () => Promise.resolve(formData),
  } as unknown as NextRequest;
}

// =============================================================================
// AUTHENTICATION TESTS
// =============================================================================

describe('Generation API - Authentication', () => {
  log.subsection('Authentication Tests');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject request without auth header', async () => {
    log.info('Testing: Missing authorization header');
    
    const { POST } = await import('@/app/api/generate/route');
    
    const request = createMockRequest({ prompt: 'test' }, { token: '' });
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(401);
    expect(data.error).toContain('authorization');
    
    log.success('Missing auth header rejected', { status: response.status, error: data.error });
  });

  it('should reject request with invalid token', async () => {
    log.info('Testing: Invalid JWT token');
    
    mockVerifyToken.mockReturnValue(null);
    
    const { POST } = await import('@/app/api/generate/route');
    
    const request = createMockRequest({ prompt: 'test' }, { token: 'invalid-token' });
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(401);
    expect(data.error).toBeDefined();
    
    log.success('Invalid token rejected', { status: response.status });
  });

  it('should reject request with expired token', async () => {
    log.info('Testing: Expired JWT token');
    
    mockVerifyToken.mockReturnValue(null); // Expired tokens return null
    
    const { POST } = await import('@/app/api/generate/route');
    
    const request = createMockRequest({ prompt: 'test' });
    const response = await POST(request);
    
    expect(response.status).toBe(401);
    
    log.success('Expired token rejected');
  });

  it('should reject when user not found in database', async () => {
    log.info('Testing: User not in database');
    
    mockVerifyToken.mockReturnValue({ userId: 'nonexistent-user' });
    mockPrisma.user.findUnique.mockResolvedValue(null);
    
    const { POST } = await import('@/app/api/generate/route');
    
    const request = createMockRequest({ prompt: 'test' });
    const response = await POST(request);
    
    expect(response.status).toBe(401);
    
    log.success('Nonexistent user rejected');
  });
});

// =============================================================================
// PROMPT VALIDATION TESTS
// =============================================================================

describe('Generation API - Prompt Validation', () => {
  log.subsection('Prompt Validation Tests');

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyToken.mockReturnValue({ userId: 'test-user' });
    mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ creditBalance: 10 }));
    // Default model for prompt validation tests
    mockGetDefaultModel.mockResolvedValue({
      id: 'model-1',
      provider: 'openai',
      providerModelId: 'dall-e-3',
      displayName: 'DALL-E 3',
      creditCost: 1,
      isActive: true,
      isDefault: true,
    });
    mockGetModelById.mockResolvedValue({
      id: 'model-1',
      provider: 'openai',
      providerModelId: 'dall-e-3',
      displayName: 'DALL-E 3',
      creditCost: 1,
      isActive: true,
      isDefault: true,
    });
  });

  it('should reject missing prompt', async () => {
    log.info('Testing: Missing prompt');
    
    const { POST } = await import('@/app/api/generate/route');
    
    const request = createMockRequest({});
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(400);
    expect(data.error).toContain('Prompt');
    
    log.success('Missing prompt rejected', { error: data.error });
  });

  it('should reject empty prompt', async () => {
    log.info('Testing: Empty prompt');
    
    const { POST } = await import('@/app/api/generate/route');
    
    const request = createMockRequest({ prompt: '' });
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(400);
    
    log.success('Empty prompt rejected');
  });

  it('should reject whitespace-only prompt', async () => {
    log.info('Testing: Whitespace-only prompt');
    
    const { POST } = await import('@/app/api/generate/route');
    
    const request = createMockRequest({ prompt: '   \n\t   ' });
    const response = await POST(request);
    
    expect(response.status).toBe(400);
    
    log.success('Whitespace prompt rejected');
  });

  it('should reject prompt shorter than 3 characters', async () => {
    log.info('Testing: Prompt too short');
    
    const { POST } = await import('@/app/api/generate/route');
    
    const shortPrompts = ['a', 'ab', '  a '];
    
    for (const prompt of shortPrompts) {
      vi.clearAllMocks();
      mockVerifyToken.mockReturnValue({ userId: 'test-user' });
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser());
      
      const request = createMockRequest({ prompt });
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toContain('3');
      log.info(`Prompt "${prompt}" (length ${prompt.trim().length}): ✓ Rejected`);
    }
    
    log.success('Short prompts rejected correctly');
  });

  it('should reject prompt longer than 500 characters', async () => {
    log.info('Testing: Prompt too long');
    
    const { POST } = await import('@/app/api/generate/route');
    
    const longPrompt = 'a'.repeat(501);
    const request = createMockRequest({ prompt: longPrompt });
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(400);
    expect(data.error).toContain('500');
    
    log.success('Long prompt rejected', { length: longPrompt.length });
  });

  it('should accept prompt at exact boundaries', async () => {
    log.info('Testing: Prompt at boundary lengths');
    
    // Setup successful generation
    mockGenerateImage.mockResolvedValue({
      imageUrl: 'https://example.com/image.png',
      revisedPrompt: 'revised',
    });
    mockDownloadImage.mockResolvedValue(Buffer.from([1, 2, 3]));
    mockUploadImageToPinata.mockResolvedValue({
      cid: 'bafkreitest',
      ipfsUrl: 'ipfs://bafkreitest',
      gatewayUrl: 'https://gateway.pinata.cloud/ipfs/bafkreitest',
    });
    mockPrisma.generation.create.mockResolvedValue(createMockGeneration());
    mockPrisma.user.update.mockResolvedValue(createMockUser({ creditBalance: 9 }));
    
    const { POST } = await import('@/app/api/generate/route');
    
    // Test minimum valid length (3 chars)
    const minPrompt = 'abc';
    vi.clearAllMocks();
    mockVerifyToken.mockReturnValue({ userId: 'test-user' });
    mockPrisma.user.findUnique.mockResolvedValue(createMockUser());
    mockGenerateImage.mockResolvedValue({ imageUrl: 'https://test.com/img.png', revisedPrompt: 'test' });
    mockDownloadImage.mockResolvedValue(Buffer.from([1, 2, 3]));
    mockUploadImageToPinata.mockResolvedValue({ cid: 'baftest', ipfsUrl: 'ipfs://baftest', gatewayUrl: 'https://gw.test/baftest' });
    mockPrisma.user.update.mockResolvedValue(createMockUser({ creditBalance: 9 }));
    mockPrisma.generation.create.mockResolvedValue(createMockGeneration());
    
    const minRequest = createMockRequest({ prompt: minPrompt });
    const minResponse = await POST(minRequest);
    
    expect(minResponse.status).toBe(200);
    log.info(`Prompt length 3 (minimum): ✓ Accepted`);
    
    // Test maximum valid length (500 chars)
    const maxPrompt = 'a'.repeat(500);
    vi.clearAllMocks();
    mockVerifyToken.mockReturnValue({ userId: 'test-user' });
    mockPrisma.user.findUnique.mockResolvedValue(createMockUser());
    mockGenerateImage.mockResolvedValue({ imageUrl: 'https://test.com/img.png', revisedPrompt: 'test' });
    mockDownloadImage.mockResolvedValue(Buffer.from([1, 2, 3]));
    mockUploadImageToPinata.mockResolvedValue({ cid: 'baftest', ipfsUrl: 'ipfs://baftest', gatewayUrl: 'https://gw.test/baftest' });
    mockPrisma.user.update.mockResolvedValue(createMockUser({ creditBalance: 9 }));
    mockPrisma.generation.create.mockResolvedValue(createMockGeneration());
    
    const maxRequest = createMockRequest({ prompt: maxPrompt });
    const maxResponse = await POST(maxRequest);
    
    expect(maxResponse.status).toBe(200);
    log.info(`Prompt length 500 (maximum): ✓ Accepted`);
    
    log.success('Boundary prompts accepted correctly');
  });

  it('should reject non-string prompt', async () => {
    log.info('Testing: Non-string prompt types');
    
    const { POST } = await import('@/app/api/generate/route');
    
    const invalidPrompts = [
      { prompt: 123, type: 'number' },
      { prompt: ['array'], type: 'array' },
      { prompt: { text: 'object' }, type: 'object' },
      { prompt: null, type: 'null' },
      { prompt: true, type: 'boolean' },
    ];
    
    for (const { prompt, type } of invalidPrompts) {
      vi.clearAllMocks();
      mockVerifyToken.mockReturnValue({ userId: 'test-user' });
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser());
      
      const request = createMockRequest({ prompt });
      const response = await POST(request);
      
      expect(response.status).toBe(400);
      log.info(`Prompt type ${type}: ✓ Rejected`);
    }
    
    log.success('Non-string prompts rejected correctly');
  });
});

// =============================================================================
// CREDIT SYSTEM TESTS
// =============================================================================

describe('Generation API - Credit System', () => {
  log.subsection('Credit System Tests');

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyToken.mockReturnValue({ userId: 'test-user' });
    // Default model for credit tests
    mockGetDefaultModel.mockResolvedValue({
      id: 'model-1',
      provider: 'openai',
      providerModelId: 'dall-e-3',
      displayName: 'DALL-E 3',
      creditCost: 1,
      isActive: true,
      isDefault: true,
    });
    mockGetModelById.mockResolvedValue({
      id: 'model-1',
      provider: 'openai',
      providerModelId: 'dall-e-3',
      displayName: 'DALL-E 3',
      creditCost: 1,
      isActive: true,
      isDefault: true,
    });
  });

  it('should reject when user has zero credits', async () => {
    log.info('Testing: Zero credit balance');
    
    mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ creditBalance: 0 }));
    
    const { POST } = await import('@/app/api/generate/route');
    
    const request = createMockRequest({ prompt: 'test prompt here' });
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(402); // Payment Required
    expect(data.error).toContain('Insufficient');
    
    log.success('Zero credits rejected with 402', { error: data.error });
  });

  it('should accept when user has exactly 1 credit', async () => {
    log.info('Testing: Exactly enough credits');
    
    // findUnique is called 3 times:
    // 1. withAuth middleware checks user exists
    // 2. Route checks if user has enough credits
    // 3. Route gets updated balance after generation
    let callCount = 0;
    mockPrisma.user.findUnique.mockImplementation(async () => {
      callCount++;
      if (callCount <= 2) return createMockUser({ creditBalance: 1 }); // Auth + credit check
      return createMockUser({ creditBalance: 0 }); // After deduction
    });
    mockPrisma.user.update.mockResolvedValue(createMockUser({ creditBalance: 0 }));
    mockGenerateImage.mockResolvedValue({
      imageUrl: 'https://example.com/image.png',
      revisedPrompt: 'revised',
    });
    mockDownloadImage.mockResolvedValue(Buffer.from([1, 2, 3]));
    mockUploadImageToPinata.mockResolvedValue({
      cid: 'bafkreitest',
      ipfsUrl: 'ipfs://bafkreitest',
      gatewayUrl: 'https://gateway.pinata.cloud/ipfs/bafkreitest',
    });
    mockPrisma.generation.create.mockResolvedValue(createMockGeneration());
    
    const { POST } = await import('@/app/api/generate/route');
    
    const request = createMockRequest({ prompt: 'test prompt here' });
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.newBalance).toBe(0);
    
    log.success('Exactly 1 credit accepted', { newBalance: data.newBalance });
  });

  it('should deduct credits before generation', async () => {
    log.info('Testing: Credit deduction timing');
    
    const updateCalls: number[] = [];
    
    mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ creditBalance: 5 }));
    mockPrisma.user.update.mockImplementation(async (args) => {
      if (args.data.creditBalance?.decrement) {
        updateCalls.push(-args.data.creditBalance.decrement);
      }
      return createMockUser({ creditBalance: 4 });
    });
    
    // Simulate slow generation
    mockGenerateImage.mockImplementation(async () => {
      await new Promise(r => setTimeout(r, 100));
      return { imageUrl: 'https://test.com/img.png', revisedPrompt: 'test' };
    });
    mockDownloadImage.mockResolvedValue(Buffer.from([1, 2, 3]));
    mockUploadImageToPinata.mockResolvedValue({
      cid: 'baftest',
      ipfsUrl: 'ipfs://baftest',
      gatewayUrl: 'https://gw.test/baftest',
    });
    mockPrisma.generation.create.mockResolvedValue(createMockGeneration());
    
    const { POST } = await import('@/app/api/generate/route');
    
    const request = createMockRequest({ prompt: 'test prompt here' });
    await POST(request);
    
    // Credits should be deducted (decrement call made)
    expect(updateCalls.length).toBeGreaterThan(0);
    expect(updateCalls[0]).toBe(-1); // First call should be decrement
    
    log.success('Credits deducted before generation', { updateCalls });
  });

  it('should refund credits on OpenAI failure', async () => {
    log.info('Testing: Credit refund on OpenAI failure');
    
    let creditBalance = 5;
    
    mockPrisma.user.findUnique.mockImplementation(async () => 
      createMockUser({ creditBalance })
    );
    mockPrisma.user.update.mockImplementation(async (args) => {
      if (args.data.creditBalance?.decrement) {
        creditBalance -= args.data.creditBalance.decrement;
      }
      if (args.data.creditBalance?.increment) {
        creditBalance += args.data.creditBalance.increment;
      }
      return createMockUser({ creditBalance });
    });
    
    // OpenAI fails
    mockGenerateImage.mockRejectedValue(new Error('OpenAI API error'));
    
    const { POST } = await import('@/app/api/generate/route');
    
    const request = createMockRequest({ prompt: 'test prompt here' });
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(500);
    expect(data.error).toContain('refunded');
    expect(creditBalance).toBe(5); // Credits should be refunded
    
    log.success('Credits refunded on OpenAI failure', { 
      finalBalance: creditBalance,
      error: data.error,
    });
  });

  it('should refund credits on Pinata failure', async () => {
    log.info('Testing: Credit refund on Pinata failure');
    
    let creditBalance = 5;
    
    mockPrisma.user.findUnique.mockImplementation(async () => 
      createMockUser({ creditBalance })
    );
    mockPrisma.user.update.mockImplementation(async (args) => {
      if (args.data.creditBalance?.decrement) {
        creditBalance -= args.data.creditBalance.decrement;
      }
      if (args.data.creditBalance?.increment) {
        creditBalance += args.data.creditBalance.increment;
      }
      return createMockUser({ creditBalance });
    });
    
    // OpenAI succeeds, Pinata fails
    mockGenerateImage.mockResolvedValue({
      imageUrl: 'https://example.com/image.png',
      revisedPrompt: 'revised',
    });
    mockDownloadImage.mockResolvedValue(Buffer.from([1, 2, 3]));
    mockUploadImageToPinata.mockRejectedValue(new Error('Pinata upload failed'));
    
    const { POST } = await import('@/app/api/generate/route');
    
    const request = createMockRequest({ prompt: 'test prompt here' });
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(500);
    expect(data.error).toContain('refunded');
    expect(creditBalance).toBe(5); // Credits should be refunded
    
    log.success('Credits refunded on Pinata failure', {
      finalBalance: creditBalance,
      error: data.error,
    });
  });

  it('should refund credits on image download failure', async () => {
    log.info('Testing: Credit refund on download failure');
    
    let creditBalance = 5;
    
    mockPrisma.user.findUnique.mockImplementation(async () => 
      createMockUser({ creditBalance })
    );
    mockPrisma.user.update.mockImplementation(async (args) => {
      if (args.data.creditBalance?.decrement) {
        creditBalance -= args.data.creditBalance.decrement;
      }
      if (args.data.creditBalance?.increment) {
        creditBalance += args.data.creditBalance.increment;
      }
      return createMockUser({ creditBalance });
    });
    
    // OpenAI succeeds, download fails
    mockGenerateImage.mockResolvedValue({
      imageUrl: 'https://example.com/image.png',
      revisedPrompt: 'revised',
    });
    mockDownloadImage.mockRejectedValue(new Error('Download failed'));
    
    const { POST } = await import('@/app/api/generate/route');
    
    const request = createMockRequest({ prompt: 'test prompt here' });
    const response = await POST(request);
    
    expect(response.status).toBe(500);
    expect(creditBalance).toBe(5); // Credits should be refunded
    
    log.success('Credits refunded on download failure');
  });
});

// =============================================================================
// SUCCESSFUL GENERATION TESTS
// =============================================================================

describe('Generation API - Successful Generation', () => {
  log.subsection('Successful Generation Tests');

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyToken.mockReturnValue({ userId: 'test-user' });
    // Default model for generation tests
    mockGetDefaultModel.mockResolvedValue({
      id: 'model-1',
      provider: 'openai',
      providerModelId: 'dall-e-3',
      displayName: 'DALL-E 3',
      creditCost: 1,
      isActive: true,
      isDefault: true,
    });
    mockGetModelById.mockResolvedValue({
      id: 'model-1',
      provider: 'openai',
      providerModelId: 'dall-e-3',
      displayName: 'DALL-E 3',
      creditCost: 1,
      isActive: true,
      isDefault: true,
    });
  });

  it('should return complete generation data on success', async () => {
    log.info('Testing: Successful generation response');
    
    // findUnique is called twice: once for credit check, once for updated balance
    let callCount = 0;
    mockPrisma.user.findUnique.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return createMockUser({ creditBalance: 10 });
      return createMockUser({ creditBalance: 9 }); // After deduction
    });
    mockPrisma.user.update.mockResolvedValue(createMockUser({ creditBalance: 9 }));
    mockGenerateImage.mockResolvedValue({
      imageUrl: 'https://oaidalleapiprodscus.blob.core.windows.net/private/image.png',
      revisedPrompt: 'A beautiful sunset over mountains, photorealistic',
    });
    mockDownloadImage.mockResolvedValue(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    mockUploadImageToPinata.mockResolvedValue({
      cid: 'bafkreiexamplecid123456789',
      ipfsUrl: 'ipfs://bafkreiexamplecid123456789',
      gatewayUrl: 'https://gateway.pinata.cloud/ipfs/bafkreiexamplecid123456789',
    });
    mockPrisma.generation.create.mockResolvedValue(createMockGeneration({
      id: 'gen-123',
      prompt: 'A beautiful sunset',
      ipfsUrl: 'https://gateway.pinata.cloud/ipfs/bafkreiexamplecid123456789',
    }));
    
    const { POST } = await import('@/app/api/generate/route');
    
    const request = createMockRequest({ prompt: 'A beautiful sunset' });
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.id).toBeDefined();
    expect(data.status).toBe('complete');
    expect(data.ipfsUrl).toContain('gateway.pinata.cloud');
    expect(data.newBalance).toBe(9);
    expect(data.creditCost).toBe(1);
    
    log.success('Generation successful', {
      id: data.id,
      status: data.status,
      newBalance: data.newBalance,
      ipfsUrl: data.ipfsUrl?.substring(0, 50) + '...',
    });
  });

  it('should persist generation to database', async () => {
    log.info('Testing: Database persistence');
    
    mockPrisma.user.findUnique.mockResolvedValue(createMockUser());
    mockPrisma.user.update.mockResolvedValue(createMockUser({ creditBalance: 9 }));
    mockGenerateImage.mockResolvedValue({
      imageUrl: 'https://test.com/img.png',
      revisedPrompt: 'revised prompt',
    });
    mockDownloadImage.mockResolvedValue(Buffer.from([1, 2, 3]));
    mockUploadImageToPinata.mockResolvedValue({
      cid: 'bafkreitest',
      ipfsUrl: 'ipfs://bafkreitest',
      gatewayUrl: 'https://gw.test/bafkreitest',
    });
    mockPrisma.generation.create.mockResolvedValue(createMockGeneration());
    
    const { POST } = await import('@/app/api/generate/route');
    
    const request = createMockRequest({ prompt: 'test prompt for db' });
    await POST(request);
    
    // Verify generation.create was called with expected fields
    expect(mockPrisma.generation.create).toHaveBeenCalled();
    const createCall = mockPrisma.generation.create.mock.calls[0][0];
    
    expect(createCall.data.prompt).toBe('test prompt for db');
    expect(createCall.data.modelId).toBe('model-1'); // Internal model ID from database
    expect(createCall.data.modelName).toBe('DALL-E 3');
    expect(createCall.data.creditCost).toBe(1);
    expect(createCall.data.ipfsCid).toBe('bafkreitest');
    expect(createCall.data.userId).toBeDefined();
    
    log.success('Generation persisted to database correctly', {
      prompt: createCall.data.prompt,
      modelId: createCall.data.modelId,
      ipfsCid: createCall.data.ipfsCid,
    });
  });
});

// =============================================================================
// MODEL VALIDATION TESTS
// =============================================================================

describe('Generation API - Model Validation', () => {
  log.subsection('Model Validation Tests');

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyToken.mockReturnValue({ userId: 'test-user' });
    mockPrisma.user.findUnique.mockResolvedValue(createMockUser());
  });

  it('should reject invalid model ID', async () => {
    log.info('Testing: Invalid model ID');
    
    // Model not found in database
    mockGetModelById.mockResolvedValue(null);
    
    const { POST } = await import('@/app/api/generate/route');
    
    const request = createMockRequest({ 
      prompt: 'test prompt here',
      modelId: 'invalid-model-xyz',
    });
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(400);
    expect(data.error).toContain('not found');
    
    log.success('Invalid model rejected', { error: data.error });
  });

  it('should accept valid model ID', async () => {
    log.info('Testing: Valid model ID from database');
    
    // Model found in database
    mockGetModelById.mockResolvedValue({
      id: 'model-1',
      provider: 'openai',
      providerModelId: 'dall-e-3',
      displayName: 'DALL-E 3',
      creditCost: 1,
      isActive: true,
      isDefault: true,
    });
    
    mockPrisma.user.update.mockResolvedValue(createMockUser({ creditBalance: 9 }));
    mockGenerateImage.mockResolvedValue({
      imageUrl: 'https://test.com/img.png',
      revisedPrompt: 'test',
    });
    mockDownloadImage.mockResolvedValue(Buffer.from([1, 2, 3]));
    mockUploadImageToPinata.mockResolvedValue({
      cid: 'baftest',
      ipfsUrl: 'ipfs://baftest',
      gatewayUrl: 'https://gw.test/baftest',
    });
    mockPrisma.generation.create.mockResolvedValue(createMockGeneration({
      modelId: 'model-1',
      modelName: 'DALL-E 3',
    }));
    
    const { POST } = await import('@/app/api/generate/route');
    
    const request = createMockRequest({ 
      prompt: 'test prompt here',
      modelId: 'model-1',
    });
    const response = await POST(request);
    
    expect(response.status).toBe(200);
    
    log.success('Valid model accepted');
  });

  it('should use default model when no model specified', async () => {
    log.info('Testing: Default model selection from database');
    
    // Return default model when getDefaultModel is called
    mockGetDefaultModel.mockResolvedValue({
      id: 'model-1',
      provider: 'openai',
      providerModelId: 'dall-e-3',
      displayName: 'DALL-E 3',
      creditCost: 1,
      isActive: true,
      isDefault: true,
    });
    
    mockPrisma.user.update.mockResolvedValue(createMockUser({ creditBalance: 9 }));
    mockGenerateImage.mockResolvedValue({
      imageUrl: 'https://test.com/img.png',
      revisedPrompt: 'test',
    });
    mockDownloadImage.mockResolvedValue(Buffer.from([1, 2, 3]));
    mockUploadImageToPinata.mockResolvedValue({
      cid: 'baftest',
      ipfsUrl: 'ipfs://baftest',
      gatewayUrl: 'https://gw.test/baftest',
    });
    mockPrisma.generation.create.mockResolvedValue(createMockGeneration({
      modelId: 'model-1',
      modelName: 'DALL-E 3',
    }));
    
    const { POST } = await import('@/app/api/generate/route');
    
    // No modelId in request
    const request = createMockRequest({ prompt: 'test prompt here' });
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.modelId).toBe('model-1');
    
    log.success('Default model used', { modelId: data.modelId });
  });

  it('should reject inactive model', async () => {
    log.info('Testing: Inactive model rejection');
    
    // Model found but inactive
    mockGetModelById.mockResolvedValue({
      id: 'model-inactive',
      provider: 'openai',
      providerModelId: 'dall-e-2',
      displayName: 'DALL-E 2',
      creditCost: 1,
      isActive: false, // Inactive!
      isDefault: false,
    });
    
    const { POST } = await import('@/app/api/generate/route');
    
    const request = createMockRequest({ 
      prompt: 'test prompt here',
      modelId: 'model-inactive',
    });
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(400);
    expect(data.error).toContain('no longer available');
    
    log.success('Inactive model rejected', { error: data.error });
  });

  it('should reject image attachment for unsupported model', async () => {
    log.info('Testing: Attachment rejected for unsupported model');

    mockGetModelById.mockResolvedValue({
      id: 'model-dalle3',
      provider: 'openai',
      providerModelId: 'dall-e-3',
      displayName: 'DALL-E 3',
      creditCost: 1,
      isActive: true,
      isDefault: true,
    });

    const formData = new FormData();
    formData.append('prompt', 'test prompt here');
    formData.append('modelId', 'model-dalle3');
    formData.append(
      'referenceImage',
      new File([new Uint8Array([137, 80, 78, 71])], 'ref.png', { type: 'image/png' })
    );

    const { POST } = await import('@/app/api/generate/route');
    const request = createMockMultipartRequest(formData);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('does not support reference images');

    log.success('Unsupported-model attachment rejected');
  });

  it('should accept image attachment for supported model', async () => {
    log.info('Testing: Attachment accepted for supported model');

    mockGetModelById.mockResolvedValue({
      id: 'model-gpt-image',
      provider: 'openai',
      providerModelId: 'gpt-image-1',
      displayName: 'GPT Image',
      creditCost: 1,
      isActive: true,
      isDefault: false,
    });
    mockPrisma.user.update.mockResolvedValue(createMockUser({ creditBalance: 9 }));
    mockGenerateImage.mockResolvedValue({
      imageBuffer: Buffer.from([1, 2, 3]),
      revisedPrompt: 'test prompt here',
    });
    mockUploadImageToPinata.mockResolvedValue({
      cid: 'baftest',
      ipfsUrl: 'ipfs://baftest',
      gatewayUrl: 'https://gw.test/baftest',
    });
    mockPrisma.generation.create.mockResolvedValue(createMockGeneration({
      modelId: 'model-gpt-image',
      modelName: 'GPT Image',
    }));

    const formData = new FormData();
    formData.append('prompt', 'test prompt here');
    formData.append('modelId', 'model-gpt-image');
    formData.append(
      'referenceImage',
      new File([new Uint8Array([137, 80, 78, 71])], 'ref.png', { type: 'image/png' })
    );

    const { POST } = await import('@/app/api/generate/route');
    const request = createMockMultipartRequest(formData);
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockGenerateImage).toHaveBeenCalledWith(
      'test prompt here',
      'gpt-image-1',
      expect.objectContaining({
        mimeType: 'image/png',
        fileName: 'ref.png',
      })
    );

    log.success('Supported-model attachment accepted');
  });
});

// =============================================================================
// GET GENERATION TESTS
// =============================================================================

describe('Generation API - GET /api/generate/[id]', () => {
  log.subsection('GET Generation by ID Tests');

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyToken.mockReturnValue({ userId: 'test-user' });
    // Default model for GET tests
    mockGetDefaultModel.mockResolvedValue({
      id: 'model-1',
      provider: 'openai',
      providerModelId: 'dall-e-3',
      displayName: 'DALL-E 3',
      creditCost: 1,
      isActive: true,
      isDefault: true,
    });
  });

  it('should return generation for owner', async () => {
    log.info('Testing: Owner can access generation');
    
    mockPrisma.user.findUnique.mockResolvedValue(createMockUser());
    mockPrisma.generation.findUnique.mockResolvedValue(createMockGeneration({
      userId: 'test-user-id',
    }));
    
    const { GET } = await import('@/app/api/generate/[id]/route');
    
    const request = createMockRequest({}, { method: 'GET' });
    const response = await GET(request, { params: Promise.resolve({ id: 'gen-123' }) });
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.id).toBeDefined();
    
    log.success('Owner can access their generation');
  });

  it('should reject access to other user generation', async () => {
    log.info('Testing: Cannot access other user generation');
    
    mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ id: 'test-user-id' }));
    mockPrisma.generation.findUnique.mockResolvedValue(createMockGeneration({
      userId: 'other-user-id', // Different user
    }));
    
    const { GET } = await import('@/app/api/generate/[id]/route');
    
    const request = createMockRequest({}, { method: 'GET' });
    const response = await GET(request, { params: Promise.resolve({ id: 'gen-123' }) });
    const data = await response.json();
    
    expect(response.status).toBe(403);
    expect(data.error).toContain('Unauthorized');
    
    log.success('Other user generation access blocked');
  });

  it('should return 404 for nonexistent generation', async () => {
    log.info('Testing: 404 for missing generation');
    
    mockPrisma.user.findUnique.mockResolvedValue(createMockUser());
    mockPrisma.generation.findUnique.mockResolvedValue(null);
    
    const { GET } = await import('@/app/api/generate/[id]/route');
    
    const request = createMockRequest({}, { method: 'GET' });
    const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) });
    const data = await response.json();
    
    expect(response.status).toBe(404);
    expect(data.error).toContain('not found');
    
    log.success('404 returned for missing generation');
  });
});
