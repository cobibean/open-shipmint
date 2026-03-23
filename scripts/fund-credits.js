/* eslint-disable no-console */

// Usage:
//   node scripts/fund-credits.js <WALLET_ADDRESS> <CREDITS>
//
// Example:
//   node scripts/fund-credits.js 7R2LWDRrRpdxTCCiWzUVQQ9TN5zt8VQDMR9SSaduEku6 1000

const path = require('path');

// Load `.env` so DATABASE_URL is available to Prisma.
// (Hard rule: use `.env` only.)
try {
  // eslint-disable-next-line global-require
  require('dotenv').config({ path: path.resolve(process.cwd(), '.env'), quiet: true });
} catch {
  // If dotenv isn't available, Prisma will fall back to process env.
}

const { PrismaClient } = require('@prisma/client');

const walletAddress = process.argv[2];
const creditsRaw = process.argv[3];

if (!walletAddress) {
  console.error('Missing wallet address.\nExample: node scripts/fund-credits.js <WALLET_ADDRESS> <CREDITS>');
  process.exit(1);
}

const desiredCredits = Number.parseInt(creditsRaw ?? '1000', 10);
if (!Number.isFinite(desiredCredits) || desiredCredits < 0) {
  console.error(`Invalid credits value: "${creditsRaw}". Expected a non-negative integer.`);
  process.exit(1);
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.upsert({
      where: { walletAddress },
      create: { walletAddress, creditBalance: desiredCredits },
      update: { creditBalance: desiredCredits },
      select: { id: true, walletAddress: true, creditBalance: true, updatedAt: true },
    });

    console.log('✅ Credits funded');
    console.log({
      walletAddress: user.walletAddress,
      userId: user.id,
      creditBalance: user.creditBalance,
      updatedAt: user.updatedAt.toISOString(),
    });

    if (user.creditBalance !== desiredCredits) {
      throw new Error(`Expected creditBalance=${desiredCredits}, got ${user.creditBalance}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('❌ Failed to fund credits');
  console.error(err);
  process.exit(1);
});

