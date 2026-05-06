// src/storage/onboardingStorage.ts
//
// Persistance simple de la complétion de l'onboarding.

const KEY = 'debt-city.onboarding.completedAt';

export const isOnboardingDone = (): boolean =>
  typeof window !== 'undefined' && localStorage.getItem(KEY) !== null;

export const markOnboardingDone = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, new Date().toISOString());
};

export const resetOnboarding = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
};

export const getOnboardingCompletedAt = (): Date | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(KEY);
  return raw ? new Date(raw) : null;
};
