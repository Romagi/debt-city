import { memo, type CSSProperties } from 'react';
import type { CityBuilding, Borrower, Project, Tranche, Lender } from '../types/portfolio';
import type { PortfolioAction } from '../state/portfolio-reducer';
import { formatMoney } from '../city/utils';
import { tokens } from '../styles/tokens';
import { makePanelStyles, STATUS_BADGES } from './panelStyles';

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

const S = makePanelStyles(tokens.color.construct);

function DealPanel({ building, dispatch, onClose, onOpenModal }: Props) {
  const { project } = building;
  const badge = STATUS_BADGES[project.currentStatus] ?? STATUS_BADGES.draft;

  function handleDeleteProject() {
    if (confirm(`Supprimer "${project.title}" ? Cette action est définitive.`)) {
      dispatch({ type: 'DELETE_PROJECT', payload: { id: project.id } });
      onClose();
    }
  }

  function handleDeleteTranche(trancheId: string, name: string) {
    if (confirm(`Retirer la tranche "${name}" ?`)) {
      dispatch({ type: 'DELETE_TRANCHE', payload: { projectId: project.id, trancheId } });
    }
  }

  function handleDeleteLender(lenderId: string, name: string) {
    if (confirm(`Retirer "${name}" du syndicat ?`)) {
      dispatch({ type: 'DELETE_LENDER', payload: { projectId: project.id, lenderId } });
    }
  }

  return (
    <div style={S.panel}>
      <div style={S.header}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.panelType}>DEAL · OVERVIEW</div>
          <h2 style={S.title}>{project.title}</h2>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ ...S.badge, backgroundColor: badge.bg, color: badge.text }}>
              {project.currentStatus}
            </span>
            <span style={S.nature}>{project.nature.replace(/_/g, ' ')}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexShrink: 0 }}>
          <button style={S.iconBtn} title="Modifier le deal" onClick={() => onOpenModal({ type: 'deal', project })}>
            &#9998;
          </button>
          <button
            style={{ ...S.iconBtn, color: tokens.color.debt }}
            title="Supprimer le deal"
            onClick={handleDeleteProject}
          >
            &#128465;
          </button>
          <button onClick={onClose} style={S.closeBtn} title="Fermer">&times;</button>
        </div>
      </div>

      <div style={S.stats}>
        <div>
          <div style={S.statLabel}>FUNDING TOTAL</div>
          <div style={S.statValue}>
            {project.globalFundingAmount.amount > 0 ? formatMoney(project.globalFundingAmount.amount) : '—'}
          </div>
        </div>
        <div>
          <div style={S.statLabel}>AGENT</div>
          <div style={S.statValue}>{project.agentName || '—'}</div>
        </div>
        <div>
          <div style={S.statLabel}>CLOSING</div>
          <div style={S.statValue}>{project.closingDate ?? 'TBD'}</div>
        </div>
      </div>

      <div style={S.sectionHeader}>
        <h3 style={S.sectionTitle}>TRANCHES · {project.tranches.length}</h3>
        <button style={S.addBtn} onClick={() => onOpenModal({ type: 'tranche', projectId: project.id })}>
          + Tranche
        </button>
      </div>
      <div style={S.list}>
        {project.tranches.length === 0 && (
          <div style={S.empty}>
            Aucune tranche pour l'instant.<br />Ajoute un étage pour faire grandir ton bâtiment.
          </div>
        )}
        {project.tranches.map(tr => (
          <div key={tr.id} style={S.listItem}>
            <div style={S.listItemHeader}>
              <span style={S.listItemName}>{tr.name}</span>
              <span style={S.listItemValue}>{formatMoney(tr.amount.amount)}</span>
            </div>
            <div style={S.listItemMeta}>
              {(tr.rank ?? 'N/A').toUpperCase()} · {tr.rate.index ?? 'FIXED'} + {tr.rate.margin ?? 0}%
            </div>
            <div style={S.itemActions}>
              <button style={S.smallBtn} onClick={() => onOpenModal({ type: 'tranche', projectId: project.id, tranche: tr })}>
                Modifier
              </button>
              <button
                style={{ ...S.smallBtn, color: tokens.color.debt }}
                onClick={() => handleDeleteTranche(tr.id, tr.name)}
              >
                Retirer
              </button>
            </div>
          </div>
        ))}
      </div>

      {project.covenants.length > 0 && (
        <>
          <div style={S.sectionHeader}>
            <h3 style={S.sectionTitle}>COVENANTS · {project.covenants.length}</h3>
          </div>
          <div style={S.list}>
            {project.covenants.map(cov => (
              <div key={cov.id} style={S.listItem}>
                <div style={S.listItemHeader}>
                  <span style={S.listItemName}>{cov.name}</span>
                  <span style={S.listItemMeta}>{cov.nature.replace(/_/g, ' ').toUpperCase()}</span>
                </div>
                <div style={localStyles.termRow}>
                  {cov.terms.map(term => (
                    <span
                      key={term.id}
                      style={{ ...localStyles.termDot, backgroundColor: TERM_STATUS_COLORS[term.currentStatus] ?? tokens.color.textMid }}
                      title={`${term.name}: ${term.currentStatus}${term.waiver === false ? ' (waiver refusé)' : ''}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={S.sectionHeader}>
        <h3 style={S.sectionTitle}>SYNDICAT · {project.lenders.length}</h3>
        <button style={S.addBtn} onClick={() => onOpenModal({ type: 'lender', projectId: project.id })}>
          + Lender
        </button>
      </div>
      <div style={S.list}>
        {project.lenders.length === 0 && (
          <div style={S.empty}>Aucun lender pour l'instant.<br />Construis ton syndicat.</div>
        )}
        {project.lenders.map(l => (
          <div key={l.id} style={S.listItem}>
            <div style={S.listItemHeader}>
              <span style={S.listItemName}>
                {l.corporateName} {l.role !== 'participant' ? `(${l.role})` : ''}
              </span>
              <span style={S.listItemValue}>
                {formatMoney(l.allocations.reduce((s, a) => s + a.amount.amount, 0))}
              </span>
            </div>
            <div style={S.itemActions}>
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
        ))}
      </div>
    </div>
  );
}

export default memo(DealPanel);

const localStyles: Record<string, CSSProperties> = {
  termRow: {
    display: 'flex',
    gap: 6,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  termDot: {
    display: 'inline-block',
    width: 10,
    height: 10,
    borderRadius: '50%',
    cursor: 'help',
    boxShadow: '0 0 4px currentColor',
  },
};
