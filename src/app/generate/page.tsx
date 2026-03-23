'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useCredits } from '@/hooks/useCredits';
import { useGeneration } from '@/hooks/useGeneration';
import { PromptInput } from '@/components/generate/PromptInput';
import { GenerateButton } from '@/components/generate/GenerateButton';
import { ImageDisplay } from '@/components/generate/ImageDisplay';
import { ModelSelector } from '@/components/generate/ModelSelector';
import { PurchaseModal } from '@/components/credits/PurchaseModal';
import { MintModal } from '@/components/mint/MintModal';
import { useAppStore } from '@/stores/appStore';

export default function GeneratePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { balance } = useCredits();
  const { status, generation, error, generate, reset } = useGeneration();
  const { availableModels, selectedModelId } = useAppStore();

  const [prompt, setPrompt] = useState('');
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showMintModal, setShowMintModal] = useState(false);

  // Get credit cost from selected model
  const selectedModel = availableModels.find((m) => m.id === selectedModelId);
  const creditCost = selectedModel?.creditCost ?? 1;
  const insufficientCredits = balance < creditCost;
  const supportsReferenceImage = selectedModel?.supportsReferenceImage ?? true;
  const attachmentUnsupported = Boolean(attachedImage && !supportsReferenceImage);

  const handleGenerate = useCallback(async () => {
    if (insufficientCredits) {
      setShowPurchaseModal(true);
      return;
    }

    if (attachmentUnsupported) {
      return;
    }

    if (prompt.trim()) {
      await generate(prompt, undefined, attachedImage);
    }
  }, [prompt, attachedImage, insufficientCredits, attachmentUnsupported, generate]);

  const handlePromptSubmit = useCallback(
    (submittedPrompt: string, submittedImage?: File | null) => {
      setPrompt(submittedPrompt);
      setAttachedImage(submittedImage || null);
      if (!insufficientCredits) {
        if (!submittedImage || supportsReferenceImage) {
          generate(submittedPrompt, undefined, submittedImage || null);
        }
      } else {
        setShowPurchaseModal(true);
      }
    },
    [insufficientCredits, supportsReferenceImage, generate]
  );

  const handleMint = useCallback(() => {
    if (generation) {
      setShowMintModal(true);
    }
  }, [generation]);

  const handleMintSuccess = useCallback(() => {
    setShowMintModal(false);
    router.push('/gallery');
  }, [router]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-8"
      >
        <h1 className="text-2xl font-bold">Generate Image</h1>

        {/* Image display */}
        <ImageDisplay
          status={status}
          generation={generation}
          error={error}
          onMint={handleMint}
        />

        {/* Model selector */}
        <div className="w-full">
          <ModelSelector disabled={status === 'generating'} />
        </div>

        {/* Prompt input */}
        <div className="w-full">
          <PromptInput
            onSubmit={handlePromptSubmit}
            onPromptChange={setPrompt}
            onImageChange={setAttachedImage}
            disabled={status === 'generating'}
            supportsReferenceImage={supportsReferenceImage}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-4">
          <GenerateButton
            onClick={handleGenerate}
            disabled={!prompt.trim() || status === 'generating' || attachmentUnsupported}
            loading={status === 'generating'}
            insufficientCredits={insufficientCredits}
            creditCost={creditCost}
          />

          {status === 'complete' && generation && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleMint}
              className="rounded-lg border border-yellow-500 px-6 py-3 font-medium text-yellow-400 transition-colors hover:bg-yellow-500/10"
            >
              Mint as 1/1
            </motion.button>
          )}

          {(status === 'complete' || status === 'error') && (
            <button
              onClick={reset}
              className="rounded-lg border border-white/20 px-6 py-3 font-medium text-white/70 transition-colors hover:bg-white/5"
            >
              New Image
            </button>
          )}
        </div>

        {/* Low balance warning */}
        {balance > 0 && balance <= 3 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-yellow-400"
          >
            Low credits remaining.{' '}
            <button
              onClick={() => setShowPurchaseModal(true)}
              className="underline hover:no-underline"
            >
              Buy more
            </button>
          </motion.p>
        )}

        {attachmentUnsupported && (
          <p className="text-sm text-yellow-400">
            Select GPT Image or DALL-E 2 to use image attachments.
          </p>
        )}
      </motion.div>

      {/* Modals */}
      <PurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
      />

      {generation && (
        <MintModal
          isOpen={showMintModal}
          onClose={() => setShowMintModal(false)}
          generation={generation}
          onSuccess={handleMintSuccess}
        />
      )}
    </div>
  );
}
