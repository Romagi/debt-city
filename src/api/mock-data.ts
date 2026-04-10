import type {
  Portfolio,
  Project,
  Borrower,
  Tranche,
  Covenant,
  Term,
  Lender,
  Document,
  DocumentDrive,
} from '../types/portfolio';
import { STATUS_TO_STATE, createEmptyGrid } from '../types/portfolio';

// ─── Borrowers ───

const borrowers: Borrower[] = [
  {
    id: 'b1',
    corporateName: 'Foncière Rivoli',
    legalForm: 'SA', headOffice: 'Paris 8e', rcs: 'Paris B 432 567 891',
    capital: { amount: 120_000_000, currency: 'EUR' },
    esgScope1: 1200, esgScope2: 800, esgScope3: 3500,
    patrimony: { amount: 2_400_000_000, currency: 'EUR' },
    taxonomyCA: 62, taxonomyOPEX: 45,
    projectIds: ['p1', 'p2'],
  },
  {
    id: 'b2',
    corporateName: 'Groupe Haussmann',
    legalForm: 'SAS', headOffice: 'Paris 9e', rcs: 'Paris B 501 234 567',
    capital: { amount: 85_000_000, currency: 'EUR' },
    esgScope1: 500, esgScope2: 300, esgScope3: 1200,
    patrimony: { amount: 1_800_000_000, currency: 'EUR' },
    taxonomyCA: 55, taxonomyOPEX: 38,
    projectIds: ['p3'],
  },
  {
    id: 'b3',
    corporateName: 'InfraVerte SAS',
    legalForm: 'SAS', headOffice: 'Lyon 3e', rcs: 'Lyon B 789 012 345',
    capital: { amount: 45_000_000, currency: 'EUR' },
    esgScope1: 150, esgScope2: 80, esgScope3: 400,
    patrimony: null,
    taxonomyCA: 92, taxonomyOPEX: 88,
    projectIds: ['p4', 'p5'],
  },
  {
    id: 'b4',
    corporateName: 'LogiPark REIT',
    legalForm: 'SA', headOffice: 'Marseille', rcs: 'Marseille B 345 678 901',
    capital: { amount: 200_000_000, currency: 'EUR' },
    esgScope1: 900, esgScope2: 600, esgScope3: 2800,
    patrimony: { amount: 3_100_000_000, currency: 'EUR' },
    taxonomyCA: 41, taxonomyOPEX: 30,
    projectIds: ['p6'],
  },
  {
    id: 'b5',
    corporateName: 'Nexity Développement',
    legalForm: 'SA', headOffice: 'Paris 16e', rcs: 'Paris B 444 346 795',
    capital: { amount: 280_000_000, currency: 'EUR' },
    esgScope1: 2000, esgScope2: 1400, esgScope3: 5000,
    patrimony: { amount: 5_600_000_000, currency: 'EUR' },
    taxonomyCA: 35, taxonomyOPEX: 22,
    projectIds: ['p7', 'p8'],
  },
];

// ─── Lenders pool ───

const lenderPool: Omit<Lender, 'allocations'>[] = [
  { id: 'l1', corporateName: 'BNP Paribas', role: 'agent',
    legalForm: 'SA', headOffice: 'Paris', rcs: 'Paris B 662 042 449',
    bankAccount: { institutionName: 'BNP Paribas SA', bic: 'BNPAFRPP', iban: 'FR76 3000 4028 3700 0100 0266 590' } },
  { id: 'l2', corporateName: 'Société Générale', role: 'arranger',
    legalForm: 'SA', headOffice: 'Paris', rcs: 'Paris B 552 120 222',
    bankAccount: { institutionName: 'Société Générale SA', bic: 'SOGEFRPP', iban: 'FR76 3000 3034 0000 0200 4810 125' } },
  { id: 'l3', corporateName: 'Crédit Agricole CIB', role: 'participant',
    legalForm: 'SA', headOffice: 'Montrouge', rcs: 'Nanterre B 304 187 701',
    bankAccount: { institutionName: 'Crédit Agricole CIB', bic: 'CRLYFRPP', iban: 'FR76 3000 6000 0100 0000 1234 567' } },
  { id: 'l4', corporateName: 'Natixis', role: 'participant',
    legalForm: 'SA', headOffice: 'Paris', rcs: 'Paris B 542 044 524',
    bankAccount: { institutionName: 'Natixis SA', bic: 'NATXFRPP', iban: 'FR76 3000 7999 9901 2345 6789 012' } },
  { id: 'l5', corporateName: 'HSBC France', role: 'participant',
    legalForm: 'SA', headOffice: 'Paris', rcs: 'Paris B 775 670 284',
    bankAccount: { institutionName: 'HSBC Continental Europe', bic: 'CCFRFRPP', iban: 'FR76 3005 8000 0000 0012 3456 789' } },
];

function pickLenders(tranches: Tranche[], count: number): Lender[] {
  const selected = lenderPool.slice(0, count);
  return selected.map((l, i) => ({
    ...l,
    role: (i === 0 ? 'agent' : i === 1 ? 'arranger' : 'participant') as Lender['role'],
    allocations: tranches.map(t => ({
      trancheId: t.id,
      trancheName: t.name,
      amount: { amount: Math.round(t.amount.amount / count), currency: 'EUR' },
    })),
  }));
}

// ─── Helper: generate terms for a covenant ───

function makeCovenant(id: string, name: string, nature: Covenant['nature'], statuses: Term['currentStatus'][], published = true): Covenant {
  return {
    id, name, nature,
    terms: makeTerms(id, name, nature, statuses),
    status: published ? 'published' : 'draft',
    version: 1,
    publishedAt: published ? '2025-06-01' : null,
    versions: published ? [{ version: 1, name, nature, publishedAt: '2025-06-01' }] : [],
  };
}

function makeTerms(covenantId: string, covenantName: string, nature: Covenant['nature'], statuses: Term['currentStatus'][]): Term[] {
  return statuses.map((status, i) => ({
    id: `${covenantId}-t${i + 1}`,
    name: `Q${i + 1} 2026`,
    covenantId,
    covenantName,
    covenantNature: nature,
    startDate: `2026-0${i * 3 + 1}-01`,
    endDate: `2026-0${i * 3 + 3}-31`,
    currentStatus: status,
    state: STATUS_TO_STATE[status],
    waiver: null,
    waiverReason: null,
    late: status === 'pending',
  }));
}

// ─── Helper: generate mock documents ───

const DOC_NAMES = [
  'Credit Agreement', 'Term Sheet', 'Compliance Certificate', 'Financial Model',
  'Valuation Report', 'Insurance Policy', 'Environmental Assessment', 'Legal Opinion',
  'Facility Agreement', 'Intercreditor Agreement', 'Security Package', 'Board Resolution',
];
const DRIVES: DocumentDrive[] = ['lender', 'borrower_shared', 'borrower_confidential'];

function makeDocuments(projectId: string, count: number): Document[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${projectId}-doc${i + 1}`,
    name: DOC_NAMES[i % DOC_NAMES.length],
    drive: DRIVES[i % DRIVES.length],
    uploadedAt: `2025-${String((i % 12) + 1).padStart(2, '0')}-15`,
  }));
}

// ─── Tranche definitions (extracted so pickLenders can use them) ───

const p1Tranches: Tranche[] = [
  { id: 'p1-tr1', name: 'Tranche A Senior', amount: { amount: 300_000_000, currency: 'EUR' }, rank: 'senior', nature: 'term_loan', repaymentType: 'amortizing', rate: { index: 'EURIBOR 3M', margin: 1.5, floor: 0 } },
  { id: 'p1-tr2', name: 'Tranche B Mezz', amount: { amount: 100_000_000, currency: 'EUR' }, rank: 'mezzanine', nature: 'term_loan', repaymentType: 'bullet', rate: { index: 'EURIBOR 3M', margin: 3.2, floor: 0.5 } },
  { id: 'p1-tr3', name: 'RCF', amount: { amount: 50_000_000, currency: 'EUR' }, rank: 'senior', nature: 'revolving', repaymentType: 'revolving', rate: { index: 'EURIBOR 1M', margin: 1.2, floor: 0 } },
];

const p2Tranches: Tranche[] = [
  { id: 'p2-tr1', name: 'Senior Secured', amount: { amount: 120_000_000, currency: 'EUR' }, rank: 'senior', nature: 'term_loan', repaymentType: 'amortizing', rate: { index: 'EURIBOR 3M', margin: 1.8, floor: 0 } },
];
const p3Tranches: Tranche[] = [
  { id: 'p3-tr1', name: 'Tranche A', amount: { amount: 400_000_000, currency: 'EUR' }, rank: 'senior', nature: 'term_loan', repaymentType: 'amortizing', rate: { index: 'EURIBOR 3M', margin: 1.3, floor: 0 } },
  { id: 'p3-tr2', name: 'Tranche B', amount: { amount: 180_000_000, currency: 'EUR' }, rank: 'senior', nature: 'term_loan', repaymentType: 'bullet', rate: { index: 'EURIBOR 6M', margin: 1.8, floor: 0 } },
  { id: 'p3-tr3', name: 'Capex Facility', amount: { amount: 50_000_000, currency: 'EUR' }, rank: 'senior', nature: 'revolving', repaymentType: 'revolving', rate: { index: 'EURIBOR 1M', margin: 1.5, floor: 0 } },
  { id: 'p3-tr4', name: 'VAT Facility', amount: { amount: 50_000_000, currency: 'EUR' }, rank: 'senior', nature: 'revolving', repaymentType: 'revolving', rate: { index: 'EURIBOR 1M', margin: 1.0, floor: 0 } },
];
const p4Tranches: Tranche[] = [
  { id: 'p4-tr1', name: 'Project Finance Senior', amount: { amount: 160_000_000, currency: 'EUR' }, rank: 'senior', nature: 'term_loan', repaymentType: 'sculpted', rate: { index: 'EURIBOR 6M', margin: 1.6, floor: 0 } },
  { id: 'p4-tr2', name: 'DSR Facility', amount: { amount: 40_000_000, currency: 'EUR' }, rank: 'senior', nature: 'revolving', repaymentType: 'revolving', rate: { index: 'EURIBOR 3M', margin: 1.2, floor: 0 } },
];
const p5Tranches: Tranche[] = [
  { id: 'p5-tr1', name: 'Senior Secured', amount: { amount: 85_000_000, currency: 'EUR' }, rank: 'senior', nature: 'term_loan', repaymentType: 'sculpted', rate: { index: 'EURIBOR 6M', margin: 1.4, floor: 0 } },
];
const p6Tranches: Tranche[] = [
  { id: 'p6-tr1', name: 'Tranche A', amount: { amount: 220_000_000, currency: 'EUR' }, rank: 'senior', nature: 'term_loan', repaymentType: 'amortizing', rate: { index: 'EURIBOR 3M', margin: 1.6, floor: 0 } },
  { id: 'p6-tr2', name: 'Tranche B', amount: { amount: 90_000_000, currency: 'EUR' }, rank: 'mezzanine', nature: 'term_loan', repaymentType: 'bullet', rate: { index: 'EURIBOR 3M', margin: 2.8, floor: 0.25 } },
];
const p7Tranches: Tranche[] = [
  { id: 'p7-tr1', name: 'Senior', amount: { amount: 175_000_000, currency: 'EUR' }, rank: 'senior', nature: 'term_loan', repaymentType: 'amortizing', rate: { index: 'EURIBOR 3M', margin: 1.7, floor: 0 } },
];
const p8Tranches: Tranche[] = [
  { id: 'p8-tr1', name: 'Term Loan', amount: { amount: 95_000_000, currency: 'EUR' }, rank: 'senior', nature: 'term_loan', repaymentType: 'amortizing', rate: { index: 'EURIBOR 3M', margin: 2.0, floor: 0 } },
];

// ─── Projects ───

const projects: Project[] = [
  {
    id: 'p1',
    title: 'Tour Montparnasse Refinancement',
    nature: 'real_estate',
    trackingType: 'agency',
    currentStatus: 'published',
    globalFundingAmount: { amount: 450_000_000, currency: 'EUR' },
    closingDate: '2024-06-15',
    contractEndDate: '2031-06-15',
    borrowerId: 'b1',
    tranches: p1Tranches,
    covenants: [
      makeCovenant('p1-c1', 'DSCR', 'financial_ratio', ['validated', 'validated', 'breached', 'coming']),
      makeCovenant('p1-c2', 'LTV Ratio', 'financial_ratio', ['validated', 'validated', 'non_compliant', 'coming']),
      makeCovenant('p1-c3', 'Insurance Certificate', 'document', ['validated', 'validated', 'validated', 'pending']),
    ],
    lenders: pickLenders(p1Tranches, 4),
    documents: makeDocuments('p1', 10),
    agentName: 'BNP Paribas Securities Services',
    operationReference: 'OP-2024-0615-TMR',
    internalReference: 'INT-FR-CRE-001',
    fundingSpecificity: 'refinancing',
    description: 'Refinancing of Tour Montparnasse mixed-use complex — 60-storey tower, 120k sqm office + retail. Senior/mezz structure with RCF.',
    riskGroupName: 'Foncière Rivoli Group',
  },
  {
    id: 'p2',
    title: 'Rivoli Logistics Hub',
    nature: 'real_estate',
    trackingType: 'agency',
    currentStatus: 'published',
    globalFundingAmount: { amount: 120_000_000, currency: 'EUR' },
    closingDate: '2025-01-20',
    contractEndDate: '2030-01-20',
    borrowerId: 'b1',
    tranches: p2Tranches,
    covenants: [
      makeCovenant('p2-c1', 'ICR', 'financial_ratio', ['validated', 'validated', 'result_received', 'coming']),
    ],
    lenders: pickLenders(p2Tranches, 2),
    documents: makeDocuments('p2', 3),
    agentName: 'BNP Paribas Securities Services',
    operationReference: 'OP-2025-0120-RLH',
    internalReference: 'INT-FR-CRE-002',
    fundingSpecificity: 'acquisition_financing',
    description: 'Acquisition financing for a 45k sqm logistics hub near Roissy-CDG airport.',
    riskGroupName: 'Foncière Rivoli Group',
  },
  {
    id: 'p3',
    title: 'Haussmann Office Portfolio',
    nature: 'real_estate',
    trackingType: 'agency',
    currentStatus: 'published',
    globalFundingAmount: { amount: 680_000_000, currency: 'EUR' },
    closingDate: '2023-09-01',
    contractEndDate: '2030-09-01',
    borrowerId: 'b2',
    tranches: p3Tranches,
    covenants: [
      makeCovenant('p3-c1', 'DSCR', 'financial_ratio', ['validated', 'validated', 'validated', 'coming']),
      makeCovenant('p3-c2', 'LTV Ratio', 'financial_ratio', ['validated', 'validated', 'validated', 'coming']),
    ],
    lenders: pickLenders(p3Tranches, 5),
    documents: makeDocuments('p3', 8),
    agentName: 'Société Générale Securities Services',
    operationReference: 'OP-2023-0901-HOP',
    internalReference: 'INT-FR-CRE-003',
    fundingSpecificity: 'syndicated',
    description: 'Large syndicated facility for a 200k sqm prime office portfolio across Paris CBD (8th, 9th, 16th arrondissements).',
    riskGroupName: 'Groupe Haussmann',
  },
  {
    id: 'p4',
    title: 'Parc Éolien Normandie',
    nature: 'infrastructure',
    trackingType: 'agency',
    currentStatus: 'published',
    globalFundingAmount: { amount: 200_000_000, currency: 'EUR' },
    closingDate: '2025-03-10',
    contractEndDate: '2043-03-10',
    borrowerId: 'b3',
    tranches: p4Tranches,
    covenants: [
      makeCovenant('p4-c1', 'DSCR', 'financial_ratio', ['validated', 'validated', 'validated', 'coming']),
      makeCovenant('p4-c2', 'ESG Reporting', 'esg_criteria', ['validated', 'result_received', 'coming', 'coming'], false),
    ],
    lenders: pickLenders(p4Tranches, 3),
    documents: makeDocuments('p4', 6),
    agentName: 'Natixis Green & Sustainable Hub',
    operationReference: 'OP-2025-0310-PEN',
    internalReference: 'INT-FR-INF-001',
    fundingSpecificity: 'project_financing',
    description: 'Project finance for a 120MW onshore wind farm in Normandy — 18-year tenor, sculpted repayment profile.',
    riskGroupName: 'InfraVerte SAS',
  },
  {
    id: 'p5',
    title: 'Solar Farm Provence',
    nature: 'infrastructure',
    trackingType: 'bilateral',
    currentStatus: 'draft',
    globalFundingAmount: { amount: 85_000_000, currency: 'EUR' },
    closingDate: null,
    contractEndDate: null,
    borrowerId: 'b3',
    tranches: p5Tranches,
    covenants: [],
    lenders: pickLenders(p5Tranches, 2),
    documents: makeDocuments('p5', 1),
    agentName: 'Natixis Green & Sustainable Hub',
    operationReference: null,
    internalReference: null,
    fundingSpecificity: 'green_loan',
    description: null,
    riskGroupName: 'InfraVerte SAS',
  },
  {
    id: 'p6',
    title: 'LogiPark Marseille',
    nature: 'real_estate',
    trackingType: 'agency',
    currentStatus: 'published',
    globalFundingAmount: { amount: 310_000_000, currency: 'EUR' },
    closingDate: '2024-11-01',
    contractEndDate: '2032-11-01',
    borrowerId: 'b4',
    tranches: p6Tranches,
    covenants: [
      makeCovenant('p6-c1', 'DSCR', 'financial_ratio', ['validated', 'breached', 'breached', 'coming']),
      makeCovenant('p6-c2', 'Occupancy Rate', 'financial_element', ['validated', 'non_compliant', 'pending', 'coming']),
    ],
    lenders: pickLenders(p6Tranches, 3),
    documents: makeDocuments('p6', 5),
    agentName: 'Crédit Agricole CIB',
    operationReference: 'OP-2024-1101-LPM',
    internalReference: 'INT-FR-CRE-004',
    fundingSpecificity: 'development_financing',
    description: 'Development financing for a 80k sqm logistics park in Marseille Fos industrial zone.',
    riskGroupName: 'LogiPark REIT',
  },
  {
    id: 'p7',
    title: 'Nexity Résidentiel Lyon',
    nature: 'real_estate',
    trackingType: 'agency',
    currentStatus: 'published',
    globalFundingAmount: { amount: 175_000_000, currency: 'EUR' },
    closingDate: '2025-02-01',
    contractEndDate: '2030-02-01',
    borrowerId: 'b5',
    tranches: p7Tranches,
    covenants: [
      makeCovenant('p7-c1', 'LTV Ratio', 'financial_ratio', ['validated', 'validated', 'validated', 'coming']),
    ],
    lenders: pickLenders(p7Tranches, 2),
    documents: makeDocuments('p7', 4),
    agentName: 'HSBC France',
    operationReference: 'OP-2025-0201-NRL',
    internalReference: 'INT-FR-CRE-005',
    fundingSpecificity: 'acquisition_financing',
    description: 'Residential development financing in Lyon Part-Dieu area — 350 units.',
    riskGroupName: 'Nexity Développement',
  },
  {
    id: 'p8',
    title: 'Nexity Bureaux Nanterre',
    nature: 'real_estate',
    trackingType: 'agency',
    currentStatus: 'archived',
    globalFundingAmount: { amount: 95_000_000, currency: 'EUR' },
    closingDate: '2020-04-01',
    contractEndDate: '2025-04-01',
    borrowerId: 'b5',
    tranches: p8Tranches,
    covenants: [
      makeCovenant('p8-c1', 'DSCR', 'financial_ratio', ['validated', 'validated', 'validated', 'validated']),
    ],
    lenders: pickLenders(p8Tranches, 2),
    documents: makeDocuments('p8', 2),
    agentName: 'HSBC France',
    operationReference: 'OP-2020-0401-NBN',
    internalReference: 'INT-FR-CRE-006',
    fundingSpecificity: 'refinancing',
    description: 'Legacy office refinancing in Nanterre La Défense — now fully repaid and archived.',
    riskGroupName: 'Nexity Développement',
  },
];

// ─── Compute aggregations ───

function computeTermStateCount(allProjects: Project[]): Portfolio['termStateCount'] {
  let breached = 0, late = 0, ending = 0, resultToCheck = 0;
  for (const p of allProjects) {
    for (const c of p.covenants) {
      for (const t of c.terms) {
        if (t.currentStatus === 'breached') breached++;
        if (t.late) late++;
        if (t.state === 'to_control') resultToCheck++;
        if (t.currentStatus === 'pending') ending++;
      }
    }
  }
  return { breached, late, ending, resultToCheck };
}

const totalAmount = projects.reduce((sum, p) => sum + p.globalFundingAmount.amount, 0);

export const mockPortfolio: Portfolio = {
  projects,
  borrowers,
  termStateCount: computeTermStateCount(projects),
  totalFunding: { amount: totalAmount, currency: 'EUR' },
  grid: createEmptyGrid(32),
};
