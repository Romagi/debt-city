/**
 * Debt City — design tokens.
 *
 * Hub of all visual constants. Import from here instead of hard-coding values
 * in component styles. Lot 3 introduced this file as part of the "rond et fun"
 * redesign — palette warm-dark, Quicksand typography, generous radii.
 *
 * Usage:
 *   import { tokens } from '../styles/tokens';
 *   const styles = { card: { background: tokens.color.surface, ... } };
 */

export const tokens = {
  // ─── Colour ──────────────────────────────────────────────────────────────
  color: {
    // Surfaces (dark-warm, not bluish)
    bg:        '#1A1612',                   // outer wrapper
    surface:   'rgba(28, 22, 18, 0.92)',    // standard card / drawer
    surfaceHi: 'rgba(38, 30, 24, 0.95)',    // raised (hover, modals)
    surfaceLo: 'rgba(20, 16, 12, 0.85)',    // sunken (search field, list rows)
    border:    'rgba(255, 235, 200, 0.10)', // standard hairline
    borderHi:  'rgba(255, 235, 200, 0.18)', // emphasised (active, focus)

    // Text
    text:    '#F5EFE5',  // headlines, primary content
    textMid: '#B8AC9A',  // secondary
    textDim: '#7A6F5F',  // tertiary, hints, captions

    // Brand — sky blue (matches sprite buildings)
    primary:    '#6AB0F0',
    primaryDk:  '#4A90D9',
    primaryBg:  'rgba(106, 176, 240, 0.18)',  // tinted background
    primaryBd:  'rgba(106, 176, 240, 0.45)',  // tinted border

    // Accent — warm orange (matches sprite roofs / signage)
    accent:    '#FFB360',
    accentBg:  'rgba(255, 179, 96, 0.18)',
    accentBd:  'rgba(255, 179, 96, 0.45)',

    // Semantic
    success:   '#7ED87E',
    warning:   '#FFCB47',
    danger:    '#FF7461',
    dangerBg:  'rgba(255, 116, 97, 0.15)',
    dangerBd:  'rgba(255, 116, 97, 0.40)',

    // Modal backdrop
    overlay:   'rgba(10, 8, 6, 0.7)',
  },

  // ─── Radius (rounder = friendlier, matches voxel sprites) ────────────────
  radius: {
    sm:   8,    // small elements: chips, sub-buttons
    md:   12,   // standard inputs
    lg:   16,   // small cards
    xl:   20,   // main cards / drawers
    xxl:  24,   // hero cards
    pill: 999,  // buttons, badges
  },

  // ─── Shadow (soft warm-tinted, no hard edges) ────────────────────────────
  shadow: {
    sm: '0 2px 6px rgba(0, 0, 0, 0.18)',
    md: '0 4px 14px rgba(0, 0, 0, 0.28)',
    lg: '0 8px 28px rgba(0, 0, 0, 0.40)',
    xl: '0 12px 40px rgba(0, 0, 0, 0.50)',
    /** Soft warm glow used on highlighted cards (e.g. Money headline) */
    glow: '0 0 0 1px rgba(106, 176, 240, 0.35), 0 8px 28px rgba(0, 0, 0, 0.40)',
  },

  // ─── Typography (Quicksand — friendly rounded sans-serif) ────────────────
  font: {
    family:  '"Quicksand", "SF Pro Rounded", system-ui, -apple-system, sans-serif',
    /** monospace fallback kept for tabular numbers (amounts, counts) */
    mono:    '"SF Mono", "Menlo", monospace',
    weight: {
      regular:  500,
      semibold: 600,
      bold:     700,
    },
    size: {
      xxs: 10,
      xs:  11,
      sm:  12,
      md:  13,
      lg:  15,
      xl:  18,
      xxl: 22,
    },
    /** Generous letter spacing on uppercase labels for the "city builder" feel */
    tracking: {
      tight:  '-0.01em',
      normal: 0,
      wide:   '0.05em',
      wider:  '0.08em',
    },
  },

  // ─── Spacing scale ───────────────────────────────────────────────────────
  spacing: {
    0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 48,
  },

  // ─── Backdrop blur ───────────────────────────────────────────────────────
  blur: {
    soft:    'blur(8px)',
    mid:     'blur(12px)',
    strong:  'blur(20px)',
  },

  // ─── Z-index layers ──────────────────────────────────────────────────────
  z: {
    canvas:    1,
    hud:       20,
    drawer:    25,
    overlay:   40,
    modal:     50,
    tooltip:   60,
  },
} as const;

/** Convenience: tabular-nums for money/counts. Use with `fontVariantNumeric: 'tabular-nums'`. */
export const tabularNums: React.CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
};
