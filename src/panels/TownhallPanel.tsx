import { memo, type CSSProperties } from 'react';
import type { CityBuilding, Covenant, TermStatus } from '../types/portfolio';
import { TERM_ACTIONS } from '../types/portfolio';
import type { PortfolioAction } from '../state/portfolio-reducer';
import { tokens } from '../styles/tokens';
import { makePanelStyles } from './panelStyles';

const TERM_STATUS_COLORS: Record<string, string> = {
  validated:       tokens.color.money,
  coming:          tokens.color.construct,
  pending:         tokens.color.citizen,
  result_received: tokens.color.brick,
  result_ko:       tokens.color.brick,
  non_compliant:   tokens.color.brick,
  breached:        tokens.color.debt,
  created:         tokens.color.textMid,
  deactivated:     tokens.color.textDim,
};

const TRAFFIC_BADGES: Record<string, { bg: string; color: string; label: string }> = {
  green: { bg: tokens.color.moneyBg,  color: tokens.color.money,  label: 'CONFORME' },
  orange:{ bg: tokens.color.brickBg,  color: tokens.color.brick,  label: 'À RISQUE' },
  red:   { bg: tokens.color.debtBg,   color: tokens.color.debt,   label: 'BREACH' },
  grey:  { bg: tokens.color.surfaceLo,color: tokens.color.textDim,label: 'SANS DONNÉES' },
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

const S = makePanelStyles(tokens.color.citizen);

function TownhallPanel({ building, dispatch, onClose, onOpenModal }: Props) {
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
    if (confirm(`Supprimer le covenant "${name}" et tous ses terms ?`)) {
      dispatch({ type: 'DELETE_COVENANT', payload: { projectId: project.id, covenantId } });
    }
  }

  function handleDeleteTerm(covenantId: string, termId: string, name: string) {
    if (confirm(`Supprimer le term "${name}" ?`)) {
      dispatch({ type: 'DELETE_TERM', payload: { projectId: project.id, covenantId, termId } });
    }
  }

  return (
    <div style={S.panel}>
      <div style={S.header}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.panelType}>MAIRIE · COVENANTS</div>
          <h2 style={S.title}>{project.title}</h2>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ ...S.badge, background: tb.bg, color: tb.color }}>{tb.label}</span>
            {alertLevel !== 'none' && (
              <span style={{ ...S.nature, color: alertLevel === 'fire' ? tokens.color.debt : tokens.color.textMid }}>
                {alertLevel === 'fire' ? 'WAIVER REFUSÉ' : 'BREACH DÉTECTÉ'}
              </span>
            )}
          </div>
        </div>
        <button onClick={onClose} style={S.closeBtn} title="Fermer">&times;</button>
      </div>

      <div style={S.stats}>
        <div>
          <div style={S.statLabel}>COVENANTS</div>
          <div style={S.statValue}>{covenants.length}</div>
        </div>
        <div>
          <div style={S.statLabel}>TERMS EN BREACH</div>
          <div style={{ ...S.statValue, color: tokens.color.debt }}>
            {covenants.flatMap(c => c.terms).filter(t => t.currentStatus === 'breached').length}
          </div>
        </div>
      </div>

      <div style={S.sectionHeader}>
        <h3 style={S.sectionTitle}>COVENANTS · {covenants.length}</h3>
        <button style={S.addBtn} onClick={() => onOpenModal({ type: 'covenant', projectId: project.id })}>
          + Covenant
        </button>
      </div>
      <div style={S.list}>
        {covenants.length === 0 && <div style={S.empty}>Aucun covenant défini sur ce deal.</div>}
        {covenants.map(cov => (
          <div key={cov.id} style={S.listItem}>
            <div style={{ ...S.listItemHeader, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
                <span style={S.listItemName}>{cov.name}</span>
                <span style={{ ...localStyles.versionBadge, ...(cov.status === 'published' ? localStyles.versionPublished : localStyles.versionDraft) }}>
                  {cov.status === 'published' ? 'PUBLIÉ' : 'DRAFT'} v{cov.version}
                </span>
              </div>
              <span style={S.listItemMeta}>{cov.nature.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              {cov.status === 'draft' && (
                <>
                  <button
                    style={{ ...localStyles.actionBtn, borderColor: tokens.color.moneyBd, color: tokens.color.money }}
                    onClick={() => dispatch({ type: 'PUBLISH_COVENANT', payload: { projectId: project.id, covenantId: cov.id } })}
                  >
                    Publier
                  </button>
                  <button style={S.smallBtn} onClick={() => onOpenModal({ type: 'covenant', projectId: project.id, covenant: cov })}>
                    Modifier
                  </button>
                  <button style={{ ...S.smallBtn, color: tokens.color.debt }} onClick={() => handleDeleteCovenant(cov.id, cov.name)}>
                    Supprimer
                  </button>
                </>
              )}
              {cov.status === 'published' && (
                <button
                  style={{ ...localStyles.actionBtn, borderColor: tokens.color.constructBd, color: tokens.color.construct }}
                  onClick={() => dispatch({ type: 'AMEND_COVENANT', payload: { projectId: project.id, covenantId: cov.id } })}
                >
                  Créer un avenant
                </button>
              )}
              {cov.versions.length > 0 && (
                <span style={{ ...S.listItemMeta, marginLeft: 'auto', marginTop: 0 }}>
                  {cov.versions.length} VERSION{cov.versions.length > 1 ? 'S' : ''}
                </span>
              )}
            </div>

            <div style={localStyles.termRow}>
              {cov.terms.map(term => {
                const actions = TERM_ACTIONS[term.currentStatus] ?? [];
                const isBreached = term.currentStatus === 'breached';
                const waiverPending = isBreached && term.waiver === null;

                return (
                  <div key={term.id} style={localStyles.termItem}>
                    <div style={localStyles.termChip}>
                      <span style={{ ...localStyles.termDot, backgroundColor: TERM_STATUS_COLORS[term.currentStatus] ?? tokens.color.textMid }} />
                      <span style={localStyles.termLabel}>{term.name}</span>
                      <span style={localStyles.termStatus}>{term.currentStatus.replace(/_/g, ' ').toUpperCase()}</span>
                      {term.waiver === false && <span style={localStyles.waiverBadge}>WAIVER REFUSÉ</span>}
                      {term.waiver === true && <span style={{ ...localStyles.waiverBadge, color: tokens.color.money }}>WAIVER OK</span>}
                      <button
                        style={{ ...S.smallBtn, fontSize: 10, marginLeft: 'auto' }}
                        onClick={() => handleDeleteTerm(cov.id, term.id, term.name)}
                        title="Supprimer ce term"
                      >
                        &times;
                      </button>
                    </div>

                    {(actions.length > 0 || waiverPending) && (
                      <div style={localStyles.actionRow}>
                        {actions.map(a => (
                          <button
                            key={a.target}
                            style={
                              a.target === 'breached' || a.target === 'non_compliant'
                                ? localStyles.actionBtnDanger
                                : localStyles.actionBtn
                            }
                            onClick={() => handleTransition(cov.id, term.id, a.target)}
                          >
                            {a.label}
                          </button>
                        ))}
                        {waiverPending && (
                          <>
                            <button style={localStyles.waiverGrantBtn} onClick={() => handleWaiver(cov.id, term.id, true)}>
                              Accorder waiver
                            </button>
                            <button style={localStyles.waiverRefuseBtn} onClick={() => handleWaiver(cov.id, term.id, false)}>
                              Refuser waiver
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                style={{ ...localStyles.actionBtn, marginTop: 4, alignSelf: 'flex-start', borderColor: tokens.color.citizenBd, color: tokens.color.citizen }}
                onClick={() => onOpenModal({ type: 'term', projectId: project.id, covenantId: cov.id })}
              >
                + Term
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(TownhallPanel);

const actionBtnBase: CSSProperties = {
  padding: '4px 10px',
  fontFamily: tokens.font.mono,
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  border: `1px solid ${tokens.color.hairline2}`,
  borderRadius: tokens.radius.pill,
  background: tokens.color.surfaceLo,
  color: tokens.color.textMid,
  cursor: 'pointer',
};

const localStyles: Record<string, CSSProperties> = {
  termRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  termItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  termChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 0',
    flexWrap: 'wrap',
  },
  termDot: {
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: '0 0 6px currentColor',
  },
  termLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: tokens.color.text,
    minWidth: 50,
  },
  termStatus: {
    fontFamily: tokens.font.mono,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: tokens.color.textDim,
  },
  waiverBadge: {
    fontFamily: tokens.font.mono,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: tokens.color.debt,
  },
  actionRow: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
    marginLeft: 16,
  },
  actionBtn: { ...actionBtnBase },
  actionBtnDanger: { ...actionBtnBase, borderColor: tokens.color.brickBd, color: tokens.color.brick },
  waiverGrantBtn: { ...actionBtnBase, borderColor: tokens.color.moneyBd, color: tokens.color.money },
  waiverRefuseBtn: { ...actionBtnBase, borderColor: tokens.color.debtBd, color: tokens.color.debt },
  versionBadge: {
    padding: '2px 8px',
    borderRadius: tokens.radius.pill,
    fontFamily: tokens.font.mono,
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
  },
  versionDraft: {
    background: tokens.color.citizenBg,
    color: tokens.color.citizen,
    border: `1px solid ${tokens.color.citizenBd}`,
  },
  versionPublished: {
    background: tokens.color.moneyBg,
    color: tokens.color.money,
    border: `1px solid ${tokens.color.moneyBd}`,
  },
};
