import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Generation, GalleryFilter, GenerationStatus, Model } from '@/types';

interface AppState {
  // Auth
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;

  // Models
  availableModels: Model[];
  selectedModelId: string | null;
  modelsLoading: boolean;

  // Generation
  generationStatus: GenerationStatus;
  currentGeneration: Generation | null;
  generationError: string | null;

  // Gallery
  galleryItems: Generation[];
  galleryFilter: GalleryFilter;
  galleryLoading: boolean;
  galleryHasMore: boolean;
  galleryCursor: string | null;

  // Actions
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  updateCreditBalance: (balance: number) => void;
  setAvailableModels: (models: Model[]) => void;
  setSelectedModelId: (modelId: string | null) => void;
  setModelsLoading: (loading: boolean) => void;
  setGenerationStatus: (status: GenerationStatus) => void;
  setCurrentGeneration: (generation: Generation | null) => void;
  setGenerationError: (error: string | null) => void;
  setGalleryItems: (items: Generation[]) => void;
  appendGalleryItems: (items: Generation[]) => void;
  setGalleryFilter: (filter: GalleryFilter) => void;
  setGalleryLoading: (loading: boolean) => void;
  setGalleryPagination: (hasMore: boolean, cursor: string | null) => void;
  updateGenerationMintStatus: (id: string, nftAddress: string, mintTxHash: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      token: null,
      user: null,
      isAuthenticated: false,

      availableModels: [],
      selectedModelId: null,
      modelsLoading: false,

      generationStatus: 'idle',
      currentGeneration: null,
      generationError: null,

      galleryItems: [],
      galleryFilter: 'all',
      galleryLoading: false,
      galleryHasMore: true,
      galleryCursor: null,

      // Actions
      setAuth: (token, user) =>
        set({ token, user, isAuthenticated: true }),

      clearAuth: () =>
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          galleryItems: [],
          currentGeneration: null,
        }),

      updateCreditBalance: (balance) =>
        set((state) => ({
          user: state.user ? { ...state.user, creditBalance: balance } : null,
        })),

      setAvailableModels: (models) =>
        set({ availableModels: models }),

      setSelectedModelId: (modelId) =>
        set({ selectedModelId: modelId }),

      setModelsLoading: (loading) =>
        set({ modelsLoading: loading }),

      setGenerationStatus: (status) =>
        set({ generationStatus: status }),

      setCurrentGeneration: (generation) =>
        set({ currentGeneration: generation }),

      setGenerationError: (error) =>
        set({ generationError: error }),

      setGalleryItems: (items) =>
        set({ galleryItems: items }),

      appendGalleryItems: (items) =>
        set((state) => ({ galleryItems: [...state.galleryItems, ...items] })),

      setGalleryFilter: (filter) =>
        set({ galleryFilter: filter, galleryItems: [], galleryCursor: null }),

      setGalleryLoading: (loading) =>
        set({ galleryLoading: loading }),

      setGalleryPagination: (hasMore, cursor) =>
        set({ galleryHasMore: hasMore, galleryCursor: cursor }),

      updateGenerationMintStatus: (id, nftAddress, mintTxHash) =>
        set((state) => ({
          galleryItems: state.galleryItems.map((item) =>
            item.id === id
              ? { ...item, isMinted: true, nftAddress, mintTxHash, mintedAt: new Date().toISOString() }
              : item
          ),
          currentGeneration:
            state.currentGeneration?.id === id
              ? { ...state.currentGeneration, isMinted: true, nftAddress, mintTxHash, mintedAt: new Date().toISOString() }
              : state.currentGeneration,
        })),
    }),
    {
      name: 'shipmint-storage',
      partialize: (state) => ({ 
        token: state.token, 
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        selectedModelId: state.selectedModelId 
      }),
    }
  )
);
