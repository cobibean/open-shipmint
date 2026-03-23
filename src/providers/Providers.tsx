'use client';

import { FC, ReactNode } from 'react';
import { WalletProvider } from './WalletProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { WelcomeModal } from '@/components/help/WelcomeModal';

interface Props {
  children: ReactNode;
}

export const Providers: FC<Props> = ({ children }) => {
  return (
    <ErrorBoundary>
      <WalletProvider>
        <ToastProvider>
          {children}
          <WelcomeModal />
        </ToastProvider>
      </WalletProvider>
    </ErrorBoundary>
  );
};
