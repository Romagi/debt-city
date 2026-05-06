import { memo, type CSSProperties } from 'react';
import type { CityBuilding, Lender, Tranche } from '../types/portfolio';
import { getLenderTotal } from '../types/portfolio';
import type { PortfolioAction } from '../state/portfolio-reducer';
import { formatMoney } from '../city/utils';
import { tokens } from '../styles/tokens';
import { makePanelStyles } from './panelStyles';

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
  none: 'Pas de syndicat',
  kiosk: 'Kiosque',
  shop: 'Commerce',
  mall: 'Mall',
};

const ROLE_BADGES: Record<string, { bg: string; color: string; label: string }> = {
  agent:       { bg: tokens.color.constructBg, color: tokens.color.construct, label: 'Agent' },
  arranger:    { bg: tokens.color.brickBg,     color: tokens.color.brick,     label: 'Arranger' },
  participant: { bg: tokens.color.surfaceLo,   color: tokens.color.textMid,   label: 'Participant' },
};

const S = makePanelStyles(tokens.color.brick);

function ShopPanel({ building, dispatch, onClose, onOpenModal }: Props) {
  const { project, syndicateSize } = building;
  const lenders = project.lenders;
  const totalParticipation = lenders.reduce((s, l) => s + getLenderTotal(l), 0);

  function handleDeleteLender(lenderId: string, name: string) {
    if (confirm(`Retirer "${name}" du syndicat ?`)) {
      dispatch({ type: 'DELETE_LENDER', payload: { projectId: project.id, lenderId } });
    }
  }

  function handleDeleteAllocation(lenderId: string, trancheId: string) {
    dispatch({ type: 'DELETE_ALLOCATION', payload: { projectId: project.id, lenderId, trancheId } });
  }

  return (
    <div style={S.panel}>
      <div style={S.header}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.panelType}>COMMERCE · SYNDICAT</div>
          <h2 style={S.title}>{project.title}</h2>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={localStyles.sizeBadge}>{SIZE_LABELS[syndicateSize]}</span>
            <span style={S.nature}>
              {lenders.length} LENDER{lenders.length !== 1 ? 'S' : ''}
            </span>
          </div>
        </div>
        <button onClick={onClose} style={S.closeBtn} title="Fermer">&times;</button>
      </div>

      <div style={S.stats}>
        <div>
          <div style={S.statLabel}>PARTICIPATION TOTALE</div>
          <div style={S.statValue}>{formatMoney(totalParticipation)}</div>
        </div>
        <div>
          <div style={S.statLabel}>FUNDING DEAL</div>
          <div style={S.statValue}>{formatMoney(project.globalFundingAmount.amount)}</div>
        </div>
      </div>

      <div style={S.sectionHeader}>
        <h3 style={S.sectionTitle}>MEMBRES DU SYNDICAT</h3>
        <button style={S.addBtn} onClick={() => onOpenModal({ type: 'lender', projectId: project.id })}>
          + Lender
        </button>
      </div>
      <div style={S.list}>
        {lenders.length === 0 && (
          <div style={S.empty}>
            Aucun lender pour l'instant.<br />
            Construis ton syndicat pour faire grandir ce commerce.
          </div>
        )}
        {lenders.map(l => {
          const lTotal = getLenderTotal(l);
          const rb = ROLE_BADGES[l.role] ?? ROLE_BADGES.participant;
          return (
            <div key={l.id} style={S.listItem}>
              <div style={S.listItemHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
                  <span style={S.listItemName}>{l.corporateName}</span>
                  <span style={{ ...localStyles.roleBadge, background: rb.bg, color: rb.color }}>{rb.label}</span>
                </div>
                <span style={S.listItemValue}>{formatMoney(lTotal)}</span>
              </div>

              {(l.headOffice || l.legalForm) && (
                <div style={{ ...S.listItemMeta, marginTop: 4 }}>
                  {[l.legalForm, l.headOffice].filter(Boolean).join(' · ')}
                </div>
              )}

              {l.allocations.length > 0 && (
                <div style={localStyles.allocations}>
                  {l.allocations.map(a => (
                    <div key={a.trancheId} style={localStyles.allocationRow}>
                      <span style={localStyles.allocationName}>{a.trancheName}</span>
                      <span style={localStyles.allocationAmount}>{formatMoney(a.amount.amount)}</span>
                      <button
                        style={localStyles.delBtn}
                        onClick={() => handleDeleteAllocation(l.id, a.trancheId)}
                        title="Retirer cette allocation"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {totalParticipation > 0 && lTotal > 0 && (
                <div style={localStyles.bar}>
                  <div style={{ ...localStyles.barFill, width: `${(lTotal / totalParticipation) * 100}%` }} />
                </div>
              )}

              <div style={S.itemActions}>
                <button
                  style={S.smallBtn}
                  onClick={() => onOpenModal({ type: 'allocation', projectId: project.id, lender: l, tranches: project.tranches })}
                >
                  + Allocation
                </button>
                <button style={S.smallBtn} onClick={() => onOpenModal({ type: 'lender', projectId: project.id, lender: l })}>
                  Modifier
                </button>
                <button
                  style={{ ...S.smallBtn, color: tokens.color.debt }}
                  onClick={() => handleDeleteLender(l.id, l.corporateName)}
                >
                  Retirer
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(ShopPanel);

const localStyles: Record<string, CSSProperties> = {
  sizeBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: tokens.radius.pill,
    fontFamily: tokens.font.mono,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    background: tokens.color.brickBg,
    color: tokens.color.brick,
    border: `1px solid ${tokens.color.brickBd}`,
  },
  roleBadge: {
    padding: '2px 8px',
    borderRadius: tokens.radius.pill,
    fontFamily: tokens.font.mono,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
  },
  allocations: {
    marginTop: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    paddingLeft: 10,
    borderLeft: `2px solid ${tokens.color.brickBd}`,
  },
  allocationRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 11,
  },
  allocationName: {
    color: tokens.color.textMid,
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  allocationAmount: {
    fontFamily: tokens.font.mono,
    color: tokens.color.text,
    fontWeight: 600,
  },
  delBtn: {
    background: 'transparent',
    border: 'none',
    color: tokens.color.textDim,
    fontSize: 14,
    cursor: 'pointer',
    padding: '0 2px',
    lineHeight: 1,
  },
  bar: {
    height: 4,
    background: tokens.color.surfaceLo,
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    background: tokens.color.brick,
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
};
