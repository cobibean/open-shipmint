import { Metadata } from 'next'
import { FAQAccordion } from '@/components/help/FAQAccordion'

export const metadata: Metadata = {
  title: 'Help & FAQ | ShipMint',
  description: 'Frequently asked questions about generating AI images and minting NFTs on Solana',
}

export default function HelpPage() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-600 text-transparent bg-clip-text">
            Help & FAQ
          </h1>
          <p className="text-xl text-gray-400">
            Everything you need to know about ShipMint
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <a
            href="#getting-started"
            className="p-6 border border-white/10 rounded-lg bg-black/20 backdrop-blur-sm hover:border-purple-500/50 hover:bg-white/5 transition-all"
          >
            <div className="text-2xl mb-2">🚀</div>
            <h3 className="font-semibold mb-1">Getting Started</h3>
            <p className="text-sm text-gray-400">Connect, buy credits, generate</p>
          </a>

          <a
            href="#credits-sol"
            className="p-6 border border-white/10 rounded-lg bg-black/20 backdrop-blur-sm hover:border-purple-500/50 hover:bg-white/5 transition-all"
          >
            <div className="text-2xl mb-2">💳</div>
            <h3 className="font-semibold mb-1">Credits & SOL</h3>
            <p className="text-sm text-gray-400">Understanding the dual currency</p>
          </a>

          <a
            href="#minting"
            className="p-6 border border-white/10 rounded-lg bg-black/20 backdrop-blur-sm hover:border-purple-500/50 hover:bg-white/5 transition-all"
          >
            <div className="text-2xl mb-2">💎</div>
            <h3 className="font-semibold mb-1">Minting NFTs</h3>
            <p className="text-sm text-gray-400">Turn art into forever ownership</p>
          </a>
        </div>

        {/* FAQ Accordion */}
        <FAQAccordion />

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <div className="p-8 border border-white/10 rounded-lg bg-black/20 backdrop-blur-sm">
            <h3 className="text-2xl font-bold mb-2">Still have questions?</h3>
            <p className="text-gray-400 mb-6">
              We&apos;re here to help. Reach out on Twitter or GitHub.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href="https://twitter.com/shipmint"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
              >
                Twitter
              </a>
              <a
                href="https://github.com/your-org/your-repo"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 border border-white/20 hover:bg-white/5 rounded-lg font-medium transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
