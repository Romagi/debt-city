import { memo, useState, useMemo } from 'react';
import type { Portfolio, Project } from '../types/portfolio';
import { formatMoney } from '../city/utils';
import { tokens } from '../styles/tokens';

interface Props {
  portfolio: Portfolio;
  /** Click on a deal → focus the camera on its district. */
  onFocusDistrict: (projectId: string) => void;
  /** Open the +Deal modal. */
  onAddDeal: () => void;
  /** Open the +Borrower modal. */
  onAddBorrower: () => void;
  /** Auto-close the drawer after an action (focus, add). */
  onClose: () => void;
}

type FilterStatus = 'all' | 'published' | 'draft' | 'finished' | 'archived';

const STATUS_LABEL: Record<FilterStatus, string> = {
  all: 'Tous',
  published: 'Actifs',
  draft: 'Brouillons',
  finished: 'Clos',
  archived: 'Archivés',
};

const STATUS_COLOR: Record<string, string> = {
  published: tokens.color.success,
  draft:     tokens.color.warning,
  finished:  tokens.color.textDim,
  archived:  '#555',
};

/**
 * Drawer "🗺 Annuaire" — liste des deals + boutons +Deal / +Borrower.
 * Clic sur un deal → focus caméra sur son quartier (et fermeture du drawer).
 *
 * Wrapped in React.memo: parent re-renders on every portfolio tick, but the
 * drawer only recomputes when the projects/borrowers references change.
 */
function DirectoryDrawer({ portfolio, onFocusDistrict, onAddDeal, onAddBorrower, onClose }: Props) {
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [query, setQuery] = useState('');

  // Counts per status — single pass over projects, memoised on projects only
  const counts = useMemo<Record<FilterStatus, number>>(() => {
    const c = { all: portfolio.projects.length, published: 0, draft: 0, finished: 0, archived: 0 };
    for (const p of portfolio.projects) {
      if      (p.currentStatus === 'published') c.published++;
      else if (p.currentStatus === 'draft')     c.draft++;
      else if (p.currentStatus === 'finished')  c.finished++;
      else if (p.currentStatus === 'archived')  c.archived++;
    }
    return c;
  }, [portfolio.projects]);

  // Filter+sort runs only when relevant inputs change
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const order: Record<string, number> = { published: 0, draft: 1, finished: 2, archived: 3 };
    return portfolio.projects
      .filter(p => filter === 'all' || p.currentStatus === filter)
      .filter(p => !q || p.title.toLowerCase().includes(q))
      .sort((a, b) => {
        const sd = (order[a.currentStatus] ?? 9) - (order[b.currentStatus] ?? 9);
        if (sd !== 0) return sd;
        return b.globalFundingAmount.amount - a.globalFundingAmount.amount;
      });
  }, [portfolio.projects, filter, query]);

  const handleFocus = (p: Project) => {
    onFocusDistrict(p.id);
    onClose();
  };

  return (
    <div>
      <div style={styles.titleRow}>
        <div style={styles.title}>🗺 Annuaire — {portfolio.projects.length} deals</div>
      </div>

      {/* Quick actions */}
      <div style={styles.quickActions}>
        <button
          style={{ ...styles.actionBtn, ...styles.actionBtnPrimary }}
          onClick={() => { onAddDeal(); onClose(); }}
        >
          + Deal
        </button>
        <button
          style={styles.actionBtn}
          onClick={() => { onAddBorrower(); onClose(); }}
        >
          + Borrower
        </button>
      </div>

      {/* Search */}
      <input
        style={styles.search}
        type="text"
        placeholder="Rechercher un deal…"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />

      {/* Filter chips */}
      <div style={styles.filters}>
        {(Object.keys(STATUS_LABEL) as FilterStatus[]).map(k => (
          <button
            key={k}
            style={{
              ...styles.filterChip,
              ...(filter === k ? styles.filterChipActive : {}),
            }}
            onClick={() => setFilter(k)}
          >
            {STATUS_LABEL[k]}
            <span style={styles.filterCount}>{counts[k]}</span>
          </button>
        ))}
      </div>

      {/* Deals list */}
      <div style={styles.list}>
        {filtered.length === 0 ? (
          <div style={styles.empty}>Aucun deal ne correspond.</div>
        ) : filtered.map(p => {
          const borrower = portfolio.borrowers.find(b => b.id === p.borrowerId);
          const breached = p.covenants.some(c => c.terms.some(t => t.currentStatus === 'breached'));
          return (
            <div
              key={p.id}
              style={styles.dealRow}
              onClick={() => handleFocus(p)}
              title="Focus sur ce quartier"
            >
              <div style={{
                ...styles.statusDot,
                background: STATUS_COLOR[p.currentStatus] ?? '#888',
              }} />
              <div style={styles.dealInfo}>
                <div style={styles.dealTitle}>
                  {p.title}
                  {breached && <span style={styles.dealAlert}>⚠️</span>}
                </div>
                <div style={styles.dealMeta}>
                  {borrower?.corporateName ?? 'Sans borrower'} · {p.tranches.length} tranche{p.tranches.length > 1 ? 's' : ''} · {p.lenders.length} lender{p.lenders.length > 1 ? 's' : ''}
                </div>
              </div>
              <div style={styles.dealAmount}>{formatMoney(p.globalFundingAmount.amount)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(DirectoryDrawer);

const styles: Record<string, React.CSSProperties> = {
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: tokens.font.size.md,
    fontWeight: tokens.font.weight.bold,
    color: tokens.color.primary,
    letterSpacing: tokens.font.tracking.wide,
  },
  quickActions: {
    display: 'flex',
    gap: 8,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    padding: '10px 14px',
    background: tokens.color.surfaceLo,
    border: `1px solid ${tokens.color.border}`,
    borderRadius: tokens.radius.pill,
    color: tokens.color.text,
    fontFamily: tokens.font.family,
    fontSize: tokens.font.size.xs,
    fontWeight: tokens.font.weight.bold,
    cursor: 'pointer',
    transition: 'all 0.12s',
  },
  actionBtnPrimary: {
    background: tokens.color.primaryBg,
    borderColor: tokens.color.primaryBd,
    color: tokens.color.primary,
  },
  search: {
    width: '100%',
    padding: '10px 14px',
    background: tokens.color.surfaceLo,
    border: `1px solid ${tokens.color.border}`,
    borderRadius: tokens.radius.md,
    color: tokens.color.text,
    fontFamily: tokens.font.family,
    fontSize: tokens.font.size.sm,
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: 8,
  },
  filters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 12,
  },
  filterChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 12px',
    background: tokens.color.surfaceLo,
    border: `1px solid ${tokens.color.border}`,
    borderRadius: tokens.radius.pill,
    color: tokens.color.textDim,
    fontFamily: tokens.font.family,
    fontSize: tokens.font.size.xxs,
    fontWeight: tokens.font.weight.bold,
    cursor: 'pointer',
    transition: 'all 0.12s',
  },
  filterChipActive: {
    background: tokens.color.primaryBg,
    borderColor: tokens.color.primaryBd,
    color: tokens.color.primary,
  },
  filterCount: {
    fontSize: tokens.font.size.xxs,
    color: 'inherit',
    opacity: 0.7,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    maxHeight: 360,
    overflowY: 'auto',
  },
  empty: {
    color: tokens.color.textDim,
    fontSize: tokens.font.size.xs,
    textAlign: 'center',
    padding: '20px 0',
  },
  dealRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    background: tokens.color.surfaceLo,
    border: `1px solid ${tokens.color.border}`,
    borderRadius: tokens.radius.md,
    cursor: 'pointer',
    transition: 'all 0.12s',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  dealInfo: {
    flex: 1,
    minWidth: 0,
  },
  dealTitle: {
    fontSize: tokens.font.size.sm,
    fontWeight: tokens.font.weight.bold,
    color: tokens.color.text,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  dealAlert: {
    fontSize: tokens.font.size.xs,
  },
  dealMeta: {
    fontSize: tokens.font.size.xxs,
    color: tokens.color.textDim,
    marginTop: 2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  dealAmount: {
    fontSize: tokens.font.size.xs,
    fontWeight: tokens.font.weight.bold,
    color: tokens.color.primary,
    fontVariantNumeric: 'tabular-nums',
    flexShrink: 0,
  },
};
