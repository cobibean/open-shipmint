'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import {
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  PublicKey,
  ComputeBudgetProgram,
  Connection,
} from '@solana/web3.js';
import { useAuthenticatedFetch } from './useAuthenticatedFetch';
import { useAppStore } from '@/stores/appStore';
import { CreditPack } from '@/types';

// Use a dedicated RPC for sending transactions on mainnet
// The public RPC has stale state and poor transaction routing
function getSendConnection(): Connection | null {
  const sendRpc = process.env.NEXT_PUBLIC_SOLANA_SEND_RPC_URL;
  if (sendRpc) {
    return new Connection(sendRpc, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
    });
  }
  return null;
}

// Check if we're using a reliable RPC provider (not public RPC)
function hasReliableRpc(): boolean {
  const mainRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || '';
  const sendRpc = process.env.NEXT_PUBLIC_SOLANA_SEND_RPC_URL || '';
  const reliableProviders = ['helius', 'triton', 'quicknode', 'alchemy', 'syndica'];
  
  return reliableProviders.some(provider => 
    mainRpc.toLowerCase().includes(provider) || 
    sendRpc.toLowerCase().includes(provider)
  );
}

export function useCredits() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const authFetch = useAuthenticatedFetch();
  const { user, updateCreditBalance, isAuthenticated } = useAppStore();

  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [solPrice, setSolPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const res = await authFetch('/api/credits/balance');
      if (res.ok) {
        const { balance } = await res.json();
        updateCreditBalance(balance);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  }, [authFetch, updateCreditBalance, isAuthenticated]);

  const fetchPacks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/credits/packs');
      if (res.ok) {
        const data = await res.json();
        setPacks(data.packs);
        setSolPrice(data.solPrice);
      }
    } catch (error) {
      console.error('Failed to fetch packs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const purchasePack = useCallback(
    async (packId: string): Promise<{ success: boolean; error?: string }> => {
      if (!publicKey || !signTransaction) {
        return { success: false, error: 'Wallet not connected' };
      }

      const pack = packs.find((p) => p.id === packId);
      if (!pack) {
        return { success: false, error: 'Invalid pack' };
      }

      setPurchasing(true);

      try {
        const treasuryAddress = process.env.NEXT_PUBLIC_TREASURY_WALLET_ADDRESS;
        if (!treasuryAddress) {
          return { success: false, error: 'Treasury not configured' };
        }

        // Use dedicated send RPC if available (Helius/Triton with staked connections)
        // Falls back to the default connection if not configured
        const sendConnection = getSendConnection() || connection;
        
        const lamports = Math.round(pack.solPrice * LAMPORTS_PER_SOL);

        // Set compute unit limit (simple transfer needs ~450 CU, use 1000 for safety)
        const computeUnitLimit = ComputeBudgetProgram.setComputeUnitLimit({
          units: 1000,
        });

        // Set priority fee - use higher value for mainnet congestion
        // 50,000 microlamports/CU is more competitive during high congestion
        // This adds ~0.00005 SOL to transaction cost (still negligible)
        const priorityFee = ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 50000,
        });

        const transaction = new Transaction().add(
          computeUnitLimit,
          priorityFee,
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey(treasuryAddress),
            lamports,
          })
        );

        // Get recent blockhash from send connection for consistency
        const { blockhash, lastValidBlockHeight } = await sendConnection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        // Sign transaction with wallet
        const signedTransaction = await signTransaction(transaction);

        // Serialize and send raw transaction
        const rawTransaction = signedTransaction.serialize();
        
        // Use simulation (preflight) when we have a reliable RPC provider
        // Skip preflight only with public RPC which has stale state
        const useSimulation = hasReliableRpc();
        console.log('RPC config:', {
          mainRpc: process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.substring(0, 50),
          sendRpc: process.env.NEXT_PUBLIC_SOLANA_SEND_RPC_URL?.substring(0, 50),
          useSimulation,
          lamports,
          from: publicKey.toBase58(),
          to: treasuryAddress,
        });
        
        let signature: string;
        try {
          signature = await sendConnection.sendRawTransaction(rawTransaction, {
            skipPreflight: !useSimulation,
            maxRetries: 3,
            preflightCommitment: 'confirmed',
          });
        } catch (sendError) {
          console.error('sendRawTransaction error:', sendError);
          // Extract simulation logs if available
          if (sendError && typeof sendError === 'object') {
            const err = sendError as { logs?: string[]; message?: string };
            if (err.logs) {
              console.error('Simulation logs:', err.logs);
            }
            return {
              success: false,
              error: err.message || 'Failed to send transaction',
            };
          }
          throw sendError;
        }

        console.log('Transaction sent:', signature);

        // Poll for confirmation using getSignatureStatuses
        const POLL_INTERVAL = 1500;
        const TIMEOUT = 90000; // Increased timeout for mainnet
        const startTime = Date.now();

        let confirmed = false;
        let txError: string | null = null;

        while (Date.now() - startTime < TIMEOUT) {
          try {
            const { value: statuses } = await sendConnection.getSignatureStatuses([signature]);
            const status = statuses[0];

            if (status) {
              console.log('Transaction status:', status.confirmationStatus);
              if (status.err) {
                txError = `Transaction failed: ${JSON.stringify(status.err)}`;
                break;
              }
              if (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized') {
                confirmed = true;
                break;
              }
            }

            // Check if blockhash has expired
            const currentBlockHeight = await sendConnection.getBlockHeight('confirmed');
            if (currentBlockHeight > lastValidBlockHeight) {
              console.log('Blockhash expired, checking transaction history...');
              // Blockhash expired but transaction might have landed - check with history search
              const { value: finalStatuses } = await sendConnection.getSignatureStatuses([signature], {
                searchTransactionHistory: true,
              });
              const finalStatus = finalStatuses[0];
              if (finalStatus && !finalStatus.err &&
                  (finalStatus.confirmationStatus === 'confirmed' || finalStatus.confirmationStatus === 'finalized')) {
                confirmed = true;
              }
              break;
            }
          } catch (pollError) {
            console.warn('Polling error (will retry):', pollError);
          }

          await new Promise((r) => setTimeout(r, POLL_INTERVAL));
        }

        if (txError) {
          return { success: false, error: txError };
        }

        if (!confirmed) {
          return { 
            success: false, 
            error: 'Transaction did not confirm in time. It may still land - check your wallet balance.',
          };
        }

        // Register purchase
        const purchaseRes = await authFetch('/api/credits/purchase', {
          method: 'POST',
          body: JSON.stringify({ packId, txSignature: signature }),
        });

        if (!purchaseRes.ok) {
          return { success: false, error: 'Failed to register purchase' };
        }

        const { purchaseId } = await purchaseRes.json();

        // Poll for confirmation
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
          await new Promise((r) => setTimeout(r, 2000));

          const checkRes = await authFetch(`/api/credits/purchase/${purchaseId}`);
          if (checkRes.ok) {
            const data = await checkRes.json();
            console.log('[Purchase] Poll response:', data);
            if (data.status === 'confirmed') {
              console.log('[Purchase] Confirmed! New balance:', data.newBalance);
              updateCreditBalance(data.newBalance);
              // Also trigger a fresh balance fetch to ensure UI updates
              setTimeout(() => fetchBalance(), 500);
              return { success: true };
            }
            if (data.error) {
              console.log('[Purchase] Verification error:', data.error);
            }
          }
          attempts++;
        }

        console.log('[Purchase] Confirmation timeout after', maxAttempts, 'attempts');
        return { success: false, error: 'Confirmation timeout' };
      } catch (error) {
        console.error('Purchase error:', error);
        // Log more details for debugging
        if (error instanceof Error) {
          console.error('Error name:', error.name);
          console.error('Error message:', error.message);
          // Check if it's a SendTransactionError with logs
          if ('logs' in error) {
            console.error('Transaction logs:', (error as { logs?: string[] }).logs);
          }
        }
        console.error('Paying wallet:', publicKey?.toBase58());
        console.error('Treasury wallet:', process.env.NEXT_PUBLIC_TREASURY_WALLET_ADDRESS);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Purchase failed',
        };
      } finally {
        setPurchasing(false);
      }
    },
    [publicKey, signTransaction, connection, packs, authFetch, updateCreditBalance, fetchBalance]
  );

  // Fetch balance on mount and auth change
  useEffect(() => {
    if (isAuthenticated) {
      fetchBalance();
    }
  }, [isAuthenticated, fetchBalance]);

  return {
    balance: user?.creditBalance ?? 0,
    packs,
    solPrice,
    loading,
    purchasing,
    fetchBalance,
    fetchPacks,
    purchasePack,
  };
}
