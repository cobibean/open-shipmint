/**
 * Swap Types - Pump.Fun Token Swap Integration
 *
 * Types for the official Pump.fun SDK integration and internal swap tracking.
 */

// Swap status enum
export type SwapStatus = 'pending' | 'confirmed' | 'failed';

// Swap configuration from environment
export interface SwapConfig {
  enabled: boolean;
  percentage: number;      // 0-100, percentage of SOL to swap
  tokenMint: string;       // Token mint address to buy
  slippage: number;        // Slippage tolerance in percentage (e.g., 10 = 10%)
  priorityFee: number;     // Priority fee in microlamports per compute unit
  maxRetries: number;      // Max retry attempts before giving up
  treasuryReserveSol: number; // SOL reserved for mint costs and rent
  treasuryBufferSol: number;  // Additional SOL kept as gas buffer
}

// Result of a swap execution attempt
export interface SwapResult {
  success: boolean;
  signature?: string;
  error?: string;
}

// Internal swap request (queued for execution)
export interface SwapRequest {
  purchaseId: string;
  solAmount: number;
  tokenMint: string;
}

// Database swap attempt record (matches Prisma model)
export interface SwapAttemptRecord {
  id: string;
  purchaseId: string;
  solAmount: number;
  tokenMint: string;
  status: SwapStatus;
  txSignature: string | null;
  attempts: number;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt: Date | null;
}

// Swap stats for monitoring
export interface SwapStats {
  totalSwaps: number;
  confirmedSwaps: number;
  failedSwaps: number;
  pendingSwaps: number;
  successRate: number;
  totalSolSwapped: number;
}
