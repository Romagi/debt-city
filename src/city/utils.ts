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

// ─── Sub-structure positions relative to building origin ───
// Layout: library (back-left), building (center), townhall (front-left), shop (front-right)
// `s` = district scale factor (bigger deal → more spread out)

function townhallPosition(bx: number, by: number, w: number, s: number): { x: number; y: number } {
  return { x: bx - w * 0.95 * s, y: by + w * 0.48 * s };
}

function shopPosition(bx: number, by: number, w: number, s: number): { x: number; y: number } {
  return { x: bx + w * 0.95 * s, y: by + w * 0.48 * s };
}

function libraryPosition(bx: number, by: number, w: number, s: number): { x: number; y: number } {
  return { x: bx - w * 0.95 * s, y: by - w * 0.48 * s };
}

/** District scale: bigger deals get larger neighborhoods */
function computeDistrictScale(amount: number): number {
  return 0.8 + Math.min(amount / MAX_FUNDING, 1) * 0.5;
}

// ─── Build city layout ───

const GRID_COLS = 3;
const GRID_SPACING_COL = 11;
const GRID_SPACING_ROW = 11;

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

export function buildCityState(portfolio: Portfolio): CityState {
  const districts: CityDistrict[] = [];
  let grid = createEmptyGrid(GRID_SIZE);

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

    // Find a spot for this district on the grid
    const dSize = districtGridSize(amount);
    const spot = findFreeSpot(grid, dSize, dSize);
    if (!spot) continue; // Grid full — skip this deal

    // Reserve the district area
    for (let c = spot.col; c < spot.col + dSize; c++) {
      for (let r = spot.row; r < spot.row + dSize; r++) {
        if (!grid.cells[r]?.[c]) {
          // Mark as part of district (we'll overwrite with structures below)
        }
      }
    }

    // Place building in center of district
    const bSizeKey = getBuildingSizeKey(amount);
    const [bw, bh] = STRUCTURE_SIZES[bSizeKey] ?? [2, 2];
    const bCol = spot.col + Math.floor((dSize - bw) / 2);
    const bRow = spot.row + Math.floor((dSize - bh) / 2);
    grid = placeOnGrid(grid, bCol, bRow, bw, bh, { type: 'building', entityId: project.id, projectId: project.id });

    // Place sub-structures around the building
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

    // Convert grid position to screen position for backward compatibility
    const { x, y } = gridToScreen(bCol + bw / 2, bRow + bh / 2);
    const thScreen = gridToScreen(thCol + thSize[0] / 2, thRow + thSize[1] / 2);
    const sScreen = gridToScreen(sCol + sSize[0] / 2, sRow + sSize[1] / 2);
    const lScreen = gridToScreen(lCol + lSize[0] / 2, lRow + lSize[1] / 2);

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
