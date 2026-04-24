import { useState, useMemo, useReducer, useEffect, useRef } from 'react';
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
import Toolbar from './panels/Toolbar';
import LandingScreen from './screens/LandingScreen';
import { mockPortfolio } from './api/mock-data';
import { portfolioReducer } from './state/portfolio-reducer';
import { buildCityState } from './city/utils';
import { useAutoSave } from './storage/useAutoSave';
import type { Portfolio, ClickTarget, Borrower, Project, Tranche, Lender, Covenant } from './types/portfolio';
import type { PlacementMode } from './city/CityCanvas';

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
  const [session, setSession] = useState<{ slug: string; initial: Portfolio } | null>(null);

  // Show landing screen if no active session
  if (!session) {
    return (
      <LandingScreen
        initialPortfolio={mockPortfolio}
        onSessionStart={(slug, portfolio) => setSession({ slug, initial: portfolio })}
      />
    );
  }

  return <GameScreen slug={session.slug} initialPortfolio={session.initial} onQuit={() => setSession(null)} />;
}

// ─── Game screen (split to allow useReducer with dynamic initial state) ───

function GameScreen({ slug, initialPortfolio, onQuit }: { slug: string; initialPortfolio: Portfolio; onQuit: () => void }) {
  const [portfolio, dispatch] = useReducer(portfolioReducer, initialPortfolio);
  const [activeTarget, setActiveTarget] = useState<ClickTarget | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [placementMode, setPlacementMode] = useState<PlacementMode | null>(null);

  // F key → toggle flip while placing a decoration
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.key === 'f' || e.key === 'F') && placementMode && !placementMode.eraser) {
        setPlacementMode(prev => prev ? { ...prev, flip: !prev.flip } : prev);
      }
      if (e.key === 'Escape' && placementMode) {
        setPlacementMode(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [placementMode]);

  // Auto-save to localStorage
  const { status: saveStatus } = useAutoSave(slug, portfolio);

  const cityState = useMemo(() => buildCityState(portfolio), [portfolio]);

  // Sync grid when buildCityState produces new districts (initial render + new deals)
  // hasSyncedRef ensures we fire at least once on mount so existing sessions get fences retroactively
  const hasSyncedRef = useRef(false);
  const cityDistrictCount = cityState.grid.districts.length;
  const portfolioDistrictCount = portfolio.grid.districts.length;
  useEffect(() => {
    const isFirstSync = !hasSyncedRef.current;
    const hasNewDistricts = cityDistrictCount > portfolioDistrictCount;
    if (isFirstSync || hasNewDistricts) {
      hasSyncedRef.current = true;
      dispatch({ type: 'SYNC_GRID', payload: { grid: cityState.grid } });
    }
  }, [cityDistrictCount, portfolioDistrictCount, cityState.grid]);

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
        placementMode={placementMode}
        onPlaceDecoration={(col, row, projectId) => {
          if (placementMode?.deco) {
            dispatch({ type: 'PLACE_DECORATION', payload: { decorationType: placementMode.deco, col, row, projectId, flip: placementMode.flip } });
          }
        }}
        onRemoveDecoration={(col, row) => {
          dispatch({ type: 'REMOVE_DECORATION', payload: { col, row } });
        }}
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

      <Toolbar
        placementMode={placementMode}
        onSelectItem={(deco) => setPlacementMode({ deco, eraser: false, flip: false })}
        onErase={() => setPlacementMode({ deco: 'tree_sm', eraser: true })}
        onCancel={() => setPlacementMode(null)}
        onFlip={() => setPlacementMode(prev => prev ? { ...prev, flip: !prev.flip } : prev)}
      />

      <PortfolioOverview portfolio={portfolio} />

      {/* Save indicator + quit */}
      <div style={styles.saveBar}>
        <button style={styles.quitBtn} onClick={onQuit} title="Quitter la partie">
          ← Quitter
        </button>
        <span style={styles.saveStatus}>
          {saveStatus === 'saving' && '⏳ Sauvegarde...'}
          {saveStatus === 'saved' && '💾 Sauvegardé'}
        </span>
      </div>

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
  fab: { position: 'absolute', bottom: 24, left: 20, display: 'flex', gap: 8, zIndex: 10 },
  fabBtn: { padding: '8px 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#CCC', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, cursor: 'pointer', backdropFilter: 'blur(8px)' },
  fabBtnPrimary: { background: 'rgba(74,144,217,0.3)', borderColor: 'rgba(74,144,217,0.5)', color: '#6AB0F0' },
  saveBar: { position: 'absolute', top: 16, right: 16, display: 'flex', alignItems: 'center', gap: 12, zIndex: 10 },
  saveStatus: { color: '#667', fontFamily: 'monospace', fontSize: 11 },
  quitBtn: { padding: '6px 14px', background: 'rgba(255,255,255,0.06)', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, color: '#999', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, cursor: 'pointer', backdropFilter: 'blur(8px)' },
};
