/**
 * Model Service - Centralized CRUD for GenerationModel management
 * 
 * This service provides all database operations for AI generation models.
 * Admin pages will call these functions through protected API routes.
 */

import { prisma } from './prisma';
import { supportsReferenceImage } from './openai';

export interface PublicModel {
  id: string;
  displayName: string;
  creditCost: number;
  isDefault: boolean;
  supportsReferenceImage: boolean;
}

export interface AdminModel extends PublicModel {
  provider: string;
  providerModelId: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get all active models for public API
 * Returns only the fields needed for the frontend model selector
 */
export async function getActiveModels(): Promise<PublicModel[]> {
  const models = await prisma.generationModel.findMany({
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

  return models.map((model) => ({
    id: model.id,
    displayName: model.displayName,
    creditCost: model.creditCost,
    isDefault: model.isDefault,
    supportsReferenceImage: supportsReferenceImage(model.providerModelId),
  }));
}

/**
 * Get a model by its internal ID
 * Used for generation validation - includes providerModelId for API calls
 */
export async function getModelById(id: string) {
  return prisma.generationModel.findUnique({
    where: { id },
  });
}

/**
 * Get the default model
 * Falls back to first active model if no default is set
 */
export async function getDefaultModel() {
  const defaultModel = await prisma.generationModel.findFirst({
    where: { isDefault: true, isActive: true },
  });

  if (defaultModel) return defaultModel;

  // Fallback: return first active model
  return prisma.generationModel.findFirst({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
}

// ============================================
// Admin Functions
// ============================================

/**
 * Get all models including inactive ones (for admin)
 */
export async function getAllModels(): Promise<AdminModel[]> {
  const models = await prisma.generationModel.findMany({
    orderBy: { sortOrder: 'asc' },
  });
  return models.map((model) => ({
    ...model,
    supportsReferenceImage: supportsReferenceImage(model.providerModelId),
  }));
}

/**
 * Update model pricing
 */
export async function updateModelPricing(id: string, creditCost: number) {
  if (creditCost < 1) {
    throw new Error('Credit cost must be at least 1');
  }

  return prisma.generationModel.update({
    where: { id },
    data: { creditCost },
  });
}

/**
 * Set model active/inactive status
 */
export async function setModelActive(id: string, isActive: boolean) {
  return prisma.generationModel.update({
    where: { id },
    data: { isActive },
  });
}

/**
 * Set a model as the default
 * Unsets any existing default first
 */
export async function setDefaultModel(id: string) {
  // First, unset all defaults
  await prisma.generationModel.updateMany({
    where: { isDefault: true },
    data: { isDefault: false },
  });

  // Then set the new default
  return prisma.generationModel.update({
    where: { id },
    data: { isDefault: true },
  });
}

/**
 * Update multiple model fields at once (for admin)
 */
export async function updateModel(
  id: string,
  data: {
    displayName?: string;
    creditCost?: number;
    isActive?: boolean;
    isDefault?: boolean;
    sortOrder?: number;
  }
) {
  // If setting as default, unset other defaults first
  if (data.isDefault === true) {
    await prisma.generationModel.updateMany({
      where: { isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });
  }

  return prisma.generationModel.update({
    where: { id },
    data,
  });
}

/**
 * Create a new model (for admin)
 */
export async function createModel(data: {
  provider: string;
  providerModelId: string;
  displayName: string;
  creditCost: number;
  isActive?: boolean;
  isDefault?: boolean;
  sortOrder?: number;
}) {
  // If setting as default, unset other defaults first
  if (data.isDefault === true) {
    await prisma.generationModel.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
  }

  return prisma.generationModel.create({
    data: {
      provider: data.provider,
      providerModelId: data.providerModelId,
      displayName: data.displayName,
      creditCost: data.creditCost,
      isActive: data.isActive ?? true,
      isDefault: data.isDefault ?? false,
      sortOrder: data.sortOrder ?? 0,
    },
  });
}
