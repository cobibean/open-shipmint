import OpenAI, { toFile } from 'openai';

// Lazy-load the OpenAI client to avoid initialization during build
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export interface GenerationResult {
  imageUrl?: string;
  imageBuffer?: Buffer;
  revisedPrompt: string;
}

export interface ReferenceImageInput {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

const REFERENCE_IMAGE_SUPPORTED_MODELS = new Set([
  'gpt-image-1',
  'gpt-image-1-mini',
  'gpt-image-1.5',
  'dall-e-2',
]);

export function supportsReferenceImage(providerModelId: string): boolean {
  return REFERENCE_IMAGE_SUPPORTED_MODELS.has(providerModelId);
}

// Custom error for content moderation blocks
export class ModerationError extends Error {
  constructor(message: string = 'Your prompt was flagged by content moderation. Please try a different prompt.') {
    super(message);
    this.name = 'ModerationError';
  }
}

function isModerationBlockedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  if ('code' in error) {
    const code = String((error as { code?: unknown }).code || '');
    if (code === 'moderation_blocked' || code === 'content_policy_violation') {
      return true;
    }
  }

  if ('message' in error) {
    const message = String((error as { message?: unknown }).message || '').toLowerCase();
    if (message.includes('content policy') || message.includes('moderation')) {
      return true;
    }
  }

  return false;
}

/**
 * Generate an image using OpenAI's image generation API
 * @param prompt - The text prompt to generate an image from
 * @param providerModelId - The OpenAI model ID (e.g., 'dall-e-3', 'gpt-image-1', 'dall-e-2')
 */
export async function generateImage(
  prompt: string,
  providerModelId: string = 'dall-e-3',
  referenceImage?: ReferenceImageInput
): Promise<GenerationResult> {
  const openai = getOpenAIClient();

  let response;
  try {
    if (referenceImage) {
      if (!supportsReferenceImage(providerModelId)) {
        throw new Error(`Model "${providerModelId}" does not support reference images`);
      }

      const imageFile = await toFile(referenceImage.buffer, referenceImage.fileName, {
        type: referenceImage.mimeType,
      });

      const editRequest: Record<string, unknown> = {
        model: providerModelId,
        prompt,
        image: imageFile,
        n: 1,
        size: '1024x1024',
      };

      if (providerModelId === 'dall-e-2') {
        editRequest.quality = 'standard';
        editRequest.response_format = 'b64_json';
      } else {
        editRequest.quality = 'auto';
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response = await openai.images.edit(editRequest as any);
    } else {
      // Build request with model-specific options
      const request: Record<string, unknown> = {
        model: providerModelId,
        prompt,
        n: 1,
        size: '1024x1024',
      };

      // DALL-E models support base64 response format and 'standard'/'hd' quality
      if (providerModelId.startsWith('dall-e')) {
        request.quality = 'standard';
        request.response_format = 'b64_json';
      } else {
        // GPT image models use a different quality enum (high/medium/low/auto)
        // and return base64 by default
        request.quality = 'auto';
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response = await openai.images.generate(request as any);
    }
  } catch (error) {
    if (isModerationBlockedError(error)) {
      throw new ModerationError();
    }

    throw error;
  }

  const image = response.data?.[0] as {
    b64_json?: string;
    url?: string;
    revised_prompt?: string;
  } | undefined;

  if (!image) {
    throw new Error('No image in response');
  }

  if (typeof image.b64_json === 'string' && image.b64_json.length > 0) {
    return {
      imageBuffer: Buffer.from(image.b64_json, 'base64'),
      revisedPrompt: typeof image.revised_prompt === 'string' ? image.revised_prompt : prompt,
    };
  }

  if (typeof image.url === 'string' && image.url.length > 0) {
    return {
      imageUrl: image.url,
      revisedPrompt: typeof image.revised_prompt === 'string' ? image.revised_prompt : prompt,
    };
  }

  throw new Error('No image data in response');
}

export async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to download image');
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
