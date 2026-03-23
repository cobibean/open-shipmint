'use client';

import { useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import { useAppStore } from '@/stores/appStore';

export function useAuth() {
  const { publicKey, signMessage, connected, disconnect } = useWallet();
  const { token, user, isAuthenticated, setAuth, clearAuth } = useAppStore();

  const authenticate = useCallback(async () => {
    if (!publicKey || !signMessage) return;

    try {
      const walletAddress = publicKey.toBase58();

      // Get nonce
      const nonceRes = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
      });

      if (!nonceRes.ok) throw new Error('Failed to get nonce');
      const { nonce } = await nonceRes.json();

      // Sign message
      const messageBytes = new TextEncoder().encode(nonce);
      const signatureBytes = await signMessage(messageBytes);
      const signature = bs58.encode(signatureBytes);

      // Verify and get token
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, signature, nonce }),
      });

      if (!verifyRes.ok) throw new Error('Authentication failed');
      const { token, user } = await verifyRes.json();

      setAuth(token, user);
    } catch (error) {
      console.error('Auth error:', error);
      clearAuth();
    }
  }, [publicKey, signMessage, setAuth, clearAuth]);

  const logout = useCallback(() => {
    clearAuth();
    disconnect();
  }, [clearAuth, disconnect]);

  // Auto-authenticate when wallet connects
  useEffect(() => {
    if (connected && publicKey && signMessage && !isAuthenticated) {
      authenticate();
    }
  }, [connected, publicKey, signMessage, isAuthenticated, authenticate]);

  // Clear auth when wallet disconnects
  useEffect(() => {
    if (!connected && isAuthenticated) {
      clearAuth();
    }
  }, [connected, isAuthenticated, clearAuth]);

  return {
    connected,       // Wallet is connected (but may not be authenticated)
    isAuthenticated, // User has signed and has valid JWT
    user,
    token,
    authenticate,
    logout,
  };
}
