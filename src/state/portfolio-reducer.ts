import type { Portfolio, Project, Borrower, Tranche, Lender, TermStatus, Term, CovenantNature, Money, DocumentDrive, CellType } from '../types/portfolio';
import { TERM_TRANSITION_MAP, STATUS_TO_STATE, removeFromGrid, placeOnGrid, canPlace, clearFencesInArea, getDistrictForProject, getDistrictAt, fitsInDistrict, STRUCTURE_SIZES, DECORATION_TYPES } from '../types/portfolio';
import type { DistrictBounds } from '../types/portfolio';

// ─── Action types ───

type Action =
  | { type: 'ADD_BORROWER'; payload: Omit<Borrower, 'id' | 'projectIds'> }
  | { type: 'EDIT_BORROWER'; payload: { id: string } & Partial<Omit<Borrower, 'id' | 'projectIds'>> }
  | { type: 'DELETE_BORROWER'; payload: { id: string } }
  | { type: 'ADD_PROJECT'; payload: Omit<Project, 'id' | 'tranches' | 'covenants' | 'lenders' | 'currentStatus' | 'documents'> }
  | { type: 'EDIT_PROJECT'; payload: { id: string } & Partial<Pick<Project, 'title' | 'nature' | 'trackingType' | 'agentName' | 'currentStatus' | 'closingDate' | 'contractEndDate' | 'globalFundingAmount' | 'operationReference' | 'internalReference' | 'fundingSpecificity' | 'description' | 'riskGroupName'>> }
  | { type: 'DELETE_PROJECT'; payload: { id: string } }
  | { type: 'ADD_TRANCHE'; payload: { projectId: string } & Omit<Tranche, 'id'> }
  | { type: 'EDIT_TRANCHE'; payload: { projectId: string; trancheId: string } & Partial<Omit<Tranche, 'id'>> }
  | { type: 'DELETE_TRANCHE'; payload: { projectId: string; trancheId: string } }
  | { type: 'ADD_LENDER'; payload: { projectId: string } & Omit<Lender, 'id'> }
  | { type: 'EDIT_LENDER'; payload: { projectId: string; lenderId: string } & Partial<Omit<Lender, 'id'>> }
  | { type: 'DELETE_LENDER'; payload: { projectId: string; lenderId: string } }
  | { type: 'ADD_ALLOCATION'; payload: { projectId: string; lenderId: string; trancheId: string; trancheName: string; amount: Money } }
  | { type: 'EDIT_ALLOCATION'; payload: { projectId: string; lenderId: string; trancheId: string; amount: Money } }
  | { type: 'DELETE_ALLOCATION'; payload: { projectId: string; lenderId: string; trancheId: string } }
  | { type: 'ADD_COVENANT'; payload: { projectId: string; name: string; nature: CovenantNature } }
  | { type: 'EDIT_COVENANT'; payload: { projectId: string; covenantId: string; name?: string; nature?: CovenantNature } }
  | { type: 'DELETE_COVENANT'; payload: { projectId: string; covenantId: string } }
  | { type: 'PUBLISH_COVENANT'; payload: { projectId: string; covenantId: string } }
  | { type: 'AMEND_COVENANT'; payload: { projectId: string; covenantId: string } }
  | { type: 'ADD_TERM'; payload: { projectId: string; covenantId: string; name: string; startDate: string; endDate: string } }
  | { type: 'DELETE_TERM'; payload: { projectId: string; covenantId: string; termId: string } }
  | { type: 'TRANSITION_TERM'; payload: { projectId: string; covenantId: string; termId: string; newStatus: TermStatus } }
  | { type: 'SET_WAIVER'; payload: { projectId: string; covenantId: string; termId: string; granted: boolean } }
  | { type: 'ADD_DOCUMENT'; payload: { projectId: string; name: string; drive: DocumentDrive } }
  | { type: 'DELETE_DOCUMENT'; payload: { projectId: string; documentId: string } }
  | { type: 'MOVE_STRUCTURE'; payload: { entityId: string; structureType: CellType; toCol: number; toRow: number; width: number; height: number } }
  | { type: 'SYNC_GRID'; payload: { grid: import('../types/portfolio').GridState } }
  | { type: 'PLACE_DECORATION'; payload: { decorationType: CellType; col: number; row: number; projectId: string; flip?: boolean } }
  | { type: 'REMOVE_DECORATION'; payload: { col: number; row: number } };

export type PortfolioAction = Action;

// ─── ID generator ───

let counter = 100;
function nextId(prefix: string): string {
  return `${prefix}${++counter}`;
}

// ─── Recompute helpers ───

function recomputeProjectFunding(project: Project): Project {
  const total = project.tranches.reduce((sum, t) => sum + t.amount.amount, 0);
  const currency = project.tranches[0]?.amount.currency ?? 'EUR';
  return { ...project, globalFundingAmount: { amount: total, currency } };
}

function recomputePortfolio(portfolio: Portfolio): Portfolio {
  const totalAmount = portfolio.projects.reduce((sum, p) => sum + p.globalFundingAmount.amount, 0);
  const currency = portfolio.projects[0]?.globalFundingAmount.currency ?? 'EUR';

  let breached = 0, late = 0, ending = 0, resultToCheck = 0;
  for (const p of portfolio.projects) {
    for (const c of p.covenants) {
      for (const t of c.terms) {
        if (t.currentStatus === 'breached') breached++;
        if (t.late) late++;
        if (t.state === 'to_control') resultToCheck++;
        if (t.currentStatus === 'pending') ending++;
      }
    }
  }

  // Recompute borrower projectIds
  const borrowers = portfolio.borrowers.map(b => ({
    ...b,
    projectIds: portfolio.projects.filter(p => p.borrowerId === b.id).map(p => p.id),
  }));

  return {
    ...portfolio,
    borrowers,
    totalFunding: { amount: totalAmount, currency },
    termStateCount: { breached, late, ending, resultToCheck },
  };
}

// ─── Fence overlay helpers ───

type GridState = import('../types/portfolio').GridState;
import type { FenceOverlayCell } from '../types/portfolio';

function getOverlay(grid: GridState): (FenceOverlayCell | null)[][] {
  return grid.fenceOverlay ?? Array.from({ length: grid.size }, () => Array(grid.size).fill(null));
}

/** Write fences onto the fenceOverlay for a district's perimeter.
 *
 *  fence1_e = PicketFence1 at the SE ("/") edge of a tile.
 *    E boundary → placed ON the rightmost column  (dc + size - 1)  → outer-right edge ✓
 *    W boundary → placed on the column OUTSIDE     (dc - 1)         → that tile's SE edge
 *                 == the NW edge of (dc) == the visual left boundary ✓
 *
 *  fence2_s = PicketFence2 at the SW ("\") edge of a tile.
 *    S boundary → placed ON the bottom row         (dr + size - 1)  → outer-bottom edge ✓
 *    N boundary → placed on the row OUTSIDE         (dr - 1)         → that tile's SW edge
 *                 == the NE edge of (dr) == the visual top boundary ✓
 *
 *  Z-order: the rendering loop draws r ascending, so E fences (row=dr…) are
 *  drawn AFTER N fences (row=dr-1) → E appears in front at the NE corner. ✓ */
function placeFencesForDistrict(grid: GridState, district: DistrictBounds): GridState {
  const { col: dc, row: dr, size } = district;
  const overlay = getOverlay(grid).map(r => [...r]) as (FenceOverlayCell | null)[][];

  const set = (c: number, r: number, patch: FenceOverlayCell) => {
    if (r < 0 || r >= grid.size || c < 0 || c >= grid.size) return;
    overlay[r][c] = { ...overlay[r][c], ...patch };
  };

  // E boundary → fence1_e on rightmost column
  for (let r = dr; r < dr + size; r++) set(dc + size - 1, r, { fence1_e: true });
  // W boundary → fence1_e on the column just outside the left edge
  for (let r = dr; r < dr + size; r++) set(dc - 1,        r, { fence1_e: true });
  // S boundary → fence2_s on bottom row
  for (let c = dc; c < dc + size; c++) set(c, dr + size - 1, { fence2_s: true });
  // N boundary → fence2_s on the row just outside the top edge
  for (let c = dc; c < dc + size; c++) set(c, dr - 1,        { fence2_s: true });

  return { ...grid, fenceOverlay: overlay };
}

// ─── Reducer ───

export function portfolioReducer(state: Portfolio, action: Action): Portfolio {
  switch (action.type) {
    // ── Borrower ──
    case 'ADD_BORROWER': {
      const newBorrower: Borrower = {
        id: nextId('b'),
        projectIds: [],
        ...action.payload,
      };
      return recomputePortfolio({ ...state, borrowers: [...state.borrowers, newBorrower] });
    }
    case 'EDIT_BORROWER': {
      const { id, ...updates } = action.payload;
      return recomputePortfolio({
        ...state,
        borrowers: state.borrowers.map(b => b.id === id ? { ...b, ...updates } : b),
      });
    }
    case 'DELETE_BORROWER': {
      const { id } = action.payload;
      return recomputePortfolio({
        ...state,
        borrowers: state.borrowers.filter(b => b.id !== id),
        projects: state.projects.filter(p => p.borrowerId !== id),
      });
    }

    // ── Project ──
    case 'ADD_PROJECT': {
      const newProject: Project = {
        id: nextId('p'),
        currentStatus: 'draft',
        tranches: [],
        covenants: [],
        lenders: [],
        documents: [],
        ...action.payload,
      };
      return recomputePortfolio({ ...state, projects: [...state.projects, newProject] });
    }
    case 'EDIT_PROJECT': {
      const { id, ...updates } = action.payload;
      return recomputePortfolio({
        ...state,
        projects: state.projects.map(p => p.id === id ? { ...p, ...updates } : p),
      });
    }
    case 'DELETE_PROJECT': {
      return recomputePortfolio({
        ...state,
        projects: state.projects.filter(p => p.id !== action.payload.id),
      });
    }

    // ── Tranche ──
    case 'ADD_TRANCHE': {
      const { projectId, ...trancheData } = action.payload;
      const newTranche: Tranche = { id: nextId('tr'), ...trancheData };
      return recomputePortfolio({
        ...state,
        projects: state.projects.map(p =>
          p.id === projectId
            ? recomputeProjectFunding({ ...p, tranches: [...p.tranches, newTranche] })
            : p
        ),
      });
    }
    case 'EDIT_TRANCHE': {
      const { projectId, trancheId, ...updates } = action.payload;
      return recomputePortfolio({
        ...state,
        projects: state.projects.map(p =>
          p.id === projectId
            ? recomputeProjectFunding({
                ...p,
                tranches: p.tranches.map(t => t.id === trancheId ? { ...t, ...updates } : t),
              })
            : p
        ),
      });
    }
    case 'DELETE_TRANCHE': {
      const { projectId, trancheId } = action.payload;
      return recomputePortfolio({
        ...state,
        projects: state.projects.map(p =>
          p.id === projectId
            ? recomputeProjectFunding({ ...p, tranches: p.tranches.filter(t => t.id !== trancheId) })
            : p
        ),
      });
    }

    // ── Lender ──
    case 'ADD_LENDER': {
      const { projectId, ...lenderData } = action.payload;
      const newLender: Lender = { id: nextId('l'), ...lenderData };
      return recomputePortfolio({
        ...state,
        projects: state.projects.map(p =>
          p.id === projectId ? { ...p, lenders: [...p.lenders, newLender] } : p
        ),
      });
    }
    case 'EDIT_LENDER': {
      const { projectId, lenderId, ...updates } = action.payload;
      return recomputePortfolio({
        ...state,
        projects: state.projects.map(p =>
          p.id === projectId
            ? { ...p, lenders: p.lenders.map(l => l.id === lenderId ? { ...l, ...updates } : l) }
            : p
        ),
      });
    }
    case 'DELETE_LENDER': {
      const { projectId, lenderId } = action.payload;
      return recomputePortfolio({
        ...state,
        projects: state.projects.map(p =>
          p.id === projectId ? { ...p, lenders: p.lenders.filter(l => l.id !== lenderId) } : p
        ),
      });
    }

    // ── Allocation ──
    case 'ADD_ALLOCATION': {
      const { projectId, lenderId, trancheId, trancheName, amount } = action.payload;
      return recomputePortfolio({
        ...state,
        projects: state.projects.map(p =>
          p.id === projectId
            ? { ...p, lenders: p.lenders.map(l =>
                l.id === lenderId
                  ? { ...l, allocations: [...l.allocations, { trancheId, trancheName, amount }] }
                  : l
              )}
            : p
        ),
      });
    }
    case 'EDIT_ALLOCATION': {
      const { projectId, lenderId, trancheId, amount } = action.payload;
      return recomputePortfolio({
        ...state,
        projects: state.projects.map(p =>
          p.id === projectId
            ? { ...p, lenders: p.lenders.map(l =>
                l.id === lenderId
                  ? { ...l, allocations: l.allocations.map(a => a.trancheId === trancheId ? { ...a, amount } : a) }
                  : l
              )}
            : p
        ),
      });
    }
    case 'DELETE_ALLOCATION': {
      const { projectId, lenderId, trancheId } = action.payload;
      return recomputePortfolio({
        ...state,
        projects: state.projects.map(p =>
          p.id === projectId
            ? { ...p, lenders: p.lenders.map(l =>
                l.id === lenderId
                  ? { ...l, allocations: l.allocations.filter(a => a.trancheId !== trancheId) }
                  : l
              )}
            : p
        ),
      });
    }

    // ── Covenant ──
    case 'ADD_COVENANT': {
      const { projectId, name, nature } = action.payload;
      const newCovenant = { id: nextId('c'), name, nature, terms: [], status: 'draft' as const, version: 1, publishedAt: null, versions: [] };
      return recomputePortfolio({
        ...state,
        projects: state.projects.map(p =>
          p.id === projectId ? { ...p, covenants: [...p.covenants, newCovenant] } : p
        ),
      });
    }
    case 'EDIT_COVENANT': {
      const { projectId, covenantId, ...updates } = action.payload;
      return recomputePortfolio({
        ...state,
        projects: state.projects.map(p =>
          p.id === projectId
            ? { ...p, covenants: p.covenants.map(c =>
                // Only allow editing draft covenants
                c.id === covenantId && c.status === 'draft'
                  ? {
                      ...c,
                      ...updates,
                      terms: c.terms.map(t => ({
                        ...t,
                        covenantName: updates.name ?? t.covenantName,
                        covenantNature: updates.nature ?? t.covenantNature,
                      })),
                    }
                  : c
              )}
            : p
        ),
      });
    }
    case 'DELETE_COVENANT': {
      const { projectId, covenantId } = action.payload;
      return recomputePortfolio({
        ...state,
        projects: state.projects.map(p =>
          p.id === projectId ? { ...p, covenants: p.covenants.filter(c => c.id !== covenantId) } : p
        ),
      });
    }
    case 'PUBLISH_COVENANT': {
      const { projectId, covenantId } = action.payload;
      const now = new Date().toISOString().split('T')[0];
      return recomputePortfolio({
        ...state,
        projects: state.projects.map(p =>
          p.id === projectId
            ? { ...p, covenants: p.covenants.map(c =>
                c.id === covenantId && c.status === 'draft'
                  ? {
                      ...c,
                      status: 'published' as const,
                      publishedAt: now,
                      versions: [...c.versions, { version: c.version, name: c.name, nature: c.nature, publishedAt: now }],
                    }
                  : c
              )}
            : p
        ),
      });
    }
    case 'AMEND_COVENANT': {
      const { projectId, covenantId } = action.payload;
      return recomputePortfolio({
        ...state,
        projects: state.projects.map(p =>
          p.id === projectId
            ? { ...p, covenants: p.covenants.map(c =>
                c.id === covenantId && c.status === 'published'
                  ? { ...c, status: 'draft' as const, version: c.version + 1, publishedAt: null }
                  : c
              )}
            : p
        ),
      });
    }

    // ── Term ──
    case 'ADD_TERM': {
      const { projectId, covenantId, name, startDate, endDate } = action.payload;
      return recomputePortfolio({
        ...state,
        projects: state.projects.map(p =>
          p.id === projectId
            ? { ...p, covenants: p.covenants.map(c => {
                if (c.id !== covenantId) return c;
                const newTerm: Term = {
                  id: nextId('t'),
                  name,
                  covenantId: c.id,
                  covenantName: c.name,
                  covenantNature: c.nature,
                  startDate,
                  endDate,
                  currentStatus: 'coming',
                  state: 'coming',
                  waiver: null,
                  waiverReason: null,
                  late: false,
                };
                return { ...c, terms: [...c.terms, newTerm] };
              })}
            : p
        ),
      });
    }
    case 'DELETE_TERM': {
      const { projectId, covenantId, termId } = action.payload;
      return recomputePortfolio({
        ...state,
        projects: state.projects.map(p =>
          p.id === projectId
            ? { ...p, covenants: p.covenants.map(c =>
                c.id === covenantId ? { ...c, terms: c.terms.filter(t => t.id !== termId) } : c
              )}
            : p
        ),
      });
    }

    // ── Term workflow ──
    case 'TRANSITION_TERM': {
      const { projectId, covenantId, termId, newStatus } = action.payload;
      return recomputePortfolio({
        ...state,
        projects: state.projects.map(p =>
          p.id === projectId
            ? { ...p, covenants: p.covenants.map(c =>
                c.id === covenantId
                  ? { ...c, terms: c.terms.map(t =>
                      t.id === termId && TERM_TRANSITION_MAP[t.currentStatus]?.includes(newStatus)
                        ? {
                            ...t,
                            currentStatus: newStatus,
                            state: STATUS_TO_STATE[newStatus],
                            // Reset waiver when leaving breached
                            waiver: t.currentStatus === 'breached' ? null : t.waiver,
                            waiverReason: t.currentStatus === 'breached' ? null : t.waiverReason,
                          }
                        : t
                    )}
                  : c
              )}
            : p
        ),
      });
    }
    case 'SET_WAIVER': {
      const { projectId, covenantId, termId, granted } = action.payload;
      return recomputePortfolio({
        ...state,
        projects: state.projects.map(p =>
          p.id === projectId
            ? { ...p, covenants: p.covenants.map(c =>
                c.id === covenantId
                  ? { ...c, terms: c.terms.map(t =>
                      t.id === termId && t.currentStatus === 'breached'
                        ? { ...t, waiver: granted, waiverReason: granted ? 'Waiver granted' : 'Waiver refused' }
                        : t
                    )}
                  : c
              )}
            : p
        ),
      });
    }

    // ── Document ──
    case 'ADD_DOCUMENT': {
      const { projectId, name, drive } = action.payload;
      const newDoc = { id: nextId('doc'), name, drive, uploadedAt: new Date().toISOString().split('T')[0] };
      return recomputePortfolio({
        ...state,
        projects: state.projects.map(p =>
          p.id === projectId ? { ...p, documents: [...p.documents, newDoc] } : p
        ),
      });
    }
    case 'DELETE_DOCUMENT': {
      const { projectId, documentId } = action.payload;
      return recomputePortfolio({
        ...state,
        projects: state.projects.map(p =>
          p.id === projectId ? { ...p, documents: p.documents.filter(d => d.id !== documentId) } : p
        ),
      });
    }

    // ── Grid ──
    case 'SYNC_GRID': {
      const incoming = action.payload.grid;
      const existingIds = new Set(state.grid.districts.map(d => d.projectId));
      const newDistricts = incoming.districts.filter(d => !existingIds.has(d.projectId));
      const hasNewDistricts = newDistricts.length > 0;

      let workingGrid = state.grid;

      if (hasNewDistricts) {
        // Merge: keep existing cell modifications (moves, decos) but fill new structures
        const newCells = state.grid.cells.map((row, r) =>
          row.map((cell, c) => {
            if (cell !== null) return cell;
            return incoming.cells[r]?.[c] ?? null;
          })
        );
        workingGrid = { ...state.grid, cells: newCells, districts: incoming.districts };
      }

      // Place fences on the perimeter of every district that doesn't have them yet.
      // The null-check inside placeFencesForDistrict ensures no overwrites.
      const gridBefore = workingGrid;
      for (const district of workingGrid.districts) {
        workingGrid = placeFencesForDistrict(workingGrid, district);
      }

      const changed = hasNewDistricts || workingGrid !== gridBefore;
      return changed ? { ...state, grid: workingGrid } : state;
    }
    case 'MOVE_STRUCTURE': {
      const { entityId, structureType, toCol, toRow, width, height } = action.payload;
      // Validate: must stay within project's district
      const district = getDistrictForProject(state.grid, entityId);
      if (!district || !fitsInDistrict(district, toCol, toRow, width, height)) return state;
      // Remove structure from current position
      let newGrid = removeFromGrid(state.grid, entityId, structureType);
      // Clear any fences in target area (fences are permeable to buildings)
      newGrid = clearFencesInArea(newGrid, toCol, toRow, width, height);
      // Check if target area is free
      if (!canPlace(newGrid, toCol, toRow, width, height)) return state;
      // Place at new position
      newGrid = placeOnGrid(newGrid, toCol, toRow, width, height, {
        type: structureType,
        entityId,
        projectId: entityId,
      });
      return { ...state, grid: newGrid };
    }

    // ── Decorations ──
    case 'PLACE_DECORATION': {
      const { decorationType, col, row, projectId, flip } = action.payload;

      // Fence types go to the overlay instead of the main grid
      if (decorationType === 'fence_1' || decorationType === 'fence_2') {
        const overlay = getOverlay(state.grid).map(r => [...r]) as (FenceOverlayCell | null)[][];
        const patch: FenceOverlayCell = decorationType === 'fence_1' ? { fence1_e: true } : { fence2_s: true };
        overlay[row][col] = { ...overlay[row][col], ...patch };
        return { ...state, grid: { ...state.grid, fenceOverlay: overlay } };
      }

      const rawSize = STRUCTURE_SIZES[decorationType] ?? [1, 1];
      // Permute footprint when flipped (e.g. 2×1 → 1×2)
      const [w, h] = (flip && rawSize[0] !== rawSize[1]) ? [rawSize[1], rawSize[0]] : rawSize;
      // If inside a district, must fit within it
      const district = getDistrictAt(state.grid, col, row);
      if (district && !fitsInDistrict(district, col, row, w, h)) return state;
      if (!canPlace(state.grid, col, row, w, h)) return state;
      const entityId = nextId('deco');
      const newGrid = placeOnGrid(state.grid, col, row, w, h, {
        type: decorationType,
        entityId,
        projectId: projectId || undefined,
        flip: flip || undefined,
      });
      return { ...state, grid: newGrid };
    }
    case 'REMOVE_DECORATION': {
      const { col, row } = action.payload;

      // If the cell has fence overlay entries, clear them first / instead
      const fenceCell = state.grid.fenceOverlay?.[row]?.[col];
      if (fenceCell && (fenceCell.fence1_e || fenceCell.fence2_s)) {
        const overlay = state.grid.fenceOverlay!.map(r => [...r]) as (FenceOverlayCell | null)[][];
        overlay[row][col] = null;
        return { ...state, grid: { ...state.grid, fenceOverlay: overlay } };
      }

      const cell = state.grid.cells[row]?.[col];
      if (!cell) return state;
      // Find origin cell
      const originCol = cell.originCol ?? col;
      const originRow = cell.originRow ?? row;
      const origin = state.grid.cells[originRow]?.[originCol];
      if (!origin || !DECORATION_TYPES.has(origin.type) || !origin.entityId) return state;
      const newGrid = removeFromGrid(state.grid, origin.entityId, origin.type);
      return { ...state, grid: newGrid };
    }

    default:
      return state;
  }
}
