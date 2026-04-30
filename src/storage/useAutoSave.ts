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

  // Debounced auto-save on portfolio change.
  // PERF — JSON.stringify is deferred inside the setTimeout. With 50+ deals, the
  // serialised portfolio is heavy (5-50ms). We don't want to pay that cost on every
  // dispatch; only when the timer actually fires (after 2s of idle). The reference
  // change of `portfolio` is enough signal that something *might* have changed —
  // the in-timer string equality guard catches the rare false positives.
  useEffect(() => {
    if (!slug) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    setStatus('saving');
    timerRef.current = setTimeout(() => {
      const json = JSON.stringify(portfolio);
      if (json !== lastSavedRef.current) {
        savePortfolio(slug, portfolio);
        lastSavedRef.current = json;
      }
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
