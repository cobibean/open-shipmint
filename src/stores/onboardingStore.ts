import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface OnboardingStore {
  hasSeenWelcome: boolean
  setHasSeenWelcome: (seen: boolean) => void
}

export const useOnboarding = create<OnboardingStore>()(
  persist(
    (set) => ({
      hasSeenWelcome: false,
      setHasSeenWelcome: (seen) => set({ hasSeenWelcome: seen }),
    }),
    {
      name: 'shipmint-onboarding',
    }
  )
)
