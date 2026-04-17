import { useEffect, useRef, useState, useCallback } from 'react';
import { savePortfolio } from './session-manager';
import type { Portfolio } from '../types/portfolio';

const DEBOUNCE_MS = 2000;

export type SaveStatus = 'idle' | 'saving' | 'saved';

export function useAutoSave(slug: string | null, portfolio: Portfolio) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');

  // Manual save function
  const saveNow = useCallback(() => {
    if (!slug) return;
    const json = JSON.stringify(portfolio);
    if (json === lastSavedRef.current) return; // No changes
    setStatus('saving');
    savePortfolio(slug, portfolio);
    lastSavedRef.current = json;
    setStatus('saved');
  }, [slug, portfolio]);

  // Debounced auto-save on portfolio change
  useEffect(() => {
    if (!slug) return;

    // Skip the initial render (portfolio hasn't changed yet)
    const json = JSON.stringify(portfolio);
    if (json === lastSavedRef.current) return;

    // Clear previous timer
    if (timerRef.current) clearTimeout(timerRef.current);

    setStatus('saving');
    timerRef.current = setTimeout(() => {
      savePortfolio(slug, portfolio);
      lastSavedRef.current = json;
      setStatus('saved');

      // Reset to idle after 3s
      setTimeout(() => setStatus('idle'), 3000);
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [slug, portfolio]);

  // Save on page unload
  useEffect(() => {
    if (!slug) return;
    const handleBeforeUnload = () => {
      savePortfolio(slug, portfolio);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [slug, portfolio]);

  return { status, saveNow };
}
