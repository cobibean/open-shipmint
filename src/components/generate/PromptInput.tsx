'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  PROMPT_MAX_LENGTH,
  PROMPT_MIN_LENGTH,
  REFERENCE_IMAGE_ALLOWED_TYPES,
  REFERENCE_IMAGE_MAX_SIZE_BYTES,
} from '@/lib/constants';
import { cn } from '@/lib/utils';

interface Props {
  onSubmit: (prompt: string, referenceImage?: File | null) => void;
  onPromptChange?: (prompt: string) => void;
  onImageChange?: (file: File | null) => void;
  disabled?: boolean;
  supportsReferenceImage?: boolean;
}

export const PromptInput = ({
  onSubmit,
  onPromptChange,
  onImageChange,
  disabled,
  supportsReferenceImage = true,
}: Props) => {
  const [prompt, setPrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const charCount = prompt.length;
  const isValid = charCount >= PROMPT_MIN_LENGTH && charCount <= PROMPT_MAX_LENGTH;

  useEffect(() => {
    if (!supportsReferenceImage && referenceImage) {
      setReferenceImage(null);
      setImageError(null);
      onImageChange?.(null);
    }
  }, [supportsReferenceImage, referenceImage, onImageChange]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (isValid && !disabled) {
        onSubmit(prompt.trim(), referenceImage);
      }
    },
    [prompt, referenceImage, isValid, disabled, onSubmit]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (isValid && !disabled) {
          onSubmit(prompt.trim(), referenceImage);
        }
      }
    },
    [prompt, referenceImage, isValid, disabled, onSubmit]
  );

  const handlePromptChange = useCallback(
    (value: string) => {
      setPrompt(value);
      onPromptChange?.(value);
    },
    [onPromptChange]
  );

  const handleReferenceImageChange = useCallback(
    (file: File | null) => {
      if (!file) {
        setReferenceImage(null);
        setImageError(null);
        onImageChange?.(null);
        return;
      }

      if (!REFERENCE_IMAGE_ALLOWED_TYPES.includes(file.type as (typeof REFERENCE_IMAGE_ALLOWED_TYPES)[number])) {
        setImageError('Unsupported file type. Use PNG, JPG, or WEBP.');
        setReferenceImage(null);
        onImageChange?.(null);
        return;
      }

      if (file.size > REFERENCE_IMAGE_MAX_SIZE_BYTES) {
        setImageError('Image must be 4MB or smaller.');
        setReferenceImage(null);
        onImageChange?.(null);
        return;
      }

      setReferenceImage(file);
      setImageError(null);
      onImageChange?.(file);
    },
    [onImageChange]
  );

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => handlePromptChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe the image you want to create..."
          disabled={disabled}
          rows={3}
          className={cn(
            'w-full resize-none rounded-lg border bg-white/5 px-4 py-3 pr-16 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-500',
            disabled ? 'cursor-not-allowed opacity-50' : '',
            charCount > PROMPT_MAX_LENGTH ? 'border-red-500' : 'border-white/10'
          )}
        />
        <div
          className={cn(
            'absolute bottom-3 right-3 text-sm',
            charCount > PROMPT_MAX_LENGTH
              ? 'text-red-400'
              : charCount > PROMPT_MAX_LENGTH * 0.8
                ? 'text-yellow-400'
                : 'text-white/40'
          )}
        >
          {charCount}/{PROMPT_MAX_LENGTH}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <label
          className={cn(
            'inline-flex cursor-pointer items-center rounded-lg border px-3 py-2 text-sm transition-colors',
            disabled || !supportsReferenceImage
              ? 'cursor-not-allowed border-white/10 text-white/40'
              : 'border-white/20 text-white/80 hover:border-white/40 hover:text-white'
          )}
        >
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={disabled || !supportsReferenceImage}
            className="hidden"
            onChange={(e) => handleReferenceImageChange(e.target.files?.[0] || null)}
          />
          Attach Image
        </label>

        {referenceImage && (
          <>
            <span className="max-w-[220px] truncate text-sm text-white/70">
              {referenceImage.name}
            </span>
            <button
              type="button"
              onClick={() => handleReferenceImageChange(null)}
              className="text-sm text-red-400 hover:text-red-300"
            >
              Remove
            </button>
          </>
        )}
      </div>

      {!supportsReferenceImage && (
        <p className="mt-2 text-xs text-yellow-400">
          This model does not support image attachments.
        </p>
      )}

      {imageError && (
        <p className="mt-2 text-xs text-red-400">{imageError}</p>
      )}
    </form>
  );
};
