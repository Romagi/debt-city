import type { CityBuilding, DocumentDrive } from '../types/portfolio';
import type { PortfolioAction } from '../state/portfolio-reducer';

const DRIVE_LABELS: Record<DocumentDrive, string> = {
  lender: 'Lender Drive',
  borrower_shared: 'Borrower Shared Drive',
  borrower_confidential: 'Borrower Confidential Drive',
};

const DRIVE_ORDER: DocumentDrive[] = ['lender', 'borrower_shared', 'borrower_confidential'];

type ModalOpener = (m: { type: 'document'; projectId: string }) => void;

interface Props {
  building: CityBuilding;
  dispatch: React.Dispatch<PortfolioAction>;
  onClose: () => void;
  onOpenModal: ModalOpener;
}

export default function LibraryPanel({ building, dispatch, onClose, onOpenModal }: Props) {
  const { project } = building;
  const docs = project.documents;
  const driveCount = new Set(docs.map(d => d.drive)).size;
  const byDrive = DRIVE_ORDER.map(drive => ({
    drive,
    label: DRIVE_LABELS[drive],
    docs: docs.filter(d => d.drive === drive),
  }));

  function handleDelete(docId: string, name: string) {
    if (confirm(`Delete "${name}"?`)) {
      dispatch({ type: 'DELETE_DOCUMENT', payload: { projectId: project.id, documentId: docId } });
    }
  }

  return (
    <div style={S.panel}>
      <div style={S.header}>
        <div style={{ flex: 1 }}>
          <div style={S.panelType}>Library — Dataroom</div>
          <h2 style={S.title}>{project.title}</h2>
        </div>
        <button onClick={onClose} style={S.closeBtn}>&times;</button>
      </div>

      <div style={S.stats}>
        <div><div style={S.statLabel}>Documents</div><div style={S.statValue}>{docs.length}</div></div>
        <div><div style={S.statLabel}>Drives</div><div style={S.statValue}>{driveCount}</div></div>
      </div>

      <div style={S.sectionHeader}>
        <span />
        <button style={S.addBtn} onClick={() => onOpenModal({ type: 'document', projectId: project.id })}>
          + Add Document
        </button>
      </div>

      {byDrive.map(({ drive, label, docs: driveDocs }) => (
        <div key={drive}>
          <h3 style={S.sectionTitle}>{label} ({driveDocs.length})</h3>
          <div style={S.list}>
            {driveDocs.length === 0 && <div style={S.empty}>No documents in this drive.</div>}
            {driveDocs.map(doc => (
              <div key={doc.id} style={S.listItem}>
                <div style={S.docRow}>
                  <span style={S.docIcon}>&#128196;</span>
                  <span style={S.docName}>{doc.name}</span>
                  <span style={S.docDate}>{doc.uploadedAt}</span>
                  <button
                    style={S.delBtn}
                    onClick={() => handleDelete(doc.id, doc.name)}
                    title="Delete document"
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

const S: Record<string, React.CSSProperties> = {
  panel: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 400, background: 'rgba(15, 20, 30, 0.95)', backdropFilter: 'blur(10px)', color: '#FFF', padding: 24, overflowY: 'auto', borderLeft: '1px solid rgba(255,255,255,0.1)', fontFamily: 'monospace', fontSize: 13, zIndex: 20 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  panelType: { color: '#72A6A6', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  title: { margin: 0, fontSize: 16, fontWeight: 700, lineHeight: 1.3 },
  closeBtn: { background: 'none', border: 'none', color: '#FFF', fontSize: 24, cursor: 'pointer', padding: '0 4px', lineHeight: 1 },
  stats: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20, padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 8 },
  statLabel: { color: '#888', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 },
  statValue: { fontSize: 16, fontWeight: 700 },
  sectionHeader: { display: 'flex', justifyContent: 'flex-end', marginBottom: 8 },
  addBtn: { background: 'none', border: '1px solid rgba(114,166,166,0.4)', borderRadius: 4, color: '#72A6A6', fontSize: 10, fontWeight: 700, cursor: 'pointer', padding: '3px 10px', fontFamily: 'monospace' },
  sectionTitle: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#888', margin: '16px 0 8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 4 },
  list: { display: 'flex', flexDirection: 'column', gap: 4 },
  listItem: { padding: '6px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 6 },
  docRow: { display: 'flex', alignItems: 'center', gap: 8 },
  docIcon: { fontSize: 14, flexShrink: 0 },
  docName: { fontWeight: 600, flex: 1 },
  docDate: { color: '#666', fontSize: 10 },
  delBtn: { background: 'none', border: 'none', color: '#666', fontSize: 14, cursor: 'pointer', padding: '0 2px', lineHeight: 1 },
  empty: { color: '#555', fontSize: 11, fontStyle: 'italic', padding: '4px 0' },
};
