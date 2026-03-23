/**
 * Pump.Fun Swap Service (Official SDK)
 *
 * Core service for executing token swaps via the official @pump-fun/pump-sdk.
 * Handles transaction building, signing, and broadcasting.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  ComputeBudgetProgram,
  SendTransactionError,
  TransactionInstruction,
} from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import {
  OnlinePumpSdk,
  PUMP_SDK,
  canonicalPumpPoolPda,
  getBuyTokenAmountFromSolAmount,
} from '@pump-fun/pump-sdk';
import { OnlinePumpAmmSdk, PUMP_AMM_SDK } from '@pump-fun/pump-swap-sdk';
import BN from 'bn.js';
import bs58 from 'bs58';
import { SwapConfig, SwapResult } from '@/types/swap';
import { MINT_FEE_SOL } from '@/lib/constants';

const LAMPORTS_PER_SOL = 1_000_000_000;
const DEFAULT_TREASURY_RESERVE_SOL = MINT_FEE_SOL;
const DEFAULT_TREASURY_BUFFER_SOL = 0.01;

function readNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Get swap configuration from environment variables
 */
export function getSwapConfig(): SwapConfig {
  return {
    enabled: process.env.PUMP_SWAP_ENABLED === 'true',
    percentage: parseInt(process.env.PUMP_SWAP_PERCENTAGE || '75', 10),
    tokenMint: process.env.PUMP_SWAP_TOKEN_MINT || '',
    slippage: parseInt(process.env.PUMP_SWAP_SLIPPAGE || '10', 10),
    priorityFee: parseInt(process.env.PUMP_SWAP_PRIORITY_FEE || '50000', 10),
    maxRetries: parseInt(process.env.PUMP_SWAP_MAX_RETRIES || '3', 10),
    treasuryReserveSol: readNumberEnv('PUMP_SWAP_TREASURY_RESERVE_SOL', DEFAULT_TREASURY_RESERVE_SOL),
    treasuryBufferSol: readNumberEnv('PUMP_SWAP_TREASURY_BUFFER_SOL', DEFAULT_TREASURY_BUFFER_SOL),
  };
}

/**
 * Validate swap configuration
 */
export function validateSwapConfig(config: SwapConfig): { valid: boolean; error?: string } {
  if (!config.enabled) {
    return { valid: false, error: 'Swap is disabled' };
  }
  if (!config.tokenMint) {
    return { valid: false, error: 'PUMP_SWAP_TOKEN_MINT not configured' };
  }
  if (config.percentage < 0 || config.percentage > 100) {
    return { valid: false, error: 'PUMP_SWAP_PERCENTAGE must be between 0 and 100' };
  }
  if (config.slippage < 1 || config.slippage > 50) {
    return { valid: false, error: 'PUMP_SWAP_SLIPPAGE must be between 1 and 50' };
  }
  if (config.treasuryReserveSol < 0 || config.treasuryBufferSol < 0) {
    return { valid: false, error: 'Treasury reserve settings cannot be negative' };
  }
  return { valid: true };
}

/**
 * Get treasury keypair from environment
 */
function getTreasuryKeypair(): Keypair {
  const treasuryPrivateKey = process.env.TREASURY_WALLET_PRIVATE_KEY;
  if (!treasuryPrivateKey) {
    throw new Error('TREASURY_WALLET_PRIVATE_KEY not configured');
  }
  return Keypair.fromSecretKey(bs58.decode(treasuryPrivateKey));
}

/**
 * Get Solana connection using configured RPC
 */
function getConnection(): Connection {
  const rpcUrl =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    'https://api.mainnet-beta.solana.com';

  return new Connection(rpcUrl, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
  });
}

/**
 * Calculate the SOL amount to swap based on percentage
 */
export function calculateSwapAmount(totalSol: number, percentage: number): number {
  return totalSol * (percentage / 100);
}

export function getRequiredTreasuryFloor(config: SwapConfig): number {
  return config.treasuryReserveSol + config.treasuryBufferSol;
}

export function calculateExecutableSwapAmount(
  requestedSolAmount: number,
  treasuryBalanceSol: number,
  requiredTreasuryFloorSol: number
): number {
  const spendableSol = Math.max(0, treasuryBalanceSol - requiredTreasuryFloorSol);
  return Math.max(0, Math.min(requestedSolAmount, spendableSol));
}

function shouldUseAmmFallback(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes('migrated') ||
    message.includes('graduated') ||
    message.includes('poolrequiredforgraduatederror') ||
    message.includes('amm accounts are required') ||
    message.includes('bonding curve has completed') ||
    message.includes('token amount calculation returned zero')
  );
}

async function buildAmmBuyInstructions(
  connection: Connection,
  mint: PublicKey,
  user: PublicKey,
  solAmountLamports: BN,
  slippage: number
): Promise<TransactionInstruction[]> {
  const poolKey = canonicalPumpPoolPda(mint);
  const ammSdk = new OnlinePumpAmmSdk(connection);
  const swapState = await ammSdk.swapSolanaState(poolKey, user);

  return PUMP_AMM_SDK.buyQuoteInput(swapState, solAmountLamports, slippage);
}

async function buildBuyInstructions(
  connection: Connection,
  sdk: OnlinePumpSdk,
  mint: PublicKey,
  user: PublicKey,
  tokenProgram: PublicKey,
  solAmountLamports: BN,
  slippage: number
): Promise<{ instructions: TransactionInstruction[]; route: 'bonding_curve' | 'amm' }> {
  try {
    const global = await sdk.fetchGlobal();
    console.log('[Swap] Fetched global state');

    const { bondingCurveAccountInfo, bondingCurve, associatedUserAccountInfo } =
      await sdk.fetchBuyState(mint, user, tokenProgram);
    console.log('[Swap] Fetched bonding curve state');

    if (bondingCurve.complete) {
      console.log('[Swap] Bonding curve is complete, switching to AMM route');
      const instructions = await buildAmmBuyInstructions(connection, mint, user, solAmountLamports, slippage);
      return { instructions, route: 'amm' };
    }

    const feeConfig = await sdk.fetchFeeConfig();
    const mintInfo = await connection.getTokenSupply(mint);
    const mintSupply = new BN(mintInfo.value.amount);

    const tokenAmount = getBuyTokenAmountFromSolAmount({
      global,
      feeConfig,
      mintSupply,
      bondingCurve,
      amount: solAmountLamports,
    });
    console.log(`[Swap] Expected tokens (bonding curve): ${tokenAmount.toString()}`);

    if (tokenAmount.isZero()) {
      console.log('[Swap] Bonding curve quote returned zero, switching to AMM route');
      const instructions = await buildAmmBuyInstructions(connection, mint, user, solAmountLamports, slippage);
      return { instructions, route: 'amm' };
    }

    const instructions = await PUMP_SDK.buyInstructions({
      global,
      bondingCurveAccountInfo,
      bondingCurve,
      associatedUserAccountInfo,
      mint,
      user,
      amount: tokenAmount,
      solAmount: solAmountLamports,
      slippage,
      tokenProgram,
    });

    return { instructions, route: 'bonding_curve' };
  } catch (error) {
    if (!shouldUseAmmFallback(error)) {
      throw error;
    }

    console.log('[Swap] Bonding curve route unavailable, retrying through AMM');
    const instructions = await buildAmmBuyInstructions(connection, mint, user, solAmountLamports, slippage);
    return { instructions, route: 'amm' };
  }
}

/**
 * Detect the token program (SPL Token or Token-2022) for a given mint
 */
async function detectTokenProgram(
  connection: Connection,
  mint: PublicKey
): Promise<PublicKey> {
  const mintInfo = await connection.getAccountInfo(mint);
  if (!mintInfo) {
    throw new Error(`Mint account not found: ${mint.toBase58()}`);
  }

  // Token-2022 program owns Token-2022 mints
  if (mintInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
    return TOKEN_2022_PROGRAM_ID;
  }

  return TOKEN_PROGRAM_ID;
}

/**
 * Execute a token swap via the official Pump.fun SDK
 *
 * @param solAmount - Amount of SOL to swap
 * @returns SwapResult with success status and transaction signature
 */
export async function executeSwap(solAmount: number): Promise<SwapResult> {
  const config = getSwapConfig();

  // Validate configuration
  const validation = validateSwapConfig(config);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Minimum amount check (avoid dust transactions)
  if (solAmount < 0.0001) {
    return { success: false, error: 'Amount too small to swap' };
  }

  const keypair = getTreasuryKeypair();
  const connection = getConnection();
  const mint = new PublicKey(config.tokenMint);
  const user = keypair.publicKey;

  try {
    console.log(`[Swap] Executing swap: ${solAmount} SOL -> ${config.tokenMint}`);
    console.log(`[Swap] Treasury: ${user.toBase58()}`);

    const treasuryBalanceLamports = await connection.getBalance(user, 'confirmed');
    const treasuryBalanceSol = treasuryBalanceLamports / LAMPORTS_PER_SOL;
    const requiredFloorSol = getRequiredTreasuryFloor(config);
    const executableSolAmount = calculateExecutableSwapAmount(
      solAmount,
      treasuryBalanceSol,
      requiredFloorSol
    );

    if (executableSolAmount < 0.0001) {
      return {
        success: false,
        error: `No spendable SOL after reserve. Balance=${treasuryBalanceSol.toFixed(6)} floor=${requiredFloorSol.toFixed(6)}`,
      };
    }

    if (executableSolAmount < solAmount) {
      console.log(
        `[Swap] Clamped amount from ${solAmount} to ${executableSolAmount} SOL to preserve treasury floor`
      );
    }

    // Step 1: Initialize SDK
    const sdk = new OnlinePumpSdk(connection);

    // Step 2: Detect token program (SPL Token vs Token-2022)
    const tokenProgram = await detectTokenProgram(connection, mint);
    const isToken2022 = tokenProgram.equals(TOKEN_2022_PROGRAM_ID);
    console.log(`[Swap] Token program: ${isToken2022 ? 'Token-2022' : 'SPL Token'}`);

    // Step 3: Calculate SOL amount in lamports
    const solAmountLamports = new BN(Math.floor(executableSolAmount * LAMPORTS_PER_SOL));

    // Step 4: Build buy instructions (bonding curve route with AMM fallback)
    const { instructions, route } = await buildBuyInstructions(
      connection,
      sdk,
      mint,
      user,
      tokenProgram,
      solAmountLamports,
      config.slippage
    );
    console.log(`[Swap] Built ${instructions.length} instructions via ${route}`);

    // Step 5: Add compute budget instructions for priority fees
    const computeBudgetIxs = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: config.priorityFee }),
    ];

    // Step 6: Build transaction
    const transaction = new Transaction();
    transaction.add(...computeBudgetIxs);
    transaction.add(...instructions);

    // Step 7: Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = user;

    // Step 8: Sign transaction
    transaction.sign(keypair);
    console.log('[Swap] Transaction signed');

    // Step 9: Send transaction
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
      preflightCommitment: 'confirmed',
    });
    console.log(`[Swap] Transaction sent: ${signature}`);

    // Step 10: Confirm transaction
    const confirmation = await connection.confirmTransaction(
      {
        signature,
        blockhash,
        lastValidBlockHeight,
      },
      'confirmed'
    );

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    console.log(`[Swap] Transaction confirmed: ${signature}`);
    return { success: true, signature };
  } catch (error) {
    // Extract meaningful error message
    let errorMessage: string;

    if (error instanceof SendTransactionError) {
      errorMessage = `SendTransactionError: ${error.message}`;
      // Try to get more details from logs
      if (error.logs) {
        const relevantLogs = error.logs.filter(log =>
          log.includes('Error') || log.includes('failed') || log.includes('insufficient')
        );
        if (relevantLogs.length > 0) {
          errorMessage += ` | Logs: ${relevantLogs.join('; ')}`;
        }
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    } else {
      errorMessage = String(error);
    }

    console.error(`[Swap] Swap failed:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Check if a swap transaction was confirmed
 */
export async function checkSwapStatus(signature: string): Promise<{
  confirmed: boolean;
  error?: string;
}> {
  const connection = getConnection();

  try {
    const status = await connection.getSignatureStatus(signature, {
      searchTransactionHistory: true,
    });

    if (!status.value) {
      return { confirmed: false, error: 'Transaction not found' };
    }

    if (status.value.err) {
      return { confirmed: false, error: JSON.stringify(status.value.err) };
    }

    if (
      status.value.confirmationStatus === 'confirmed' ||
      status.value.confirmationStatus === 'finalized'
    ) {
      return { confirmed: true };
    }

    return { confirmed: false, error: 'Transaction pending' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { confirmed: false, error: errorMessage };
  }
}
