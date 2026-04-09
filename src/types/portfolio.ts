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
  esgScore: 'good' | 'neutral' | 'bad';
}

export interface CityState {
  districts: CityDistrict[];
  weather: WeatherState;
  totalBuildings: number;
}
