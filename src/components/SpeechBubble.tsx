import React from 'react';
import { tokens } from '../styles/tokens';

/**
 * Bulle de dialogue du Maire (et autres). Réutilisable.
 *
 * Usage :
 *   <SpeechBubble name="LE MAIRE" tail="left">
 *     Bienvenue dans ta ville.
 *   </SpeechBubble>
 */

export type SpeechBubbleTail = 'left' | 'right' | 'top' | 'bottom' | 'none';

export interface SpeechBubbleProps {
  name?: string;       // eyebrow en mono UPPERCASE (ex: "LE MAIRE")
  title?: string;      // gros titre Bricolage Grotesque
  tail?: SpeechBubbleTail;
  width?: number | string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const TAIL_STYLES: Record<Exclude<SpeechBubbleTail, 'none'>, React.CSSProperties> = {
  left: {
    left: -10, top: 32,
    borderLeft: `1px solid ${tokens.color.hairline2}`,
    borderBottom: `1px solid ${tokens.color.hairline2}`,
  },
  right: {
    right: -10, top: 32,
    borderRight: `1px solid ${tokens.color.hairline2}`,
    borderTop: `1px solid ${tokens.color.hairline2}`,
  },
  top: {
    top: -10, left: 50,
    borderLeft: `1px solid ${tokens.color.hairline2}`,
    borderTop: `1px solid ${tokens.color.hairline2}`,
  },
  bottom: {
    bottom: -10, left: 50,
    borderRight: `1px solid ${tokens.color.hairline2}`,
    borderBottom: `1px solid ${tokens.color.hairline2}`,
  },
};

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({
  name, title, tail = 'left', width = 360, children, className, style,
}) => (
  <div
    className={className}
    style={{
      position: 'relative',
      background: tokens.color.surfaceHi,
      border: `1px solid ${tokens.color.hairline2}`,
      borderRadius: tokens.radius.lg,
      padding: '20px 24px',
      width,
      color: tokens.color.text,
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
      fontFamily: tokens.font.ui,
      ...style,
    }}
  >
    {tail !== 'none' && (
      <div
        aria-hidden
        style={{
          position: 'absolute',
          width: 18,
          height: 18,
          background: tokens.color.surfaceHi,
          transform: 'rotate(45deg)',
          ...TAIL_STYLES[tail],
        }}
      />
    )}
    {name && (
      <div style={{
        fontFamily: tokens.font.mono,
        fontSize: 10,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: tokens.color.citizen,
        marginBottom: 8,
      }}>
        {name}
      </div>
    )}
    {title && (
      <div style={{
        fontFamily: tokens.font.display,
        fontWeight: 800,
        fontSize: 24,
        letterSpacing: '-0.02em',
        lineHeight: 1.05,
        marginBottom: 10,
      }}>
        {title}
      </div>
    )}
    <div style={{ fontSize: 14, lineHeight: 1.5, color: tokens.color.textMid }}>
      {children}
    </div>
  </div>
);

export default SpeechBubble;
