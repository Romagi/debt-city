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

/** Townhall (mairie) — to the left of the building */
function townhallPosition(bx: number, by: number, w: number): { x: number; y: number } {
  return { x: bx - w * 0.78, y: by + w * 0.39 };
}

/** Shop (syndicate) — to the right of the building */
function shopPosition(bx: number, by: number, w: number): { x: number; y: number } {
  return { x: bx + w * 0.78, y: by + w * 0.39 };
}

/** Library (bibliothèque) — behind the building (upper-left in iso view) */
function libraryPosition(bx: number, by: number, w: number): { x: number; y: number } {
  return { x: bx - w * 0.35, y: by - w * 0.45 };
}

// ─── Build city layout ───

const GRID_COLS = 3;
const GRID_SPACING_COL = 7;
const GRID_SPACING_ROW = 7;

export function buildCityState(portfolio: Portfolio): CityState {
  const districts: CityDistrict[] = [];

  const sortedProjects = [...portfolio.projects].sort((a, b) => {
    const statusOrder: Record<string, number> = { published: 0, draft: 1, archived: 2, finished: 3 };
    const sDiff = (statusOrder[a.currentStatus] ?? 9) - (statusOrder[b.currentStatus] ?? 9);
    if (sDiff !== 0) return sDiff;
    return b.globalFundingAmount.amount - a.globalFundingAmount.amount;
  });

  sortedProjects.forEach((project, index) => {
    const gridCol = index % GRID_COLS;
    const gridRow = Math.floor(index / GRID_COLS);
    const { x, y } = gridToIso(gridCol * GRID_SPACING_COL, gridRow * GRID_SPACING_ROW);

    const height = computeBuildingHeight(project.globalFundingAmount.amount);
    const borrower = portfolio.borrowers.find(b => b.id === project.borrowerId)!;

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
      townhallPos: townhallPosition(x, y, TILE_WIDTH),
      shopPos: shopPosition(x, y, TILE_WIDTH),
      libraryPos: libraryPosition(x, y, TILE_WIDTH),
    };

    districts.push({
      borrower,
      buildings: [mainBuilding],
      x,
      y,
      esgScore: mapEsgScore(borrower),
    });
  });

  return {
    districts,
    weather: mapWeather(portfolio),
    totalBuildings: portfolio.projects.length,
  };
}

// ─── Formatting helpers ───

export function formatMoney(amount: number, currency = 'EUR'): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B ${currency}`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(0)}M ${currency}`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K ${currency}`;
  return `${amount} ${currency}`;
}
