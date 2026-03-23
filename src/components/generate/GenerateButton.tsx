'use client';

import { cn } from '@/lib/utils';

interface Props {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  insufficientCredits?: boolean;
  creditCost?: number;
}

export const GenerateButton = ({
  onClick,
  disabled,
  loading,
  insufficientCredits,
  creditCost = 1,
}: Props) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-medium transition-all',
        disabled || loading
          ? 'cursor-not-allowed bg-white/10 text-white/50'
          : 'bg-yellow-600 hover:bg-yellow-700 active:scale-[0.98]'
      )}
    >
      {loading ? (
        <>
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          <span>Generating...</span>
        </>
      ) : insufficientCredits ? (
        <span>Insufficient Credits</span>
      ) : (
        <>
          <span>Generate</span>
          <span className="rounded bg-white/20 px-2 py-0.5 text-sm">
            {creditCost} credit{creditCost > 1 ? 's' : ''}
          </span>
        </>
      )}
    </button>
  );
};
