'use client';

import { motion } from 'framer-motion';
import { GalleryFilter } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  filter: GalleryFilter;
  onChange: (filter: GalleryFilter) => void;
}

const filters: { id: GalleryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'generated', label: 'Generated' },
  { id: 'minted', label: 'Minted' },
];

export const GalleryFilters = ({ filter, onChange }: Props) => {
  return (
    <div className="flex gap-2">
      {filters.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            'relative rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            filter === id
              ? 'text-white'
              : 'text-white/60 hover:text-white/80'
          )}
        >
          {filter === id && (
            <motion.div
              layoutId="activeFilter"
              className="absolute inset-0 rounded-lg bg-white/10"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
            />
          )}
          <span className="relative z-10">{label}</span>
        </button>
      ))}
    </div>
  );
};
