'use client';

import { useEffect, useState } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const WalletButton = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-yellow-700"
        aria-label="Connect Wallet"
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <WalletMultiButton className="!bg-yellow-600 !rounded-lg !h-10 !text-sm hover:!bg-yellow-700 transition-colors" />
  );
};
