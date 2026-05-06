/**
 * Debt City — design tokens.
 *
 * Hub of all visual constants. Import from here instead of hard-coding values
 * in component styles.
 *
 * — Lot 3 (initial) introduced this file as part of the warm-dark "rond et fun" pass.
 * — Lot 4 (refresh) re-skinned the palette to the new "nuit-violet + brand saturée"
 *   identity, while keeping the SAME structural keys (shadow/blur/z/spacing/font.*)
 *   so that no existing import breaks. Migration aliases at the bottom of `color`
 *   keep `tokens.color.primary`, `.accent`, `.success`, `.danger` working.
 *
 * Usage:
 *   import { tokens } from '../styles/tokens';
 *   const styles = { card: { background: tokens.color.surface, ... } };
 */

import type { CSSProperties } from 'react';

export const tokens = {
  // ─── Colour ──────────────────────────────────────────────────────────────
  color: {
    // Surfaces — nuit urbaine, violet-bleuté
    bg:        '#0E0B1A',                   // outer wrapper / page background
    bg2:       '#14112A',                   // raised gradient stop (landing)
    surface:   '#181434',                   // standard card / drawer
    surfaceHi: '#221C42',                   // raised (hover, modals, popovers)
    surfaceLo: 'rgba(0, 0, 0, 0.30)',       // sunken (search field, list rows)

    // Hairlines (new naming) + legacy `border`/`borderHi` aliases
    hairline:  'rgba(200, 210, 255, 0.10)',
    hairline2: 'rgba(200, 210, 255, 0.20)',
    border:    'rgba(200, 210, 255, 0.10)', // legacy alias of hairline
    borderHi:  'rgba(200, 210, 255, 0.20)', // legacy alias of hairline2

    // Text
    text:    '#F5EFE5',  // headlines, primary content
    textMid: '#B8AC9A',  // secondary
    textDim: '#7A6F5F',  // tertiary, hints, captions

    // Brand — saturated, named by city role
    citizen:   '#FFC03A',  // primary brand / highlights
    construct: '#4DA8FF',  // secondary brand / construction & info
    debt:      '#FF4D8D',  // semantic debt / danger
    money:     '#34D399',  // semantic gain / success
    brick:     '#E0552E',  // accent — roof / signage / warm callout
    asphalt:   '#2C2520',  // neutral road surface

    // Tinted backgrounds (for active states, badges)
    citizenBg:   'rgba(255, 192, 58, 0.14)',
    citizenBd:   'rgba(255, 192, 58, 0.45)',
    constructBg: 'rgba(77, 168, 255, 0.14)',
    constructBd: 'rgba(77, 168, 255, 0.45)',
    debtBg:      'rgba(255, 77, 141, 0.14)',
    debtBd:      'rgba(255, 77, 141, 0.45)',
    moneyBg:     'rgba(52, 211, 153, 0.14)',
    moneyBd:     'rgba(52, 211, 153, 0.45)',
    brickBg:     'rgba(224, 85, 46, 0.14)',
    brickBd:     'rgba(224, 85, 46, 0.45)',

    // Modal backdrop
    overlay:   'rgba(14, 11, 26, 0.7)',

    // ─── MIGRATION ALIASES ─────────────────────────────────────────────────
    // Kept so existing imports keep working during the refresh roll-out.
    // Eventually these can be removed once every callsite uses the new names.
    primary:    '#FFC03A',                  // → citizen
    primaryDk:  '#4DA8FF',                  // → construct
    primaryBg:  'rgba(255, 192, 58, 0.14)', // → citizenBg
    primaryBd:  'rgba(255, 192, 58, 0.45)', // → citizenBd

    accent:     '#E0552E',                  // → brick
    accentBg:   'rgba(224, 85, 46, 0.14)',  // → brickBg
    accentBd:   'rgba(224, 85, 46, 0.45)',  // → brickBd

    success:    '#34D399',                  // → money
    warning:    '#FFC03A',                  // → citizen (no dedicated warning in new palette)
    danger:     '#FF4D8D',                  // → debt
    dangerBg:   'rgba(255, 77, 141, 0.14)', // → debtBg
    dangerBd:   'rgba(255, 77, 141, 0.45)', // → debtBd
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

  // ─── Shadow (soft, no hard edges) ────────────────────────────────────────
  shadow: {
    sm: '0 2px 6px rgba(0, 0, 0, 0.18)',
    md: '0 4px 14px rgba(0, 0, 0, 0.28)',
    lg: '0 8px 28px rgba(0, 0, 0, 0.40)',
    xl: '0 12px 40px rgba(0, 0, 0, 0.50)',
    /** Soft glow used on highlighted cards — re-tinted from sky-blue to citizen-yellow. */
    glow: '0 0 0 1px rgba(255, 192, 58, 0.35), 0 8px 28px rgba(0, 0, 0, 0.40)',
  },

  // ─── Typography ──────────────────────────────────────────────────────────
  font: {
    /** Display — Bricolage Grotesque (titles, KPI values, brand). */
    display: '"Bricolage Grotesque", "SF Pro Display", system-ui, sans-serif',
    /** UI — Quicksand (body, buttons, list items). Alias of `family`. */
    ui:      '"Quicksand", "SF Pro Rounded", system-ui, -apple-system, sans-serif',
    /** Legacy `family` alias — keeps existing imports working (= ui). */
    family:  '"Quicksand", "SF Pro Rounded", system-ui, -apple-system, sans-serif',
    /** Mono — JetBrains Mono for tabular numbers (amounts, counts, deltas). */
    mono:    '"JetBrains Mono", "SF Mono", "Menlo", monospace',
    weight: {
      regular:  500,
      semibold: 600,
      bold:     700,
      black:    800,  // new — Bricolage Grotesque hero titles
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
      tighter: '-0.02em',
      normal: 0,
      wide:   '0.05em',
      wider:  '0.08em',
      widest: '0.18em',
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
export const tabularNums: CSSProperties = {
  fontFamily: tokens.font.mono,
  fontVariantNumeric: 'tabular-nums',
};
