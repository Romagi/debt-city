import { useState, useMemo } from 'react';
import type { Portfolio, Project } from '../types/portfolio';
import { formatMoney } from '../city/utils';

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
  published: '#5CB85C',
  draft:     '#FFDC00',
  finished:  '#777',
  archived:  '#555',
};

/**
 * Drawer "🗺 Annuaire" — liste des deals + boutons +Deal / +Borrower.
 * Clic sur un deal → focus caméra sur son quartier (et fermeture du drawer).
 */
export default function DirectoryDrawer({ portfolio, onFocusDistrict, onAddDeal, onAddBorrower, onClose }: Props) {
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return portfolio.projects
      .filter(p => filter === 'all' || p.currentStatus === filter)
      .filter(p => !q || p.title.toLowerCase().includes(q))
      .sort((a, b) => {
        const order: Record<string, number> = { published: 0, draft: 1, finished: 2, archived: 3 };
        const sd = (order[a.currentStatus] ?? 9) - (order[b.currentStatus] ?? 9);
        if (sd !== 0) return sd;
        return b.globalFundingAmount.amount - a.globalFundingAmount.amount;
      });
  }, [portfolio.projects, filter, query]);

  const handleFocus = (p: Project) => {
    onFocusDistrict(p.id);
    onClose();
  };

  const counts: Record<FilterStatus, number> = {
    all: portfolio.projects.length,
    published: portfolio.projects.filter(p => p.currentStatus === 'published').length,
    draft: portfolio.projects.filter(p => p.currentStatus === 'draft').length,
    finished: portfolio.projects.filter(p => p.currentStatus === 'finished').length,
    archived: portfolio.projects.filter(p => p.currentStatus === 'archived').length,
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

const styles: Record<string, React.CSSProperties> = {
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: 700,
    color: '#6AB0F0',
    letterSpacing: 1,
  },
  quickActions: {
    display: 'flex',
    gap: 8,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    color: '#CCC',
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
  },
  actionBtnPrimary: {
    background: 'rgba(74,144,217,0.25)',
    borderColor: 'rgba(74,144,217,0.4)',
    color: '#6AB0F0',
  },
  search: {
    width: '100%',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    color: '#DDD',
    fontFamily: 'monospace',
    fontSize: 12,
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
    padding: '4px 10px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 999,
    color: '#889',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 700,
    cursor: 'pointer',
  },
  filterChipActive: {
    background: 'rgba(74,144,217,0.2)',
    borderColor: 'rgba(74,144,217,0.4)',
    color: '#6AB0F0',
  },
  filterCount: {
    fontSize: 9,
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
    color: '#667',
    fontSize: 11,
    textAlign: 'center',
    padding: '20px 0',
  },
  dealRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 10,
    cursor: 'pointer',
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
    fontSize: 12,
    fontWeight: 700,
    color: '#DDD',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  dealAlert: {
    fontSize: 11,
  },
  dealMeta: {
    fontSize: 10,
    color: '#778',
    marginTop: 2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  dealAmount: {
    fontSize: 11,
    fontWeight: 700,
    color: '#6AB0F0',
    fontVariantNumeric: 'tabular-nums',
    flexShrink: 0,
  },
};
