import type { GridState } from '../types/portfolio';

// ─── Road auto-tiling (4-bit bitmask) ───
// Bitmask encoding: N=8, E=4, S=2, W=1
// Each bit is 1 if the neighbour cell also contains a road.

export type RoadVariant =
  | 'road_isolated'    // 0000 — standalone dot
  | 'road_end_n'       // 1000 — dead end, opening south
  | 'road_end_e'       // 0100 — dead end, opening west
  | 'road_end_s'       // 0010 — dead end, opening north
  | 'road_end_w'       // 0001 — dead end, opening east
  | 'road_straight_ns' // 1010 — straight N↔S
  | 'road_straight_ew' // 0101 — straight E↔W
  | 'road_turn_ne'     // 1100 — corner N+E
  | 'road_turn_se'     // 0110 — corner S+E
  | 'road_turn_sw'     // 0011 — corner S+W
  | 'road_turn_nw'     // 1001 — corner N+W
  | 'road_t_nse'       // 1110 — T-junction N+S+E (missing W)
  | 'road_t_sew'       // 0111 — T-junction S+E+W (missing N)
  | 'road_t_nsw'       // 1011 — T-junction N+S+W (missing E)
  | 'road_t_new'       // 1101 — T-junction N+E+W (missing S)
  | 'road_cross';      // 1111 — 4-way intersection

export const BITMASK_TO_VARIANT: Record<number, RoadVariant> = {
  0b0000: 'road_isolated',
  0b1000: 'road_end_n',
  0b0100: 'road_end_e',
  0b0010: 'road_end_s',
  0b0001: 'road_end_w',
  0b1010: 'road_straight_ns',
  0b0101: 'road_straight_ew',
  0b1100: 'road_turn_ne',
  0b0110: 'road_turn_se',
  0b0011: 'road_turn_sw',
  0b1001: 'road_turn_nw',
  0b1110: 'road_t_nse',
  0b0111: 'road_t_sew',
  0b1011: 'road_t_nsw',
  0b1101: 'road_t_new',
  0b1111: 'road_cross',
};

/** Compute the road variant for a given cell based on its neighbours. */
export function getRoadVariant(grid: GridState, col: number, row: number): RoadVariant {
  const isRoad = (c: number, r: number): boolean =>
    r >= 0 && r < grid.size && c >= 0 && c < grid.size &&
    grid.cells[r]?.[c]?.type === 'road';

  const mask =
    (isRoad(col,     row - 1) ? 8 : 0) | // N
    (isRoad(col + 1, row    ) ? 4 : 0) | // E
    (isRoad(col,     row + 1) ? 2 : 0) | // S
    (isRoad(col - 1, row    ) ? 1 : 0);  // W

  return BITMASK_TO_VARIANT[mask] ?? 'road_isolated';
}

/**
 * Returns the (col, row) pairs that need their road variant recomputed
 * after a road is placed or removed at (col, row).
 * This is the cell itself + its 4 cardinal neighbours.
 */
export function getCellsToRetile(col: number, row: number): [number, number][] {
  return [
    [col,     row    ],
    [col,     row - 1],
    [col + 1, row    ],
    [col,     row + 1],
    [col - 1, row    ],
  ];
}
