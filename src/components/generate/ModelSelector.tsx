'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/stores/appStore';
import { Model } from '@/types';
import { Tooltip } from '@/components/help/Tooltip';

interface ModelSelectorProps {
  disabled?: boolean;
}

export function ModelSelector({ disabled = false }: ModelSelectorProps) {
  const {
    availableModels,
    selectedModelId,
    modelsLoading,
    setAvailableModels,
    setSelectedModelId,
    setModelsLoading,
  } = useAppStore();

  // Fetch models on mount
  useEffect(() => {
    async function fetchModels() {
      setModelsLoading(true);
      try {
        const response = await fetch('/api/models');
        const data = await response.json();

        if (response.ok && data.models) {
          setAvailableModels(data.models);

          // If no model selected, select the default one
          if (!selectedModelId) {
            const defaultModel = data.models.find((m: Model) => m.isDefault);
            if (defaultModel) {
              setSelectedModelId(defaultModel.id);
            } else if (data.models.length > 0) {
              setSelectedModelId(data.models[0].id);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch models:', error);
      } finally {
        setModelsLoading(false);
      }
    }

    fetchModels();
  }, [setAvailableModels, setSelectedModelId, setModelsLoading, selectedModelId]);

  const selectedModel = availableModels.find((m) => m.id === selectedModelId);

  if (modelsLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-white/50">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
        Loading models...
      </div>
    );
  }

  if (availableModels.length === 0) {
    return (
      <div className="text-sm text-red-400">
        No models available
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-white/70">
        AI Model
        <Tooltip content="Different models cost different amounts of credits. DALL-E 3 is highest quality but costs more." />
      </label>
      <div className="relative">
        <select
          value={selectedModelId || ''}
          onChange={(e) => setSelectedModelId(e.target.value)}
          disabled={disabled}
          className="w-full appearance-none rounded-lg border border-white/10 bg-white/5 px-4 py-3 pr-10 text-white transition-colors focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {availableModels.map((model) => (
            <option key={model.id} value={model.id} className="bg-gray-900">
              {model.displayName} — {model.creditCost} credit{model.creditCost !== 1 ? 's' : ''}
              {model.isDefault ? ' (default)' : ''}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <svg
            className="h-5 w-5 text-white/50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
      {selectedModel && (
        <p className="mt-2 text-sm text-white/50">
          Cost: <span className="font-medium text-yellow-400">{selectedModel.creditCost} credit{selectedModel.creditCost !== 1 ? 's' : ''}</span> per generation
        </p>
      )}
    </motion.div>
  );
}
