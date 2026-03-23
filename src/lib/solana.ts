import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Keypair,
  ComputeBudgetProgram,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import bs58 from 'bs58';

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_WALLET_ADDRESS!;

// Log RPC URL on first import (server-side)
console.log(`[Solana] Using RPC: ${RPC_URL.substring(0, 50)}...`);

export const connection = new Connection(RPC_URL, 'confirmed');

export function getTreasuryPublicKey(): PublicKey {
  return new PublicKey(TREASURY_ADDRESS);
}

export function solToLamports(sol: number): number {
  return Math.round(sol * LAMPORTS_PER_SOL);
}

export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

export async function verifyTransaction(
  signature: string,
  expectedAmount: number,
  fromAddress: string
): Promise<{ verified: boolean; error?: string }> {
  try {
    console.log(`[Verify] Looking up tx: ${signature}`);
    
    const tx = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      console.log('[Verify] Transaction not found yet');
      return { verified: false, error: 'Transaction not found' };
    }
    
    console.log('[Verify] Transaction found, checking details...');

    if (tx.meta?.err) {
      return { verified: false, error: 'Transaction failed' };
    }

    // Verify sender
    const accountKeys = tx.transaction.message.getAccountKeys();
    const senderKey = accountKeys.get(0);
    if (!senderKey || senderKey.toBase58() !== fromAddress) {
      return { verified: false, error: 'Sender mismatch' };
    }

    // Verify recipient (treasury)
    const treasuryKey = getTreasuryPublicKey();
    const preBalances = tx.meta?.preBalances || [];
    const postBalances = tx.meta?.postBalances || [];

    let treasuryIndex = -1;
    for (let i = 0; i < accountKeys.length; i++) {
      if (accountKeys.get(i)?.equals(treasuryKey)) {
        treasuryIndex = i;
        break;
      }
    }

    if (treasuryIndex === -1) {
      return { verified: false, error: 'Treasury not in transaction' };
    }

    // Verify amount
    const received = postBalances[treasuryIndex] - preBalances[treasuryIndex];
    const expectedLamports = solToLamports(expectedAmount);
    // Allow tolerance for transaction fees (base fee ~5000 + priority fees up to ~150000)
    // Plus some variance for price fluctuations during purchase flow
    const tolerance = 200000; // 0.0002 SOL tolerance

    if (Math.abs(received - expectedLamports) > tolerance) {
      console.log(`[Verify] Amount mismatch: received ${received}, expected ${expectedLamports}, diff ${Math.abs(received - expectedLamports)}`);
      return { verified: false, error: 'Amount mismatch' };
    }

    return { verified: true };
  } catch (error) {
    console.error('Transaction verification error:', error);
    return { verified: false, error: 'Verification failed' };
  }
}

export async function getSolPrice(): Promise<number> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      { next: { revalidate: 60 } }
    );
    const data = await response.json();
    return data.solana.usd;
  } catch (error) {
    console.error('Failed to fetch SOL price:', error);
    // Fallback price
    return 100;
  }
}

export function createTransferInstruction(
  from: PublicKey,
  lamports: number
): Transaction {
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: getTreasuryPublicKey(),
      lamports,
    })
  );
  return transaction;
}

/**
 * Get the treasury keypair for signing transactions
 * Used for refunds and other treasury-initiated transactions
 */
function getTreasuryKeypair(): Keypair {
  const privateKey = process.env.TREASURY_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('TREASURY_WALLET_PRIVATE_KEY not configured');
  }
  return Keypair.fromSecretKey(bs58.decode(privateKey));
}

export interface RefundResult {
  success: boolean;
  signature?: string;
  error?: string;
}

/**
 * Send a refund from the treasury to a user's wallet
 * Used when minting fails after payment has been received
 */
export async function sendRefund(
  recipientAddress: string,
  solAmount: number
): Promise<RefundResult> {
  try {
    const treasuryKeypair = getTreasuryKeypair();
    const recipientPubkey = new PublicKey(recipientAddress);
    const lamports = solToLamports(solAmount);

    console.log(`[Refund] Sending ${solAmount} SOL to ${recipientAddress}`);

    // Build transaction with priority fees for reliable landing
    const transaction = new Transaction();

    // Add compute budget instructions
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 1000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 })
    );

    // Add the transfer
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: treasuryKeypair.publicKey,
        toPubkey: recipientPubkey,
        lamports,
      })
    );

    // Get blockhash and send
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = treasuryKeypair.publicKey;

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [treasuryKeypair],
      { commitment: 'confirmed' }
    );

    console.log(`[Refund] Success: ${signature}`);
    return { success: true, signature };
  } catch (error) {
    console.error('[Refund] Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Refund failed',
    };
  }
}
