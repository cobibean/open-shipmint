'use client';

import { useCallback } from 'react';
import { useAuthenticatedFetch } from './useAuthenticatedFetch';
import { useAppStore } from '@/stores/appStore';
import { Generation } from '@/types';

export function useGeneration() {
  const authFetch = useAuthenticatedFetch();
  const {
    generationStatus,
    currentGeneration,
    generationError,
    selectedModelId,
    setGenerationStatus,
    setCurrentGeneration,
    setGenerationError,
    updateCreditBalance,
  } = useAppStore();

  const generate = useCallback(
    async (
      prompt: string,
      modelIdOverride?: string,
      referenceImage?: File | null
    ): Promise<Generation | null> => {
      setGenerationStatus('generating');
      setGenerationError(null);

      // Use override if provided, otherwise use selected model from store
      const modelId = modelIdOverride || selectedModelId;

      try {
        const requestInit: RequestInit = {
          method: 'POST',
        };

        if (referenceImage) {
          const formData = new FormData();
          formData.append('prompt', prompt);
          if (modelId) {
            formData.append('modelId', modelId);
          }
          formData.append('referenceImage', referenceImage);
          requestInit.body = formData;
        } else {
          requestInit.body = JSON.stringify({ prompt, modelId });
        }

        const response = await authFetch('/api/generate', requestInit);

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Generation failed');
        }

        const generation: Generation = {
          id: data.id,
          prompt: data.prompt,
          modelId: data.modelId,
          modelName: data.modelName,
          creditCost: data.creditCost,
          ipfsCid: data.ipfsCid || '',
          ipfsUrl: data.ipfsUrl,
          isMinted: false,
          mintedAt: null,
          nftAddress: null,
          mintTxHash: null,
          nftTitle: null,
          createdAt: data.createdAt,
        };

        setCurrentGeneration(generation);
        setGenerationStatus('complete');
        updateCreditBalance(data.newBalance);

        return generation;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Generation failed';
        setGenerationError(message);
        setGenerationStatus('error');
        return null;
      }
    },
    [authFetch, selectedModelId, setGenerationStatus, setCurrentGeneration, setGenerationError, updateCreditBalance]
  );

  const reset = useCallback(() => {
    setGenerationStatus('idle');
    setCurrentGeneration(null);
    setGenerationError(null);
  }, [setGenerationStatus, setCurrentGeneration, setGenerationError]);

  return {
    status: generationStatus,
    generation: currentGeneration,
    error: generationError,
    generate,
    reset,
  };
}
