import type { CityBuilding, Covenant, TermStatus } from '../types/portfolio';
import { TERM_ACTIONS } from '../types/portfolio';
import type { PortfolioAction } from '../state/portfolio-reducer';

const TERM_STATUS_COLORS: Record<string, string> = {
  validated: '#2ECC40', coming: '#87CEEB', pending: '#FFD700',
  result_received: '#FF851B', result_ko: '#FF851B', non_compliant: '#FF851B',
  breached: '#FF4136', created: '#AAA', deactivated: '#666',
};

const TRAFFIC_BADGES: Record<string, { bg: string; label: string }> = {
  green: { bg: '#2ECC40', label: 'Compliant' },
  orange: { bg: '#FF851B', label: 'At Risk' },
  red: { bg: '#FF4136', label: 'Breached' },
  grey: { bg: '#888', label: 'No Data' },
};

type ModalOpener = (m:
  | { type: 'covenant'; projectId: string; covenant?: Covenant }
  | { type: 'term'; projectId: string; covenantId: string }
) => void;

interface Props {
  building: CityBuilding;
  dispatch: React.Dispatch<PortfolioAction>;
  onClose: () => void;
  onOpenModal: ModalOpener;
}

export default function TownhallPanel({ building, dispatch, onClose, onOpenModal }: Props) {
  const { project, trafficLight, alertLevel } = building;
  const covenants = project.covenants;
  const tb = TRAFFIC_BADGES[trafficLight] ?? TRAFFIC_BADGES.grey;

  function handleTransition(covenantId: string, termId: string, newStatus: TermStatus) {
    dispatch({ type: 'TRANSITION_TERM', payload: { projectId: project.id, covenantId, termId, newStatus } });
  }

  function handleWaiver(covenantId: string, termId: string, granted: boolean) {
    dispatch({ type: 'SET_WAIVER', payload: { projectId: project.id, covenantId, termId, granted } });
  }

  function handleDeleteCovenant(covenantId: string, name: string) {
    if (confirm(`Delete covenant "${name}" and all its terms?`)) {
      dispatch({ type: 'DELETE_COVENANT', payload: { projectId: project.id, covenantId } });
    }
  }

  function handleDeleteTerm(covenantId: string, termId: string, name: string) {
    if (confirm(`Delete term "${name}"?`)) {
      dispatch({ type: 'DELETE_TERM', payload: { projectId: project.id, covenantId, termId } });
    }
  }

  return (
    <div style={S.panel}>
      <div style={S.header}>
        <div style={{ flex: 1 }}>
          <div style={S.panelType}>Mairie — Covenants</div>
          <h2 style={S.title}>{project.title}</h2>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ ...S.badge, backgroundColor: tb.bg, color: '#FFF' }}>{tb.label}</span>
            {alertLevel !== 'none' && (
              <span style={{ color: alertLevel === 'fire' ? '#FF4136' : '#AAA', fontSize: 11 }}>
                {alertLevel === 'fire' ? 'Waiver refused' : 'Breach detected'}
              </span>
            )}
          </div>
        </div>
        <button onClick={onClose} style={S.closeBtn}>&times;</button>
      </div>

      {/* Summary */}
      <div style={S.stats}>
        <div><div style={S.statLabel}>Covenants</div><div style={S.statValue}>{covenants.length}</div></div>
        <div>
          <div style={S.statLabel}>Breached Terms</div>
          <div style={{ ...S.statValue, color: '#FF4136' }}>
            {covenants.flatMap(c => c.terms).filter(t => t.currentStatus === 'breached').length}
          </div>
        </div>
      </div>

      {/* Covenant list */}
      <div style={S.sectionHeader}>
        <h3 style={S.sectionTitle}>Covenants ({covenants.length})</h3>
        <button style={S.addBtn} onClick={() => onOpenModal({ type: 'covenant', projectId: project.id })}>
          + Add Covenant
        </button>
      </div>
      <div style={S.list}>
        {covenants.length === 0 && <div style={S.empty}>No covenants defined for this deal.</div>}
        {covenants.map(cov => (
          <div key={cov.id} style={S.listItem}>
            <div style={S.listItemHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={S.listItemName}>{cov.name}</span>
                <span style={{ ...S.versionBadge, ...(cov.status === 'published' ? S.versionPublished : S.versionDraft) }}>
                  {cov.status === 'published' ? 'Published' : 'Draft'} v{cov.version}
                </span>
              </div>
              <span style={S.listItemMeta}>{cov.nature.replace(/_/g, ' ')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
              {cov.status === 'draft' && (
                <>
                  <button style={{ ...S.actionBtn, borderColor: 'rgba(46,204,64,0.4)', color: '#2ECC40' }}
                    onClick={() => dispatch({ type: 'PUBLISH_COVENANT', payload: { projectId: project.id, covenantId: cov.id } })}>
                    Publish
                  </button>
                  <button style={S.smallBtn} onClick={() => onOpenModal({ type: 'covenant', projectId: project.id, covenant: cov })}>Edit</button>
                  <button style={{ ...S.smallBtn, color: '#FF4136' }} onClick={() => handleDeleteCovenant(cov.id, cov.name)}>Del</button>
                </>
              )}
              {cov.status === 'published' && (
                <button style={{ ...S.actionBtn, borderColor: 'rgba(74,144,217,0.4)', color: '#6AB0F0' }}
                  onClick={() => dispatch({ type: 'AMEND_COVENANT', payload: { projectId: project.id, covenantId: cov.id } })}>
                  Create Amendment
                </button>
              )}
              {cov.versions.length > 0 && (
                <span style={{ color: '#666', fontSize: 9, marginLeft: 'auto' }}>{cov.versions.length} version{cov.versions.length > 1 ? 's' : ''}</span>
              )}
            </div>

            {/* Terms */}
            <div style={S.termRow}>
              {cov.terms.map(term => {
                const actions = TERM_ACTIONS[term.currentStatus] ?? [];
                const isBreached = term.currentStatus === 'breached';
                const waiverPending = isBreached && term.waiver === null;

                return (
                  <div key={term.id} style={S.termItem}>
                    {/* Status row */}
                    <div style={S.termChip}>
                      <span style={{ ...S.termDot, backgroundColor: TERM_STATUS_COLORS[term.currentStatus] ?? '#AAA' }} />
                      <span style={S.termLabel}>{term.name}</span>
                      <span style={S.termStatus}>{term.currentStatus.replace(/_/g, ' ')}</span>
                      {term.waiver === false && <span style={S.waiverBadge}>waiver refused</span>}
                      {term.waiver === true && <span style={{ ...S.waiverBadge, color: '#2ECC40' }}>waiver granted</span>}
                      <button
                        style={{ ...S.smallBtn, color: '#666', fontSize: 9, marginLeft: 'auto' }}
                        onClick={() => handleDeleteTerm(cov.id, term.id, term.name)}
                        title="Delete term"
                      >
                        &times;
                      </button>
                    </div>

                    {/* Action buttons */}
                    {(actions.length > 0 || waiverPending) && (
                      <div style={S.actionRow}>
                        {actions.map(a => (
                          <button
                            key={a.target}
                            style={a.target === 'breached' || a.target === 'non_compliant' ? S.actionBtnDanger : S.actionBtn}
                            onClick={() => handleTransition(cov.id, term.id, a.target)}
                          >
                            {a.label}
                          </button>
                        ))}
                        {waiverPending && (
                          <>
                            <button style={S.waiverGrantBtn} onClick={() => handleWaiver(cov.id, term.id, true)}>
                              Grant Waiver
                            </button>
                            <button style={S.waiverRefuseBtn} onClick={() => handleWaiver(cov.id, term.id, false)}>
                              Refuse Waiver
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add Term button */}
              <button
                style={S.addTermBtn}
                onClick={() => onOpenModal({ type: 'term', projectId: project.id, covenantId: cov.id })}
              >
                + Add Term
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const actionBtnBase: React.CSSProperties = {
  padding: '2px 6px',
  fontSize: 9,
  fontFamily: 'monospace',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 3,
  background: 'rgba(255,255,255,0.06)',
  color: '#CCC',
  cursor: 'pointer',
  textTransform: 'uppercase',
  fontWeight: 700,
  letterSpacing: 0.3,
};

const S: Record<string, React.CSSProperties> = {
  panel: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 400, background: 'rgba(15, 20, 30, 0.95)', backdropFilter: 'blur(10px)', color: '#FFF', padding: 24, overflowY: 'auto', borderLeft: '1px solid rgba(255,255,255,0.1)', fontFamily: 'monospace', fontSize: 13, zIndex: 20 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  panelType: { color: '#A88A74', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  title: { margin: 0, fontSize: 16, fontWeight: 700, lineHeight: 1.3 },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' },
  closeBtn: { background: 'none', border: 'none', color: '#FFF', fontSize: 24, cursor: 'pointer', padding: '0 4px', lineHeight: 1 },
  stats: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20, padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 8 },
  statLabel: { color: '#888', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 },
  statValue: { fontSize: 16, fontWeight: 700 },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 4 },
  sectionTitle: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#888', margin: 0 },
  addBtn: { background: 'none', border: '1px solid rgba(168,138,116,0.4)', borderRadius: 4, color: '#A88A74', fontSize: 10, fontWeight: 700, cursor: 'pointer', padding: '3px 10px', fontFamily: 'monospace' },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  listItem: { padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 6 },
  listItemHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  listItemName: { fontWeight: 700, fontSize: 13 },
  listItemMeta: { color: '#777', fontSize: 10, textTransform: 'capitalize' },
  smallBtn: { background: 'none', border: 'none', color: '#888', fontSize: 10, cursor: 'pointer', padding: '2px 0', fontFamily: 'monospace', textDecoration: 'underline' },
  termRow: { display: 'flex', flexDirection: 'column', gap: 6 },
  termItem: { display: 'flex', flexDirection: 'column', gap: 3 },
  termChip: { display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' },
  termDot: { display: 'inline-block', width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  termLabel: { fontSize: 11, color: '#CCC', minWidth: 50 },
  termStatus: { fontSize: 10, color: '#888', textTransform: 'capitalize' },
  waiverBadge: { fontSize: 9, color: '#FF4136', fontWeight: 700, textTransform: 'uppercase' },
  empty: { color: '#555', fontSize: 11, fontStyle: 'italic', padding: '8px 0' },
  actionRow: { display: 'flex', gap: 4, flexWrap: 'wrap', marginLeft: 14 },
  actionBtn: { ...actionBtnBase },
  actionBtnDanger: { ...actionBtnBase, borderColor: 'rgba(255,133,27,0.4)', color: '#FF851B' },
  waiverGrantBtn: { ...actionBtnBase, borderColor: 'rgba(46,204,64,0.4)', color: '#2ECC40' },
  waiverRefuseBtn: { ...actionBtnBase, borderColor: 'rgba(255,65,54,0.4)', color: '#FF4136' },
  addTermBtn: { ...actionBtnBase, marginTop: 4, borderColor: 'rgba(168,138,116,0.3)', color: '#A88A74', alignSelf: 'flex-start' },
  versionBadge: { padding: '1px 6px', borderRadius: 3, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 },
  versionDraft: { background: 'rgba(255,215,0,0.15)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.3)' },
  versionPublished: { background: 'rgba(46,204,64,0.15)', color: '#2ECC40', border: '1px solid rgba(46,204,64,0.3)' },
};
