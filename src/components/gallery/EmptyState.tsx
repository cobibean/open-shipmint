'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { GalleryFilter } from '@/types';

interface Props {
  filter: GalleryFilter;
}

export const EmptyState = ({ filter }: Props) => {
  const getMessage = () => {
    switch (filter) {
      case 'minted':
        return {
          title: 'No minted NFTs yet',
          description: "You haven't minted any NFTs yet. Generate images and mint your favorites.",
          action: {
            label: 'View All Generations',
            href: '/gallery',
          },
        };
      case 'generated':
        return {
          title: 'All minted!',
          description: "All your generations are minted! Create more images to expand your collection.",
          action: {
            label: 'Generate More',
            href: '/generate',
          },
        };
      default:
        return {
          title: 'No images yet',
          description: 'Head to Generate to create your first one.',
          action: {
            label: 'Start Generating',
            href: '/generate',
          },
        };
    }
  };

  const { title, description, action } = getMessage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
        <svg
          className="h-10 w-10 text-white/40"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
      <h3 className="mb-2 text-xl font-semibold text-white">{title}</h3>
      <p className="mb-6 max-w-sm text-white/60">{description}</p>
      <Link
        href={action.href}
        className="rounded-lg bg-yellow-600 px-6 py-3 font-medium text-white transition-colors hover:bg-yellow-700"
      >
        {action.label}
      </Link>
    </motion.div>
  );
};
