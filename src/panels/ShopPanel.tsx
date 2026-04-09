import type { CityBuilding, Lender, Tranche } from '../types/portfolio';
import { getLenderTotal } from '../types/portfolio';
import type { PortfolioAction } from '../state/portfolio-reducer';
import { formatMoney } from '../city/utils';

type ModalOpener = (m:
  | { type: 'lender'; projectId: string; lender?: Lender }
  | { type: 'allocation'; projectId: string; lender: Lender; tranches: Tranche[] }
) => void;

interface Props {
  building: CityBuilding;
  dispatch: React.Dispatch<PortfolioAction>;
  onClose: () => void;
  onOpenModal: ModalOpener;
}

const SIZE_LABELS: Record<string, string> = {
  none: 'No shop',
  kiosk: 'Kiosk',
  shop: 'Shop',
  mall: 'Mall',
};

const ROLE_BADGES: Record<string, { bg: string; label: string }> = {
  agent: { bg: 'rgba(74,144,217,0.25)', label: 'Agent' },
  arranger: { bg: 'rgba(212,165,116,0.25)', label: 'Arranger' },
  participant: { bg: 'rgba(255,255,255,0.08)', label: 'Participant' },
};

export default function ShopPanel({ building, dispatch, onClose, onOpenModal }: Props) {
  const { project, syndicateSize } = building;
  const lenders = project.lenders;
  const totalParticipation = lenders.reduce((s, l) => s + getLenderTotal(l), 0);

  function handleDeleteLender(lenderId: string, name: string) {
    if (confirm(`Remove "${name}" from syndicate?`)) {
      dispatch({ type: 'DELETE_LENDER', payload: { projectId: project.id, lenderId } });
    }
  }

  function handleDeleteAllocation(lenderId: string, trancheId: string) {
    dispatch({ type: 'DELETE_ALLOCATION', payload: { projectId: project.id, lenderId, trancheId } });
  }

  return (
    <div style={S.panel}>
      <div style={S.header}>
        <div style={{ flex: 1 }}>
          <div style={S.panelType}>Shop — Syndicate</div>
          <h2 style={S.title}>{project.title}</h2>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={S.sizeBadge}>{SIZE_LABELS[syndicateSize]}</span>
            <span style={{ color: '#AAA', fontSize: 11 }}>{lenders.length} lender{lenders.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <button onClick={onClose} style={S.closeBtn}>&times;</button>
      </div>

      <div style={S.stats}>
        <div><div style={S.statLabel}>Total Participation</div><div style={S.statValue}>{formatMoney(totalParticipation)}</div></div>
        <div><div style={S.statLabel}>Deal Funding</div><div style={S.statValue}>{formatMoney(project.globalFundingAmount.amount)}</div></div>
      </div>

      <div style={S.sectionHeader}>
        <h3 style={S.sectionTitle}>Syndicate Members</h3>
        <button style={S.addBtn} onClick={() => onOpenModal({ type: 'lender', projectId: project.id })}>+ Add Lender</button>
      </div>
      <div style={S.list}>
        {lenders.length === 0 && <div style={S.empty}>No lenders yet. Build your syndicate to grow this shop.</div>}
        {lenders.map(l => {
          const lTotal = getLenderTotal(l);
          const rb = ROLE_BADGES[l.role] ?? ROLE_BADGES.participant;
          return (
            <div key={l.id} style={S.listItem}>
              <div style={S.listItemHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={S.listItemName}>{l.corporateName}</span>
                  <span style={{ ...S.roleBadge, background: rb.bg }}>{rb.label}</span>
                </div>
                <span style={S.listItemValue}>{formatMoney(lTotal)}</span>
              </div>

              {(l.headOffice || l.legalForm) && (
                <div style={{ color: '#777', fontSize: 10, marginTop: 2 }}>
                  {[l.legalForm, l.headOffice].filter(Boolean).join(' · ')}
                </div>
              )}

              {/* Allocations per tranche */}
              {l.allocations.length > 0 && (
                <div style={S.allocations}>
                  {l.allocations.map(a => (
                    <div key={a.trancheId} style={S.allocationRow}>
                      <span style={S.allocationName}>{a.trancheName}</span>
                      <span style={S.allocationAmount}>{formatMoney(a.amount.amount)}</span>
                      <button style={S.delBtn} onClick={() => handleDeleteAllocation(l.id, a.trancheId)} title="Remove allocation">&times;</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Total bar */}
              {totalParticipation > 0 && lTotal > 0 && (
                <div style={S.bar}>
                  <div style={{ ...S.barFill, width: `${(lTotal / totalParticipation) * 100}%` }} />
                </div>
              )}

              <div style={S.itemActions}>
                <button style={S.smallBtn} onClick={() => onOpenModal({ type: 'allocation', projectId: project.id, lender: l, tranches: project.tranches })}>+ Allocation</button>
                <button style={S.smallBtn} onClick={() => onOpenModal({ type: 'lender', projectId: project.id, lender: l })}>Edit</button>
                <button style={{ ...S.smallBtn, color: '#FF4136' }} onClick={() => handleDeleteLender(l.id, l.corporateName)}>Remove</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  panel: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 400, background: 'rgba(15, 20, 30, 0.95)', backdropFilter: 'blur(10px)', color: '#FFF', padding: 24, overflowY: 'auto', borderLeft: '1px solid rgba(255,255,255,0.1)', fontFamily: 'monospace', fontSize: 13, zIndex: 20 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  panelType: { color: '#D4A574', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  title: { margin: 0, fontSize: 16, fontWeight: 700, lineHeight: 1.3 },
  sizeBadge: { display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: 'rgba(212,165,116,0.2)', color: '#D4A574', border: '1px solid rgba(212,165,116,0.3)' },
  closeBtn: { background: 'none', border: 'none', color: '#FFF', fontSize: 24, cursor: 'pointer', padding: '0 4px', lineHeight: 1 },
  stats: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20, padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 8 },
  statLabel: { color: '#888', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 },
  statValue: { fontSize: 14, fontWeight: 700 },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 4 },
  sectionTitle: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#888', margin: 0 },
  addBtn: { background: 'none', border: '1px solid rgba(212,165,116,0.4)', borderRadius: 4, color: '#D4A574', fontSize: 10, fontWeight: 700, cursor: 'pointer', padding: '3px 10px', fontFamily: 'monospace' },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  listItem: { padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 6 },
  listItemHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  listItemName: { fontWeight: 600 },
  listItemValue: { color: '#D4A574', fontWeight: 600 },
  roleBadge: { padding: '1px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#CCC' },
  allocations: { marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 8, borderLeft: '2px solid rgba(212,165,116,0.2)' },
  allocationRow: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 },
  allocationName: { color: '#AAA', flex: 1 },
  allocationAmount: { color: '#CCC', fontWeight: 600 },
  delBtn: { background: 'none', border: 'none', color: '#666', fontSize: 12, cursor: 'pointer', padding: '0 2px', lineHeight: 1 },
  bar: { height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  barFill: { height: '100%', background: '#D4A574', borderRadius: 2 },
  itemActions: { display: 'flex', gap: 8, marginTop: 6 },
  smallBtn: { background: 'none', border: 'none', color: '#888', fontSize: 10, cursor: 'pointer', padding: '2px 0', fontFamily: 'monospace', textDecoration: 'underline' },
  empty: { color: '#555', fontSize: 11, fontStyle: 'italic', padding: '8px 0' },
};
