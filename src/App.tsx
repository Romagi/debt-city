import { useState, useMemo, useReducer } from 'react';
import CityCanvas from './city/CityCanvas';
import BuildingPanel from './panels/BuildingPanel';
import TownhallPanel from './panels/TownhallPanel';
import ShopPanel from './panels/ShopPanel';
import LibraryPanel from './panels/LibraryPanel';
import PortfolioOverview from './panels/PortfolioOverview';
import BorrowerModal from './modals/BorrowerModal';
import DealModal from './modals/DealModal';
import TrancheModal from './modals/TrancheModal';
import LenderModal from './modals/LenderModal';
import CovenantModal from './modals/CovenantModal';
import TermModal from './modals/TermModal';
import AllocationModal from './modals/AllocationModal';
import DocumentModal from './modals/DocumentModal';
import { mockPortfolio } from './api/mock-data';
import { portfolioReducer } from './state/portfolio-reducer';
import { buildCityState } from './city/utils';
import type { ClickTarget, Borrower, Project, Tranche, Lender, Covenant } from './types/portfolio';

// ─── Modal state ───

type ModalState =
  | null
  | { type: 'borrower'; borrower?: Borrower }
  | { type: 'deal'; project?: Project }
  | { type: 'tranche'; projectId: string; tranche?: Tranche }
  | { type: 'lender'; projectId: string; lender?: Lender }
  | { type: 'covenant'; projectId: string; covenant?: Covenant }
  | { type: 'term'; projectId: string; covenantId: string }
  | { type: 'allocation'; projectId: string; lender: Lender; tranches: Tranche[] }
  | { type: 'document'; projectId: string };

export default function App() {
  const [portfolio, dispatch] = useReducer(portfolioReducer, mockPortfolio);
  const [activeTarget, setActiveTarget] = useState<ClickTarget | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  const cityState = useMemo(() => buildCityState(portfolio), [portfolio]);

  // Keep activeTarget in sync with portfolio changes (project data may have changed)
  const syncedTarget = useMemo(() => {
    if (!activeTarget) return null;
    const allBuildings = cityState.districts.flatMap(d => d.buildings);
    const match = allBuildings.find(b => b.project.id === activeTarget.building.project.id);
    if (!match) return null;
    return { ...activeTarget, building: match } as ClickTarget;
  }, [activeTarget, cityState]);

  return (
    <div style={styles.app}>
      <CityCanvas
        cityState={cityState}
        onTargetClick={setActiveTarget}
        onMoveStructure={(entityId, structureType, toCol, toRow, width, height) =>
          dispatch({ type: 'MOVE_STRUCTURE', payload: { entityId, structureType: structureType as any, toCol, toRow, width, height } })
        }
      />

      {/* Contextual panel based on what was clicked */}
      {syncedTarget?.kind === 'building' && (
        <BuildingPanel
          building={syncedTarget.building}
          dispatch={dispatch}
          onClose={() => setActiveTarget(null)}
          onOpenModal={setModal}
        />
      )}
      {syncedTarget?.kind === 'townhall' && (
        <TownhallPanel
          building={syncedTarget.building}
          dispatch={dispatch}
          onClose={() => setActiveTarget(null)}
          onOpenModal={setModal}
        />
      )}
      {syncedTarget?.kind === 'shop' && (
        <ShopPanel
          building={syncedTarget.building}
          dispatch={dispatch}
          onClose={() => setActiveTarget(null)}
          onOpenModal={setModal}
        />
      )}
      {syncedTarget?.kind === 'library' && (
        <LibraryPanel
          building={syncedTarget.building}
          dispatch={dispatch}
          onClose={() => setActiveTarget(null)}
          onOpenModal={setModal}
        />
      )}

      <PortfolioOverview portfolio={portfolio} />

      {/* Floating action buttons */}
      <div style={styles.fab}>
        <button style={styles.fabBtn} onClick={() => setModal({ type: 'borrower' })}>+ Borrower</button>
        <button style={{ ...styles.fabBtn, ...styles.fabBtnPrimary }} onClick={() => setModal({ type: 'deal' })}>+ Deal</button>
      </div>

      {/* Modals */}
      {modal?.type === 'borrower' && <BorrowerModal borrower={modal.borrower} onClose={() => setModal(null)} dispatch={dispatch} />}
      {modal?.type === 'deal' && <DealModal project={modal.project} borrowers={portfolio.borrowers} onClose={() => setModal(null)} dispatch={dispatch} />}
      {modal?.type === 'tranche' && <TrancheModal projectId={modal.projectId} tranche={modal.tranche} onClose={() => setModal(null)} dispatch={dispatch} />}
      {modal?.type === 'lender' && <LenderModal projectId={modal.projectId} lender={modal.lender} onClose={() => setModal(null)} dispatch={dispatch} />}
      {modal?.type === 'covenant' && <CovenantModal projectId={modal.projectId} covenant={modal.covenant} onClose={() => setModal(null)} dispatch={dispatch} />}
      {modal?.type === 'term' && <TermModal projectId={modal.projectId} covenantId={modal.covenantId} onClose={() => setModal(null)} dispatch={dispatch} />}
      {modal?.type === 'allocation' && <AllocationModal projectId={modal.projectId} lender={modal.lender} tranches={modal.tranches} onClose={() => setModal(null)} dispatch={dispatch} />}
      {modal?.type === 'document' && <DocumentModal projectId={modal.projectId} onClose={() => setModal(null)} dispatch={dispatch} />}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: { position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#0A0F19' },
  fab: { position: 'absolute', bottom: 64, left: 20, display: 'flex', gap: 8, zIndex: 10 },
  fabBtn: { padding: '8px 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#CCC', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, cursor: 'pointer', backdropFilter: 'blur(8px)' },
  fabBtnPrimary: { background: 'rgba(74,144,217,0.3)', borderColor: 'rgba(74,144,217,0.5)', color: '#6AB0F0' },
};
