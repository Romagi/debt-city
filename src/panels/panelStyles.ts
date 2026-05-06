import type { CSSProperties } from 'react';
import { tokens, tabularNums } from '../styles/tokens';

/**
 * Shared styles for the contextual panels (Building / Townhall / Shop /
 * Library / Deal). Each panel calls `makePanelStyles(accent)` with its own
 * brand-role colour to tint the panel-type eyebrow, the action buttons, and
 * the list-item value highlights, while sharing the rest of the visual
 * vocabulary (panel chrome, header, stats card, sections, lists).
 *
 * Local panel-specific styles (e.g. version badges, role badges, term chips)
 * stay in the panel file itself and are merged on top of these.
 */
export function makePanelStyles(accent: string): Record<string, CSSProperties> {
  return {
    panel: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: 420,
      background: tokens.color.surface,
      backdropFilter: tokens.blur.strong,
      borderLeft: `1px solid ${tokens.color.hairline}`,
      color: tokens.color.text,
      padding: '26px 28px 32px',
      overflowY: 'auto',
      fontFamily: tokens.font.ui,
      fontSize: 13,
      zIndex: tokens.z.hud,
    },

    // ─── Header ─────────────────────────────────────────────────────────
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 24,
      gap: 12,
    },
    panelType: {
      fontFamily: tokens.font.mono,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.18em',
      color: accent,
      marginBottom: 6,
    },
    title: {
      fontFamily: tokens.font.display,
      fontSize: 22,
      fontWeight: 800,
      letterSpacing: '-0.02em',
      lineHeight: 1.15,
      margin: 0,
      color: tokens.color.text,
    },
    badge: {
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: tokens.radius.pill,
      fontFamily: tokens.font.mono,
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.10em',
      textTransform: 'uppercase',
    },
    nature: {
      fontFamily: tokens.font.mono,
      color: tokens.color.textDim,
      fontSize: 10,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    },
    closeBtn: {
      width: 32,
      height: 32,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: tokens.color.surfaceLo,
      border: `1px solid ${tokens.color.hairline}`,
      borderRadius: tokens.radius.md,
      color: tokens.color.textMid,
      fontSize: 16,
      cursor: 'pointer',
      lineHeight: 1,
      flexShrink: 0,
      transition: 'all 0.15s',
    },
    iconBtn: {
      width: 32,
      height: 32,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: tokens.color.surfaceLo,
      border: `1px solid ${tokens.color.hairline}`,
      borderRadius: tokens.radius.md,
      color: tokens.color.textMid,
      fontSize: 13,
      cursor: 'pointer',
      lineHeight: 1,
      transition: 'all 0.15s',
    },

    // ─── Stats card ─────────────────────────────────────────────────────
    stats: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 14,
      marginBottom: 24,
      padding: 16,
      background: tokens.color.surfaceHi,
      border: `1px solid ${tokens.color.hairline}`,
      borderRadius: tokens.radius.lg,
    },
    statLabel: {
      fontFamily: tokens.font.mono,
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.18em',
      color: tokens.color.textDim,
      marginBottom: 5,
    },
    statValue: {
      fontFamily: tokens.font.display,
      fontSize: 16,
      fontWeight: 700,
      color: tokens.color.text,
      letterSpacing: '-0.01em',
      ...tabularNums,
    },

    // ─── Section header ─────────────────────────────────────────────────
    sectionHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 22,
      marginBottom: 12,
      paddingBottom: 8,
      borderBottom: `1px solid ${tokens.color.hairline}`,
    },
    sectionTitle: {
      fontFamily: tokens.font.mono,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.18em',
      color: tokens.color.textMid,
      margin: 0,
      textTransform: 'uppercase',
    },
    addBtn: {
      padding: '6px 14px',
      background: 'transparent',
      border: `1px solid ${accent}66`,
      borderRadius: tokens.radius.pill,
      color: accent,
      fontFamily: tokens.font.ui,
      fontSize: 11,
      fontWeight: 700,
      cursor: 'pointer',
      transition: 'all 0.15s',
    },

    // ─── List ───────────────────────────────────────────────────────────
    list: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    },
    listItem: {
      padding: '12px 14px',
      background: tokens.color.surfaceHi,
      border: `1px solid ${tokens.color.hairline}`,
      borderRadius: tokens.radius.md,
    },
    listItemHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
    },
    listItemName: {
      fontWeight: 700,
      fontSize: 13,
      color: tokens.color.text,
    },
    listItemValue: {
      fontFamily: tokens.font.mono,
      fontSize: 12,
      fontWeight: 700,
      color: accent,
      ...tabularNums,
    },
    listItemMeta: {
      fontFamily: tokens.font.mono,
      fontSize: 10,
      color: tokens.color.textDim,
      marginTop: 4,
      letterSpacing: '0.05em',
    },
    itemActions: {
      display: 'flex',
      gap: 12,
      marginTop: 8,
    },
    smallBtn: {
      background: 'transparent',
      border: 'none',
      color: tokens.color.textDim,
      fontFamily: tokens.font.ui,
      fontSize: 11,
      fontWeight: 600,
      cursor: 'pointer',
      padding: '2px 0',
      textDecoration: 'underline',
    },
    empty: {
      color: tokens.color.textDim,
      fontSize: 12,
      fontStyle: 'italic',
      padding: '14px 0',
      textAlign: 'center',
    },

    // ─── Workflow buttons (Building/Deal status transitions) ────────────
    workflowBtn: {
      padding: '4px 12px',
      fontFamily: tokens.font.mono,
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      border: '1px solid',
      borderRadius: tokens.radius.pill,
      background: tokens.color.surfaceLo,
      cursor: 'pointer',
    },

    // ─── Description block ──────────────────────────────────────────────
    description: {
      color: tokens.color.textMid,
      fontSize: 12,
      fontStyle: 'italic',
      lineHeight: 1.55,
      marginBottom: 18,
      padding: '10px 14px',
      background: tokens.color.surfaceLo,
      borderLeft: `2px solid ${accent}55`,
      borderRadius: `0 ${tokens.radius.sm}px ${tokens.radius.sm}px 0`,
    },
  };
}

/** Standard status badge colours (deal lifecycle), aligned with the new palette. */
export const STATUS_BADGES: Record<string, { bg: string; text: string }> = {
  draft:     { bg: tokens.color.citizenBg,   text: tokens.color.citizen },
  published: { bg: tokens.color.moneyBg,     text: tokens.color.money },
  archived:  { bg: tokens.color.surfaceLo,   text: tokens.color.textDim },
  finished:  { bg: tokens.color.constructBg, text: tokens.color.construct },
};
