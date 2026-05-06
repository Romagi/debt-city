import { memo, type CSSProperties } from 'react';
import type { CityBuilding, DocumentDrive } from '../types/portfolio';
import type { PortfolioAction } from '../state/portfolio-reducer';
import { tokens } from '../styles/tokens';
import { makePanelStyles } from './panelStyles';

const DRIVE_LABELS: Record<DocumentDrive, string> = {
  lender: 'DRIVE LENDERS',
  borrower_shared: 'DRIVE BORROWER · PARTAGÉ',
  borrower_confidential: 'DRIVE BORROWER · CONFIDENTIEL',
};

const DRIVE_ORDER: DocumentDrive[] = ['lender', 'borrower_shared', 'borrower_confidential'];

type ModalOpener = (m: { type: 'document'; projectId: string }) => void;

interface Props {
  building: CityBuilding;
  dispatch: React.Dispatch<PortfolioAction>;
  onClose: () => void;
  onOpenModal: ModalOpener;
}

const S = makePanelStyles(tokens.color.money);

function LibraryPanel({ building, dispatch, onClose, onOpenModal }: Props) {
  const { project } = building;
  const docs = project.documents;
  const driveCount = new Set(docs.map(d => d.drive)).size;
  const byDrive = DRIVE_ORDER.map(drive => ({
    drive,
    label: DRIVE_LABELS[drive],
    docs: docs.filter(d => d.drive === drive),
  }));

  function handleDelete(docId: string, name: string) {
    if (confirm(`Supprimer "${name}" ?`)) {
      dispatch({ type: 'DELETE_DOCUMENT', payload: { projectId: project.id, documentId: docId } });
    }
  }

  return (
    <div style={S.panel}>
      <div style={S.header}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.panelType}>BIBLIOTHÈQUE · DATAROOM</div>
          <h2 style={S.title}>{project.title}</h2>
        </div>
        <button onClick={onClose} style={S.closeBtn} title="Fermer">&times;</button>
      </div>

      <div style={S.stats}>
        <div>
          <div style={S.statLabel}>DOCUMENTS</div>
          <div style={S.statValue}>{docs.length}</div>
        </div>
        <div>
          <div style={S.statLabel}>DRIVES</div>
          <div style={S.statValue}>{driveCount}</div>
        </div>
      </div>

      <div style={S.sectionHeader}>
        <span />
        <button style={S.addBtn} onClick={() => onOpenModal({ type: 'document', projectId: project.id })}>
          + Document
        </button>
      </div>

      {byDrive.map(({ drive, label, docs: driveDocs }) => (
        <div key={drive} style={{ marginTop: 18 }}>
          <h3 style={localStyles.driveTitle}>
            {label} · <span style={localStyles.driveCount}>{driveDocs.length}</span>
          </h3>
          <div style={S.list}>
            {driveDocs.length === 0 && <div style={S.empty}>Aucun document dans ce drive.</div>}
            {driveDocs.map(doc => (
              <div key={doc.id} style={S.listItem}>
                <div style={localStyles.docRow}>
                  <span style={localStyles.docIcon}>&#128196;</span>
                  <span style={localStyles.docName}>{doc.name}</span>
                  <span style={localStyles.docDate}>{doc.uploadedAt}</span>
                  <button
                    style={localStyles.delBtn}
                    onClick={() => handleDelete(doc.id, doc.name)}
                    title="Supprimer ce document"
                  >
                    &times;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default memo(LibraryPanel);

const localStyles: Record<string, CSSProperties> = {
  driveTitle: {
    fontFamily: tokens.font.mono,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.18em',
    color: tokens.color.textMid,
    margin: '0 0 10px',
    paddingBottom: 6,
    borderBottom: `1px solid ${tokens.color.hairline}`,
  },
  driveCount: {
    color: tokens.color.money,
  },
  docRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  docIcon: {
    fontSize: 16,
    flexShrink: 0,
    opacity: 0.7,
  },
  docName: {
    fontWeight: 600,
    flex: 1,
    color: tokens.color.text,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  docDate: {
    fontFamily: tokens.font.mono,
    color: tokens.color.textDim,
    fontSize: 10,
    flexShrink: 0,
    letterSpacing: '0.05em',
  },
  delBtn: {
    background: 'transparent',
    border: 'none',
    color: tokens.color.textDim,
    fontSize: 14,
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
    flexShrink: 0,
  },
};
