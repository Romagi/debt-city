import type {
  Project,
  Borrower,
  Portfolio,
  CityBuilding,
  CityDistrict,
  CityState,
  BuildingState,
  AlertLevel,
  TrafficLightColor,
  WeatherState,
  SyndicateSize,
  LibrarySize,
  GridState,
} from '../types/portfolio';
import {
  GRID_SIZE,
  DISTRICT_SIZE,
  STRUCTURE_SIZES,
  gridToScreen,
  createEmptyGrid,
  placeOnGrid,
  canPlace,
  allocateDistrict,
  getDistrictForProject,
} from '../types/portfolio';

// ─── Isometric grid helpers ───

const TILE_WIDTH = 80;
const TILE_HEIGHT = 40;

export function gridToIso(col: number, row: number): { x: number; y: number } {
  return {
    x: (col - row) * (TILE_WIDTH / 2),
    y: (col + row) * (TILE_HEIGHT / 2),
  };
}

// ─── Data → Visual mapping ───

const MAX_BUILDING_HEIGHT = 180;
const MIN_BUILDING_HEIGHT = 50;
const MAX_FUNDING = 700_000_000;

function mapBuildingState(status: Project['currentStatus']): BuildingState {
  switch (status) {
    case 'draft': return 'construction';
    case 'published': return 'operational';
    case 'archived': return 'dimmed';
    case 'finished': return 'closed';
  }
}

function mapAlertLevel(project: Project): AlertLevel {
  const allTerms = project.covenants.flatMap(c => c.terms);
  const hasBreachedNoWaiver = allTerms.some(t => t.currentStatus === 'breached' && t.waiver === false);
  const hasBreached = allTerms.some(t => t.currentStatus === 'breached');
  if (hasBreachedNoWaiver) return 'fire';
  if (hasBreached) return 'smoke';
  return 'none';
}

function mapTrafficLight(project: Project): TrafficLightColor {
  const allTerms = project.covenants.flatMap(c => c.terms);
  if (allTerms.length === 0) return 'grey';
  if (allTerms.some(t => t.currentStatus === 'breached')) return 'red';
  if (allTerms.some(t => t.state === 'breach_risk' || t.state === 'to_control')) return 'orange';
  if (allTerms.every(t => t.currentStatus === 'validated' || t.currentStatus === 'coming' || t.currentStatus === 'deactivated')) return 'green';
  return 'orange';
}

function mapSyndicateSize(lenderCount: number): SyndicateSize {
  if (lenderCount === 0) return 'none';
  if (lenderCount <= 2) return 'kiosk';
  if (lenderCount <= 4) return 'shop';
  return 'mall';
}

function mapLibrarySize(docCount: number): LibrarySize {
  if (docCount <= 3) return 'small';
  if (docCount <= 8) return 'medium';
  return 'large';
}

function computeBuildingHeight(amount: number): number {
  const ratio = Math.min(amount / MAX_FUNDING, 1);
  return MIN_BUILDING_HEIGHT + ratio * (MAX_BUILDING_HEIGHT - MIN_BUILDING_HEIGHT);
}

function mapEsgScore(borrower: Borrower): CityDistrict['esgScore'] {
  const total = (borrower.esgScope1 ?? 0) + (borrower.esgScope2 ?? 0) + (borrower.esgScope3 ?? 0);
  if (total === 0) return 'neutral';
  if (total < 2000) return 'good';
  if (total < 5000) return 'neutral';
  return 'bad';
}

function mapWeather(portfolio: Portfolio): WeatherState {
  const { breached, late } = portfolio.termStateCount;
  if (breached >= 3) return 'stormy';
  if (breached > 0 || late > 2) return 'cloudy';
  return 'sunny';
}

/** District scale: bigger deals get larger neighborhoods */
function computeDistrictScale(amount: number): number {
  return 0.8 + Math.min(amount / MAX_FUNDING, 1) * 0.5;
}

// ─── Build city layout ───

/** Get the building size key based on funding */
function getBuildingSizeKey(amount: number): string {
  if (amount > 500_000_000) return 'building_xl';
  if (amount > 300_000_000) return 'building_lg';
  if (amount > 150_000_000) return 'building_md';
  if (amount > 50_000_000) return 'building_sm';
  return 'building_xs';
}

function getShopSizeKey(lenderCount: number): string {
  if (lenderCount >= 5) return 'shop_mall';
  if (lenderCount >= 3) return 'shop_store';
  return 'shop_kiosk';
}

// Library is now a single model (library_md, 2×2) — no size variants.
const LIBRARY_SPRITE_KEY = 'library_md';

function findStructureOnGrid(grid: GridState, entityId: string, type: string): { col: number; row: number } | null {
  for (let r = 0; r < grid.size; r++) {
    for (let c = 0; c < grid.size; c++) {
      const cell = grid.cells[r]?.[c];
      if (cell?.entityId === entityId && cell.type === type && !cell.originCol && !cell.originRow) {
        return { col: c, row: r };
      }
    }
  }
  return null;
}

export function buildCityState(portfolio: Portfolio): CityState {
  const districts: CityDistrict[] = [];
  let grid = portfolio.grid ?? createEmptyGrid(GRID_SIZE);

  const sortedProjects = [...portfolio.projects].sort((a, b) => {
    const statusOrder: Record<string, number> = { published: 0, draft: 1, archived: 2, finished: 3 };
    const sDiff = (statusOrder[a.currentStatus] ?? 9) - (statusOrder[b.currentStatus] ?? 9);
    if (sDiff !== 0) return sDiff;
    return b.globalFundingAmount.amount - a.globalFundingAmount.amount;
  });

  for (const project of sortedProjects) {
    const amount = project.globalFundingAmount.amount;
    const height = computeBuildingHeight(amount);
    const scale = computeDistrictScale(amount);
    const borrower = portfolio.borrowers.find(b => b.id === project.borrowerId)!;

    // Get or allocate district for this project
    let district = getDistrictForProject(grid, project.id);
    if (!district) {
      district = allocateDistrict(grid, project.id);
      grid = { ...grid, districts: [...grid.districts, district] };
    }
    const d = district;

    // Check if building already placed on grid
    const existingBuildingPos = findStructureOnGrid(grid, project.id, 'building');
    const bSizeKey = getBuildingSizeKey(amount);
    const [bw, bh] = STRUCTURE_SIZES[bSizeKey] ?? [2, 2];
    let bCol: number, bRow: number;

    // Use existing position or auto-place
    if (existingBuildingPos) {
      bCol = existingBuildingPos.col;
      bRow = existingBuildingPos.row;
    } else {
      // Auto-place building centered in district
      bCol = d.col + Math.floor((DISTRICT_SIZE - bw) / 2);
      bRow = d.row + Math.floor((DISTRICT_SIZE - bh) / 2);
      if (canPlace(grid, bCol, bRow, bw, bh)) {
        grid = placeOnGrid(grid, bCol, bRow, bw, bh, { type: 'building', entityId: project.id, projectId: project.id });
      }
    }

    // Auto-place sub-structures ONLY if not already on the grid
    if (!findStructureOnGrid(grid, project.id, 'townhall')) {
      const [thW, thH] = STRUCTURE_SIZES.townhall ?? [3, 3];
      const thCol = d.col + 1;
      const thRow = bRow + bh + 1;
      if (canPlace(grid, thCol, thRow, thW, thH)) {
        grid = placeOnGrid(grid, thCol, thRow, thW, thH, { type: 'townhall', entityId: project.id, projectId: project.id });
      }
    }

    if (!findStructureOnGrid(grid, project.id, 'shop')) {
      const sSizeKey = getShopSizeKey(project.lenders.length);
      const [sW, sH] = STRUCTURE_SIZES[sSizeKey] ?? [2, 2];
      const sCol = bCol + bw + 1;
      const sRow = bRow + 1;
      if (canPlace(grid, sCol, sRow, sW, sH)) {
        grid = placeOnGrid(grid, sCol, sRow, sW, sH, { type: 'shop', entityId: project.id, projectId: project.id });
      }
    }

    if (!findStructureOnGrid(grid, project.id, 'library')) {
      // Single library model: library_md (2×2)
      const [lW, lH] = STRUCTURE_SIZES[LIBRARY_SPRITE_KEY] ?? [2, 2];
      const lCol = d.col + 1;
      const lRow = d.row + 1;
      if (canPlace(grid, lCol, lRow, lW, lH)) {
        grid = placeOnGrid(grid, lCol, lRow, lW, lH, { type: 'library', entityId: project.id, projectId: project.id });
      }
    }

    // ── Convert grid positions to screen positions (SOUTH-TIP convention) ──
    // South tip of N×M footprint at (col, row) = gridToScreen(col + N - 0.5, row + M - 0.5)
    const { x, y } = gridToScreen(bCol + bw - 0.5, bRow + bh - 0.5);
    const thPos = findStructureOnGrid(grid, project.id, 'townhall');
    const sPos  = findStructureOnGrid(grid, project.id, 'shop');
    const lPos  = findStructureOnGrid(grid, project.id, 'library');

    // Townhall: 2×2 → south tip = col+1.5, row+1.5
    const thScreen = thPos
      ? gridToScreen(thPos.col + 1.5, thPos.row + 1.5)
      : { x: x - 60, y: y + 30 };

    // Shop: size varies by lender count — compute south tip dynamically
    const sSizeKey = getShopSizeKey(project.lenders.length);
    const [sW, sH] = STRUCTURE_SIZES[sSizeKey] ?? [1, 1];
    const sScreen = sPos
      ? gridToScreen(sPos.col + sW - 0.5, sPos.row + sH - 0.5)
      : { x: x + 60, y: y + 30 };

    // Library: 2×2 → south tip = col+1.5, row+1.5
    const lScreen = lPos
      ? gridToScreen(lPos.col + 1.5, lPos.row + 1.5)
      : { x: x - 60, y: y - 30 };

    const mainBuilding: CityBuilding = {
      project,
      x, y,
      width: TILE_WIDTH,
      height,
      floors: project.tranches.length,
      state: mapBuildingState(project.currentStatus),
      alertLevel: mapAlertLevel(project),
      trafficLight: mapTrafficLight(project),
      syndicateSize: mapSyndicateSize(project.lenders.length),
      librarySize: mapLibrarySize(project.documents.length),
      townhallPos: thScreen,
      shopPos: sScreen,
      libraryPos: lScreen,
    };

    districts.push({
      borrower,
      buildings: [mainBuilding],
      x, y,
      scale,
      esgScore: mapEsgScore(borrower),
    });
  }

  return {
    districts,
    weather: mapWeather(portfolio),
    totalBuildings: portfolio.projects.length,
    grid,
  };
}

// ─── Formatting helpers ───

export function formatMoney(amount: number, currency = 'EUR'): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B ${currency}`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(0)}M ${currency}`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K ${currency}`;
  return `${amount} ${currency}`;
}
