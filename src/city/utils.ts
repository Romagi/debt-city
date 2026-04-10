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
  STRUCTURE_SIZES,
  gridToScreen,
  createEmptyGrid,
  findFreeSpot,
  placeOnGrid,
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

function getLibrarySizeKey(docCount: number): string {
  if (docCount >= 9) return 'library_lg';
  if (docCount >= 4) return 'library_md';
  return 'library_sm';
}

/** District size on the grid based on funding */
function districtGridSize(amount: number): number {
  if (amount > 500_000_000) return 12;
  if (amount > 300_000_000) return 10;
  if (amount > 150_000_000) return 9;
  return 8;
}

function findStructureOnGrid(grid: import('../types/portfolio').GridState, entityId: string, type: string): { col: number; row: number } | null {
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
  // Use persisted grid, or create a fresh one
  let grid = portfolio.grid ?? createEmptyGrid(GRID_SIZE);

  // Track which projects are already on the grid
  const placedProjectIds = new Set<string>();
  for (let r = 0; r < grid.size; r++) {
    for (let c = 0; c < grid.size; c++) {
      const cell = grid.cells[r]?.[c];
      if (cell?.type === 'building' && cell.entityId && !cell.originCol && !cell.originRow) {
        placedProjectIds.add(cell.entityId);
      }
    }
  }

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

    // Only auto-place if not already on the grid (persisted positions are preserved)
    const alreadyPlaced = placedProjectIds.has(project.id);

    let bCol: number, bRow: number;
    const bSizeKey = getBuildingSizeKey(amount);
    const [bw, bh] = STRUCTURE_SIZES[bSizeKey] ?? [2, 2];

    if (alreadyPlaced) {
      // Find existing position on grid
      let found = false;
      bCol = 0; bRow = 0;
      for (let r = 0; r < grid.size && !found; r++) {
        for (let c = 0; c < grid.size && !found; c++) {
          const cell = grid.cells[r]?.[c];
          if (cell?.type === 'building' && cell.entityId === project.id && !cell.originCol && !cell.originRow) {
            bCol = c; bRow = r; found = true;
          }
        }
      }
    } else {
      // Auto-place new deal
      const dSize = districtGridSize(amount);
      const spot = findFreeSpot(grid, dSize, dSize);
      if (!spot) continue;

      bCol = spot.col + Math.floor((dSize - bw) / 2);
      bRow = spot.row + Math.floor((dSize - bh) / 2);
      grid = placeOnGrid(grid, bCol, bRow, bw, bh, { type: 'building', entityId: project.id, projectId: project.id });

      // Place sub-structures
      const thSize = STRUCTURE_SIZES.townhall ?? [3, 3];
      const thCol = spot.col + 1;
      const thRow = bRow + bh;
      if (canPlaceSafe(grid, thCol, thRow, thSize[0], thSize[1])) {
        grid = placeOnGrid(grid, thCol, thRow, thSize[0], thSize[1], { type: 'townhall', entityId: project.id, projectId: project.id });
      }

      const sSizeKey = getShopSizeKey(project.lenders.length);
      const sSize = STRUCTURE_SIZES[sSizeKey] ?? [2, 2];
      const sCol = bCol + bw + 1;
      const sRow = bRow + 1;
      if (canPlaceSafe(grid, sCol, sRow, sSize[0], sSize[1])) {
        grid = placeOnGrid(grid, sCol, sRow, sSize[0], sSize[1], { type: 'shop', entityId: project.id, projectId: project.id });
      }

      const lSizeKey = getLibrarySizeKey(project.documents.length);
      const lSize = STRUCTURE_SIZES[lSizeKey] ?? [2, 2];
      const lCol = spot.col + 1;
      const lRow = bRow - lSize[1] - 1;
      if (canPlaceSafe(grid, lCol, lRow, lSize[0], lSize[1])) {
        grid = placeOnGrid(grid, lCol, lRow, lSize[0], lSize[1], { type: 'library', entityId: project.id, projectId: project.id });
      }
    }

    // Find screen positions for all structures by scanning the grid
    const { x, y } = gridToScreen(bCol + bw / 2, bRow + bh / 2);
    const thPos = findStructureOnGrid(grid, project.id, 'townhall');
    const sPos = findStructureOnGrid(grid, project.id, 'shop');
    const lPos = findStructureOnGrid(grid, project.id, 'library');
    const thScreen = thPos ? gridToScreen(thPos.col + 1.5, thPos.row + 1.5) : { x: x - 60, y: y + 30 };
    const sScreen = sPos ? gridToScreen(sPos.col + 1, sPos.row + 1) : { x: x + 60, y: y + 30 };
    const lScreen = lPos ? gridToScreen(lPos.col + 1, lPos.row + 1) : { x: x - 60, y: y - 30 };

    const mainBuilding: CityBuilding = {
      project,
      x,
      y,
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
      x,
      y,
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

  function canPlaceSafe(g: GridState, col: number, row: number, w: number, h: number): boolean {
    if (col < 0 || row < 0 || col + w > g.size || row + h > g.size) return false;
    for (let c = col; c < col + w; c++) {
      for (let r = row; r < row + h; r++) {
        if (g.cells[r]?.[c] !== null && g.cells[r]?.[c] !== undefined) return false;
      }
    }
    return true;
  }
}

// ─── Formatting helpers ───

export function formatMoney(amount: number, currency = 'EUR'): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B ${currency}`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(0)}M ${currency}`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K ${currency}`;
  return `${amount} ${currency}`;
}
