'use client'

import { motion } from 'framer-motion'
import { Wallet, Sparkles, Image, Gem } from 'lucide-react'

const steps = [
  {
    icon: Wallet,
    title: 'Connect & Load Credits',
    description: 'Link your Solana wallet (like login, but cooler). Buy credits with SOL - 4 packs from $0.25 to $50.',
    color: 'from-blue-500 to-cyan-500',
    detail: 'Credits never expire. Failed generation? Auto-refunded.',
  },
  {
    icon: Sparkles,
    title: 'Generate AI Art',
    description: '3 AI models to choose from (1-2 credits each). Takes 20-30 seconds, stored on IPFS forever.',
    color: 'from-purple-500 to-pink-500',
    detail: 'DALL-E 3, GPT Image, or DALL-E 2. Your choice.',
  },
  {
    icon: Image,
    title: 'Browse Your Gallery',
    description: 'All your generations in one place. Infinite scroll, filters, and full-screen previews.',
    color: 'from-green-500 to-emerald-500',
    detail: 'Filter by all, generated, or minted. Copy prompts. Track your creations.',
  },
  {
    icon: Gem,
    title: 'Mint Your Favorites',
    description: '0.02 SOL per NFT. We mint BEFORE you pay - if minting fails, you pay nothing.',
    color: 'from-yellow-500 to-orange-500',
    detail: 'Yours forever on Solana. Never lose money.',
  },
]

export function HowItWorks() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-600 text-transparent bg-clip-text">
            How It Works
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Credits create. SOL mints. Simple as that.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative group"
              >
                <div className="h-full p-8 border border-white/10 rounded-2xl bg-black/20 backdrop-blur-sm hover:border-purple-500/30 transition-all hover:shadow-lg hover:shadow-purple-500/10">
                  {/* Step number */}
                  <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center font-bold text-lg shadow-lg">
                    {index + 1}
                  </div>

                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${step.color} p-3 mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-full h-full text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                  <p className="text-gray-300 mb-3 leading-relaxed">
                    {step.description}
                  </p>
                  <p className="text-sm text-purple-400 font-medium">
                    {step.detail}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <div className="inline-block p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="text-left">
                <h3 className="text-xl font-bold mb-1">Ready to ship?</h3>
                <p className="text-gray-400 text-sm">
                  Connect your wallet and get started in seconds.
                </p>
              </div>
              <a
                href="#get-started"
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-bold whitespace-nowrap transition-all transform hover:scale-105 active:scale-95"
              >
                Get Started
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
