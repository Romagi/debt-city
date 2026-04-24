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

export const GRID_SIZE = 60; // fits up to ~12 districts (4×3)
export const ISO_TILE_W = 64; // pixel width of one iso tile
export const ISO_TILE_H = 38; // pixel height of one iso tile (~30.5° dimetric — matches new sprite library geometry)
export const DISTRICT_SIZE = 12; // 12×12 tiles per district
export const DISTRICT_GAP = 1; // gap between districts (for roads)
export const DISTRICT_COLS = 4; // districts per row

export type CellType =
  // ── Bâtiments (auto-générés) ──────────────────────────────────────────────
  | 'building' | 'townhall' | 'shop' | 'library'
  // ── Routes ────────────────────────────────────────────────────────────────
  | 'road'
  // ── Trottoirs (13 variantes plaçables) ───────────────────────────────────
  | 'sidewalk_1'  | 'sidewalk_2'  | 'sidewalk_3'  | 'sidewalk_4'  | 'sidewalk_5'
  | 'sidewalk_6'  | 'sidewalk_7'  | 'sidewalk_8'  | 'sidewalk_9'
  | 'sidewalk_10' | 'sidewalk_11' | 'sidewalk_12' | 'sidewalk_13'
  // ── Nature ────────────────────────────────────────────────────────────────
  | 'tree_palm' | 'tree_3' | 'tree_14'
  // ── Décorations ──────────────────────────────────────────────────────────
  | 'park_fountain' | 'park_pond'
  // ── Utilitaires — Parking ─────────────────────────────────────────────────
  | 'carpark_sign' | 'carpark_gate'
  // ── Utilitaires — Services ────────────────────────────────────────────────
  | 'bar' | 'hospital' | 'post_office' | 'recycling' | 'gas_station' | 'tele_tower'
  // ── Utilitaires — Urgences ────────────────────────────────────────────────
  | 'fire_station' | 'police_station' | 'prison'
  // ── Utilitaires — Loisirs ─────────────────────────────────────────────────
  | 'cinema' | 'museum'
  | 'stadium_athletics' | 'stadium_football_american' | 'stadium_football_soccer' | 'stadium_tennis'
  // ── Utilitaires — Restauration ────────────────────────────────────────────
  | 'restaurant_breakfast' | 'restaurant_pizza' | 'restaurant_ramen'
  | 'restaurant_sandwich'  | 'restaurant_sushi'
  | 'street_flowers' | 'street_icecream'
  // ── Clôtures (auto-placées sur le périmètre des quartiers) ──────────────────
  | 'fence_1' | 'fence_2'
  // ── Legacy (compatibilité grids existantes) ────────────────────────────────
  | 'tree_sm' | 'tree_lg' | 'sidewalk' | 'park' | 'bench' | 'fountain' | 'bush';

export const DECORATION_TYPES: Set<CellType> = new Set([
  // Routes
  'road',
  // Trottoirs
  'sidewalk_1',  'sidewalk_2',  'sidewalk_3',  'sidewalk_4',  'sidewalk_5',
  'sidewalk_6',  'sidewalk_7',  'sidewalk_8',  'sidewalk_9',
  'sidewalk_10', 'sidewalk_11', 'sidewalk_12', 'sidewalk_13',
  // Nature
  'tree_palm', 'tree_3', 'tree_14',
  // Décorations
  'park_fountain', 'park_pond',
  // Utilitaires — Parking
  'carpark_sign', 'carpark_gate',
  // Utilitaires — Services
  'bar', 'hospital', 'post_office', 'recycling', 'gas_station', 'tele_tower',
  // Utilitaires — Urgences
  'fire_station', 'police_station', 'prison',
  // Utilitaires — Loisirs
  'cinema', 'museum',
  'stadium_athletics', 'stadium_football_american', 'stadium_football_soccer', 'stadium_tennis',
  // Utilitaires — Restauration
  'restaurant_breakfast', 'restaurant_pizza', 'restaurant_ramen',
  'restaurant_sandwich', 'restaurant_sushi',
  'street_flowers', 'street_icecream',
  // Clôtures
  'fence_1', 'fence_2',
  // Legacy
  'tree_sm', 'tree_lg', 'sidewalk', 'park', 'bench', 'fountain', 'bush',
]);

/** Fence types — permeable to roads and buildings (can be overwritten) */
export const FENCE_TYPES: Set<CellType> = new Set(['fence_1', 'fence_2']);

export interface CellContent {
  type: CellType;
  entityId?: string;    // Links to project/covenant/lender ID
  projectId?: string;   // Which deal this belongs to
  /** For multi-cell structures, only the top-left cell has the content. Other cells point to it. */
  originCol?: number;
  originRow?: number;
  /** Horizontal flip — mirrors the sprite for directional assets */
  flip?: boolean;
}

export interface DistrictBounds {
  projectId: string;
  col: number; // top-left grid col
  row: number; // top-left grid row
  size: number; // always DISTRICT_SIZE (20)
}

export interface GridState {
  cells: (CellContent | null)[][];
  size: number;
  districts: DistrictBounds[];
}

/** How many grid cells each structure type occupies [cols, rows]
 *  Based on actual sprite footprint (base isometric diamond), NOT height.
 *  New lib sprites (512/768/1024 wide, baseRatio=1.0):
 *    512px → 1×1  (footprintW = (1+1)*32 = 64,  scale = 64/512  = 0.125)
 *    768px → 2×1  (footprintW = (2+1)*32 = 96,  scale = 96/768  = 0.125)
 *   1024px → 2×2  (footprintW = (2+2)*32 = 128, scale = 128/1024 = 0.125) */
export const STRUCTURE_SIZES: Record<string, [number, number]> = {
  // ── Main buildings — new lib sprites ──────────────────────────────────────
  building_xs: [1, 1],   // 512×1024
  building_sm: [2, 1],   // 768×1280
  building_md: [2, 1],   // 768×1280
  building_lg: [2, 2],   // 1024×1280
  building_xl: [2, 2],   // 1024×1536
  // ── Sub-structures — new lib sprites ─────────────────────────────────────
  townhall:    [2, 2],   // 1024×1280
  shop_kiosk:  [1, 1],   // 512×768
  shop_store:  [2, 1],   // 768×1280
  shop_mall:   [2, 2],   // 1024×1280
  library_md:  [2, 2],   // 1024×1024
  // ── Construction placeholders (named after footprint) ────────────────────
  construction_1x1: [1, 1],   // 512×512
  construction_2x1: [2, 1],   // 768×1024
  construction_2x2: [2, 2],   // 1024×1024
  road_straight_ns: [1, 1],
  road_straight_ew: [1, 1],
  road_cross: [1, 1],
  road_turn_ne: [1, 1],
  road_turn_se: [1, 1],
  road_turn_sw: [1, 1],
  road_turn_nw: [1, 1],
  road_t_nse: [1, 1],
  road_t_sew: [1, 1],
  road_t_nsw: [1, 1],
  road_t_new: [1, 1],
  road_isolated: [1, 1],
  road_end_n: [1, 1],
  road_end_e: [1, 1],
  road_end_s: [1, 1],
  road_end_w: [1, 1],
  tile_sidewalk: [1, 1],
  tile_sidewalk_flat: [1, 1],
  // ── Ground tiles ─────────────────────────────────────────────────────────
  tile_grass:    [1, 1],
  // ── Road sprite keys ─────────────────────────────────────────────────────
  road_straight_1: [1, 1], road_straight_2: [1, 1],
  road_turn_1: [1, 1], road_turn_2: [1, 1], road_turn_3: [1, 1], road_turn_4: [1, 1],
  road_t_1: [1, 1], road_t_2: [1, 1], road_t_3: [1, 1], road_t_4: [1, 1],
  road_end_1: [1, 1], road_end_2: [1, 1], road_end_3: [1, 1], road_end_4: [1, 1],
  // ── Trottoirs ────────────────────────────────────────────────────────────
  sidewalk_1:  [1, 1], sidewalk_2:  [1, 1], sidewalk_3:  [1, 1], sidewalk_4:  [1, 1],
  sidewalk_5:  [1, 1], sidewalk_6:  [1, 1], sidewalk_7:  [1, 1], sidewalk_8:  [1, 1],
  sidewalk_9:  [1, 1],
  sidewalk_10: [1, 1], sidewalk_11: [1, 1], sidewalk_12: [1, 1], sidewalk_13: [1, 1],
  // ── Nature ───────────────────────────────────────────────────────────────
  tree_palm: [1, 1], tree_3: [1, 1], tree_14: [1, 1],
  // ── Décorations ──────────────────────────────────────────────────────────
  park_fountain: [2, 2], park_pond: [2, 2],
  // ── Utilitaires — Parking ────────────────────────────────────────────────
  carpark_sign: [2, 1], carpark_gate: [2, 2],
  // ── Utilitaires — Services ────────────────────────────────────────────────
  bar:        [2, 1], hospital:   [2, 2], post_office: [2, 1],
  recycling:  [2, 1], gas_station: [2, 1], tele_tower: [1, 1],
  // ── Utilitaires — Urgences ────────────────────────────────────────────────
  fire_station: [2, 2], police_station: [2, 2], prison: [2, 2],
  // ── Utilitaires — Loisirs ─────────────────────────────────────────────────
  cinema: [2, 2], museum: [2, 2],
  stadium_athletics: [2, 2], stadium_football_american: [2, 2],
  stadium_football_soccer: [2, 2], stadium_tennis: [2, 2],
  // ── Utilitaires — Restauration ────────────────────────────────────────────
  restaurant_breakfast: [2, 1], restaurant_pizza:    [2, 1],
  restaurant_ramen:     [2, 1], restaurant_sandwich: [2, 1],
  restaurant_sushi:     [2, 1],
  street_flowers: [1, 1], street_icecream: [1, 1],
  // Clôtures (1×1 — PicketFence1/2, 262×255)
  fence_1:        [1, 1],
  fence_2:        [1, 1],
  picket_fence_1: [1, 1],  // SpriteKey alias — requis pour drawSpriteOnGrid
  picket_fence_2: [1, 1],
  // Decorations
  tree_sm: [1, 1],
  tree_lg: [1, 1],
  road: [1, 1],
  sidewalk: [1, 1],
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
  return { cells, size, districts: [] };
}

/** Get the district that a grid cell belongs to */
export function getDistrictAt(grid: GridState, col: number, row: number): DistrictBounds | null {
  return grid.districts.find(d =>
    col >= d.col && col < d.col + d.size && row >= d.row && row < d.row + d.size
  ) ?? null;
}

/** Get the district bounds for a specific project */
export function getDistrictForProject(grid: GridState, projectId: string): DistrictBounds | null {
  return grid.districts.find(d => d.projectId === projectId) ?? null;
}

/** Check if a placement fits within a district */
export function fitsInDistrict(district: DistrictBounds, col: number, row: number, w: number, h: number): boolean {
  return col >= district.col && row >= district.row && col + w <= district.col + district.size && row + h <= district.row + district.size;
}

/** Allocate a new district slot on the grid */
export function allocateDistrict(grid: GridState, projectId: string): DistrictBounds {
  const index = grid.districts.length;
  const slotCol = index % DISTRICT_COLS;
  const slotRow = Math.floor(index / DISTRICT_COLS);
  const col = slotCol * (DISTRICT_SIZE + DISTRICT_GAP);
  const row = slotRow * (DISTRICT_SIZE + DISTRICT_GAP);
  return { projectId, col, row, size: DISTRICT_SIZE };
}

/** Remove fence cells from a rectangular area (fences are permeable to roads and buildings) */
export function clearFencesInArea(grid: GridState, col: number, row: number, w: number, h: number): GridState {
  let changed = false;
  const newCells = grid.cells.map((rowArr, r) =>
    rowArr.map((cell, c) => {
      if (c >= col && c < col + w && r >= row && r < row + h && cell && FENCE_TYPES.has(cell.type)) {
        changed = true;
        return null;
      }
      return cell;
    })
  );
  return changed ? { ...grid, cells: newCells } : grid;
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
