/**
 * Seed script for GenerationModel table
 * Run with: npx ts-node scripts/seed-models.ts
 * Or: npx tsx scripts/seed-models.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const models = [
  {
    provider: 'openai',
    providerModelId: 'dall-e-3',
    displayName: 'DALL-E 3',
    creditCost: 2,
    isActive: true,
    isDefault: true,
    sortOrder: 1,
  },
  {
    provider: 'openai',
    providerModelId: 'gpt-image-1',
    displayName: 'GPT Image',
    creditCost: 1,
    isActive: true,
    isDefault: false,
    sortOrder: 2,
  },
  {
    provider: 'openai',
    providerModelId: 'dall-e-2',
    displayName: 'DALL-E 2',
    creditCost: 1,
    isActive: true,
    isDefault: false,
    sortOrder: 3,
  },
];

async function main() {
  console.log('Seeding GenerationModel table...');

  for (const model of models) {
    const result = await prisma.generationModel.upsert({
      where: {
        provider_providerModelId: {
          provider: model.provider,
          providerModelId: model.providerModelId,
        },
      },
      update: {
        displayName: model.displayName,
        creditCost: model.creditCost,
        isActive: model.isActive,
        isDefault: model.isDefault,
        sortOrder: model.sortOrder,
      },
      create: model,
    });
    console.log(`  ✓ ${result.displayName} (${result.providerModelId}) - ${result.creditCost} credits`);
  }

  console.log('Done!');
}

main()
  .catch((e) => {
    console.error('Error seeding models:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
