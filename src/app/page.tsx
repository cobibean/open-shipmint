'use client';

import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
import { WalletButton } from '@/components/layout/WalletButton';
import { HowItWorks } from '@/components/landing/HowItWorks';

export default function Home() {
  const { connected } = useWallet();

  return (
    <>
      <div className="flex min-h-[calc(100vh-10rem)] flex-col items-center justify-center text-center px-4">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 text-4xl md:text-6xl font-bold tracking-tight"
        >
          Generate AI Art.
          <br />
          <span className="bg-gradient-to-r from-purple-400 to-pink-600 text-transparent bg-clip-text">
            Mint Your Favorites.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 max-w-2xl text-lg md:text-xl text-gray-400"
        >
          Create images with AI, see what you get, then mint only the ones you love
          as 1/1 Solana NFTs.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          {connected ? (
            <>
              <Link
                href="/generate"
                className="inline-flex h-14 items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-8 font-bold text-lg transition-all hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 active:scale-95"
              >
                Start Generating
              </Link>
              <Link
                href="/help"
                className="inline-flex h-14 items-center justify-center rounded-xl border border-white/20 px-8 font-medium text-lg transition-all hover:bg-white/5 hover:border-purple-500/50"
              >
                How It Works
              </Link>
            </>
          ) : (
            <>
              <WalletButton />
              <Link
                href="/help"
                className="inline-flex h-14 items-center justify-center rounded-xl border border-white/20 px-8 font-medium text-lg transition-all hover:bg-white/5 hover:border-purple-500/50"
              >
                Learn More
              </Link>
            </>
          )}
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-16 flex flex-wrap justify-center gap-8 text-sm text-gray-500"
        >
          <div className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span>Failed generation? Auto-refunded</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span>We mint before you pay</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span>No signup required</span>
          </div>
        </motion.div>
      </div>

      {/* How It Works Section */}
      <HowItWorks />
    </>
  );
}
