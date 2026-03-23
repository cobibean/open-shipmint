'use client';

import { useCallback } from 'react';
import { useAppStore } from '@/stores/appStore';

export function useAuthenticatedFetch() {
  const token = useAppStore((state) => state.token);

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers);

      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

      if (!headers.has('Content-Type') && options.body && !isFormData) {
        headers.set('Content-Type', 'application/json');
      }

      const response = await fetch(url, { ...options, headers });

      if (response.status === 401) {
        useAppStore.getState().clearAuth();
        throw new Error('Authentication expired');
      }

      return response;
    },
    [token]
  );

  return authFetch;
}
