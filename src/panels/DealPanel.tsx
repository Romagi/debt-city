import type { CityBuilding, Borrower, Project, Tranche, Lender } from '../types/portfolio';
import type { PortfolioAction } from '../state/portfolio-reducer';
import { formatMoney } from '../city/utils';

type ModalState =
  | null
  | { type: 'borrower'; borrower?: Borrower }
  | { type: 'deal'; project?: Project }
  | { type: 'tranche'; projectId: string; tranche?: Tranche }
  | { type: 'lender'; projectId: string; lender?: Lender };

interface Props {
  building: CityBuilding;
  dispatch: React.Dispatch<PortfolioAction>;
  onClose: () => void;
  onOpenModal: (modal: ModalState) => void;
}

const STATUS_BADGES: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#FFD700', text: '#000' },
  published: { bg: '#2ECC40', text: '#FFF' },
  archived: { bg: '#999', text: '#FFF' },
  finished: { bg: '#666', text: '#FFF' },
};

const TERM_STATUS_COLORS: Record<string, string> = {
  validated: '#2ECC40',
  coming: '#87CEEB',
  pending: '#FFD700',
  result_received: '#FF851B',
  result_ko: '#FF851B',
  non_compliant: '#FF851B',
  breached: '#FF4136',
  created: '#AAA',
  deactivated: '#666',
};

export default function DealPanel({ building, dispatch, onClose, onOpenModal }: Props) {
  const { project } = building;
  const badge = STATUS_BADGES[project.currentStatus] ?? STATUS_BADGES.draft;

  function handleDeleteProject() {
    if (confirm(`Delete "${project.title}"? This cannot be undone.`)) {
      dispatch({ type: 'DELETE_PROJECT', payload: { id: project.id } });
      onClose();
    }
  }

  function handleDeleteTranche(trancheId: string, name: string) {
    if (confirm(`Remove floor "${name}"?`)) {
      dispatch({ type: 'DELETE_TRANCHE', payload: { projectId: project.id, trancheId } });
    }
  }

  function handleDeleteLender(lenderId: string, name: string) {
    if (confirm(`Remove "${name}" from syndicate?`)) {
      dispatch({ type: 'DELETE_LENDER', payload: { projectId: project.id, lenderId } });
    }
  }

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ flex: 1 }}>
          <h2 style={styles.title}>{project.title}</h2>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ ...styles.badge, backgroundColor: badge.bg, color: badge.text }}>
              {project.currentStatus}
            </span>
            <span style={styles.nature}>{project.nature.replace('_', ' ')}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <button style={styles.iconBtn} title="Edit Deal" onClick={() => onOpenModal({ type: 'deal', project })}>
            &#9998;
          </button>
          <button style={{ ...styles.iconBtn, color: '#FF4136' }} title="Delete Deal" onClick={handleDeleteProject}>
            &#128465;
          </button>
          <button onClick={onClose} style={styles.closeBtn}>&times;</button>
        </div>
      </div>

      {/* Stats */}
      <div style={styles.stats}>
        <div>
          <div style={styles.statLabel}>Total Funding</div>
          <div style={styles.statValue}>
            {project.globalFundingAmount.amount > 0
              ? formatMoney(project.globalFundingAmount.amount)
              : 'No tranches yet'}
          </div>
        </div>
        <div>
          <div style={styles.statLabel}>Agent</div>
          <div style={styles.statValue}>{project.agentName || '—'}</div>
        </div>
        <div>
          <div style={styles.statLabel}>Closing</div>
          <div style={styles.statValue}>{project.closingDate ?? 'TBD'}</div>
        </div>
      </div>

      {/* Tranches */}
      <div style={styles.sectionHeader}>
        <h3 style={styles.sectionTitle}>Floors / Tranches ({project.tranches.length})</h3>
        <button style={styles.addBtn} onClick={() => onOpenModal({ type: 'tranche', projectId: project.id })}>
          + Add Floor
        </button>
      </div>
      <div style={styles.list}>
        {project.tranches.length === 0 && (
          <div style={styles.empty}>No tranches yet. Add a floor to grow this building.</div>
        )}
        {project.tranches.map(tr => (
          <div key={tr.id} style={styles.listItem}>
            <div style={styles.listItemHeader}>
              <span style={styles.listItemName}>{tr.name}</span>
              <span style={styles.listItemValue}>{formatMoney(tr.amount.amount)}</span>
            </div>
            <div style={styles.listItemMeta}>
              {tr.rank} &middot; {tr.rate.index ?? 'Fixed'} + {tr.rate.margin ?? 0}%
            </div>
            <div style={styles.itemActions}>
              <button style={styles.smallBtn} onClick={() => onOpenModal({ type: 'tranche', projectId: project.id, tranche: tr })}>
                Edit
              </button>
              <button style={{ ...styles.smallBtn, color: '#FF4136' }} onClick={() => handleDeleteTranche(tr.id, tr.name)}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Covenants (read-only for now) */}
      {project.covenants.length > 0 && (
        <>
          <h3 style={{ ...styles.sectionTitle, marginTop: 16 }}>Covenants ({project.covenants.length})</h3>
          <div style={styles.list}>
            {project.covenants.map(cov => (
              <div key={cov.id} style={styles.listItem}>
                <div style={styles.listItemHeader}>
                  <span style={styles.listItemName}>{cov.name}</span>
                  <span style={styles.listItemMeta}>{cov.nature.replace('_', ' ')}</span>
                </div>
                <div style={styles.termRow}>
                  {cov.terms.map(term => (
                    <span
                      key={term.id}
                      style={{ ...styles.termDot, backgroundColor: TERM_STATUS_COLORS[term.currentStatus] ?? '#AAA' }}
                      title={`${term.name}: ${term.currentStatus}${term.waiver === false ? ' (waiver refused)' : ''}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Syndicate */}
      <div style={styles.sectionHeader}>
        <h3 style={styles.sectionTitle}>Syndicate ({project.lenders.length})</h3>
        <button style={styles.addBtn} onClick={() => onOpenModal({ type: 'lender', projectId: project.id })}>
          + Add Lender
        </button>
      </div>
      <div style={styles.list}>
        {project.lenders.length === 0 && (
          <div style={styles.empty}>No lenders yet. Build your syndicate.</div>
        )}
        {project.lenders.map(l => (
          <div key={l.id} style={styles.listItem}>
            <div style={styles.listItemHeader}>
              <span style={styles.listItemName}>
                {l.corporateName} {l.role !== 'participant' ? `(${l.role})` : ''}
              </span>
              <span style={styles.listItemValue}>{formatMoney(l.allocations.reduce((s, a) => s + a.amount.amount, 0))}</span>
            </div>
            <div style={styles.itemActions}>
              <button style={styles.smallBtn} onClick={() => onOpenModal({ type: 'lender', projectId: project.id, lender: l })}>
                Edit
              </button>
              <button style={{ ...styles.smallBtn, color: '#FF4136' }} onClick={() => handleDeleteLender(l.id, l.corporateName)}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 400,
    background: 'rgba(15, 20, 30, 0.95)',
    backdropFilter: 'blur(10px)',
    color: '#FFF',
    padding: 24,
    overflowY: 'auto',
    borderLeft: '1px solid rgba(255,255,255,0.1)',
    fontFamily: 'monospace',
    fontSize: 13,
    zIndex: 20,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: { margin: 0, fontSize: 16, fontWeight: 700, lineHeight: 1.3 },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  nature: { color: '#999', fontSize: 11, textTransform: 'capitalize' },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#FFF',
    fontSize: 24,
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
  },
  iconBtn: {
    background: 'none',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    color: '#AAA',
    fontSize: 14,
    cursor: 'pointer',
    padding: '4px 8px',
    lineHeight: 1,
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginBottom: 20,
    padding: 12,
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  statLabel: { color: '#888', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 },
  statValue: { fontSize: 13, fontWeight: 600 },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#888',
    margin: 0,
  },
  addBtn: {
    background: 'none',
    border: '1px solid rgba(74, 144, 217, 0.4)',
    borderRadius: 4,
    color: '#6AB0F0',
    fontSize: 10,
    fontWeight: 700,
    cursor: 'pointer',
    padding: '3px 10px',
    fontFamily: 'monospace',
  },
  list: { display: 'flex', flexDirection: 'column', gap: 6 },
  listItem: {
    padding: '8px 10px',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 6,
  },
  listItemHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  listItemName: { fontWeight: 600 },
  listItemValue: { color: '#6AB0F0', fontWeight: 600 },
  listItemMeta: { color: '#777', fontSize: 11, marginTop: 2 },
  itemActions: {
    display: 'flex',
    gap: 8,
    marginTop: 6,
  },
  smallBtn: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: 10,
    cursor: 'pointer',
    padding: '2px 0',
    fontFamily: 'monospace',
    textDecoration: 'underline',
  },
  termRow: { display: 'flex', gap: 6, marginTop: 6 },
  termDot: {
    display: 'inline-block',
    width: 10,
    height: 10,
    borderRadius: '50%',
    cursor: 'help',
  },
  empty: {
    color: '#555',
    fontSize: 11,
    fontStyle: 'italic',
    padding: '8px 0',
  },
};
