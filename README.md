# ShipMint

ShipMint is a Next.js app for buying credits with SOL, generating AI images, minting favorites as 1/1 Solana NFTs, and browsing a private gallery.

This copy was prepared as a sanitized public export. It excludes private environment files, internal planning docs, and repo-specific agent metadata.

## Stack

- Next.js 14 App Router
- Tailwind CSS + Framer Motion
- Prisma + PostgreSQL
- Zustand persistence
- Wallet-based auth with signed messages + JWT
- OpenAI image generation
- Pinata IPFS storage
- Solana mainnet-beta NFT minting

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template and fill in your own values:

```bash
cp .env.example .env
```

3. Generate Prisma client:

```bash
npx prisma generate
```

4. Run the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Notes

- Use `.env` only. Do not create `.env.local`.
- Restart the dev server after changing any `NEXT_PUBLIC_*` variable.
- Do not rely on the public Solana mainnet RPC for transaction landing. Use a provider such as Helius.
- Set `ADMIN_API_KEY` if you want the admin swap stats endpoint enabled.

## Scripts

- `npm run dev` starts the local dev server
- `npm run build` builds the production app
- `npm run start` runs the production server
- `npm run test` runs the Vitest suite

## Before Publishing

- Choose and add a real `LICENSE` file.
- Replace the placeholder GitHub URL in `src/app/help/page.tsx`.
- Review whether you want to keep the ShipMint brand assets and social links as-is.
- Add your own deployment environment variables in Vercel or your host.
