# Open ShipMint

The first app shipped through [ShipYard](https://web3matters.xyz) — now open source so you can build one yourself.

ShipMint lets users buy credits with SOL, generate AI images with DALL-E 3, and mint their favorites as 1/1 NFTs on Solana mainnet. This repo is the sanitized public release that backs the **free ShipYard vibe coding course** at [web3matters.xyz](https://web3matters.xyz).

---

## What you'll learn

The free course walks you through three steps:

1. **Intro** — what ShipMint is, what ShipYard is, and why this approach works
2. **Clone and run** — get the app running locally in under 30 minutes
3. **Restyle with AI** — use the included prompts to make it your own

If you can finish those three steps, you can ship a real app.

---

## Stack

- **Next.js 14** App Router
- **Tailwind CSS** + Framer Motion
- **Prisma** + PostgreSQL (Supabase recommended)
- **Zustand** for client state persistence
- **Wallet-based auth** — signed messages + JWT
- **OpenAI DALL-E 3** for image generation
- **Pinata** for IPFS storage
- **Solana mainnet-beta** NFT minting

---

## Prerequisites

- Node.js 18+
- A PostgreSQL database (Supabase free tier works)
- A [Helius](https://www.helius.dev/) API key (free) — required for reliable Solana RPC
- An [OpenAI](https://platform.openai.com/) API key for image generation
- A [Pinata](https://pinata.cloud/) account for IPFS storage

---

## Setup

**1. Clone the repo**

```bash
git clone https://github.com/cobibean/open-shipmint.git
cd open-shipmint
```

**2. Install dependencies**

```bash
npm install
```

**3. Configure environment variables**

```bash
cp .env.example .env
```

Open `.env` and fill in your values. Required fields:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Supabase → Project Settings → Database |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | [helius.dev](https://www.helius.dev/) |
| `NEXT_PUBLIC_TREASURY_WALLET_ADDRESS` | Your Solana wallet public key |
| `JWT_SECRET` | Any random 32+ character string |
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com/) |
| `PINATA_JWT` | [pinata.cloud](https://pinata.cloud/) → API Keys |

> **Important:** Do not use the public Solana mainnet RPC. Transactions won't land reliably. Use Helius.

**4. Generate Prisma client**

```bash
npx prisma generate
```

**5. Run the app**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment notes

- Use `.env` only — do not create `.env.local`
- Restart the dev server after changing any `NEXT_PUBLIC_*` variable
- Set `ADMIN_API_KEY` if you want the admin swap stats endpoint enabled

---

## Available scripts

```bash
npm run dev        # Start local dev server
npm run build      # Build for production
npm run start      # Run production server
npm run test       # Run Vitest test suite
```

---

## Part of ShipYard

ShipMint is the first app shipped through [ShipYard](https://web3matters.xyz) — a build-in-public machine where real apps get built live on stream, then released as open-source learning resources.

The free vibe coding course is available at **[web3matters.xyz](https://web3matters.xyz)**.

---

## License

[MIT](./LICENSE)
