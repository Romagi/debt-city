import { memo, forwardRef, useMemo, type CSSProperties } from 'react';
import type { Portfolio, Project, ProjectNature, Borrower } from '../types/portfolio';
import { tokens, tabularNums } from '../styles/tokens';
import { formatMoney } from '../city/utils';

interface Props {
  portfolio: Portfolio;
  /** Whether the sidebar is currently visible (slides in from the left). */
  isOpen: boolean;
  /** Close the sidebar (✕ button or ESC). */
  onClose: () => void;
  /** Click on a district / chantier → focus camera on its district. */
  onFocusDistrict: (projectId: string) => void;
  /** Open the +Deal modal. */
  onAddDeal: () => void;
  /** Open the +Borrower modal. */
  onAddBorrower: () => void;
}

// ─── Nature → colour mapping ─────────────────────────────────────────────
//
// In Debt City, ONE deal = ONE city district. So the sidebar lists every
// deal individually (not grouped by nature). We still derive a stable
// dot colour from `nature` so deals of the same nature share a visual
// grouping cue.

const NATURE_COLORS = [
  tokens.color.construct,
  tokens.color.money,
  tokens.color.citizen,
  tokens.color.debt,
  tokens.color.brick,
];

function natureColor(n: ProjectNature | string | undefined): string {
  const key = (n ?? 'other') as string;
  // Stable hash → palette colour, so the same nature always gets the same hue.
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return NATURE_COLORS[h % NATURE_COLORS.length];
}

// ─── Component ───────────────────────────────────────────────────────────

/**
 * Sidebar — 320px, full-height column to the left of the canvas.
 *
 * Each *deal* in Debt City corresponds to one visual district in the city
 * grid, so the sidebar lists deals one-by-one (not grouped). The dot colour
 * is derived from `nature` to give a visual grouping cue without hiding
 * individual deals behind aggregates.
 *
 * Sections:
 *   1. QUARTIERS — published + finished deals (built / delivered districts).
 *   2. CHANTIERS — draft deals (= construction sites still being shaped).
 *   3. Footer    — quick actions (+Deal / +Borrower).
 *
 * Archived deals are hidden (they no longer have a visual district).
 */
const Sidebar = forwardRef<HTMLDivElement, Props>(
  ({ portfolio, isOpen, onClose, onFocusDistrict, onAddDeal, onAddBorrower }, ref) => {
    // Borrower lookup — used to surface the borrower name on each row
    const borrowerById = useMemo(() => {
      const m = new Map<string, Borrower>();
      for (const b of portfolio.borrowers) m.set(b.id, b);
      return m;
    }, [portfolio.borrowers]);

    // Quartiers = published + finished (every deal is its own district)
    const districts = useMemo(
      () => portfolio.projects
        .filter(p => p.currentStatus === 'published' || p.currentStatus === 'finished')
        .sort((a, b) => b.globalFundingAmount.amount - a.globalFundingAmount.amount),
      [portfolio.projects],
    );

    // Chantiers = drafts
    const drafts = useMemo(
      () => portfolio.projects
        .filter(p => p.currentStatus === 'draft')
        .sort((a, b) => b.globalFundingAmount.amount - a.globalFundingAmount.amount),
      [portfolio.projects],
    );

    return (
      <aside
        ref={ref}
        style={{
          ...styles.bar,
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          boxShadow: isOpen ? '0 0 40px rgba(0, 0, 0, 0.5)' : 'none',
        }}
        aria-hidden={!isOpen}
      >
        {/* ─── HEADER ─────────────────────────────────────────────────── */}
        <header style={styles.header}>
          <div style={styles.headerTitleBlock}>
            <span style={styles.headerEyebrow}>CARTE DE LA VILLE</span>
            <span style={styles.headerSub}>Tes quartiers et chantiers en cours</span>
          </div>
          <button
            style={styles.closeBtn}
            onClick={onClose}
            title="Fermer la carte"
            aria-label="Fermer la carte"
          >
            ✕
          </button>
        </header>

        {/* ─── QUARTIERS ─────────────────────────────────────────────── */}
        <div style={styles.section}>
          <div style={styles.eyebrowRow}>
            <span style={styles.eyebrow}>QUARTIERS</span>
            <span style={styles.eyebrowCount}>{districts.length}</span>
          </div>
          {districts.length === 0 ? (
            <div style={styles.emptyHint}>
              Aucun quartier livré pour l'instant.<br />
              Construis un deal pour bâtir ton premier quartier.
            </div>
          ) : (
            <div style={styles.list}>
              {districts.map(p => (
                <DistrictItem
                  key={p.id}
                  project={p}
                  borrower={borrowerById.get(p.borrowerId)}
                  finished={p.currentStatus === 'finished'}
                  onClick={() => onFocusDistrict(p.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ─── CHANTIERS ─────────────────────────────────────────────── */}
        <div style={styles.section}>
          <div style={styles.eyebrowRow}>
            <span style={styles.eyebrow}>CHANTIERS</span>
            <span style={styles.eyebrowCount}>{drafts.length}</span>
          </div>
          <div style={styles.draftCard}>
            {drafts.length === 0 ? (
              <div style={styles.draftEmpty}>Aucun chantier en cours.</div>
            ) : (
              drafts.map(p => (
                <button
                  key={p.id}
                  style={styles.draftRow}
                  onClick={() => onFocusDistrict(p.id)}
                >
                  <span
                    style={{
                      ...styles.draftDot,
                      background: natureColor(p.nature),
                      boxShadow: `0 0 6px ${natureColor(p.nature)}`,
                    }}
                  />
                  <span style={styles.draftName}>{p.title}</span>
                  <span style={styles.draftAmount}>
                    {formatMoney(p.globalFundingAmount.amount)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ─── Footer actions ────────────────────────────────────────── */}
        <div style={styles.footer}>
          <button style={{ ...styles.actionBtn, ...styles.actionPrimary }} onClick={onAddDeal}>
            + Deal
          </button>
          <button style={styles.actionBtn} onClick={onAddBorrower}>
            + Borrower
          </button>
        </div>
      </aside>
    );
  },
);
Sidebar.displayName = 'Sidebar';

export default memo(Sidebar);

// ─── DistrictItem ────────────────────────────────────────────────────────

interface DistrictItemProps {
  project: Project;
  borrower: Borrower | undefined;
  finished: boolean;
  onClick: () => void;
}

function DistrictItem({ project, borrower, finished, onClick }: DistrictItemProps) {
  const color = natureColor(project.nature);
  return (
    <button style={styles.districtItem} onClick={onClick}>
      <span style={{ ...styles.districtDot, background: color, boxShadow: `0 0 8px ${color}` }} />
      <div style={styles.districtTextBlock}>
        <div style={styles.districtName}>
          {project.title}
          {finished && <span style={styles.districtFinished}> · livré</span>}
        </div>
        <div style={styles.districtSub}>
          {formatMoney(project.globalFundingAmount.amount)}
          {borrower && ` · ${borrower.corporateName}`}
        </div>
      </div>
    </button>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 340,
    background: tokens.color.surface,
    borderRight: `1px solid ${tokens.color.hairline}`,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: tokens.font.ui,
    color: tokens.color.text,
    overflow: 'hidden',
    zIndex: tokens.z.drawer,
    transition: 'transform 0.32s cubic-bezier(0.5, 0, 0.2, 1), box-shadow 0.32s',
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 18px 16px',
    borderBottom: `1px solid ${tokens.color.hairline}`,
    gap: 12,
  },
  headerTitleBlock: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  headerEyebrow: {
    fontFamily: tokens.font.display,
    fontSize: 16,
    fontWeight: 800,
    letterSpacing: '-0.01em',
    color: tokens.color.text,
  },
  headerSub: {
    fontFamily: tokens.font.mono,
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: '0.08em',
    color: tokens.color.textDim,
    marginTop: 3,
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
    fontFamily: tokens.font.ui,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.15s',
  },

  section: {
    padding: '24px 18px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    minHeight: 0,
  },

  eyebrowRow: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  eyebrow: {
    fontFamily: tokens.font.mono,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.18em',
    color: tokens.color.textDim,
  },
  eyebrowCount: {
    fontFamily: tokens.font.mono,
    fontSize: 10,
    fontWeight: 700,
    color: tokens.color.textMid,
    background: tokens.color.surfaceLo,
    padding: '2px 8px',
    borderRadius: tokens.radius.pill,
    minWidth: 22,
    textAlign: 'center',
    ...tabularNums,
  },

  // Quartiers
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    overflowY: 'auto',
    maxHeight: '38vh',
    paddingRight: 4,
  },
  districtItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: 10,
    cursor: 'pointer',
    color: tokens.color.text,
    fontFamily: tokens.font.ui,
    textAlign: 'left',
    transition: 'all 0.15s',
    width: '100%',
  },
  districtDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  districtTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  districtName: {
    fontSize: 13,
    fontWeight: 700,
    color: tokens.color.text,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  districtSub: {
    fontFamily: tokens.font.mono,
    fontSize: 10,
    fontWeight: 500,
    color: tokens.color.textDim,
    marginTop: 2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    ...tabularNums,
  },
  districtFinished: {
    color: tokens.color.money,
    fontWeight: 700,
    fontSize: 11,
    fontFamily: tokens.font.mono,
    letterSpacing: '0.05em',
  },

  emptyHint: {
    fontFamily: tokens.font.ui,
    fontSize: 12,
    lineHeight: 1.5,
    color: tokens.color.textDim,
    padding: '12px 4px',
  },

  // Chantiers
  draftCard: {
    background: tokens.color.surfaceHi,
    border: `1px solid ${tokens.color.hairline}`,
    borderRadius: tokens.radius.md,
    padding: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    maxHeight: '24vh',
    overflowY: 'auto',
  },
  draftRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    background: 'transparent',
    border: 'none',
    borderRadius: tokens.radius.sm,
    color: tokens.color.text,
    fontFamily: tokens.font.ui,
    fontSize: 12,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.12s',
  },
  draftDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  draftName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  draftAmount: {
    fontFamily: tokens.font.mono,
    fontSize: 10,
    fontWeight: 700,
    color: tokens.color.textMid,
    flexShrink: 0,
    ...tabularNums,
  },
  draftEmpty: {
    fontSize: 12,
    color: tokens.color.textDim,
    padding: '6px 4px',
    textAlign: 'center',
  },

  // Footer
  footer: {
    marginTop: 'auto',
    padding: 18,
    borderTop: `1px solid ${tokens.color.hairline}`,
    display: 'flex',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    padding: '10px 12px',
    background: tokens.color.surfaceLo,
    border: `1px solid ${tokens.color.hairline2}`,
    borderRadius: tokens.radius.md,
    color: tokens.color.text,
    fontFamily: tokens.font.ui,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  actionPrimary: {
    background: tokens.color.citizenBg,
    borderColor: tokens.color.citizenBd,
    color: tokens.color.citizen,
  },
};
