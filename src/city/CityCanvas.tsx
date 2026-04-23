import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { CityState, CityBuilding, CityDistrict, ClickTarget, CellType } from '../types/portfolio';
import { GRID_SIZE, ISO_TILE_W, ISO_TILE_H, STRUCTURE_SIZES, gridToScreen, screenToGrid, getDistrictForProject, getDistrictAt, fitsInDistrict, canPlace, DECORATION_TYPES } from '../types/portfolio';
import { getRoadVariant } from './roadAutoTile';
import type { RoadVariant } from './roadAutoTile';
import { formatMoney } from './utils';

// ─── Color palettes ───

const BUILDING_COLORS: Record<string, { base: string; side: string; top: string }> = {
  real_estate:     { base: '#4A90D9', side: '#3A72B0', top: '#6AB0F0' },
  infrastructure:  { base: '#5CB85C', side: '#449944', top: '#7ED87E' },
  corporate:       { base: '#9B59B6', side: '#7D3FA0', top: '#B87AD0' },
  leveraged:       { base: '#E67E22', side: '#C0651A', top: '#F0A050' },
  project_finance: { base: '#1ABC9C', side: '#15967D', top: '#3DD8B8' },
};

const TOWNHALL_COLORS = { base: '#8B6F5C', side: '#6E5848', top: '#A88A74' };
const SHOP_COLORS = { base: '#D4A574', side: '#B8956A', top: '#E8C098' };
const LIBRARY_COLORS = { base: '#5B8C8C', side: '#4A7272', top: '#72A6A6' };

const STATE_OVERLAY: Record<string, string> = {
  construction: 'rgba(255, 200, 50, 0.25)',
  dimmed: 'rgba(100, 100, 100, 0.5)',
  closed: 'rgba(80, 80, 80, 0.6)',
};

const TRAFFIC_LIGHT_COLORS: Record<string, string> = {
  green: '#2ECC40',
  orange: '#FF851B',
  red: '#FF4136',
  grey: '#AAAAAA',
};

// ─── Sizes for sub-structures ───
const TOWNHALL_W = 38;
const TOWNHALL_H = 30;

const SHOP_SIZES: Record<string, { sw: number; sh: number }> = {
  kiosk: { sw: 28, sh: 14 },
  shop:  { sw: 38, sh: 22 },
  mall:  { sw: 52, sh: 32 },
};

const LIBRARY_SIZES: Record<string, { lw: number; lh: number }> = {
  small:  { lw: 30, lh: 18 },
  medium: { lw: 40, lh: 26 },
  large:  { lw: 52, lh: 34 },
};

const EMPTY_LOT_W = 24;
const EMPTY_LOT_H = 10;

/** Per-sprite rendering calibration — SOUTH-TIP anchor convention.
 *
 *  Valeurs calibrées visuellement via /calibrate.html (2025-04) :
 *    1×1  → yOff: 0.50, xOff:  0.00  (grass, routes, building_xs, shop_kiosk)
 *    2×1  → yOff: 0.46, xOff: -0.24  (building_sm/md, shop_store, construction_2x1)
 *    2×2  → yOff: 0.43, xOff:  0.00  (building_lg/xl, townhall, shop_mall, library_md, construction_2x2)
 */
const SPRITE_ANCHOR: Record<string, { baseRatio: number; yOff: number; xOff: number }> = {
  // ── Footprint 1×1 ────────────────────────────────────────────────────────
  building_xs:      { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },  // 512×1024
  shop_kiosk:       { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },  // 512×768
  construction_1x1: { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },  // 512×512
  tile_grass:       { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },  // 512×512 ✅ calibré
  // Roads 1×1 (même calibration que tile_grass — tuile plate)
  road_straight_1:  { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  road_straight_2:  { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  road_cross:       { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  road_turn:        { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  road_turn_1:      { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  road_turn_2:      { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  road_turn_3:      { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  road_t_1:         { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  road_t_2:         { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  road_end_1:       { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  road_end_2:       { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  road_end_3:       { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  road_end_4:       { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  road_turn_4:      { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  road_t_3:         { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  road_t_4:         { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  // ── Footprint 2×1 ────────────────────────────────────────────────────────
  building_sm:      { baseRatio: 1.0, yOff: 0.46, xOff: -0.24 },  // 768×1280  ✅ calibré
  building_md:      { baseRatio: 1.0, yOff: 0.46, xOff: -0.24 },  // 768×1280
  shop_store:       { baseRatio: 1.0, yOff: 0.46, xOff: -0.24 },  // 768×1280
  construction_2x1: { baseRatio: 1.0, yOff: 0.46, xOff: -0.24 },  // 768×1024
  // ── Footprint 2×2 ────────────────────────────────────────────────────────
  building_lg:      { baseRatio: 1.0, yOff: 0.43, xOff:  0.00 },  // 1024×1280
  building_xl:      { baseRatio: 1.0, yOff: 0.43, xOff:  0.00 },  // 1024×1536 ✅ calibré
  townhall:         { baseRatio: 1.0, yOff: 0.43, xOff:  0.00 },  // 1024×1280
  shop_mall:        { baseRatio: 1.0, yOff: 0.43, xOff:  0.00 },  // 1024×1280
  library_md:       { baseRatio: 1.0, yOff: 0.43, xOff:  0.00 },  // 1024×1024
  construction_2x2: { baseRatio: 1.0, yOff: 0.43, xOff:  0.00 },  // 1024×1024
  // ── Legacy sprites (2048×2048, non migrés) ───────────────────────────────
  tile_sidewalk_flat: { baseRatio: 0.1875, yOff: 0.56, xOff: 0 },
  tile_sidewalk:      { baseRatio: 0.1875, yOff: 0.56, xOff: 0 },
  tree_sm:            { baseRatio: 0.1875, yOff: 0.56, xOff: 0 },
  tree_lg:            { baseRatio: 0.1875, yOff: 0.56, xOff: 0 },
  bush:               { baseRatio: 0.1875, yOff: 0.56, xOff: 0 },
  ground:             { baseRatio: 0.1875, yOff: 0.56, xOff: 0 },
  tile_concrete:      { baseRatio: 0.1875, yOff: 0.56, xOff: 0 },
  park:               { baseRatio: 0.375,  yOff: 1.56, xOff: 0 },
};

/** Map a RoadVariant to the best available sprite key.
 *  All new sprites are 512×512 lib format (baseRatio=1.0, yOff=0.5). */
function getRoadSpriteKey(variant: RoadVariant): SpriteKey {
  switch (variant) {
    // Straights
    case 'road_straight_ew':  return 'road_straight_2';
    // Cross
    case 'road_cross':        return 'road_cross';
    // T-junctions  (convention écran : N=haut-droite, E=bas-droite, S=bas-gauche, W=haut-gauche)
    case 'road_t_nsw':        return 'road_t_1';   // fermé bas-droite  (E fermé)  ✅
    case 'road_t_sew':        return 'road_t_2';   // fermé haut-droite (N fermé)  ✅
    case 'road_t_nse':        return 'road_t_3';   // fermé haut-gauche (W fermé)  ← à livrer
    case 'road_t_new':        return 'road_t_4';   // fermé bas-gauche  (S fermé)  ← à livrer
    // Turns
    case 'road_turn_ne':      return 'road_turn_1';
    case 'road_turn_se':      return 'road_turn_2';
    case 'road_turn_sw':      return 'road_turn_3';
    case 'road_turn_nw':      return 'road_turn_4';
    // Dead ends
    case 'road_end_w':        return 'road_end_1';  // fermé E
    case 'road_end_s':        return 'road_end_2';  // fermé N
    case 'road_end_e':        return 'road_end_3';  // fermé W
    case 'road_end_n':        return 'road_end_4';  // fermé S
    // Default: straight NS + isolated
    default:                  return 'road_straight_1';
  }
}

// ─── Sprite system ───

const SPRITE_PATHS = {
  // ── Main buildings (new lib sprites, 512/768/1024px wide) ─────────────────
  building_xs: '/sprites/building-xs.png',   // 512×1024  footprint 1×1
  building_sm: '/sprites/building-sm.png',   // 768×1280  footprint 2×1
  building_md: '/sprites/building-md.png',   // 768×1280  footprint 2×1
  building_lg: '/sprites/building-lg.png',   // 1024×1280 footprint 2×2
  building_xl: '/sprites/building-xl.png',   // 1024×1536 footprint 2×2
  // ── Sub-structures (new lib sprites) ─────────────────────────────────────
  townhall:    '/sprites/townhall.png',       // 1024×1280 footprint 2×2
  shop_kiosk:  '/sprites/shop-kiosk.png',    // 512×768   footprint 1×1
  shop_store:  '/sprites/shop-store.png',    // 768×1280  footprint 2×1
  shop_mall:   '/sprites/shop-mall.png',     // 1024×1280 footprint 2×2
  library_md:  '/sprites/library-md.png',    // 1024×1024 footprint 2×2
  // ── Construction placeholders (new lib sprites) ───────────────────────────
  construction_1x1: '/sprites/construction_1x1.png',  // 512×512   footprint 1×1
  construction_2x1: '/sprites/construction_2x1.png',  // 768×1024  footprint 2×1
  construction_2x2: '/sprites/construction_2x2.png',  // 1024×1024 footprint 2×2
  // ── Ground tiles (standalone lib sprites, south-tip anchor) ───────────────
  tile_grass:         '/sprites/tile-grass.png',
  tile_sidewalk_flat: '/sprites/tile-concrete.png',  // placeholder until flat sprite arrives
  // ── Road variants (new lib sprites, 512×512, auto-tiled) ─────────────────
  road_straight_1: '/sprites/road-straight-1.png',
  road_straight_2: '/sprites/road-straight-2.png',
  road_cross:      '/sprites/road-cross.png',
  road_turn:       '/sprites/road-turn-1.png',   // legacy alias → turn-1
  road_turn_1:     '/sprites/road-turn-1.png',
  road_turn_2:     '/sprites/road-turn-2.png',
  road_turn_3:     '/sprites/road-turn-3.png',
  road_t_1:        '/sprites/road-t-1.png',
  road_t_2:        '/sprites/road-t-2.png',
  road_end_1:      '/sprites/road-end-1.png',   // fermé E (cap bas-droite) → road_end_w
  road_end_2:      '/sprites/road-end-2.png',   // fermé N (cap haut-droite) → road_end_s
  road_end_3:      '/sprites/road-end-3.png',   // fermé W (cap haut-gauche) → road_end_e
  road_end_4:      '/sprites/road-end-4.png',   // fermé S (cap bas-gauche)  → road_end_n
  road_turn_4:     '/sprites/road-turn-4.png',  // virage NW
  road_t_3:        '/sprites/road-t-3.png',     // fermé W → road_t_nse
  road_t_4:        '/sprites/road-t-4.png',     // fermé S → road_t_new
  // ── Decorations / objects ─────────────────────────────────────────────────
  ground:       '/sprites/ground-tile.png',
  tile_concrete: '/sprites/tile-concrete.png',
  tile_sidewalk: '/sprites/tile-concrete.png',
  tree_sm:      '/sprites/tree-sm.png',
  tree_lg:      '/sprites/tree-lg.png',
  bush:         '/sprites/bush.png',
  park:         '/sprites/park.png',
} as const;

type SpriteKey = keyof typeof SPRITE_PATHS;

const spriteCache: Map<string, HTMLImageElement> = new Map();
let spritesLoaded = false;

function loadAllSprites(): Promise<void> {
  if (spritesLoaded) return Promise.resolve();
  const promises = Object.entries(SPRITE_PATHS).map(([key, path]) => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => { spriteCache.set(key, img); resolve(); };
      img.onerror = () => resolve(); // Graceful fail
      img.src = path;
    });
  });
  return Promise.all(promises).then(() => { spritesLoaded = true; });
}

function getSprite(key: SpriteKey): HTMLImageElement | undefined {
  return spriteCache.get(key);
}

function getBuildingSpriteKey(height: number): SpriteKey {
  // Thresholds aligned with getBuildingSizeKey() in utils.ts:
  // xl > 500M€, lg > 300M€, md > 150M€, sm > 50M€, xs ≤ 50M€
  // height = 50 + (amount / 700M) * 130
  // → xl > 142.8, lg > 105.7, md > 77.8, sm > 59.3, xs ≤ 59.3
  if (height > 142) return 'building_xl';
  if (height > 105) return 'building_lg';
  if (height > 77)  return 'building_md';
  if (height > 59)  return 'building_sm';
  return 'building_xs';
}

interface DragState {
  building: CityBuilding;
  structureKind: 'building' | 'townhall' | 'shop' | 'library';
  gridCol: number;
  gridRow: number;
  gridW: number;
  gridH: number;
}

export interface PlacementMode {
  deco: CellType;
  eraser: boolean;
}

interface Props {
  cityState: CityState;
  onTargetClick?: (target: ClickTarget) => void;
  onMoveStructure?: (entityId: string, structureType: string, toCol: number, toRow: number, width: number, height: number) => void;
  placementMode?: PlacementMode | null;
  onPlaceDecoration?: (col: number, row: number, projectId: string) => void;
  onRemoveDecoration?: (col: number, row: number) => void;
}

const DRAG_THRESHOLD = 4;

/** Map CellType to SpriteKey for decoration objects (Layer 3 — objects).
 *  Roads and sidewalk are NOT here — they're handled in the ground/overlay layers. */
const DECO_SPRITE_MAP: Partial<Record<CellType, SpriteKey>> = {
  tree_sm: 'tree_sm',
  tree_lg: 'tree_lg',
  park:    'park',
  bush:    'bush',
};

export default function CityCanvas({ cityState, onTargetClick, onMoveStructure, placementMode, onPlaceDecoration, onRemoveDecoration }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
  const [, forceRender] = useState(0);
  const hoveredTargetRef = useRef<ClickTarget | null>(null);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, camX: 0, camY: 0, moved: false });
  const needsRedrawRef = useRef(true);
  const canvasSizeRef = useRef({ w: 0, h: 0 });
  const lastMoveTimeRef = useRef(0);
  const hoveredCellRef = useRef<{ col: number; row: number } | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  // Paint mode: continuous road placement while mouse button is held
  const paintedCellsRef = useRef(new Set<string>());

  // Fix 3 — Pre-sort districts (memoized, not per-frame)
  const sortedDistricts = useMemo(
    () => [...cityState.districts].sort((a, b) => a.y - b.y),
    [cityState]
  );

  // Check if any alerts need continuous animation
  const hasAnimations = useMemo(
    () => cityState.districts.some(d => d.buildings.some(b => b.alertLevel !== 'none')),
    [cityState]
  );

  // Mark redraw needed when city state or placement mode changes
  useEffect(() => { needsRedrawRef.current = true; }, [cityState, placementMode]);

  // Load sprites on mount
  useEffect(() => { loadAllSprites().then(() => { needsRedrawRef.current = true; forceRender(n => n + 1); }); }, []);


  // ─── Drawing ───

  // Fix 4 — draw reads hoveredTarget from ref, not state dependency
  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const cam = cameraRef.current;
    ctx.clearRect(0, 0, width, height);

    // Sky
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    switch (cityState.weather) {
      case 'sunny':  gradient.addColorStop(0, '#87CEEB'); gradient.addColorStop(1, '#E0F0FF'); break;
      case 'cloudy': gradient.addColorStop(0, '#8899AA'); gradient.addColorStop(1, '#C0C8D0'); break;
      case 'stormy': gradient.addColorStop(0, '#3A3A50'); gradient.addColorStop(1, '#6A6A80'); break;
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2 + cam.x, height * 0.35 + cam.y);
    ctx.scale(cam.zoom, cam.zoom);

    // Draw grid
    drawGrid(ctx, cityState.grid);

    // Draw decorations (between ground and buildings)
    drawDecorations(ctx, cityState.grid);

    for (const district of sortedDistricts) drawDistrict(ctx, district);

    // Tooltip — read from ref
    const hovered = hoveredTargetRef.current;
    if (hovered) drawTooltip(ctx, hovered);

    ctx.restore();
    drawHUD(ctx, width);
  }, [cityState, sortedDistricts, placementMode]);

  function drawGrid(ctx: CanvasRenderingContext2D, grid: import('../types/portfolio').GridState) {
    const hCell = hoveredCellRef.current;
    const tw = ISO_TILE_W;
    const th = ISO_TILE_H;
    const drag = dragStateRef.current;

    if (grid.districts.length === 0) return;

    // Bounding box of all districts
    let minCol = Infinity, minRow = Infinity, maxCol = -Infinity, maxRow = -Infinity;
    for (const d of grid.districts) {
      minCol = Math.min(minCol, d.col);
      minRow = Math.min(minRow, d.row);
      maxCol = Math.max(maxCol, d.col + d.size);
      maxRow = Math.max(maxRow, d.row + d.size);
    }

    // ── Layer 1: Ground — tile_grass everywhere, road sprites on road cells ──
    // Collect all cells in bounding box, sort back-to-front (painter's algo)
    const allCells: { col: number; row: number }[] = [];
    for (let row = minRow; row < maxRow; row++) {
      for (let col = minCol; col < maxCol; col++) {
        allCells.push({ col, row });
      }
    }
    allCells.sort((a, b) => (a.row + a.col) - (b.row + b.col));

    for (const { col, row } of allCells) {
      const cell = grid.cells[row]?.[col];
      let spriteKey: SpriteKey = 'tile_grass';
      if (cell?.type === 'road') {
        spriteKey = getRoadSpriteKey(getRoadVariant(grid, col, row));
      }
      // Ground tiles: SOUTH-TIP anchor — bottom-center of PNG = south tip of iso diamond.
      // Convention matches the sprite library: adjacent tiles share edges automatically.
      const { x: tx, y: ty } = gridToScreen(col + 0.5, row + 0.5);
      ctx.save();
      ctx.translate(tx, ty);
      if (!drawSpriteOnGrid(ctx, spriteKey)) {
        // Fallback: colored diamond — drawn from the north tip at (0,0)
        const fill = cell?.type === 'road' ? 'rgba(80,80,100,0.6)' : 'rgba(90,160,60,0.3)';
        drawTileDiamond(ctx, 0, 0, fill, null, 0, tw, th);
      }
      ctx.restore();
    }

    // ── Layer 2: Hover / drag highlights (diamond overlays on top of ground) ──
    for (const d of grid.districts) {
      for (let row = d.row; row < d.row + d.size; row++) {
        for (let col = d.col; col < d.col + d.size; col++) {
          const cell = grid.cells[row]?.[col];

          // Drag ghost check
          let isDragGhost = false;
          let isDragValid = false;
          if (drag && hCell) {
            const gc = hCell.col - Math.floor(drag.gridW / 2);
            const gr = hCell.row - Math.floor(drag.gridH / 2);
            if (col >= gc && col < gc + drag.gridW && row >= gr && row < gr + drag.gridH) {
              isDragGhost = true;
              const dragDistrict = getDistrictForProject(grid, drag.building.project.id);
              isDragValid = !!dragDistrict && fitsInDistrict(dragDistrict, gc, gr, drag.gridW, drag.gridH);
              if (isDragValid) {
                for (let dc = gc; dc < gc + drag.gridW && isDragValid; dc++) {
                  for (let dr = gr; dr < gr + drag.gridH && isDragValid; dr++) {
                    const c = grid.cells[dr]?.[dc];
                    if (c && c.entityId === drag.building.project.id && c.type === drag.structureKind) continue;
                    if (c) isDragValid = false;
                  }
                }
              }
            }
          }

          // Structure hover check
          const hoveredStruct = hoveredTargetRef.current;
          let isStructureHovered = false;
          if (!drag && hoveredStruct && cell && cell.entityId === hoveredStruct.building.project.id) {
            const oc = cell.originCol != null ? grid.cells[cell.originRow!]?.[cell.originCol!] : cell;
            isStructureHovered = oc?.type === hoveredStruct.kind;
          }

          const isHovered = hCell && hCell.col === col && hCell.row === row;

          if (isDragGhost) {
            drawTileHighlight(ctx, col, row,
              isDragValid ? 'rgba(100,200,100,0.3)' : 'rgba(255,80,80,0.3)',
              isDragValid ? 'rgba(100,200,100,0.6)' : 'rgba(255,80,80,0.6)', 1, tw, th);
          } else if (isStructureHovered) {
            drawTileHighlight(ctx, col, row, 'rgba(100,200,255,0.2)', 'rgba(100,200,255,0.5)', 1, tw, th);
          } else if (isHovered && !drag && !placementMode) {
            drawTileHighlight(ctx, col, row, 'rgba(100,200,100,0.15)', 'rgba(100,200,100,0.3)', 0.5, tw, th);
          }
        }
      }
    }

    /** Draw a diamond highlight at grid (col,row). Coordinates are absolute (not pre-translated). */
    function drawTileHighlight(c: CanvasRenderingContext2D, col: number, row: number, fill: string | null, stroke: string | null, lineW: number, tw: number, th: number) {
      const { x, y } = gridToScreen(col, row);
      c.beginPath();
      c.moveTo(x, y - th / 2);
      c.lineTo(x + tw / 2, y);
      c.lineTo(x, y + th / 2);
      c.lineTo(x - tw / 2, y);
      c.closePath();
      if (fill) { c.fillStyle = fill; c.fill(); }
      if (stroke) { c.strokeStyle = stroke; c.lineWidth = lineW; c.stroke(); }
    }

    /** Draw a diamond with SOUTH TIP at (0, 0) in translated context (fallback when sprite not loaded).
     *  The context is expected to be pre-translated to the tile's south tip (south-tip anchor). */
    function drawTileDiamond(c: CanvasRenderingContext2D, _col: number, _row: number, fill: string | null, stroke: string | null, lineW: number, tw: number, th: number) {
      c.beginPath();
      c.moveTo(0, -th);           // North tip
      c.lineTo(tw / 2, -th / 2); // East tip
      c.lineTo(0, 0);             // South tip (anchor)
      c.lineTo(-tw / 2, -th / 2);// West tip
      c.closePath();
      if (fill) { c.fillStyle = fill; c.fill(); }
      if (stroke) { c.strokeStyle = stroke; c.lineWidth = lineW; c.stroke(); }
    }
  }

  function drawDecorations(ctx: CanvasRenderingContext2D, grid: import('../types/portfolio').GridState) {
    const hCell = hoveredCellRef.current;
    const tw = ISO_TILE_W;
    const th = ISO_TILE_H;

    // ── Layer 2: Overlay — sidewalk flat (on top of ground, below objects) ──
    const sidewalkCells: { col: number; row: number }[] = [];
    for (let r = 0; r < grid.size; r++) {
      for (let c = 0; c < grid.size; c++) {
        if (grid.cells[r]?.[c]?.type === 'sidewalk') sidewalkCells.push({ col: c, row: r });
      }
    }
    sidewalkCells.sort((a, b) => (a.row + a.col) - (b.row + b.col));
    for (const { col, row } of sidewalkCells) {
      const { x, y } = gridToScreen(col + 0.5, row + 0.5);
      ctx.save();
      ctx.translate(x, y);
      drawSpriteOnGrid(ctx, 'tile_sidewalk_flat');
      ctx.restore();
    }

    // ── Layer 3: Objects — decoration sprites (trees, park, bush…) ──
    // Roads and sidewalks are excluded — they live in layers 1 and 2.
    const decos: { col: number; row: number; type: CellType }[] = [];
    for (let r = 0; r < grid.size; r++) {
      for (let c = 0; c < grid.size; c++) {
        const cell = grid.cells[r]?.[c];
        if (
          cell &&
          DECORATION_TYPES.has(cell.type) &&
          cell.type !== 'road' &&
          cell.type !== 'sidewalk' &&
          cell.originCol == null &&
          cell.originRow == null
        ) {
          decos.push({ col: c, row: r, type: cell.type });
        }
      }
    }
    decos.sort((a, b) => (a.row + a.col) - (b.row + b.col));

    for (const d of decos) {
      const spriteKey = DECO_SPRITE_MAP[d.type];
      if (!spriteKey) continue;
      const [fw, fh] = STRUCTURE_SIZES[d.type] ?? [1, 1];
      const cx = d.col + fw / 2;
      const cy = d.row + fh / 2;
      const { x, y } = gridToScreen(cx, cy);
      ctx.save();
      ctx.translate(x, y);
      drawSpriteOnGrid(ctx, spriteKey);
      ctx.restore();
    }

    // ── Ghost preview for placement mode ─────────────────────────────
    if (placementMode && !placementMode.eraser && hCell) {
      const [pw, ph] = STRUCTURE_SIZES[placementMode.deco] ?? [1, 1];
      const gc = hCell.col - Math.floor(pw / 2);
      const gr = hCell.row - Math.floor(ph / 2);
      const district = getDistrictAt(grid, hCell.col, hCell.row);
      const fitsDistrict = district ? fitsInDistrict(district, gc, gr, pw, ph) : true;
      // Roads can always be placed (no district restriction), other decos need district
      const valid = placementMode.deco === 'road'
        ? canPlace(grid, gc, gr, pw, ph)
        : fitsDistrict && canPlace(grid, gc, gr, pw, ph);

      // Ghost sprite key — road uses a straight EW preview
      const ghostSpriteKey: SpriteKey | undefined = placementMode.deco === 'road'
        ? 'road_straight_2'
        : DECO_SPRITE_MAP[placementMode.deco];

      if (ghostSpriteKey) {
        // Draw sprite at 60% alpha
        const cx = gc + pw / 2;
        const cy = gr + ph / 2;
        const { x, y } = gridToScreen(cx, cy);
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.translate(x, y);
        drawSpriteOnGrid(ctx, ghostSpriteKey);
        ctx.restore();
      }

      // Diamond footprint outline (valid / invalid colour)
      for (let dc = gc; dc < gc + pw; dc++) {
        for (let dr = gr; dr < gr + ph; dr++) {
          const { x, y } = gridToScreen(dc, dr);
          ctx.beginPath();
          ctx.moveTo(x, y - th / 2);
          ctx.lineTo(x + tw / 2, y);
          ctx.lineTo(x, y + th / 2);
          ctx.lineTo(x - tw / 2, y);
          ctx.closePath();
          ctx.fillStyle = valid ? 'rgba(80,220,80,0.18)' : 'rgba(220,60,60,0.18)';
          ctx.fill();
          ctx.strokeStyle = valid ? 'rgba(80,220,80,0.7)' : 'rgba(220,60,60,0.7)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    }

    // Eraser highlight
    if (placementMode?.eraser && hCell) {
      const cell = grid.cells[hCell.row]?.[hCell.col];
      if (cell && DECORATION_TYPES.has(cell.type)) {
        const oc = cell.originCol ?? hCell.col;
        const or_ = cell.originRow ?? hCell.row;
        const origin = grid.cells[or_]?.[oc];
        if (origin) {
          const [fw, fh] = STRUCTURE_SIZES[origin.type] ?? [1, 1];
          for (let dc = oc; dc < oc + fw; dc++) {
            for (let dr = or_; dr < or_ + fh; dr++) {
              const { x, y } = gridToScreen(dc, dr);
              ctx.beginPath();
              ctx.moveTo(x, y - th / 2);
              ctx.lineTo(x + tw / 2, y);
              ctx.lineTo(x, y + th / 2);
              ctx.lineTo(x - tw / 2, y);
              ctx.closePath();
              ctx.fillStyle = 'rgba(255, 80, 80, 0.3)';
              ctx.fill();
              ctx.strokeStyle = 'rgba(255, 80, 80, 0.6)';
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        }
      }
    }
  }

  function drawDistrict(ctx: CanvasRenderingContext2D, district: CityDistrict) {
    for (const building of district.buildings) {
      // 3. Library (behind, upper-left) — single model: library_md (2×2)
      if (building.project.documents.length > 0) {
        drawLibrary(ctx, building);
      } else {
        drawEmptyLot(ctx, building.libraryPos, 'construction_2x2');
      }
      // 4. Townhall / mairie (left) — 2×2
      if (building.project.covenants.length > 0) {
        drawTownhall(ctx, building);
      } else {
        drawEmptyLot(ctx, building.townhallPos, 'construction_2x2');
      }
      // 5. Main building (center)
      drawBuilding(ctx, building);
      // 6. Shop / syndicate (right, front-most) — size varies
      if (building.syndicateSize !== 'none') {
        drawShop(ctx, building);
      } else {
        drawEmptyLot(ctx, building.shopPos, 'construction_1x1');
      }
    }

    // District label
    const b = district.buildings[0];
    if (!b) return;
    const labelX = b.x;
    const labelY = b.y + b.width * 0.55 * district.scale + 18;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 10px monospace';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 4;
    ctx.fillText(truncate(b.project.title, 28), labelX, labelY);
    ctx.font = '9px monospace';
    ctx.fillStyle = '#AAA';
    ctx.fillText(
      `${district.borrower.corporateName} \u00B7 ${formatMoney(b.project.globalFundingAmount.amount)}`,
      labelX, labelY + 13,
    );
    const esgColors = { good: '#2ECC40', neutral: '#FFDC00', bad: '#FF4136' };
    ctx.fillStyle = esgColors[district.esgScore];
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(labelX - ctx.measureText(district.borrower.corporateName).width / 2 - 8, labelY + 9, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ─── Main building (deal + tranches) — sprite-based ───

  function drawBuilding(ctx: CanvasRenderingContext2D, building: CityBuilding) {
    const { x, y, width: w, height: h, state, project } = building;

    const bw = w * 0.9;
    const bh = h;

    ctx.save();
    ctx.translate(x, y);

    // Draw sprite
    const spriteKey = getBuildingSpriteKey(bh);
    if (!drawSpriteOnGrid(ctx, spriteKey)) {
      const colors = BUILDING_COLORS[project.nature] ?? BUILDING_COLORS.real_estate;
      drawIsoBox(ctx, bw, bh, colors.base, colors.side, colors.top);
    }

    // State overlay (dimmed/closed)
    const overlay = STATE_OVERLAY[state];
    if (overlay) {
      ctx.fillStyle = overlay;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(bw / 2, bw / 4); ctx.lineTo(bw / 2, bw / 4 - bh);
      ctx.lineTo(0, -bh); ctx.lineTo(-bw / 2, bw / 4 - bh); ctx.lineTo(-bw / 2, bw / 4);
      ctx.closePath(); ctx.fill();
    }

    // Crane for draft projects
    if (state === 'construction') {
      const craneSprite = getSprite('construction_1x1');
      if (craneSprite) {
        const craneH = bh * 0.6;
        const craneW = craneH * (craneSprite.width / craneSprite.height);
        ctx.drawImage(craneSprite, bw / 4 - craneW * 0.3, -bh - craneH * 0.7, craneW, craneH);
      } else {
        // Fallback canvas crane
        ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(bw / 4, -bh); ctx.lineTo(bw / 4, -bh - 35); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bw / 4 - 18, -bh - 35); ctx.lineTo(bw / 4 + 25, -bh - 35); ctx.stroke();
      }
    }


    ctx.restore();
  }

  // ─── Townhall (mairie) — sprite + traffic light + alerts ───

  function drawTownhall(ctx: CanvasRenderingContext2D, building: CityBuilding) {
    const { townhallPos, alertLevel, trafficLight, project } = building;

    const tw = TOWNHALL_W;
    const th = TOWNHALL_H;
    const covenantCount = project.covenants.length;

    ctx.save();
    ctx.translate(townhallPos.x, townhallPos.y);

    // Sprite or fallback
    if (!drawSpriteOnGrid(ctx, 'townhall')) {
      drawIsoBox(ctx, tw, th, TOWNHALL_COLORS.base, TOWNHALL_COLORS.side, TOWNHALL_COLORS.top);
    }

    // Covenant count badge
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 2;
    ctx.fillText(`${covenantCount}`, 0, -th - 10);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';

    // Traffic light
    const tlX = tw / 2 + 8;
    const tlY = -th * 0.5;
    ctx.fillStyle = '#333';
    ctx.fillRect(tlX - 0.5, tlY + 4, 1, 14);
    ctx.fillStyle = '#2A2A2A';
    ctx.fillRect(tlX - 3, tlY - 5, 6, 10);
    ctx.fillStyle = TRAFFIC_LIGHT_COLORS[trafficLight];
    ctx.shadowColor = TRAFFIC_LIGHT_COLORS[trafficLight];
    ctx.shadowBlur = trafficLight === 'red' ? 12 : 6;
    ctx.beginPath(); ctx.arc(tlX, tlY, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Smoke / fire alerts
    if (alertLevel !== 'none') {
      const time = Date.now() / 1000;
      for (let i = 0; i < 6; i++) {
        const px = Math.sin(time * 1.5 + i * 1.7) * 6;
        const py = -th - 14 - i * 5.5 - Math.sin(time * 2.5 + i * 0.9) * 3;
        const size = (alertLevel === 'fire' ? 5.5 : 3.5) - i * 0.5;
        ctx.fillStyle = alertLevel === 'fire'
          ? (i < 2 ? `rgba(255, ${50 + i * 35}, 15, ${0.75 - i * 0.1})` : `rgba(80, 80, 80, ${0.3 - i * 0.04})`)
          : `rgba(160, 160, 160, ${0.35 - i * 0.05})`;
        ctx.beginPath(); ctx.arc(px, py, Math.max(size, 1), 0, Math.PI * 2); ctx.fill();
      }
    }

    ctx.restore();
  }

  // ─── Shop (syndicate) — sprite-based ───

  function drawShop(ctx: CanvasRenderingContext2D, building: CityBuilding) {
    const { shopPos, syndicateSize, project } = building;

    const lenderCount = project.lenders.length;
    const sizeConfig = SHOP_SIZES[syndicateSize];
    if (!sizeConfig) return;
    const { sw, sh } = sizeConfig;

    ctx.save();
    ctx.translate(shopPos.x, shopPos.y);

    // Sprite by size — keys match new lib sprites
    const spriteKey: SpriteKey = syndicateSize === 'mall' ? 'shop_mall' : syndicateSize === 'shop' ? 'shop_store' : 'shop_kiosk';
    if (!drawSpriteOnGrid(ctx, spriteKey)) {
      drawIsoBox(ctx, sw, sh, SHOP_COLORS.base, SHOP_COLORS.side, SHOP_COLORS.top);
    }

    // Lender count badge
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 2;
    ctx.fillText(`\u00D7${lenderCount}`, 0, -sh - 4);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';

    ctx.restore();
  }

  // ─── Library (bibliothèque / dataroom) — sprite-based ───

  function drawLibrary(ctx: CanvasRenderingContext2D, building: CityBuilding) {
    const { libraryPos, librarySize, project } = building;

    const docCount = project.documents.length;
    const sizeConfig = LIBRARY_SIZES[librarySize];
    if (!sizeConfig) return;
    const { lw, lh } = sizeConfig;

    ctx.save();
    ctx.translate(libraryPos.x, libraryPos.y);

    // Single library model — library_md (1024×1024, footprint 2×2)
    const spriteKey: SpriteKey = 'library_md';
    if (!drawSpriteOnGrid(ctx, spriteKey)) {
      drawIsoBox(ctx, lw, lh, LIBRARY_COLORS.base, LIBRARY_COLORS.side, LIBRARY_COLORS.top);
    }

    // Document count badge
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 2;
    ctx.fillText(`${docCount}`, 0, -lh - 4);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';

    ctx.restore();
  }

  // ─── Shared drawing helpers ───

  function drawIsoBox(ctx: CanvasRenderingContext2D, w: number, h: number, base: string, side: string, top: string) {
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 0.5;

    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(w / 2, w / 4); ctx.lineTo(w / 2, w / 4 - h); ctx.lineTo(0, -h);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    ctx.fillStyle = side;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-w / 2, w / 4); ctx.lineTo(-w / 2, w / 4 - h); ctx.lineTo(0, -h);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.moveTo(0, -h); ctx.lineTo(w / 2, w / 4 - h); ctx.lineTo(0, w / 2 - h); ctx.lineTo(-w / 2, w / 4 - h);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  /** Draw a sprite anchored at the SOUTH TIP of its footprint (pre-translated context).
   *
   *  footprintW = (footCols + footRows) × ISO_TILE_W/2
   *    → screen width of the iso diamond for any N×M footprint.
   *    → for new lib sprites (baseRatio=1.0) gives scale=0.125 regardless of size.
   *
   *  yOff: sprite_bottom = anchor_y + ISO_TILE_H × yOff.
   *    yOff=0.5 → cube bottom sits ISO_TILE_H/2 = 19px below south tip (matches tile_grass). */
  function drawSpriteOnGrid(ctx: CanvasRenderingContext2D, spriteKey: SpriteKey) {
    const sprite = getSprite(spriteKey);
    if (!sprite) return false;
    const [footCols, footRows] = STRUCTURE_SIZES[spriteKey] ?? [2, 2];
    // Diamond screen width for any N×M footprint: (N+M) × half-tile-width
    const footprintW = (footCols + footRows) * (ISO_TILE_W / 2);
    const anchor = SPRITE_ANCHOR[spriteKey] ?? { baseRatio: 0.8, yOff: 0.8, xOff: 0 };
    // Scale so the iso BASE width of the sprite fills the footprint diamond width
    const baseW = sprite.width * anchor.baseRatio;
    const scale = footprintW / baseW;
    const sw = sprite.width * scale;
    const sh = sprite.height * scale;
    ctx.drawImage(sprite, -sw / 2 + ISO_TILE_W * anchor.xOff, -sh + ISO_TILE_H * anchor.yOff, sw, sh);
    return true;
  }

  /** Draw an empty lot placeholder.
   *  If a construction sprite key is provided, it is drawn first (at 80% alpha).
   *  Falls back to a dashed diamond outline when the sprite isn't loaded yet. */
  function drawEmptyLot(
    ctx: CanvasRenderingContext2D,
    pos: { x: number; y: number },
    constructionKey?: SpriteKey,
  ) {
    ctx.save();
    ctx.translate(pos.x, pos.y);

    // Try the construction sprite first
    if (constructionKey) {
      ctx.globalAlpha = 0.8;
      if (drawSpriteOnGrid(ctx, constructionKey)) {
        ctx.restore();
        return;
      }
      ctx.globalAlpha = 1;
    }

    // Fallback: dashed diamond outline
    const w = EMPTY_LOT_W;
    const h = EMPTY_LOT_H;
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w / 2, w / 4);
    ctx.lineTo(w / 2, w / 4 - h);
    ctx.lineTo(0, -h);
    ctx.lineTo(-w / 2, w / 4 - h);
    ctx.lineTo(-w / 2, w / 4);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fill();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', 0, -h / 2 + w / 8);

    ctx.restore();
  }

  // ─── Tooltip ───

  function drawTooltip(ctx: CanvasRenderingContext2D, target: ClickTarget) {
    const { building } = target;
    let tx: number, ty: number;
    let lines: string[];

    if (target.kind === 'townhall') {
      tx = building.townhallPos.x;
      ty = building.townhallPos.y - TOWNHALL_H - 40;
      const covenantCount = building.project.covenants.length;
      lines = [
        `Mairie \u2014 ${building.project.title}`,
        `${covenantCount} covenant${covenantCount > 1 ? 's' : ''}`,
        `Status: ${building.trafficLight}`,
      ];
    } else if (target.kind === 'shop') {
      tx = building.shopPos.x;
      const sh = SHOP_SIZES[building.syndicateSize]?.sh ?? 14;
      ty = building.shopPos.y - sh - 40;
      lines = [
        `Syndicate \u2014 ${building.project.title}`,
        `${building.project.lenders.length} lender${building.project.lenders.length > 1 ? 's' : ''}`,
        formatMoney(building.project.lenders.reduce((s, l) => s + l.allocations.reduce((sa, a) => sa + a.amount.amount, 0), 0)),
      ];
    } else if (target.kind === 'library') {
      tx = building.libraryPos.x;
      const lh = LIBRARY_SIZES[building.librarySize]?.lh ?? 18;
      ty = building.libraryPos.y - lh - 40;
      const docCount = building.project.documents.length;
      const driveCount = new Set(building.project.documents.map(d => d.drive)).size;
      lines = [
        `Library \u2014 ${truncate(building.project.title, 22)}`,
        `${docCount} document${docCount !== 1 ? 's' : ''}`,
        `${driveCount} drive${driveCount !== 1 ? 's' : ''}`,
      ];
    } else {
      tx = building.x;
      ty = building.y - building.height - 40;
      lines = [
        building.project.title,
        formatMoney(building.project.globalFundingAmount.amount),
        `${building.floors} floor${building.floors !== 1 ? 's' : ''} \u00B7 ${building.project.currentStatus}`,
      ];
    }

    ctx.save();
    ctx.font = 'bold 11px monospace';
    const maxW = Math.max(...lines.map(l => ctx.measureText(l).width)) + 24;
    const tooltipH = lines.length * 17 + 14;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.beginPath(); ctx.roundRect(tx - maxW / 2, ty - tooltipH, maxW, tooltipH, 6); ctx.fill();
    ctx.beginPath(); ctx.moveTo(tx - 6, ty); ctx.lineTo(tx, ty + 6); ctx.lineTo(tx + 6, ty); ctx.closePath(); ctx.fill();

    ctx.textAlign = 'center';
    lines.forEach((line, i) => {
      ctx.font = i === 0 ? 'bold 11px monospace' : '10px monospace';
      ctx.fillStyle = i === 0 ? '#FFF' : '#BBB';
      ctx.fillText(line, tx, ty - tooltipH + 18 + i * 17);
    });
    ctx.textAlign = 'left';
    ctx.restore();
  }

  // ─── HUD ───

  function drawHUD(ctx: CanvasRenderingContext2D, canvasWidth: number) {
    ctx.font = '24px serif';
    const weatherIcon = { sunny: '\u2600\uFE0F', cloudy: '\u2601\uFE0F', stormy: '\u26C8\uFE0F' }[cityState.weather] ?? '';
    ctx.fillText(weatherIcon, 16, 36);

    ctx.fillStyle = '#FFF'; ctx.font = 'bold 13px monospace';
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 3;
    ctx.fillText(`DEBT CITY \u00B7 ${cityState.districts.length} deals`, 48, 32);
    ctx.font = '11px monospace'; ctx.fillStyle = '#AAA';
    ctx.fillText('Scroll to zoom \u00B7 Drag to pan \u00B7 Click a structure', 48, 48);
    ctx.shadowBlur = 0;

    const legendX = canvasWidth - 200;
    ctx.font = '10px monospace';
    const legend = [
      { color: BUILDING_COLORS.real_estate.base, label: 'Building (Tranches)' },
      { color: TOWNHALL_COLORS.base, label: 'Mairie (Covenants)' },
      { color: SHOP_COLORS.base, label: 'Shop (Syndicate)' },
      { color: LIBRARY_COLORS.base, label: 'Library (Dataroom)' },
    ];
    legend.forEach((item, i) => {
      ctx.fillStyle = item.color;
      ctx.fillRect(legendX, 18 + i * 18, 10, 10);
      ctx.fillStyle = '#FFF'; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 2;
      ctx.fillText(item.label, legendX + 16, 26 + i * 18);
    });
    ctx.shadowBlur = 0;
  }

  // ─── Hit testing — grid-based ───

  function findTargetAt(clientX: number, clientY: number): ClickTarget | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const cam = cameraRef.current;
    // Convert screen to world coords
    const wx = (clientX - rect.left - rect.width / 2 - cam.x) / cam.zoom;
    const wy = (clientY - rect.top - rect.height * 0.35 - cam.y) / cam.zoom;
    // Convert world to grid
    const { col, row } = screenToGrid(wx, wy);
    if (col < 0 || row < 0 || col >= GRID_SIZE || row >= GRID_SIZE) return null;

    // Check what's on this grid cell
    const cell = cityState.grid.cells[row]?.[col];
    if (!cell || !cell.entityId) return null;

    // Find the origin cell (for multi-cell structures)
    const originCol = cell.originCol ?? col;
    const originRow = cell.originRow ?? row;
    const originCell = cityState.grid.cells[originRow]?.[originCol];
    if (!originCell) return null;

    // Find the building (CityBuilding) that this cell belongs to
    const projectId = originCell.projectId ?? originCell.entityId;
    let matchBuilding: CityBuilding | null = null;
    for (const d of cityState.districts) {
      for (const b of d.buildings) {
        if (b.project.id === projectId) { matchBuilding = b; break; }
      }
      if (matchBuilding) break;
    }
    if (!matchBuilding) return null;

    // Decorations don't produce click targets
    if (DECORATION_TYPES.has(originCell.type)) return null;

    // Map cell type to click target kind
    const typeToKind: Record<string, ClickTarget['kind']> = {
      building: 'building',
      townhall: 'townhall',
      shop: 'shop',
      library: 'library',
    };
    const kind = typeToKind[originCell.type];
    if (!kind) return null;

    return { kind, building: matchBuilding };
  }

  // ─── Event handlers ───

  function handleMouseDown(e: React.MouseEvent) {
    // In placement mode, don't initiate building drags
    if (placementMode) {
      dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, camX: cameraRef.current.x, camY: cameraRef.current.y, moved: false };
      dragStateRef.current = null;
      // Road paint mode: place first tile immediately on mousedown
      if (!placementMode.eraser && placementMode.deco === 'road') {
        paintedCellsRef.current.clear();
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const cam = cameraRef.current;
          const wx = (e.clientX - rect.left - rect.width / 2 - cam.x) / cam.zoom;
          const wy = (e.clientY - rect.top - rect.height * 0.35 - cam.y) / cam.zoom;
          const { col, row } = screenToGrid(wx, wy);
          const key = `${col},${row}`;
          paintedCellsRef.current.add(key);
          const district = getDistrictAt(cityState.grid, col, row);
          onPlaceDecoration?.(col, row, district?.projectId ?? '');
        }
      }
      return;
    }
    const target = findTargetAt(e.clientX, e.clientY);
    if (target) {
      // Click on a building — prepare for potential drag
      // sizeKey determines the grid footprint, structureKind matches what's stored in the grid
      const sizeKey = target.kind === 'building'
        ? getBuildingSpriteKey(target.building.height)
        : target.kind === 'townhall' ? 'townhall'
        : target.kind === 'shop' ? (target.building.syndicateSize === 'mall' ? 'shop_mall' : target.building.syndicateSize === 'shop' ? 'shop_store' : 'shop_kiosk')
        : (target.building.librarySize === 'large' ? 'library_lg' : target.building.librarySize === 'medium' ? 'library_md' : 'library_sm');
      const size = STRUCTURE_SIZES[sizeKey] ?? [2, 2];
      // structureKind MUST match what's stored in grid cells (e.g. 'shop', not 'shop_mall')
      // Store as a potential drag — only activates if mouse moves (DRAG_THRESHOLD)
      dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, camX: cameraRef.current.x, camY: cameraRef.current.y, moved: false };
      dragStateRef.current = {
        building: target.building,
        structureKind: target.kind as DragState['structureKind'],
        gridCol: 0, gridRow: 0,
        gridW: size[0], gridH: size[1],
      };
      return;
    }
    // Click on empty space → camera pan
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, camX: cameraRef.current.x, camY: cameraRef.current.y, moved: false };
    dragStateRef.current = null;
  }

  function handleMouseMove(e: React.MouseEvent) {
    // Fix 5 — Throttle to ~60fps
    const now = performance.now();
    if (now - lastMoveTimeRef.current < 16) return;
    lastMoveTimeRef.current = now;

    const drag = dragRef.current;
    if (drag.active) {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) drag.moved = true;
      if (drag.moved && dragStateRef.current) {
        // Building drag mode — track grid cell, don't pan camera
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const cam = cameraRef.current;
          const wx = (e.clientX - rect.left - rect.width / 2 - cam.x) / cam.zoom;
          const wy = (e.clientY - rect.top - rect.height * 0.35 - cam.y) / cam.zoom;
          const cell = screenToGrid(wx, wy);
          if (cell.col >= 0 && cell.col < GRID_SIZE && cell.row >= 0 && cell.row < GRID_SIZE) {
            hoveredCellRef.current = cell;
          }
        }
        needsRedrawRef.current = true;
      } else if (drag.moved && placementMode?.deco === 'road' && !placementMode.eraser) {
        // Road paint mode — paint cells as mouse drags
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const cam = cameraRef.current;
          const wx = (e.clientX - rect.left - rect.width / 2 - cam.x) / cam.zoom;
          const wy = (e.clientY - rect.top - rect.height * 0.35 - cam.y) / cam.zoom;
          const cell = screenToGrid(wx, wy);
          if (cell.col >= 0 && cell.col < GRID_SIZE && cell.row >= 0 && cell.row < GRID_SIZE) {
            hoveredCellRef.current = cell;
            const key = `${cell.col},${cell.row}`;
            if (!paintedCellsRef.current.has(key)) {
              paintedCellsRef.current.add(key);
              const district = getDistrictAt(cityState.grid, cell.col, cell.row);
              onPlaceDecoration?.(cell.col, cell.row, district?.projectId ?? '');
            }
          }
        }
        needsRedrawRef.current = true;
      } else if (drag.moved) {
        // Camera pan mode
        cameraRef.current = { ...cameraRef.current, x: drag.camX + dx, y: drag.camY + dy };
        needsRedrawRef.current = true;
      }
    } else {
      const target = findTargetAt(e.clientX, e.clientY);
      const prev = hoveredTargetRef.current;
      const prevId = prev ? `${prev.kind}-${prev.building.project.id}` : null;
      const nextId = target ? `${target.kind}-${target.building.project.id}` : null;
      if (prevId !== nextId) {
        hoveredTargetRef.current = target;
        needsRedrawRef.current = true;
        forceRender(n => n + 1); // Update cursor style
      }
      // Track hovered grid cell
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const cam = cameraRef.current;
        const wx = (e.clientX - rect.left - rect.width / 2 - cam.x) / cam.zoom;
        const wy = (e.clientY - rect.top - rect.height * 0.35 - cam.y) / cam.zoom;
        const cell = screenToGrid(wx, wy);
        const prevCell = hoveredCellRef.current;
        if (!prevCell || prevCell.col !== cell.col || prevCell.row !== cell.row) {
          if (cell.col >= 0 && cell.col < GRID_SIZE && cell.row >= 0 && cell.row < GRID_SIZE) {
            hoveredCellRef.current = cell;
          } else {
            hoveredCellRef.current = null;
          }
          needsRedrawRef.current = true;
        }
      }
    }
  }

  function handleMouseUp(e: React.MouseEvent) {
    const drag = dragRef.current;
    const ds = dragStateRef.current;

    // Placement mode: place or remove decoration on click (non-drag)
    if (placementMode && drag.active) {
      // Always clear paint state on mouseup
      paintedCellsRef.current.clear();

      if (!drag.moved) {
        // Single click (no drag) — place or remove
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const cam = cameraRef.current;
          const wx = (e.clientX - rect.left - rect.width / 2 - cam.x) / cam.zoom;
          const wy = (e.clientY - rect.top - rect.height * 0.35 - cam.y) / cam.zoom;
          const { col, row } = screenToGrid(wx, wy);

          if (placementMode.eraser) {
            onRemoveDecoration?.(col, row);
          } else if (placementMode.deco !== 'road') {
            // Road was already placed on mousedown; skip re-placing other decos
            const [pw, ph] = STRUCTURE_SIZES[placementMode.deco] ?? [1, 1];
            const gc = col - Math.floor(pw / 2);
            const gr = row - Math.floor(ph / 2);
            const district = getDistrictAt(cityState.grid, col, row);
            onPlaceDecoration?.(gc, gr, district?.projectId ?? '');
          }
        }
      }
      // Drag case (road paint): tiles were placed incrementally via mousemove, nothing else to do
      dragRef.current = { ...drag, active: false };
      needsRedrawRef.current = true;
      return;
    }

    if (ds && drag.active && drag.moved && hoveredCellRef.current) {
      // Building was dragged — drop it
      const hc = hoveredCellRef.current;
      const toCol = hc.col - Math.floor(ds.gridW / 2);
      const toRow = hc.row - Math.floor(ds.gridH / 2);
      const district = getDistrictForProject(cityState.grid, ds.building.project.id);
      if (district && fitsInDistrict(district, toCol, toRow, ds.gridW, ds.gridH)) {
        onMoveStructure?.(ds.building.project.id, ds.structureKind, toCol, toRow, ds.gridW, ds.gridH);
      }
      dragStateRef.current = null;
      dragRef.current = { ...drag, active: false };
      needsRedrawRef.current = true;
      return;
    }

    if (drag.active && !drag.moved) {
      // Short click — open panel
      const target = findTargetAt(e.clientX, e.clientY);
      if (target) onTargetClick?.(target);
    }

    dragStateRef.current = null;
    dragRef.current = { ...drag, active: false };
    needsRedrawRef.current = true;
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    cameraRef.current = { ...cameraRef.current, zoom: Math.max(0.3, Math.min(3, cameraRef.current.zoom - e.deltaY * 0.001)) };
    needsRedrawRef.current = true;
  }

  // ─── Fix 1 — Canvas resize only on actual resize ───

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    function updateSize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas!.getBoundingClientRect();
      canvas!.width = rect.width * dpr;
      canvas!.height = rect.height * dpr;
      canvasSizeRef.current = { w: rect.width, h: rect.height };
      needsRedrawRef.current = true;
    }
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // ─── Fix 2 — Conditional RAF loop ───

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    let id: number;
    function render() {
      // Only redraw if needed OR if animations are active
      if (needsRedrawRef.current || hasAnimations) {
        const dpr = window.devicePixelRatio || 1;
        const { w, h } = canvasSizeRef.current;
        ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw(ctx!, w, h);
        needsRedrawRef.current = false;
      }
      id = requestAnimationFrame(render);
    }
    needsRedrawRef.current = true;
    render();
    return () => cancelAnimationFrame(id);
  }, [draw, hasAnimations]);

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cam = cameraRef.current;
    const wx = (e.clientX - rect.left - rect.width / 2 - cam.x) / cam.zoom;
    const wy = (e.clientY - rect.top - rect.height * 0.35 - cam.y) / cam.zoom;
    const { col, row } = screenToGrid(wx, wy);
    const cell = cityState.grid.cells[row]?.[col];
    if (cell && DECORATION_TYPES.has(cell.type)) {
      onRemoveDecoration?.(col, row);
      needsRedrawRef.current = true;
    }
  }

  const cursorStyle = placementMode
    ? (placementMode.eraser ? 'crosshair' : 'copy')
    : dragRef.current.active && dragRef.current.moved ? 'grabbing' : hoveredTargetRef.current ? 'pointer' : 'grab';

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', cursor: cursorStyle }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { dragRef.current = { ...dragRef.current, active: false }; hoveredTargetRef.current = null; needsRedrawRef.current = true; }}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
    />
  );
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '\u2026' : s;
}
