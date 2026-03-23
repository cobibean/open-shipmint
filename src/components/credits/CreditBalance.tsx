'use client';

import { useCredits } from '@/hooks/useCredits';
import { cn } from '@/lib/utils';

interface Props {
  onClick?: () => void;
}

export const CreditBalance = ({ onClick }: Props) => {
  const { balance } = useCredits();

  const balanceColor =
    balance === 0
      ? 'text-red-400'
      : balance <= 5
        ? 'text-yellow-400'
        : 'text-white';

  const getMessage = () => {
    if (balance === 0) return 'Out of credits'
    if (balance <= 5) return 'Low balance'
    return `${balance} credits`
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 transition-colors hover:bg-white/10"
      title={balance === 0 ? 'Buy credits to generate' : balance <= 5 ? 'Consider restocking' : 'Click to buy more'}
    >
      <svg
        className="h-4 w-4 text-yellow-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span className={cn('font-medium', balanceColor)}>{getMessage()}</span>
    </button>
  );
};
