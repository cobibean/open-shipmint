export const CREDIT_PACKS = [
  { id: 'test', name: 'Scout', credits: 2, usdPrice: 0.50 },
  { id: 'starter', name: 'Explorer', credits: 25, usdPrice: 5 },
  { id: 'builder', name: 'Captain', credits: 60, usdPrice: 10 },
  { id: 'pro', name: 'Admiral', credits: 400, usdPrice: 50 },
] as const;

// Note: MODELS constant has been removed.
// Model definitions and pricing are now stored in the database (GenerationModel table).
// Use the /api/models endpoint to fetch available models.
// Admin can update pricing via /api/admin/models endpoints.

// Use safe environment variable access for client-side compatibility
const getMintFee = () => {
  try {
    return Number(process.env.NEXT_PUBLIC_MINT_FEE_SOL) || 0.02;
  } catch {
    return 0.02;
  }
};

export const MINT_FEE_SOL = getMintFee();
export const PROMPT_MAX_LENGTH = 500;
export const PROMPT_MIN_LENGTH = 3;
export const GALLERY_PAGE_SIZE = 20;
export const GALLERY_MAX_PAGE_SIZE = 50;
export const NONCE_EXPIRY_MINUTES = 10;
export const REFERENCE_IMAGE_MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4MB
export const REFERENCE_IMAGE_ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;