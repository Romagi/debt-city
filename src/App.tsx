import { useState, useMemo, useReducer, useEffect, useRef, useCallback } from 'react';
import CityCanvas from './city/CityCanvas';
import BuildingPanel from './panels/BuildingPanel';
import TownhallPanel from './panels/TownhallPanel';
import ShopPanel from './panels/ShopPanel';
import LibraryPanel from './panels/LibraryPanel';
import Topbar from './panels/Topbar';
import Sidebar from './panels/Sidebar';
import Zoombar from './panels/Zoombar';
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
import SwitchCityModal from './screens/SwitchCityModal';
import OnboardingCoach, { buildDefaultSteps } from './onboarding/OnboardingCoach';
import { isOnboardingDone, resetOnboarding } from './storage/onboardingStorage';
import { mockPortfolio } from './api/mock-data';
import { portfolioReducer } from './state/portfolio-reducer';
import { useUndoStack } from './state/undo-stack';
import { buildCityState } from './city/utils';
import { useAutoSave } from './storage/useAutoSave';
import type { Portfolio, ClickTarget, Borrower, Project, Tranche, Lender, Covenant, CellType } from './types/portfolio';
import type { PlacementMode, CameraApi } from './city/CityCanvas';
import { tokens } from './styles/tokens';

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

  // `key` on GameScreen forces a clean remount when the user switches cities.
  return (
    <GameScreen
      key={session.slug}
      slug={session.slug}
      initialPortfolio={session.initial}
      onQuit={() => setSession(null)}
      onSwitchCity={(slug, portfolio) => setSession({ slug, initial: portfolio })}
    />
  );
}

// ─── Game screen ──────────────────────────────────────────────────────────

function GameScreen({
  slug,
  initialPortfolio,
  onQuit,
  onSwitchCity,
}: {
  slug: string;
  initialPortfolio: Portfolio;
  onQuit: () => void;
  onSwitchCity: (slug: string, portfolio: Portfolio) => void;
}) {
  const [portfolio, dispatch] = useReducer(portfolioReducer, initialPortfolio);
  const [activeTarget, setActiveTarget] = useState<ClickTarget | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [placementMode, setPlacementMode] = useState<PlacementMode | null>(null);
  /** Bumping `ts` re-triggers the camera focus animation in CityCanvas, even on the same projectId. */
  const [focusRequest, setFocusRequest] = useState<{ projectId: string; ts: number } | null>(null);

  // ─── HUD-level state ────────────────────────────────────────────────────
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  /** The sidebar (city map) is hidden by default — opened from the 🗺 button. */
  const [showSidebar, setShowSidebar] = useState(false);
  // Onboarding fires automatically the very first time (no completion timestamp on disk).
  const [showOnboarding, setShowOnboarding] = useState(() => !isOnboardingDone());

  // While the onboarding overlay is showing, force the sidebar open so the
  // step that spotlights it actually has something to highlight.
  useEffect(() => {
    if (showOnboarding) setShowSidebar(true);
  }, [showOnboarding]);

  // Close the sidebar on Escape.
  useEffect(() => {
    if (!showSidebar) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowSidebar(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showSidebar]);

  // Refs for the OnboardingCoach spotlight (canvas / sidebar / build-bar).
  const canvasRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const buildBarRef = useRef<HTMLDivElement>(null);

  // Imperative camera control for the Zoombar buttons.
  const cameraApiRef = useRef<CameraApi | null>(null);
  const handleZoomIn  = useCallback(() => cameraApiRef.current?.zoomIn(),  []);
  const handleZoomOut = useCallback(() => cameraApiRef.current?.zoomOut(), []);
  const handleCenter  = useCallback(() => cameraApiRef.current?.center(),  []);

  // Stable handlers for memoised children.
  const handleFocusDistrict = useCallback(
    (projectId: string) => setFocusRequest({ projectId, ts: Date.now() }),
    [],
  );
  const handleAddDeal     = useCallback(() => setModal({ type: 'deal' }),     []);
  const handleAddBorrower = useCallback(() => setModal({ type: 'borrower' }), []);
  const handleClosePanel  = useCallback(() => setActiveTarget(null),          []);

  const handleOpenSwitchCity     = useCallback(() => setShowSwitchModal(true),  []);
  const handleCloseSwitchCity    = useCallback(() => setShowSwitchModal(false), []);
  const handleSwitchCitySelected = useCallback((s: string, p: Portfolio) => {
    setShowSwitchModal(false);
    onSwitchCity(s, p);
  }, [onSwitchCity]);

  const handleReplayOnboarding = useCallback(() => {
    resetOnboarding();
    setShowOnboarding(true);
  }, []);
  const handleCloseOnboarding = useCallback(() => setShowOnboarding(false), []);
  const handleToggleSidebar = useCallback(() => setShowSidebar(o => !o), []);
  const handleCloseSidebar  = useCallback(() => setShowSidebar(false), []);

  // ─── Undo/Redo for construction actions ────────────────────────────────────
  const { pushSnapshot, undo, redo, canUndo, canRedo } = useUndoStack(portfolio.grid, dispatch);

  const handleMoveStructure = useCallback(
    (entityId: string, structureType: string, toCol: number, toRow: number, width: number, height: number) => {
      pushSnapshot(portfolio.grid);
      dispatch({ type: 'MOVE_STRUCTURE', payload: { entityId, structureType: structureType as any, toCol, toRow, width, height } });
    },
    [portfolio.grid, pushSnapshot],
  );
  const handlePlaceDecoration = useCallback(
    (col: number, row: number, projectId: string) => {
      if (!placementMode?.deco) return;
      pushSnapshot(portfolio.grid);
      dispatch({ type: 'PLACE_DECORATION', payload: { decorationType: placementMode.deco, col, row, projectId, flip: placementMode.flip } });
    },
    [placementMode, portfolio.grid, pushSnapshot],
  );
  const handleRemoveDecoration = useCallback(
    (col: number, row: number) => {
      pushSnapshot(portfolio.grid);
      dispatch({ type: 'REMOVE_DECORATION', payload: { col, row } });
    },
    [portfolio.grid, pushSnapshot],
  );

  // ─── Toolbar handlers ──────────────────────────────────────────────────────
  const handleSelectItem = useCallback((deco: CellType) => {
    setPlacementMode({ deco, eraser: false, flip: false });
  }, []);
  const handleErase = useCallback(() => {
    setPlacementMode({ deco: 'tree_sm', eraser: true });
  }, []);
  const handleCancelPlacement = useCallback(() => setPlacementMode(null), []);
  const handleFlip = useCallback(() => {
    setPlacementMode(prev => prev ? { ...prev, flip: !prev.flip } : prev);
  }, []);

  // ─── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.key === 'f' || e.key === 'F') && placementMode && !placementMode.eraser) {
        setPlacementMode(prev => prev ? { ...prev, flip: !prev.flip } : prev);
        return;
      }
      if (e.key === 'Escape' && placementMode) {
        setPlacementMode(null);
        return;
      }

      const cmdOrCtrl = e.metaKey || e.ctrlKey;
      if (cmdOrCtrl && (e.key === 'z' || e.key === 'Z') && placementMode) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [placementMode, undo, redo]);

  const { status: saveStatus } = useAutoSave(slug, portfolio);

  const cityState = useMemo(() => buildCityState(portfolio), [portfolio]);

  // Sync grid when buildCityState produces new districts
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

  const syncedTarget = useMemo(() => {
    if (!activeTarget) return null;
    const allBuildings = cityState.districts.flatMap(d => d.buildings);
    const match = allBuildings.find(b => b.project.id === activeTarget.building.project.id);
    if (!match) return null;
    return { ...activeTarget, building: match } as ClickTarget;
  }, [activeTarget, cityState]);

  // ─── Onboarding steps (built when refs are populated, recomputed on session change) ───
  const onboardingSteps = useMemo(
    () => buildDefaultSteps({
      canvas:   canvasRef as React.RefObject<HTMLElement>,
      sidebar:  sidebarRef as React.RefObject<HTMLElement>,
      buildBar: buildBarRef as React.RefObject<HTMLElement>,
    }),
    [],
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={styles.app}>
      <div style={styles.topbarSlot}>
        <Topbar
          slug={slug}
          portfolio={portfolio}
          weather={cityState.weather}
          onSwitchCity={handleOpenSwitchCity}
          onQuit={onQuit}
          onReplayOnboarding={handleReplayOnboarding}
          saveStatus={saveStatus}
          sidebarOpen={showSidebar}
          onToggleSidebar={handleToggleSidebar}
        />
      </div>

      <div ref={canvasRef} style={styles.canvasArea}>
        <CityCanvas
          cityState={cityState}
          focusRequest={focusRequest}
          onTargetClick={setActiveTarget}
          onMoveStructure={handleMoveStructure}
          placementMode={placementMode}
          onPlaceDecoration={handlePlaceDecoration}
          onRemoveDecoration={handleRemoveDecoration}
          cameraApiRef={cameraApiRef}
        />

        {/* Build-bar (toolbar) — wrapped to capture a ref for the onboarding spotlight */}
        <div ref={buildBarRef} style={styles.toolbarSlot}>
          <Toolbar
            placementMode={placementMode}
            onSelectItem={handleSelectItem}
            onErase={handleErase}
            onCancel={handleCancelPlacement}
            onFlip={handleFlip}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
          />
        </div>

        <Zoombar onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onCenter={handleCenter} />

        {/* Sidebar (city map) — slides in from the left, stays mounted so the
            onboarding refs remain valid even when closed. */}
        <Sidebar
          ref={sidebarRef}
          portfolio={portfolio}
          isOpen={showSidebar}
          onClose={handleCloseSidebar}
          onFocusDistrict={handleFocusDistrict}
          onAddDeal={handleAddDeal}
          onAddBorrower={handleAddBorrower}
        />

        {/* Contextual panel — anchored inside canvasArea so it sits below
            the topbar (top:0 of canvasArea = top:80 of viewport). */}
        {syncedTarget?.kind === 'building' && (
          <BuildingPanel
            building={syncedTarget.building}
            dispatch={dispatch}
            onClose={handleClosePanel}
            onOpenModal={setModal}
          />
        )}
        {syncedTarget?.kind === 'townhall' && (
          <TownhallPanel
            building={syncedTarget.building}
            dispatch={dispatch}
            onClose={handleClosePanel}
            onOpenModal={setModal}
          />
        )}
        {syncedTarget?.kind === 'shop' && (
          <ShopPanel
            building={syncedTarget.building}
            dispatch={dispatch}
            onClose={handleClosePanel}
            onOpenModal={setModal}
          />
        )}
        {syncedTarget?.kind === 'library' && (
          <LibraryPanel
            building={syncedTarget.building}
            dispatch={dispatch}
            onClose={handleClosePanel}
            onOpenModal={setModal}
          />
        )}
      </div>

      {/* Switch city modal (triggered from Topbar ⚙ menu) */}
      {showSwitchModal && (
        <SwitchCityModal
          currentSlug={slug}
          onClose={handleCloseSwitchCity}
          onSwitch={handleSwitchCitySelected}
        />
      )}

      {/* Onboarding overlay */}
      {showOnboarding && (
        <OnboardingCoach
          steps={onboardingSteps}
          onClose={handleCloseOnboarding}
        />
      )}

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

// ─── Styles ──────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100vw',
    height: '100vh',
    display: 'grid',
    gridTemplateRows: '80px 1fr',
    gridTemplateColumns: '1fr',
    gridTemplateAreas: `
      "topbar"
      "canvas"
    `,
    background: tokens.color.bg,
    fontFamily: tokens.font.ui,
    color: tokens.color.text,
    overflow: 'hidden',
  },
  topbarSlot: {
    gridArea: 'topbar',
    minWidth: 0,
  },
  canvasArea: {
    gridArea: 'canvas',
    position: 'relative',
    overflow: 'hidden',
    minWidth: 0,
    minHeight: 0,
  },
  toolbarSlot: {
    position: 'absolute',
    bottom: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: tokens.z.hud,
  },
};
