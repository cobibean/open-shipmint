'use client'

import { ReactNode, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle } from 'lucide-react'

interface TooltipProps {
  content: string | ReactNode
  children?: ReactNode
  icon?: boolean
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export function Tooltip({ content, children, icon = true, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-800 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-800 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-800 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-800 border-t-transparent border-b-transparent border-l-transparent',
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onTouchStart={() => setIsVisible(!isVisible)}
    >
      {/* Trigger */}
      {children || (
        icon && (
          <HelpCircle className="w-4 h-4 text-gray-400 hover:text-purple-400 transition-colors cursor-help" />
        )
      )}

      {/* Tooltip */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute ${positionClasses[position]} z-50 pointer-events-none`}
          >
            <div className="relative">
              {/* Arrow */}
              <div className={`absolute ${arrowClasses[position]} border-4`} />

              {/* Content */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 shadow-xl max-w-xs whitespace-normal">
                {content}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Preset tooltips for common use cases
export const tooltips = {
  credits: 'Credits are used to generate AI images. Different models cost different amounts. Failed generations are automatically refunded.',
  sol: 'SOL is used to mint your generated images as NFTs on the Solana blockchain. 0.02 SOL per mint.',
  walletAuth: 'Your wallet is your account. No email or password needed. Connect once and authenticate automatically.',
  ipfs: 'Images are stored permanently on IPFS (InterPlanetary File System). No one can delete them.',
  mintFirst: 'We mint the NFT BEFORE asking for payment. If minting fails, you pay nothing. You never lose money.',
  refund: 'If image generation fails for any reason, your credits are automatically refunded to your balance.',
  models: {
    'dalle3': 'DALL-E 3: Highest quality, best at following complex prompts. 2 credits per generation.',
    'gpt': 'GPT Image: Fast and creative, good for quick iterations. 1 credit per generation.',
    'dalle2': 'DALL-E 2: Classic model, reliable results. 1 credit per generation.',
  },
  packs: {
    test: 'Perfect for trying out the platform. 1 credit = 1 GPT Image or half a DALL-E 3 image.',
    starter: 'Most popular. 10 credits = 5 DALL-E 3 images or 10 GPT Images.',
    builder: 'Best value. 25 credits = 12 DALL-E 3 images or 25 GPT Images.',
    pro: 'For power users. 150 credits = 75 DALL-E 3 images or 150 GPT Images.',
  },
}
