import { create } from 'zustand';

interface OnboardingStore {
  onboardingDone:    boolean;
  onboardingChecked: boolean;
  setOnboardingDone:    (val: boolean) => void;
  setOnboardingChecked: (val: boolean) => void;
}

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  onboardingDone:       false,
  onboardingChecked:    false,
  setOnboardingDone:    (val) => set({ onboardingDone: val }),
  setOnboardingChecked: (val) => set({ onboardingChecked: val }),
}));
