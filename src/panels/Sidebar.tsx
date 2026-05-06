import { memo, forwardRef, useMemo, type CSSProperties } from 'react';
import type { Portfolio, Project, ProjectNature } from '../types/portfolio';
import { tokens, tabularNums } from '../styles/tokens';
import { formatMoney } from '../city/utils';

interface Props {
  portfolio: Portfolio;
  /** Click on a district / chantier → focus camera on its district. */
  onFocusDistrict: (projectId: string) => void;
  /** Open the +Deal modal. */
  onAddDeal: () => void;
  /** Open the +Borrower modal. */
  onAddBorrower: () => void;
}

// ─── Nature → friendly label + colour mapping ────────────────────────────
//
// `ProjectNature` is the closest equivalent we have to the prompt's "asset
// classes" (Senior Secured / High Yield / etc.). We map each known nature
// to a brand colour role; unknown natures fall back to a stable hash.

const NATURE_LABELS: Record<string, string> = {
  acquisition_finance: 'Acquisition',
  asset_finance:       'Asset Finance',
  bridge_finance:      'Bridge',
  corporate_finance:   'Corporate',
  ecosystem_finance:   'Écosystème',
  green_finance:       'Green',
  infrastructure_finance: 'Infrastructure',
  leveraged_finance:   'Leveraged',
  mezzanine_finance:   'Mezzanine',
  project_finance:     'Project',
  real_estate_finance: 'Real Estate',
  refinancing:         'Refi',
  trade_finance:       'Trade',
  working_capital:     'Working Capital',
  other:               'Autre',
};

const NATURE_COLORS = [
  tokens.color.construct,
  tokens.color.money,
  tokens.color.citizen,
  tokens.color.debt,
  tokens.color.brick,
];

function natureLabel(n: ProjectNature | string | undefined): string {
  const key = (n ?? 'other') as string;
  return NATURE_LABELS[key] ?? prettyKey(key);
}
function prettyKey(k: string): string {
  return k.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
}
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
 * Sections:
 *   1. QUARTIERS — projects grouped by `nature`, with money totals.
 *   2. CHANTIERS — current draft deals (= "construction sites").
 *   3. Footer    — quick actions (+Deal / +Borrower).
 *
 * Replaces the contents of the old DirectoryDrawer in a permanent rail.
 */
const Sidebar = forwardRef<HTMLDivElement, Props>(
  ({ portfolio, onFocusDistrict, onAddDeal, onAddBorrower }, ref) => {
    // ─── Group by nature ─────────────────────────────────────────────────
    const districts = useMemo(() => {
      const groups: Record<string, { nature: string; projects: Project[]; total: number }> = {};
      for (const p of portfolio.projects) {
        if (p.currentStatus === 'archived') continue;
        const k = (p.nature ?? 'other') as string;
        if (!groups[k]) groups[k] = { nature: k, projects: [], total: 0 };
        groups[k].projects.push(p);
        groups[k].total += p.globalFundingAmount.amount;
      }
      return Object.values(groups).sort((a, b) => b.total - a.total);
    }, [portfolio.projects]);

    // ─── Drafts (= chantiers) ────────────────────────────────────────────
    const drafts = useMemo(
      () => portfolio.projects.filter(p => p.currentStatus === 'draft'),
      [portfolio.projects],
    );

    return (
      <aside ref={ref} style={styles.bar}>
        {/* ─── QUARTIERS ─────────────────────────────────────────────── */}
        <div style={styles.section}>
          <div style={styles.eyebrow}>QUARTIERS</div>
          {districts.length === 0 ? (
            <div style={styles.emptyHint}>
              Aucun deal pour l'instant.<br />Crée ton premier deal pour bâtir un quartier.
            </div>
          ) : (
            <div style={styles.list}>
              {districts.map(d => (
                <DistrictItem
                  key={d.nature}
                  nature={d.nature}
                  count={d.projects.length}
                  total={d.total}
                  onClick={() => {
                    const first = d.projects[0];
                    if (first) onFocusDistrict(first.id);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ─── CHANTIERS ─────────────────────────────────────────────── */}
        <div style={styles.section}>
          <div style={styles.eyebrow}>CHANTIERS</div>
          <div style={styles.draftCard}>
            {drafts.length === 0 ? (
              <div style={styles.draftEmpty}>Aucun chantier en cours.</div>
            ) : (
              drafts.slice(0, 6).map(p => (
                <button
                  key={p.id}
                  style={styles.draftRow}
                  onClick={() => onFocusDistrict(p.id)}
                >
                  <span style={styles.draftBadge}>•</span>
                  <span style={styles.draftName}>{p.title}</span>
                  <span style={styles.draftAmount}>
                    {formatMoney(p.globalFundingAmount.amount)}
                  </span>
                </button>
              ))
            )}
            {drafts.length > 6 && (
              <div style={styles.draftMore}>+ {drafts.length - 6} autres</div>
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
  nature: string;
  count: number;
  total: number;
  onClick: () => void;
}

function DistrictItem({ nature, count, total, onClick }: DistrictItemProps) {
  const color = natureColor(nature);
  return (
    <button style={styles.districtItem} onClick={onClick}>
      <span style={{ ...styles.districtDot, background: color, boxShadow: `0 0 8px ${color}` }} />
      <div style={styles.districtTextBlock}>
        <div style={styles.districtName}>{natureLabel(nature)}</div>
        <div style={styles.districtSub}>
          {formatMoney(total)} · {count} immeuble{count > 1 ? 's' : ''}
        </div>
      </div>
    </button>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  bar: {
    width: 320,
    height: '100%',
    background: tokens.color.surface,
    borderRight: `1px solid ${tokens.color.hairline}`,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: tokens.font.ui,
    color: tokens.color.text,
    overflow: 'hidden',
  },

  section: {
    padding: '24px 18px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    minHeight: 0,
  },

  eyebrow: {
    fontFamily: tokens.font.mono,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.18em',
    color: tokens.color.textDim,
  },

  // Quartiers
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    overflowY: 'auto',
    maxHeight: '40vh',
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
    ...tabularNums,
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
  draftBadge: {
    color: tokens.color.citizen,
    fontSize: 14,
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
  draftMore: {
    fontFamily: tokens.font.mono,
    fontSize: 10,
    fontWeight: 500,
    color: tokens.color.textDim,
    padding: '4px 12px',
    letterSpacing: '0.06em',
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
