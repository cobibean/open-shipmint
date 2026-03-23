'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Coins, Gem, Shield, Zap } from 'lucide-react'
import { useOnboarding } from '@/stores/onboardingStore'
import { useEffect, useState } from 'react'

export function WelcomeModal() {
  const { hasSeenWelcome, setHasSeenWelcome } = useOnboarding()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Show modal after 1 second if user hasn't seen it
    if (!hasSeenWelcome) {
      const timer = setTimeout(() => setIsOpen(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [hasSeenWelcome])

  const handleClose = () => {
    setIsOpen(false)
    setHasSeenWelcome(true)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="bg-gradient-to-br from-gray-900 to-black border border-purple-500/30 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto shadow-2xl shadow-purple-500/20"
            >
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="p-8 pb-6 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="inline-block mb-4"
                >
                  <div className="text-6xl">🎨</div>
                </motion.div>
                <h2 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-600 text-transparent bg-clip-text">
                  Welcome to ShipMint
                </h2>
                <p className="text-gray-400 text-lg">
                  Generate AI art, mint NFTs. Here&apos;s how it works.
                </p>
              </div>

              {/* Main Content */}
              <div className="px-8 pb-6 space-y-6">
                {/* Arcade Analogy */}
                <div className="p-6 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                  <h3 className="text-xl font-bold mb-4 text-center">
                    Think of it like an arcade
                  </h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg flex-shrink-0">
                        <Coins className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <div className="font-semibold mb-1">Credits = Game Tokens</div>
                        <div className="text-sm text-gray-400">
                          Cheap, consumable. Generate AI images freely.
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-500/20 rounded-lg flex-shrink-0">
                        <Gem className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <div className="font-semibold mb-1">SOL = Prize Tickets</div>
                        <div className="text-sm text-gray-400">
                          Mint your best work as NFTs. Forever ownership.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Start */}
                <div>
                  <h3 className="font-bold mb-3 text-center text-lg">Quick Start</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center font-bold flex-shrink-0">
                        1
                      </div>
                      <div className="text-sm">
                        <strong>Buy credits</strong> - 4 packs from $0.25 to $50
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center font-bold flex-shrink-0">
                        2
                      </div>
                      <div className="text-sm">
                        <strong>Generate</strong> - 3 AI models, 1-2 credits each
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center font-bold flex-shrink-0">
                        3
                      </div>
                      <div className="text-sm">
                        <strong>Mint</strong> - 0.02 SOL per NFT (optional)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Protection Features */}
                <div>
                  <h3 className="font-bold mb-3 text-center text-lg flex items-center justify-center gap-2">
                    <Shield className="w-5 h-5 text-green-400" />
                    You&apos;re Protected
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <div className="text-green-400 mt-0.5">✓</div>
                      <div>
                        <strong>Failed generation?</strong> Credits refunded automatically
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="text-green-400 mt-0.5">✓</div>
                      <div>
                        <strong>Failed mint?</strong> We mint BEFORE you pay - never lose money
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="text-green-400 mt-0.5">✓</div>
                      <div>
                        <strong>Wallet = account</strong> - No signup, no passwords
                      </div>
                    </div>
                  </div>
                </div>

                {/* Model Pricing */}
                <div className="p-4 bg-black/40 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <h3 className="font-semibold text-sm">Model Pricing</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 bg-white/5 rounded text-center">
                      <div className="font-semibold">DALL-E 3</div>
                      <div className="text-purple-400">2 credits</div>
                      <div className="text-gray-500 text-[10px]">best quality</div>
                    </div>
                    <div className="p-2 bg-white/5 rounded text-center">
                      <div className="font-semibold">GPT Image</div>
                      <div className="text-purple-400">1 credit</div>
                      <div className="text-gray-500 text-[10px]">fast</div>
                    </div>
                    <div className="p-2 bg-white/5 rounded text-center">
                      <div className="font-semibold">DALL-E 2</div>
                      <div className="text-purple-400">1 credit</div>
                      <div className="text-gray-500 text-[10px]">classic</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer CTA */}
              <div className="p-8 pt-6 border-t border-white/10">
                <button
                  onClick={handleClose}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Get Started
                </button>
                <button
                  onClick={handleClose}
                  className="w-full mt-3 text-sm text-gray-400 hover:text-gray-300 transition-colors"
                >
                  Don&apos;t show this again
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
