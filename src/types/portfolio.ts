// ─── Enums matching Kls Agency domain ───

export type ProjectStatus = 'draft' | 'published' | 'archived' | 'finished';

export type TermStatus =
  | 'created'
  | 'coming'
  | 'pending'
  | 'result_received'
  | 'result_ko'
  | 'validated'
  | 'non_compliant'
  | 'breached'
  | 'deactivated';

export type TermState =
  | 'breach_risk'
  | 'breached'
  | 'coming'
  | 'shared'
  | 'to_control'
  | 'to_fulfill'
  | 'to_share';

export type CovenantNature =
  | 'action_agent'
  | 'control'
  | 'document'
  | 'esg_criteria'
  | 'financial_element'
  | 'financial_ratio';

export type ProjectNature =
  | 'real_estate'
  | 'corporate'
  | 'infrastructure'
  | 'leveraged'
  | 'project_finance';

export type TrackingType = 'agency' | 'bilateral' | 'participation';

export type FundingSpecificity =
  | 'cbi'
  | 'lbo'
  | 'project_financing'
  | 'acquisition_financing'
  | 'development_financing'
  | 'refinancing'
  | 'restructuring'
  | 'bridge_loan'
  | 'green_loan'
  | 'social_loan'
  | 'sustainability_linked'
  | 'club_deal'
  | 'syndicated'
  | 'bilateral_loan';

// ─── Core entities ───

export interface Money {
  amount: number;
  currency: string;
}

export interface Tranche {
  id: string;
  name: string;
  amount: Money;
  rank: string | null;
  nature: string | null;
  repaymentType: string;
  rate: {
    index: string | null;
    margin: number | null;
    floor: number | null;
  };
}

export interface Term {
  id: string;
  name: string;
  covenantId: string;
  covenantName: string;
  covenantNature: CovenantNature;
  startDate: string;
  endDate: string;
  currentStatus: TermStatus;
  state: TermState;
  waiver: boolean | null;
  waiverReason: string | null;
  late: boolean;
}

export type CovenantStatus = 'draft' | 'published';

export interface CovenantVersionEntry {
  version: number;
  name: string;
  nature: CovenantNature;
  publishedAt: string;
}

export interface Covenant {
  id: string;
  name: string;
  nature: CovenantNature;
  terms: Term[];
  status: CovenantStatus;
  version: number;
  publishedAt: string | null;
  versions: CovenantVersionEntry[];
}

export type DocumentDrive = 'lender' | 'borrower_shared' | 'borrower_confidential';

export interface Document {
  id: string;
  name: string;
  drive: DocumentDrive;
  uploadedAt: string;
}

export interface BankAccount {
  institutionName: string;
  bic: string;
  iban: string;
}

export type LenderRole = 'agent' | 'arranger' | 'participant';

export interface TrancheAllocation {
  trancheId: string;
  trancheName: string;
  amount: Money;
}

export interface Lender {
  id: string;
  corporateName: string;
  role: LenderRole;
  allocations: TrancheAllocation[];
  legalForm: string | null;
  headOffice: string | null;
  rcs: string | null;
  bankAccount: BankAccount | null;
}

export function getLenderTotal(lender: Lender): number {
  return lender.allocations.reduce((sum, a) => sum + a.amount.amount, 0);
}

export interface Borrower {
  id: string;
  corporateName: string;
  esgScope1: number | null;
  esgScope2: number | null;
  esgScope3: number | null;
  projectIds: string[];
  legalForm: string | null;
  headOffice: string | null;
  rcs: string | null;
  capital: Money | null;
  patrimony: Money | null;
  taxonomyCA: number | null;
  taxonomyOPEX: number | null;
}

export interface Project {
  id: string;
  title: string;
  nature: ProjectNature;
  trackingType: TrackingType;
  currentStatus: ProjectStatus;
  globalFundingAmount: Money;
  closingDate: string | null;
  contractEndDate: string | null;
  borrowerId: string;
  tranches: Tranche[];
  covenants: Covenant[];
  lenders: Lender[];
  documents: Document[];
  agentName: string;
  operationReference: string | null;
  internalReference: string | null;
  fundingSpecificity: FundingSpecificity | null;
  description: string | null;
  riskGroupName: string | null;
}

// ─── Project status workflow ───

export const PROJECT_STATUS_ACTIONS: Record<ProjectStatus, { label: string; target: ProjectStatus; color: string }[]> = {
  draft: [{ label: 'Publish', target: 'published', color: '#2ECC40' }],
  published: [
    { label: 'Finish', target: 'finished', color: '#6AB0F0' },
    { label: 'Archive', target: 'archived', color: '#999' },
  ],
  finished: [{ label: 'Archive', target: 'archived', color: '#999' }],
  archived: [],
};

// ─── Term workflow ───

export const TERM_TRANSITION_MAP: Record<TermStatus, TermStatus[]> = {
  coming: ['pending', 'result_received', 'validated', 'breached', 'deactivated'],
  pending: ['result_received', 'validated', 'breached', 'deactivated'],
  created: ['result_received', 'validated', 'breached', 'deactivated'],
  result_received: ['validated', 'breached', 'non_compliant', 'deactivated', 'created'],
  result_ko: ['validated', 'breached', 'non_compliant', 'deactivated', 'created'],
  validated: ['created', 'breached', 'non_compliant'],
  non_compliant: ['breached', 'result_received', 'created'],
  breached: ['created', 'result_received', 'non_compliant', 'deactivated'],
  deactivated: [],
};

export const STATUS_TO_STATE: Record<TermStatus, TermState> = {
  created: 'to_fulfill',
  coming: 'coming',
  pending: 'to_fulfill',
  result_received: 'to_control',
  result_ko: 'to_control',
  validated: 'shared',
  non_compliant: 'breach_risk',
  breached: 'breached',
  deactivated: 'shared',
};

export const TERM_ACTIONS: Record<TermStatus, { label: string; target: TermStatus }[]> = {
  coming: [{ label: 'Start Period', target: 'pending' }],
  pending: [
    { label: 'Submit Result', target: 'result_received' },
    { label: 'Mark Validated', target: 'validated' },
  ],
  created: [
    { label: 'Submit Result', target: 'result_received' },
    { label: 'Mark Validated', target: 'validated' },
  ],
  result_received: [
    { label: 'Validate', target: 'validated' },
    { label: 'Flag Non-Compliant', target: 'non_compliant' },
    { label: 'Flag Breach', target: 'breached' },
  ],
  result_ko: [
    { label: 'Validate', target: 'validated' },
    { label: 'Flag Breach', target: 'breached' },
  ],
  validated: [{ label: 'Reopen', target: 'created' }],
  non_compliant: [
    { label: 'Confirm Breach', target: 'breached' },
    { label: 'Re-submit', target: 'result_received' },
  ],
  breached: [], // Handled separately via waiver buttons
  deactivated: [],
};

// ─── Portfolio aggregation ───

export interface TermStateCount {
  breached: number;
  late: number;
  ending: number;
  resultToCheck: number;
}

export interface Portfolio {
  projects: Project[];
  borrowers: Borrower[];
  termStateCount: TermStateCount;
  totalFunding: Money;
  grid: GridState;
}

// ─── City visual mapping ───

export type BuildingState = 'construction' | 'operational' | 'dimmed' | 'closed';
export type AlertLevel = 'none' | 'smoke' | 'fire';
export type TrafficLightColor = 'green' | 'orange' | 'red' | 'grey';
export type WeatherState = 'sunny' | 'cloudy' | 'stormy';

export type SyndicateSize = 'none' | 'kiosk' | 'shop' | 'mall';
export type LibrarySize = 'small' | 'medium' | 'large';

/** What the user clicked in the district */
export type ClickTarget =
  | { kind: 'building'; building: CityBuilding }
  | { kind: 'townhall'; building: CityBuilding }
  | { kind: 'shop'; building: CityBuilding }
  | { kind: 'library'; building: CityBuilding };

export interface CityBuilding {
  project: Project;
  x: number;
  y: number;
  width: number;
  height: number;
  floors: number;
  state: BuildingState;
  alertLevel: AlertLevel;
  trafficLight: TrafficLightColor;
  syndicateSize: SyndicateSize;
  librarySize: LibrarySize;
  /** Computed positions for sub-structures */
  townhallPos: { x: number; y: number };
  shopPos: { x: number; y: number };
  libraryPos: { x: number; y: number };
}

export interface CityDistrict {
  borrower: Borrower;
  buildings: CityBuilding[];
  x: number;
  y: number;
  scale: number;
  esgScore: 'good' | 'neutral' | 'bad';
}

export interface CityState {
  districts: CityDistrict[];
  weather: WeatherState;
  totalBuildings: number;
  grid: GridState;
}

// ─── Grid system (city builder) ───

export const GRID_SIZE = 32; // 32×32 tiles
export const ISO_TILE_W = 64; // pixel width of one iso tile
export const ISO_TILE_H = 32; // pixel height of one iso tile

export type CellType = 'building' | 'townhall' | 'shop' | 'library' | 'tree_sm' | 'tree_lg' | 'road' | 'park' | 'bench' | 'fountain' | 'bush';

export interface CellContent {
  type: CellType;
  entityId?: string;    // Links to project/covenant/lender ID
  projectId?: string;   // Which deal this belongs to
  /** For multi-cell structures, only the top-left cell has the content. Other cells point to it. */
  originCol?: number;
  originRow?: number;
}

export interface GridState {
  cells: (CellContent | null)[][];
  size: number;
}

/** How many grid cells each structure type occupies [cols, rows] */
export const STRUCTURE_SIZES: Record<string, [number, number]> = {
  building_xs: [2, 2],
  building_sm: [2, 3],
  building_md: [3, 4],
  building_lg: [3, 5],
  building_xl: [4, 6],
  townhall: [3, 3],
  shop_kiosk: [2, 2],
  shop_store: [2, 3],
  shop_mall: [3, 4],
  library_sm: [2, 2],
  library_md: [2, 3],
  library_lg: [3, 3],
  tree_sm: [1, 1],
  tree_lg: [1, 1],
  road: [1, 1],
  park: [2, 2],
  bench: [1, 1],
  fountain: [1, 1],
  bush: [1, 1],
};

/** Convert grid coords to isometric screen coords */
export function gridToScreen(col: number, row: number): { x: number; y: number } {
  return {
    x: (col - row) * (ISO_TILE_W / 2),
    y: (col + row) * (ISO_TILE_H / 2),
  };
}

/** Convert isometric screen coords to grid coords */
export function screenToGrid(sx: number, sy: number): { col: number; row: number } {
  const col = (sx / (ISO_TILE_W / 2) + sy / (ISO_TILE_H / 2)) / 2;
  const row = (sy / (ISO_TILE_H / 2) - sx / (ISO_TILE_W / 2)) / 2;
  return { col: Math.floor(col), row: Math.floor(row) };
}

/** Create an empty grid */
export function createEmptyGrid(size: number): GridState {
  const cells: (CellContent | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));
  return { cells, size };
}

/** Check if a rectangle of cells is free */
export function canPlace(grid: GridState, col: number, row: number, w: number, h: number): boolean {
  if (col < 0 || row < 0 || col + w > grid.size || row + h > grid.size) return false;
  for (let c = col; c < col + w; c++) {
    for (let r = row; r < row + h; r++) {
      if (grid.cells[r][c] !== null) return false;
    }
  }
  return true;
}

/** Place a structure on the grid */
export function placeOnGrid(grid: GridState, col: number, row: number, w: number, h: number, content: CellContent): GridState {
  const newCells = grid.cells.map(r => [...r]);
  for (let c = col; c < col + w; c++) {
    for (let r = row; r < row + h; r++) {
      newCells[r][c] = (c === col && r === row)
        ? content
        : { ...content, originCol: col, originRow: row };
    }
  }
  return { ...grid, cells: newCells };
}

/** Remove all cells matching a given entityId and type */
export function removeFromGrid(grid: GridState, entityId: string, type: CellType): GridState {
  const newCells = grid.cells.map(r => r.map(c =>
    c && c.entityId === entityId && c.type === type ? null : c
  ));
  return { ...grid, cells: newCells };
}

/** Find a free spot on the grid for a rectangle of given size */
export function findFreeSpot(grid: GridState, w: number, h: number): { col: number; row: number } | null {
  // Spiral from center outward
  const center = Math.floor(grid.size / 2);
  for (let radius = 0; radius < grid.size; radius++) {
    for (let dc = -radius; dc <= radius; dc++) {
      for (let dr = -radius; dr <= radius; dr++) {
        if (Math.abs(dc) !== radius && Math.abs(dr) !== radius) continue; // Only check perimeter
        const col = center + dc;
        const row = center + dr;
        if (canPlace(grid, col, row, w, h)) return { col, row };
      }
    }
  }
  return null;
}
