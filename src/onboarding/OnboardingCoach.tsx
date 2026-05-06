import React, { useEffect, useRef, useState } from 'react';
import { Mayor } from '../components/Mayor';
import type { MayorMood } from '../components/Mayor';
import { tokens } from '../styles/tokens';
import { markOnboardingDone } from '../storage/onboardingStorage';
import { mayorLines } from '../content/mayorDialogue';

/**
 * OnboardingCoach — overlay coach-mark guidé par le Maire.
 *
 * Usage :
 *   <OnboardingCoach
 *     steps={onboardingSteps}
 *     onClose={() => setShowOnboarding(false)}
 *   />
 *
 * Chaque étape pointe une zone de l'app via un targetRef. L'overlay
 * dimme tout sauf la zone ciblée (spotlight), et place le Maire +
 * une bulle à côté.
 */

export interface OnboardingStep {
  /** Si présent, refs vers une zone à spotlight. Sinon : étape centrée. */
  targetRef?: React.RefObject<HTMLElement>;
  title: string;
  body: React.ReactNode;
  mood: MayorMood;
  /** Position du Maire (CSS positioning). */
  mayorPos: React.CSSProperties;
  /** Position de la bulle (CSS positioning). */
  bubblePos: React.CSSProperties;
  /** Direction de la queue de la bulle. */
  tail: 'left' | 'right' | 'top' | 'bottom';
}

export interface OnboardingCoachProps {
  steps: OnboardingStep[];
  onClose?: () => void;
  onComplete?: () => void;
}

interface HoleRect { left: number; top: number; width: number; height: number; }

export const OnboardingCoach: React.FC<OnboardingCoachProps> = ({ steps, onClose, onComplete }) => {
  const [step, setStep] = useState(0);
  const [holeRect, setHoleRect] = useState<HoleRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const current = steps[step];

  // Recompute spotlight rect on step change + window resize
  useEffect(() => {
    const compute = () => {
      if (!current?.targetRef?.current || !overlayRef.current) {
        setHoleRect(null);
        return;
      }
      const t = current.targetRef.current.getBoundingClientRect();
      const o = overlayRef.current.getBoundingClientRect();
      setHoleRect({
        left: t.left - o.left + 4,
        top: t.top - o.top + 4,
        width: t.width - 8,
        height: t.height - 8,
      });
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [step, current]);

  const handleNext = () => {
    if (step === steps.length - 1) {
      markOnboardingDone();
      onComplete?.();
      onClose?.();
    } else {
      setStep(step + 1);
    }
  };

  const handleSkip = () => {
    markOnboardingDone();
    onClose?.();
  };

  const isLast = step === steps.length - 1;

  return (
    <div ref={overlayRef} style={{ position: 'fixed', inset: 0, zIndex: 1000, pointerEvents: 'none' }}>
      {/*
        Dim layer.
        — When a spotlight is active, we let the spotlight's giant box-shadow
          (`0 0 0 9999px rgba(...)`) act as the dim, so the cut-out zone is
          fully sharp/clear. Adding another full-screen overlay underneath
          (especially with backdrop-filter blur) would re-blur the spotlit
          region too — that was the original bug.
        — When no spotlight (centred steps without targetRef), we render a
          plain dim overlay so the form/dialog is still highlighted.
      */}
      {!holeRect && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(14, 11, 26, 0.72)',
        }} />
      )}

      {/* Spotlight — also doubles as the dim layer (no blur, sharp cut-out) */}
      {holeRect && (
        <div style={{
          position: 'absolute',
          left: holeRect.left, top: holeRect.top,
          width: holeRect.width, height: holeRect.height,
          borderRadius: 16,
          boxShadow: `
            0 0 0 9999px rgba(14, 11, 26, 0.72),
            0 0 0 3px ${tokens.color.citizen},
            0 0 40px rgba(255, 192, 58, 0.4)
          `,
          transition: 'all 0.4s cubic-bezier(0.5, 0, 0.2, 1)',
        }} />
      )}

      {/* Le Maire */}
      <div style={{
        position: 'absolute',
        transition: 'all 0.4s cubic-bezier(0.5, 0, 0.2, 1)',
        pointerEvents: 'none',
        ...current.mayorPos,
      }}>
        <Mayor size={180} mood={current.mood} />
      </div>

      {/* Bulle */}
      <div style={{
        position: 'absolute',
        background: tokens.color.surfaceHi,
        border: `1px solid ${tokens.color.hairline2}`,
        borderRadius: 20,
        padding: '24px 28px',
        width: 360,
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
        pointerEvents: 'auto',
        fontFamily: tokens.font.ui,
        color: tokens.color.text,
        transition: 'all 0.4s cubic-bezier(0.5, 0, 0.2, 1)',
        ...current.bubblePos,
      }}>
        <div style={{
          fontFamily: tokens.font.mono,
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: tokens.color.citizen,
          marginBottom: 8,
        }}>
          LE MAIRE · ÉTAPE {step + 1} / {steps.length}
        </div>
        <div style={{
          fontFamily: tokens.font.display,
          fontWeight: 800,
          fontSize: 26,
          letterSpacing: '-0.02em',
          lineHeight: 1.05,
          marginBottom: 12,
        }}>
          {current.title}
        </div>
        <div style={{ fontSize: 14, color: tokens.color.textMid, lineHeight: 1.5, marginBottom: 20 }}>
          {current.body}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {steps.map((_, i) => (
              <div key={i} style={{
                width: 24, height: 4,
                background: i === step
                  ? tokens.color.citizen
                  : i < step ? tokens.color.textDim : tokens.color.hairline,
                borderRadius: 2,
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSkip} style={{
              background: 'transparent', border: 0,
              color: tokens.color.textDim, fontSize: 12,
              cursor: 'pointer', padding: '8px 12px',
              fontFamily: tokens.font.ui,
            }}>
              Passer
            </button>
            <button onClick={handleNext} style={{
              background: tokens.color.citizen, color: tokens.color.bg,
              border: 0, borderRadius: 999,
              padding: '10px 20px', fontWeight: 700, fontSize: 13,
              cursor: 'pointer', fontFamily: tokens.font.ui,
            }}>
              {isLast ? 'Commencer' : 'Suivant →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Helper : construit les 4 étapes onboarding standards.
 * À appeler depuis le composant qui gère les refs vers canvas/sidebar/buildBar.
 */
export const buildDefaultSteps = (refs: {
  canvas: React.RefObject<HTMLElement>;
  sidebar: React.RefObject<HTMLElement>;
  buildBar: React.RefObject<HTMLElement>;
}): OnboardingStep[] => [
  {
    title: "Salut, c'est moi.",
    body: mayorLines.onboarding[0].text,
    mood: 'welcome',
    mayorPos: { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' },
    bubblePos: { left: '50%', top: 'calc(50% + 200px)', transform: 'translateX(-50%)' },
    tail: 'top',
  },
  {
    title: "Ta ville, c'est ton portefeuille.",
    body: mayorLines.onboarding[1].text,
    mood: 'point',
    targetRef: refs.canvas,
    mayorPos: { right: 380, top: 240 },
    bubblePos: { right: 60, top: 220 },
    tail: 'left',
  },
  {
    title: "Tes quartiers, en un coup d'œil.",
    body: mayorLines.onboarding[2].text,
    mood: 'neutral',
    targetRef: refs.sidebar,
    mayorPos: { left: 360, top: 220 },
    bubblePos: { left: 360, top: 200 },
    tail: 'left',
  },
  {
    title: "Construis. Démolis. Réorganise.",
    body: mayorLines.onboarding[3].text,
    mood: 'cheer',
    targetRef: refs.buildBar,
    mayorPos: { right: 80, top: 360 },
    bubblePos: { left: '50%', top: 'calc(100% - 320px)', transform: 'translateX(-50%)' },
    tail: 'bottom',
  },
];

export default OnboardingCoach;
