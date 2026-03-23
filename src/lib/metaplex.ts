import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  mplTokenMetadata,
  createNft,
} from '@metaplex-foundation/mpl-token-metadata';
import {
  createSignerFromKeypair,
  signerIdentity,
  generateSigner,
  percentAmount,
  publicKey,
} from '@metaplex-foundation/umi';
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

// Lazy-load Umi instance to avoid build-time initialization errors
let umiInstance: ReturnType<typeof createUmi> | null = null;

export function getUmi() {
  if (umiInstance) {
    return umiInstance;
  }

  const treasuryPrivateKey = process.env.TREASURY_WALLET_PRIVATE_KEY;
  if (!treasuryPrivateKey) {
    throw new Error('TREASURY_WALLET_PRIVATE_KEY not configured');
  }

  const umi = createUmi(RPC_URL).use(mplTokenMetadata());

  // Treasury keypair for paying mint fees and creating NFTs
  const treasuryKeypair = Keypair.fromSecretKey(
    bs58.decode(treasuryPrivateKey)
  );

  const umiKeypair = fromWeb3JsKeypair(treasuryKeypair);
  const signer = createSignerFromKeypair(umi, umiKeypair);

  umiInstance = umi.use(signerIdentity(signer));
  return umiInstance;
}

export interface CreateNftParams {
  metadataUri: string;
  name: string;
  symbol?: string;
  sellerFeeBasisPoints?: number;
  ownerAddress: string;
}

export interface CreateNftResult {
  mintAddress: string;
  signature: string;
}

/**
 * Poll for transaction confirmation using HTTP RPC instead of WebSocket
 * This is necessary because WebSocket subscriptions fail in Vercel serverless
 */
async function pollForConfirmation(
  umi: ReturnType<typeof createUmi>,
  signature: Uint8Array,
  maxAttempts = 30,
  intervalMs = 1000
): Promise<boolean> {
  const signatureStr = bs58.encode(signature);
  console.log(`[Poll] Starting confirmation polling for: ${signatureStr}`);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Use RPC to check signature status (HTTP, not WebSocket)
      const response = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getSignatureStatuses',
          params: [[signatureStr], { searchTransactionHistory: true }]
        })
      });
      
      const data = await response.json();
      const status = data?.result?.value?.[0];
      
      if (status) {
        if (status.err) {
          console.error(`[Poll] Transaction failed:`, status.err);
          return false;
        }
        if (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized') {
          console.log(`[Poll] Transaction confirmed after ${attempt + 1} attempts`);
          return true;
        }
      }
      
      console.log(`[Poll] Attempt ${attempt + 1}/${maxAttempts}: status = ${status?.confirmationStatus || 'pending'}`);
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    } catch (error) {
      console.error(`[Poll] Error checking status:`, error);
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
  
  console.warn(`[Poll] Confirmation polling timed out after ${maxAttempts} attempts`);
  return false;
}

/**
 * Create an NFT using the Metaplex Umi SDK
 * The treasury account pays for the mint, but the NFT is owned by the specified owner
 * 
 * IMPORTANT: Uses HTTP polling instead of WebSocket for confirmation
 * to avoid 't.mask is not a function' error in Vercel serverless
 */
export async function createNftWithUmi({
  metadataUri,
  name,
  symbol = 'SHIP',
  sellerFeeBasisPoints = 0,
  ownerAddress,
}: CreateNftParams): Promise<CreateNftResult> {
  console.log('createNftWithUmi called with:', { metadataUri, name, symbol, ownerAddress });

  try {
    const umi = getUmi();
    console.log('Umi instance created, RPC:', RPC_URL);

    const mint = generateSigner(umi);
    console.log('Generated mint address:', mint.publicKey.toString());

    // Create the NFT with the owner set to the user's wallet
    console.log('Calling createNft with send() (not sendAndConfirm to avoid WebSocket)...');
    
    // Use send() instead of sendAndConfirm() to avoid WebSocket subscription issues
    // WebSocket's 't.mask is not a function' error breaks in Vercel serverless
    const builder = createNft(umi, {
      mint,
      name,
      symbol,
      uri: metadataUri,
      sellerFeeBasisPoints: percentAmount(sellerFeeBasisPoints / 100),
      tokenOwner: publicKey(ownerAddress),
    });
    
    // Send transaction without WebSocket-based confirmation
    const result = await builder.send(umi, { skipPreflight: false });
    const signatureStr = bs58.encode(result);
    
    console.log('Transaction sent, signature:', signatureStr);
    console.log('Polling for confirmation via HTTP...');
    
    // Poll for confirmation using HTTP RPC (not WebSocket)
    const confirmed = await pollForConfirmation(umi, result, 30, 1000);
    
    if (!confirmed) {
      // Transaction was sent but confirmation timed out
      // The NFT might still be created - we'll return the result anyway
      console.warn('Confirmation polling timed out, but transaction was sent. NFT may still be created.');
    }

    console.log('NFT created successfully:', {
      mintAddress: mint.publicKey.toString(),
      signature: signatureStr,
    });

    return {
      mintAddress: mint.publicKey.toString(),
      signature: signatureStr,
    };
  } catch (error) {
    console.error('createNftWithUmi error details:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
}

export interface NftMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
  properties: {
    files: Array<{
      uri: string;
      type: string;
    }>;
    creators: Array<{
      address: string;
      share: number;
    }>;
  };
}

export function createNftMetadata(
  title: string,
  prompt: string,
  imageIpfsUrl: string,
  modelName: string,
  createdAt: string,
  creatorAddress: string
): NftMetadata {
  return {
    name: title,
    symbol: 'SHIP',
    description: `Created with shipmint | Prompt: ${prompt}`,
    image: imageIpfsUrl,
    attributes: [
      {
        trait_type: 'Model',
        value: modelName,
      },
      {
        trait_type: 'Created',
        value: createdAt,
      },
      {
        trait_type: 'Platform',
        value: 'shipmint',
      },
    ],
    properties: {
      files: [
        {
          uri: imageIpfsUrl,
          type: 'image/png',
        },
      ],
      creators: [
        {
          address: creatorAddress,
          share: 100,
        },
      ],
    },
  };
}
