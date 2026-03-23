import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';
import {
  generateImage,
  downloadImage,
  ModerationError,
  supportsReferenceImage,
} from '@/lib/openai';
import { uploadImageToPinata } from '@/lib/pinata';
import { getModelById, getDefaultModel } from '@/lib/modelService';
import {
  PROMPT_MIN_LENGTH,
  PROMPT_MAX_LENGTH,
  REFERENCE_IMAGE_ALLOWED_TYPES,
  REFERENCE_IMAGE_MAX_SIZE_BYTES,
} from '@/lib/constants';

interface ParsedGenerationRequest {
  prompt: unknown;
  modelId?: string;
  referenceImage?: File;
}

async function parseGenerationRequest(req: AuthenticatedRequest): Promise<ParsedGenerationRequest> {
  const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const prompt = formData.get('prompt');
    const modelIdValue = formData.get('modelId');
    const referenceImageValue = formData.get('referenceImage');

    return {
      prompt,
      modelId:
        typeof modelIdValue === 'string' && modelIdValue.trim().length > 0
          ? modelIdValue
          : undefined,
      referenceImage:
        referenceImageValue instanceof File && referenceImageValue.size > 0
          ? referenceImageValue
          : undefined,
    };
  }

  const payload = await req.json();
  return {
    prompt: payload.prompt,
    modelId: payload.modelId,
  };
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const { prompt, modelId, referenceImage } = await parseGenerationRequest(req);

      // Validate prompt
      if (!prompt || typeof prompt !== 'string') {
        return NextResponse.json({ error: 'Prompt required' }, { status: 400 });
      }

      const trimmedPrompt = prompt.trim();

      if (trimmedPrompt.length < PROMPT_MIN_LENGTH) {
        return NextResponse.json(
          { error: `Prompt must be at least ${PROMPT_MIN_LENGTH} characters` },
          { status: 400 }
        );
      }

      if (trimmedPrompt.length > PROMPT_MAX_LENGTH) {
        return NextResponse.json(
          { error: `Prompt must be less than ${PROMPT_MAX_LENGTH} characters` },
          { status: 400 }
        );
      }

      if (referenceImage) {
        if (!REFERENCE_IMAGE_ALLOWED_TYPES.includes(referenceImage.type as (typeof REFERENCE_IMAGE_ALLOWED_TYPES)[number])) {
          return NextResponse.json(
            {
              error: `Unsupported image type. Allowed: ${REFERENCE_IMAGE_ALLOWED_TYPES.join(', ')}`,
            },
            { status: 400 }
          );
        }

        if (referenceImage.size > REFERENCE_IMAGE_MAX_SIZE_BYTES) {
          return NextResponse.json(
            {
              error: `Reference image must be ${Math.floor(REFERENCE_IMAGE_MAX_SIZE_BYTES / (1024 * 1024))}MB or smaller`,
            },
            { status: 400 }
          );
        }
      }

      // Get model from database
      let model;
      if (modelId) {
        model = await getModelById(modelId);
        if (!model) {
          return NextResponse.json({ error: 'Model not found' }, { status: 400 });
        }
        if (!model.isActive) {
          return NextResponse.json(
            { error: 'This model is no longer available. Please select a different model.' },
            { status: 400 }
          );
        }
      } else {
        // No model specified, use default
        model = await getDefaultModel();
        if (!model) {
          return NextResponse.json(
            { error: 'No models available' },
            { status: 500 }
          );
        }
      }

      if (referenceImage && !supportsReferenceImage(model.providerModelId)) {
        return NextResponse.json(
          {
            error:
              `Selected model (${model.displayName}) does not support reference images. ` +
              'Choose GPT Image or DALL-E 2, or remove the attachment.',
          },
          { status: 400 }
        );
      }

      // Check credits using creditCost from database
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { creditBalance: true },
      });

      if (!user || user.creditBalance < model.creditCost) {
        return NextResponse.json(
          { error: 'Insufficient credits' },
          { status: 402 }
        );
      }

      // Deduct credits BEFORE generation
      await prisma.user.update({
        where: { id: req.user.id },
        data: { creditBalance: { decrement: model.creditCost } },
      });

      let generation;

      try {
        const referenceImageInput = referenceImage
          ? {
              buffer: Buffer.from(await referenceImage.arrayBuffer()),
              mimeType: referenceImage.type,
              fileName: referenceImage.name || 'reference-image',
            }
          : undefined;

        // Generate image using providerModelId from database
        const result = await generateImage(
          trimmedPrompt,
          model.providerModelId,
          referenceImageInput
        );

        // Get image bytes (prefer base64 responses; fall back to downloading a URL if needed)
        const imageBuffer =
          result.imageBuffer ??
          (result.imageUrl ? await downloadImage(result.imageUrl) : null);

        if (!imageBuffer) {
          throw new Error('No image data returned from OpenAI');
        }

        // Upload to IPFS
        const fileName = `shipmint-${Date.now()}.png`;
        const ipfsResult = await uploadImageToPinata(imageBuffer, fileName);

        // Save to database with model info from DB
        generation = await prisma.generation.create({
          data: {
            userId: req.user.id,
            prompt: trimmedPrompt,
            modelId: model.id,
            modelName: model.displayName,
            creditCost: model.creditCost,
            ipfsCid: ipfsResult.cid,
            ipfsUrl: ipfsResult.gatewayUrl,
          },
        });
      } catch (genError) {
        // Refund credits on failure
        await prisma.user.update({
          where: { id: req.user.id },
          data: { creditBalance: { increment: model.creditCost } },
        });

        // Handle content moderation errors (user's fault, not server error)
        if (genError instanceof ModerationError) {
          return NextResponse.json(
            { error: genError.message, code: 'moderation_blocked' },
            { status: 400 }
          );
        }

        console.error('Generation error:', genError);
        return NextResponse.json(
          { error: 'Image generation failed. Credits have been refunded.' },
          { status: 500 }
        );
      }

      // Get updated balance
      const updatedUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { creditBalance: true },
      });

      return NextResponse.json({
        id: generation.id,
        status: 'complete',
        prompt: generation.prompt,
        modelId: generation.modelId,
        modelName: generation.modelName,
        ipfsUrl: generation.ipfsUrl,
        creditCost: generation.creditCost,
        createdAt: generation.createdAt.toISOString(),
        newBalance: updatedUser?.creditBalance ?? 0,
      });
    } catch (error) {
      console.error('Generation error:', error);
      return NextResponse.json(
        { error: 'Generation failed' },
        { status: 500 }
      );
    }
  });
}
