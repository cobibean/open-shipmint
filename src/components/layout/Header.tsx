'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { WalletButton } from './WalletButton';
import { CreditBalance } from '@/components/credits/CreditBalance';
import { PurchaseModal } from '@/components/credits/PurchaseModal';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export const Header = () => {
  const pathname = usePathname();
  const { connected, isAuthenticated, authenticate } = useAuth();
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Debug: Log modal state changes
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Header] render', { showPurchaseModal, isAuthenticated, connected });
  }

  const handleBuyCredits = () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Buy Credits] clicked', { isAuthenticated, connected });
    }
    if (isAuthenticated) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Buy Credits] Opening modal');
      }
      setShowPurchaseModal(true);
    } else {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Buy Credits] Calling authenticate');
      }
      authenticate();
    }
  };

  const navLinks = [
    { href: '/generate', label: 'Generate' },
    { href: '/gallery', label: 'Gallery' },
    { href: '/help', label: 'Help' },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo and desktop nav */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/brand/shipmint-logo.png"
                alt="shipmint"
                width={32}
                height={32}
                priority
                className="h-8 w-8"
              />
              <span className="text-xl font-bold">
                shipmint
              </span>
            </Link>
            <nav className="hidden gap-6 md:flex">
              {navLinks.map((link) => {
                // Show Help always, others only when connected
                if (!connected && link.href !== '/help') return null;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'text-sm transition-colors hover:text-white',
                      pathname === link.href
                        ? 'text-white font-medium'
                        : 'text-white/70'
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Desktop actions */}
          <div className="hidden items-center gap-4 md:flex">
            {(isAuthenticated || connected) && (
              <>
                {isAuthenticated && <CreditBalance onClick={() => {
                  if (process.env.NODE_ENV !== 'production') {
                    console.log('[CreditBalance] clicked, opening modal');
                  }
                  setShowPurchaseModal(true);
                }} />}
                <button
                  onClick={handleBuyCredits}
                  className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-yellow-700"
                >
                  Buy Credits
                </button>
              </>
            )}
            <WalletButton />
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white md:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-white/10 md:hidden"
            >
              <div className="container mx-auto px-4 py-4">
                {/* Mobile nav links */}
                <nav className="mb-4 flex flex-col gap-2">
                  {navLinks.map((link) => {
                    // Show Help always, others only when connected
                    if (!connected && link.href !== '/help') return null;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          'rounded-lg px-4 py-3 text-sm transition-colors',
                          pathname === link.href
                            ? 'bg-purple-600/20 text-white font-medium'
                            : 'text-white/70 hover:bg-white/5 hover:text-white'
                        )}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </nav>

                {/* Mobile actions */}
                <div className="flex flex-col gap-3">
                  {(isAuthenticated || connected) && (
                    <>
                      {isAuthenticated && (
                        <div className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3">
                          <span className="text-sm text-white/60">Credits</span>
                          <CreditBalance onClick={() => {
                            if (process.env.NODE_ENV !== 'production') {
                              console.log('[Mobile CreditBalance] clicked, opening modal');
                            }
                            setShowPurchaseModal(true);
                            setMobileMenuOpen(false);
                          }} />
                        </div>
                      )}
                      <button
                        onClick={() => {
                          handleBuyCredits();
                          setMobileMenuOpen(false);
                        }}
                        className="w-full rounded-lg bg-yellow-600 px-4 py-3 text-sm font-medium transition-colors hover:bg-yellow-700"
                      >
                        Buy Credits
                      </button>
                    </>
                  )}
                  <div className="pt-2">
                    <WalletButton />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <PurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
      />
    </>
  );
};
