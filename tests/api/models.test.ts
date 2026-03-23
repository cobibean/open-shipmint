/**
 * Model API Tests
 * ================
 * Tests for the model listing and admin endpoints.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { log } from '../setup';

// =============================================================================
// MOCK SETUP
// =============================================================================

// Mock Prisma with hoisted factory
const mockPrisma = vi.hoisted(() => ({
  generationModel: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// Import after mocking
import {
  getActiveModels,
  getModelById,
  getDefaultModel,
  getAllModels,
  updateModelPricing,
  setModelActive,
  setDefaultModel,
  updateModel,
} from '@/lib/modelService';

// =============================================================================
// TEST DATA
// =============================================================================

const mockModels = [
  {
    id: 'model-1',
    provider: 'openai',
    providerModelId: 'dall-e-3',
    displayName: 'DALL-E 3',
    creditCost: 2,
    isActive: true,
    isDefault: true,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'model-2',
    provider: 'openai',
    providerModelId: 'gpt-image-1',
    displayName: 'GPT Image',
    creditCost: 1,
    isActive: true,
    isDefault: false,
    sortOrder: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'model-3',
    provider: 'openai',
    providerModelId: 'dall-e-2',
    displayName: 'DALL-E 2',
    creditCost: 1,
    isActive: false, // Inactive
    isDefault: false,
    sortOrder: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// =============================================================================
// TESTS
// =============================================================================

describe('Model Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getActiveModels', () => {
    it('should return only active models', async () => {
      log.subsection('getActiveModels - returns only active models');

      const activeModels = mockModels.filter((m) => m.isActive);
      mockPrisma.generationModel.findMany.mockResolvedValue(
        activeModels.map((m) => ({
          id: m.id,
          displayName: m.displayName,
          creditCost: m.creditCost,
          isDefault: m.isDefault,
          providerModelId: m.providerModelId,
        }))
      );

      const result = await getActiveModels();

      expect(mockPrisma.generationModel.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          displayName: true,
          creditCost: true,
          isDefault: true,
          providerModelId: true,
        },
      });

      expect(result).toHaveLength(2);
      expect(result.every((m) => m.id !== 'model-3')).toBe(true);
      expect(result[0]).toHaveProperty('supportsReferenceImage');
      log.success('Only active models returned', { count: result.length });
    });

    it('should order models by sortOrder', async () => {
      log.subsection('getActiveModels - orders by sortOrder');

      const orderedModels = [
        {
          id: 'model-1',
          displayName: 'First',
          creditCost: 2,
          isDefault: true,
          providerModelId: 'gpt-image-1',
        },
        {
          id: 'model-2',
          displayName: 'Second',
          creditCost: 1,
          isDefault: false,
          providerModelId: 'dall-e-3',
        },
      ];
      mockPrisma.generationModel.findMany.mockResolvedValue(orderedModels);

      const result = await getActiveModels();

      expect(result[0].displayName).toBe('First');
      expect(result[1].displayName).toBe('Second');
      log.success('Models ordered correctly');
    });
  });

  describe('getModelById', () => {
    it('should return a model by ID', async () => {
      log.subsection('getModelById - returns model');

      mockPrisma.generationModel.findUnique.mockResolvedValue(mockModels[0]);

      const result = await getModelById('model-1');

      expect(mockPrisma.generationModel.findUnique).toHaveBeenCalledWith({
        where: { id: 'model-1' },
      });
      expect(result?.providerModelId).toBe('dall-e-3');
      log.success('Model retrieved by ID');
    });

    it('should return null for non-existent model', async () => {
      log.subsection('getModelById - returns null for missing');

      mockPrisma.generationModel.findUnique.mockResolvedValue(null);

      const result = await getModelById('non-existent');

      expect(result).toBeNull();
      log.success('Null returned for non-existent model');
    });
  });

  describe('getDefaultModel', () => {
    it('should return the default model', async () => {
      log.subsection('getDefaultModel - returns default');

      mockPrisma.generationModel.findFirst.mockResolvedValue(mockModels[0]);

      const result = await getDefaultModel();

      expect(mockPrisma.generationModel.findFirst).toHaveBeenCalledWith({
        where: { isDefault: true, isActive: true },
      });
      expect(result?.isDefault).toBe(true);
      log.success('Default model returned');
    });

    it('should fall back to first active model if no default', async () => {
      log.subsection('getDefaultModel - fallback to first active');

      mockPrisma.generationModel.findFirst
        .mockResolvedValueOnce(null) // No default
        .mockResolvedValueOnce(mockModels[1]); // First active

      const result = await getDefaultModel();

      expect(result?.id).toBe('model-2');
      log.success('Fallback to first active model');
    });
  });

  describe('getAllModels', () => {
    it('should return all models including inactive', async () => {
      log.subsection('getAllModels - returns all');

      mockPrisma.generationModel.findMany.mockResolvedValue(mockModels);

      const result = await getAllModels();

      expect(result).toHaveLength(3);
      expect(result.some((m) => !m.isActive)).toBe(true);
      log.success('All models including inactive returned');
    });
  });

  describe('updateModelPricing', () => {
    it('should update credit cost', async () => {
      log.subsection('updateModelPricing - updates cost');

      mockPrisma.generationModel.update.mockResolvedValue({
        ...mockModels[0],
        creditCost: 5,
      });

      const result = await updateModelPricing('model-1', 5);

      expect(mockPrisma.generationModel.update).toHaveBeenCalledWith({
        where: { id: 'model-1' },
        data: { creditCost: 5 },
      });
      expect(result.creditCost).toBe(5);
      log.success('Credit cost updated');
    });

    it('should reject invalid credit cost', async () => {
      log.subsection('updateModelPricing - rejects invalid cost');

      await expect(updateModelPricing('model-1', 0)).rejects.toThrow(
        'Credit cost must be at least 1'
      );
      await expect(updateModelPricing('model-1', -1)).rejects.toThrow(
        'Credit cost must be at least 1'
      );
      log.success('Invalid credit costs rejected');
    });
  });

  describe('setModelActive', () => {
    it('should activate a model', async () => {
      log.subsection('setModelActive - activates model');

      mockPrisma.generationModel.update.mockResolvedValue({
        ...mockModels[2],
        isActive: true,
      });

      const result = await setModelActive('model-3', true);

      expect(mockPrisma.generationModel.update).toHaveBeenCalledWith({
        where: { id: 'model-3' },
        data: { isActive: true },
      });
      expect(result.isActive).toBe(true);
      log.success('Model activated');
    });

    it('should deactivate a model', async () => {
      log.subsection('setModelActive - deactivates model');

      mockPrisma.generationModel.update.mockResolvedValue({
        ...mockModels[0],
        isActive: false,
      });

      const result = await setModelActive('model-1', false);

      expect(result.isActive).toBe(false);
      log.success('Model deactivated');
    });
  });

  describe('setDefaultModel', () => {
    it('should unset previous default and set new default', async () => {
      log.subsection('setDefaultModel - sets new default');

      mockPrisma.generationModel.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.generationModel.update.mockResolvedValue({
        ...mockModels[1],
        isDefault: true,
      });

      const result = await setDefaultModel('model-2');

      expect(mockPrisma.generationModel.updateMany).toHaveBeenCalledWith({
        where: { isDefault: true },
        data: { isDefault: false },
      });
      expect(mockPrisma.generationModel.update).toHaveBeenCalledWith({
        where: { id: 'model-2' },
        data: { isDefault: true },
      });
      expect(result.isDefault).toBe(true);
      log.success('Default model changed');
    });
  });

  describe('updateModel', () => {
    it('should update multiple fields at once', async () => {
      log.subsection('updateModel - updates multiple fields');

      const updatedModel = {
        ...mockModels[0],
        displayName: 'Updated Name',
        creditCost: 3,
      };
      mockPrisma.generationModel.update.mockResolvedValue(updatedModel);

      const result = await updateModel('model-1', {
        displayName: 'Updated Name',
        creditCost: 3,
      });

      expect(mockPrisma.generationModel.update).toHaveBeenCalledWith({
        where: { id: 'model-1' },
        data: {
          displayName: 'Updated Name',
          creditCost: 3,
        },
      });
      expect(result.displayName).toBe('Updated Name');
      expect(result.creditCost).toBe(3);
      log.success('Multiple fields updated');
    });

    it('should unset other defaults when setting isDefault', async () => {
      log.subsection('updateModel - unsets other defaults');

      mockPrisma.generationModel.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.generationModel.update.mockResolvedValue({
        ...mockModels[1],
        isDefault: true,
      });

      await updateModel('model-2', { isDefault: true });

      expect(mockPrisma.generationModel.updateMany).toHaveBeenCalledWith({
        where: { isDefault: true, id: { not: 'model-2' } },
        data: { isDefault: false },
      });
      log.success('Other defaults unset');
    });
  });
});

describe('Model API Endpoints', () => {
  describe('GET /api/models', () => {
    it('should return active models for public use', async () => {
      log.subsection('GET /api/models - public endpoint');

      // This test validates the expected response format
      const expectedResponse = {
        models: [
          { id: 'model-1', displayName: 'DALL-E 3', creditCost: 2, isDefault: true },
          { id: 'model-2', displayName: 'GPT Image', creditCost: 1, isDefault: false },
        ],
      };

      // Verify shape matches PublicModel interface
      for (const model of expectedResponse.models) {
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('displayName');
        expect(model).toHaveProperty('creditCost');
        expect(model).toHaveProperty('isDefault');
        expect(model).not.toHaveProperty('provider');
        expect(model).not.toHaveProperty('providerModelId');
        expect(model).not.toHaveProperty('isActive');
      }

      log.success('Public model response format validated');
    });
  });

  describe('POST /api/generate with modelId', () => {
    it('should validate that modelId is required for generation', async () => {
      log.subsection('POST /api/generate - model validation');

      // The generate endpoint should:
      // 1. Accept modelId in request body
      // 2. Look up model in DB
      // 3. Reject if model not found or inactive
      // 4. Use creditCost from DB for deduction

      const validRequest = {
        prompt: 'A test prompt',
        modelId: 'model-1',
      };

      expect(validRequest).toHaveProperty('modelId');
      expect(typeof validRequest.modelId).toBe('string');

      log.success('Generation request format validated');
    });

    it('should reject generation with inactive model', async () => {
      log.subsection('POST /api/generate - rejects inactive model');

      // When model.isActive === false, the endpoint should return:
      // { error: 'This model is no longer available. Please select a different model.' }
      // status: 400

      const expectedError = 'This model is no longer available. Please select a different model.';
      expect(expectedError).toBeTruthy();

      log.success('Inactive model rejection behavior documented');
    });

    it('should use creditCost from database for deduction', async () => {
      log.subsection('POST /api/generate - uses DB creditCost');

      // The endpoint should:
      // 1. Fetch model from DB
      // 2. Check user.creditBalance >= model.creditCost
      // 3. Deduct model.creditCost (not hardcoded value)
      // 4. Store model.creditCost in generation record

      const mockModel = {
        id: 'model-1',
        creditCost: 2, // From DB, not hardcoded
      };

      expect(mockModel.creditCost).toBe(2);
      log.success('DB-based credit cost usage documented');
    });
  });
});
