'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
}

const faqs: FAQItem[] = [
  {
    question: 'What is ShipMint?',
    answer: 'ShipMint lets you generate AI images with credits, then mint your favorites as instant 1/1 NFTs on Solana. No account needed - just connect your wallet.',
  },
  {
    question: 'Why credits AND SOL?',
    answer: "Think of it like an arcade:\n\n• Credits = game tokens (cheap, consumable, for experimenting)\n• SOL = prize tickets (commitment, for keeping your best work forever)\n\nCredits let you generate freely without blockchain fees. SOL mints mean you only pay for NFTs you actually want to own.",
  },
  {
    question: 'Do I need to create an account?',
    answer: "Nope. Your Solana wallet IS your account. Connect once, auto-authenticate forever.",
  },
  {
    question: 'What if my image generation fails?',
    answer: "Credits are automatically refunded if OpenAI or IPFS fails. You never lose credits on failed generations.",
  },
  {
    question: 'What if minting fails after I pay?',
    answer: "It can't. We mint the NFT BEFORE asking for payment. If minting fails, you pay nothing. If it succeeds but you cancel payment, you still get the NFT (we just don't get paid). This protects you from ever losing money.",
  },
  {
    question: 'Which wallets are supported?',
    answer: "Any wallet-standard wallet: Phantom, Solflare, Backpack, Glow, and more.",
  },
  {
    question: 'Where are my images stored?',
    answer: "Images are stored on IPFS (InterPlanetary File System) via Pinata. They're permanent and decentralized - no one can take them down.",
  },
  {
    question: 'Can I delete or edit an NFT after minting?',
    answer: "No. Blockchain is forever. Once minted, the NFT exists permanently on Solana. Choose wisely.",
  },
  {
    question: 'How long does generation take?',
    answer: "DALL-E 3 takes 20-30 seconds. DALL-E 2 and GPT Image are usually faster (10-20 seconds). We show a loading indicator while your image is being created.",
  },
  {
    question: 'Can I see my past generations?',
    answer: 'Yes. Your private gallery shows all your generations with filters for "All", "Generated" (not minted), and "Minted" (turned into NFTs). Infinite scroll, lazy loading, the works.',
  },
  {
    question: 'What happens to unminted images?',
    answer: "They stay in your gallery forever. No expiration. Mint them anytime.",
  },
  {
    question: 'How do credit packs work?',
    answer: "Buy once, use anytime. Credits never expire. Prices are in SOL, calculated live from CoinGecko API (or $100/SOL if the API is down).",
  },
  {
    question: 'What happens in the backend when I buy credits?',
    answer: "1. Purchase Initiated: Your wallet sends SOL to our treasury. We create a pending purchase record.\n2. Verification: We verify your transaction on the Solana blockchain to ensure it's valid.\n3. Credit Delivery: Once verified, we instantly add credits to your balance.\n4. Token Swap: In the background, we automatically swap a portion of your SOL payment for $SHIP tokens to support the ecosystem. This happens asynchronously so you don't wait.",
  },
  {
    question: "What's the transaction fee?",
    answer: "• Credit purchases: Standard Solana network fee (~0.000005 SOL)\n• NFT minting: 0.02 SOL (includes network fees and platform fee)",
  },
  {
    question: 'Can I get a refund on credits?',
    answer: "No. Credits are final sale. But they never expire and auto-refund on failed generations.",
  },
  {
    question: 'What blockchain are NFTs on?',
    answer: "Solana mainnet. Fast, cheap, and verifiable on Solana Explorer or any NFT marketplace.",
  },
  {
    question: 'What makes this different from other AI art tools?',
    answer: "Most AI art tools are subscriptions. We're pay-per-use with crypto. Plus:\n\n• Your images are YOURS (IPFS, not our servers)\n• Instant NFT minting (no waiting, no hassle)\n• Wallet-based auth (no email, no password leaks)\n• Failed generation? Refunded. Failed mint? You pay nothing.",
  },
]

export function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-3">
      {faqs.map((faq, index) => (
        <div
          key={index}
          className="border border-white/10 rounded-lg bg-black/20 backdrop-blur-sm overflow-hidden hover:border-purple-500/30 transition-colors"
        >
          <button
            onClick={() => toggleItem(index)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
          >
            <span className="text-lg font-medium pr-4">{faq.question}</span>
            <motion.div
              animate={{ rotate: openIndex === index ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0"
            >
              <ChevronDown className="w-5 h-5 text-purple-400" />
            </motion.div>
          </button>

          <AnimatePresence>
            {openIndex === index && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-4 text-gray-300 whitespace-pre-line">
                  {faq.answer}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}
