import { memo } from 'react';
import type { CityBuilding, Project, ProjectStatus, Tranche } from '../types/portfolio';
import { PROJECT_STATUS_ACTIONS } from '../types/portfolio';
import type { PortfolioAction } from '../state/portfolio-reducer';
import { formatMoney } from '../city/utils';
import { tokens } from '../styles/tokens';
import { makePanelStyles, STATUS_BADGES } from './panelStyles';

type ModalOpener = (m: { type: 'deal'; project?: Project } | { type: 'tranche'; projectId: string; tranche?: Tranche }) => void;

interface Props {
  building: CityBuilding;
  dispatch: React.Dispatch<PortfolioAction>;
  onClose: () => void;
  onOpenModal: ModalOpener;
}

const S = makePanelStyles(tokens.color.construct);

function BuildingPanel({ building, dispatch, onClose, onOpenModal }: Props) {
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

  return (
    <div style={S.panel}>
      <div style={S.header}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.panelType}>BÂTIMENT · DEAL</div>
          <h2 style={S.title}>{project.title}</h2>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ ...S.badge, backgroundColor: badge.bg, color: badge.text }}>
              {project.currentStatus}
            </span>
            <span style={S.nature}>{project.nature.replace(/_/g, ' ')}</span>
          </div>
          {PROJECT_STATUS_ACTIONS[project.currentStatus].length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexShrink: 0 }}>
          <button style={S.iconBtn} title="Modifier le deal" onClick={() => onOpenModal({ type: 'deal', project })}>&#9998;</button>
          <button style={{ ...S.iconBtn, color: tokens.color.debt }} title="Supprimer" onClick={handleDeleteProject}>&#128465;</button>
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
        <div>
          <div style={S.statLabel}>FIN DE CONTRAT</div>
          <div style={S.statValue}>{project.contractEndDate ?? 'TBD'}</div>
        </div>
        <div>
          <div style={S.statLabel}>TRACKING</div>
          <div style={{ ...S.statValue, textTransform: 'capitalize' }}>{project.trackingType}</div>
        </div>
        {project.fundingSpecificity && (
          <div>
            <div style={S.statLabel}>SPÉCIFICITÉ</div>
            <div style={{ ...S.statValue, textTransform: 'capitalize' }}>{project.fundingSpecificity.replace(/_/g, ' ')}</div>
          </div>
        )}
      </div>

      {project.description && <div style={S.description}>{project.description}</div>}

      <div style={S.sectionHeader}>
        <h3 style={S.sectionTitle}>TRANCHES · {project.tranches.length}</h3>
        <button style={S.addBtn} onClick={() => onOpenModal({ type: 'tranche', projectId: project.id })}>
          + Tranche
        </button>
      </div>
      <div style={S.list}>
        {project.tranches.length === 0 && <div style={S.empty}>Aucune tranche pour l'instant.<br />Ajoute un étage pour faire grandir ton bâtiment.</div>}
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
              <button style={S.smallBtn} onClick={() => onOpenModal({ type: 'tranche', projectId: project.id, tranche: tr })}>Modifier</button>
              <button style={{ ...S.smallBtn, color: tokens.color.debt }} onClick={() => handleDeleteTranche(tr.id, tr.name)}>Retirer</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(BuildingPanel);
