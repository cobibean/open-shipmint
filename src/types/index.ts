export interface User {
  id: string;
  walletAddress: string;
  creditBalance: number;
}

export interface Generation {
  id: string;
  prompt: string;
  modelId: string;
  modelName: string;
  creditCost: number;
  ipfsCid: string;
  ipfsUrl: string;
  isMinted: boolean;
  mintedAt: string | null;
  nftAddress: string | null;
  mintTxHash: string | null;
  nftTitle: string | null;
  createdAt: string;
}

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  usdPrice: number;
  solPrice: number;
}

export interface Model {
  id: string;
  displayName: string;
  creditCost: number;
  isDefault: boolean;
  supportsReferenceImage: boolean;
}

export type GalleryFilter = 'all' | 'generated' | 'minted';

export type GenerationStatus = 'idle' | 'generating' | 'complete' | 'error';
