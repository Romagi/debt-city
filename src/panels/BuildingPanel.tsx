import type { CityBuilding, Project, ProjectStatus, Tranche } from '../types/portfolio';
import { PROJECT_STATUS_ACTIONS } from '../types/portfolio';
import type { PortfolioAction } from '../state/portfolio-reducer';
import { formatMoney } from '../city/utils';

type ModalOpener = (m: { type: 'deal'; project?: Project } | { type: 'tranche'; projectId: string; tranche?: Tranche }) => void;

interface Props {
  building: CityBuilding;
  dispatch: React.Dispatch<PortfolioAction>;
  onClose: () => void;
  onOpenModal: ModalOpener;
}

const STATUS_BADGES: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#FFD700', text: '#000' },
  published: { bg: '#2ECC40', text: '#FFF' },
  archived: { bg: '#999', text: '#FFF' },
  finished: { bg: '#666', text: '#FFF' },
};

export default function BuildingPanel({ building, dispatch, onClose, onOpenModal }: Props) {
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

  return (
    <div style={S.panel}>
      <div style={S.header}>
        <div style={{ flex: 1 }}>
          <div style={S.panelType}>Building — Deal</div>
          <h2 style={S.title}>{project.title}</h2>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ ...S.badge, backgroundColor: badge.bg, color: badge.text }}>{project.currentStatus}</span>
            <span style={S.nature}>{project.nature.replace('_', ' ')}</span>
          </div>
          {PROJECT_STATUS_ACTIONS[project.currentStatus].length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
              {PROJECT_STATUS_ACTIONS[project.currentStatus].map(a => (
                <button
                  key={a.target}
                  style={{ ...S.workflowBtn, borderColor: a.color + '66', color: a.color }}
                  onClick={() => dispatch({ type: 'EDIT_PROJECT', payload: { id: project.id, currentStatus: a.target as ProjectStatus } })}
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <button style={S.iconBtn} title="Edit Deal" onClick={() => onOpenModal({ type: 'deal', project })}>&#9998;</button>
          <button style={{ ...S.iconBtn, color: '#FF4136' }} title="Delete" onClick={handleDeleteProject}>&#128465;</button>
          <button onClick={onClose} style={S.closeBtn}>&times;</button>
        </div>
      </div>

      <div style={S.stats}>
        <div><div style={S.statLabel}>Total Funding</div><div style={S.statValue}>{project.globalFundingAmount.amount > 0 ? formatMoney(project.globalFundingAmount.amount) : 'No tranches'}</div></div>
        <div><div style={S.statLabel}>Agent</div><div style={S.statValue}>{project.agentName || '\u2014'}</div></div>
        <div><div style={S.statLabel}>Closing</div><div style={S.statValue}>{project.closingDate ?? 'TBD'}</div></div>
        <div><div style={S.statLabel}>Contract End</div><div style={S.statValue}>{project.contractEndDate ?? 'TBD'}</div></div>
        <div><div style={S.statLabel}>Tracking</div><div style={{ ...S.statValue, textTransform: 'capitalize' }}>{project.trackingType}</div></div>
        {project.fundingSpecificity && <div><div style={S.statLabel}>Specificity</div><div style={{ ...S.statValue, textTransform: 'capitalize' }}>{project.fundingSpecificity.replace(/_/g, ' ')}</div></div>}
      </div>
      {project.description && (
        <div style={{ color: '#999', fontSize: 11, fontStyle: 'italic', marginBottom: 16, lineHeight: 1.5, padding: '0 2px' }}>{project.description}</div>
      )}

      <div style={S.sectionHeader}>
        <h3 style={S.sectionTitle}>Floors / Tranches ({project.tranches.length})</h3>
        <button style={S.addBtn} onClick={() => onOpenModal({ type: 'tranche', projectId: project.id })}>+ Add Floor</button>
      </div>
      <div style={S.list}>
        {project.tranches.length === 0 && <div style={S.empty}>No tranches yet. Add a floor to grow this building.</div>}
        {project.tranches.map(tr => (
          <div key={tr.id} style={S.listItem}>
            <div style={S.listItemHeader}>
              <span style={S.listItemName}>{tr.name}</span>
              <span style={S.listItemValue}>{formatMoney(tr.amount.amount)}</span>
            </div>
            <div style={S.listItemMeta}>{tr.rank} &middot; {tr.rate.index ?? 'Fixed'} + {tr.rate.margin ?? 0}%</div>
            <div style={S.itemActions}>
              <button style={S.smallBtn} onClick={() => onOpenModal({ type: 'tranche', projectId: project.id, tranche: tr })}>Edit</button>
              <button style={{ ...S.smallBtn, color: '#FF4136' }} onClick={() => handleDeleteTranche(tr.id, tr.name)}>Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  panel: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 400, background: 'rgba(15, 20, 30, 0.95)', backdropFilter: 'blur(10px)', color: '#FFF', padding: 24, overflowY: 'auto', borderLeft: '1px solid rgba(255,255,255,0.1)', fontFamily: 'monospace', fontSize: 13, zIndex: 20 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  panelType: { color: '#6AB0F0', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  title: { margin: 0, fontSize: 16, fontWeight: 700, lineHeight: 1.3 },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' },
  nature: { color: '#999', fontSize: 11, textTransform: 'capitalize' },
  closeBtn: { background: 'none', border: 'none', color: '#FFF', fontSize: 24, cursor: 'pointer', padding: '0 4px', lineHeight: 1 },
  iconBtn: { background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#AAA', fontSize: 14, cursor: 'pointer', padding: '4px 8px', lineHeight: 1 },
  stats: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20, padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 8 },
  statLabel: { color: '#888', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 },
  statValue: { fontSize: 13, fontWeight: 600 },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 4 },
  sectionTitle: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#888', margin: 0 },
  addBtn: { background: 'none', border: '1px solid rgba(74,144,217,0.4)', borderRadius: 4, color: '#6AB0F0', fontSize: 10, fontWeight: 700, cursor: 'pointer', padding: '3px 10px', fontFamily: 'monospace' },
  list: { display: 'flex', flexDirection: 'column', gap: 6 },
  listItem: { padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 6 },
  listItemHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  listItemName: { fontWeight: 600 },
  listItemValue: { color: '#6AB0F0', fontWeight: 600 },
  listItemMeta: { color: '#777', fontSize: 11, marginTop: 2 },
  itemActions: { display: 'flex', gap: 8, marginTop: 6 },
  smallBtn: { background: 'none', border: 'none', color: '#888', fontSize: 10, cursor: 'pointer', padding: '2px 0', fontFamily: 'monospace', textDecoration: 'underline' },
  empty: { color: '#555', fontSize: 11, fontStyle: 'italic', padding: '8px 0' },
  workflowBtn: { padding: '3px 10px', fontSize: 9, fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3, border: '1px solid', borderRadius: 4, background: 'rgba(255,255,255,0.04)', cursor: 'pointer' },
};
