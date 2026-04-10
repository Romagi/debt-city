import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { CityState, CityBuilding, CityDistrict, ClickTarget } from '../types/portfolio';
import { GRID_SIZE, ISO_TILE_W, ISO_TILE_H, STRUCTURE_SIZES, gridToScreen, screenToGrid, getDistrictForProject, fitsInDistrict } from '../types/portfolio';
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

/** Per-sprite rendering config: scale relative to footprint, and Y anchor offset */
/** Per-sprite rendering calibration:
 *  baseRatio: what fraction of sprite width is the iso base (the 2 visible edges). 1.0 = full width.
 *  yOff: vertical anchor in ISO_TILE_H units (higher = base sits lower)
 *  xOff: horizontal shift in ISO_TILE_W units (for off-center sprites) */
const SPRITE_ANCHOR: Record<string, { baseRatio: number; yOff: number; xOff: number }> = {
  // These were good — don't touch
  building_xs: { baseRatio: 1.0, yOff: 1.2, xOff: 0 },
  building_sm: { baseRatio: 1.0, yOff: 1.2, xOff: 0 },
  building_md: { baseRatio: 1.0, yOff: 1.2, xOff: 0 },
  building_lg: { baseRatio: 1.0, yOff: 1.2, xOff: 0 },
  building_xl: { baseRatio: 1.0, yOff: 1.2, xOff: 0 },
  townhall:    { baseRatio: 1.0, yOff: 1.0, xOff: 0 },
  shop_sm:     { baseRatio: 1.0, yOff: 1.0, xOff: 0 },
  shop_md:     { baseRatio: 1.0, yOff: 1.0, xOff: 0 },
  // Mall: iso base is ~75% of sprite width, needs to fill the 4x2 footprint
  shop_lg:     { baseRatio: 0.75, yOff: 1.3, xOff: 0 },
  // These were good — don't touch
  library_sm:  { baseRatio: 1.0, yOff: 0.6, xOff: 0 },
  library_md:  { baseRatio: 1.0, yOff: 0.6, xOff: 0 },
  library_lg:  { baseRatio: 1.0, yOff: 0.6, xOff: 0 },
};

// ─── Sprite system ───

const SPRITE_PATHS = {
  // Main buildings by size tier (small → large)
  building_xs: '/sprites/building-xs.png',
  building_sm: '/sprites/building-sm.png',
  building_md: '/sprites/building-md.png',
  building_lg: '/sprites/building-lg.png',
  building_xl: '/sprites/building-xl.png',
  // Sub-structures
  townhall: '/sprites/townhall.png',
  shop_sm: '/sprites/shop-kiosk.png',
  shop_md: '/sprites/shop-store.png',
  shop_lg: '/sprites/shop-mall.png',
  library_sm: '/sprites/library-sm.png',
  library_md: '/sprites/library-md.png',
  library_lg: '/sprites/library-lg.png',
  // Extras
  empty_lot: '/sprites/empty-lot.png',
  crane: '/sprites/crane.png',
  // Environment
  ground: '/sprites/ground-tile.png',
  tile_concrete: '/sprites/tile-concrete.png',
  tile_grass: '/sprites/tile-grass.png',
  tree_sm: '/sprites/tree-sm.png',
  tree_lg: '/sprites/tree-lg.png',
  bush: '/sprites/bush.png',
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
  if (height > 140) return 'building_xl';
  if (height > 110) return 'building_lg';
  if (height > 80) return 'building_md';
  if (height > 55) return 'building_sm';
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

interface Props {
  cityState: CityState;
  onTargetClick?: (target: ClickTarget) => void;
  onMoveStructure?: (entityId: string, structureType: string, toCol: number, toRow: number, width: number, height: number) => void;
}

const DRAG_THRESHOLD = 4;

export default function CityCanvas({ cityState, onTargetClick, onMoveStructure }: Props) {
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

  // Mark redraw needed when city state changes
  useEffect(() => { needsRedrawRef.current = true; }, [cityState]);

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

    for (const district of sortedDistricts) drawDistrict(ctx, district);

    // Tooltip — read from ref
    const hovered = hoveredTargetRef.current;
    if (hovered) drawTooltip(ctx, hovered);

    ctx.restore();
    drawHUD(ctx, width);
  }, [cityState, sortedDistricts]);

  function drawGrid(ctx: CanvasRenderingContext2D, grid: import('../types/portfolio').GridState) {
    const hCell = hoveredCellRef.current;
    const tw = ISO_TILE_W;
    const th = ISO_TILE_H;
    const drag = dragStateRef.current;

    const concreteSprite = getSprite('tile_concrete');

    // Only render cells inside districts
    for (const d of grid.districts) {
      // Collect border cells and sort back-to-front (by row+col for correct overlap)
      const borderSet = new Set<string>();
      for (let edge = 0; edge < d.size; edge++) {
        borderSet.add(`${d.col + edge},${d.row}`);
        borderSet.add(`${d.col + edge},${d.row + d.size - 1}`);
        borderSet.add(`${d.col},${d.row + edge}`);
        borderSet.add(`${d.col + d.size - 1},${d.row + edge}`);
      }
      const borderCells = [...borderSet].map(s => { const [c, r] = s.split(',').map(Number); return { col: c, row: r }; });
      // Sort back-to-front: lower row+col drawn first
      borderCells.sort((a, b) => (a.row + a.col) - (b.row + b.col));

      for (const { col, row } of borderCells) {
        if (concreteSprite) {
          const { x, y } = gridToScreen(col, row);
          // Flat tile: 2:1 ratio, no thickness. Align diamond center to grid point.
          ctx.drawImage(concreteSprite, x - tw / 2, y - th / 2, tw, th);
        } else {
          drawTileDiamond(ctx, col, row, 'rgba(180,170,160,0.12)', 'rgba(180,170,160,0.2)', 0.8);
        }
      }

      // Draw interior tiles (grass on empty cells, skip border cells already drawn)
      const grassSprite = getSprite('tile_grass');
      for (let row = d.row + 1; row < d.row + d.size - 1; row++) {
        for (let col = d.col + 1; col < d.col + d.size - 1; col++) {
          const cell = grid.cells[row]?.[col];
          const isHovered = hCell && hCell.col === col && hCell.row === row;
          const isOccupied = cell !== null;

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

          // Check if this cell belongs to the hovered structure
          const hoveredStruct = hoveredTargetRef.current;
          let isStructureHovered = false;
          if (!drag && hoveredStruct && cell && cell.entityId === hoveredStruct.building.project.id) {
            // Get the origin cell type to check if it matches the hovered kind
            const oc = cell.originCol != null ? grid.cells[cell.originRow!]?.[cell.originCol!] : cell;
            isStructureHovered = oc?.type === hoveredStruct.kind;
          }

          if (isDragGhost) {
            drawTileDiamond(ctx, col, row,
              isDragValid ? 'rgba(100, 200, 100, 0.3)' : 'rgba(255, 80, 80, 0.3)',
              isDragValid ? 'rgba(100, 200, 100, 0.6)' : 'rgba(255, 80, 80, 0.6)', 1);
          } else if (isStructureHovered) {
            // Highlight all cells of the hovered building
            drawTileDiamond(ctx, col, row, 'rgba(100, 200, 255, 0.2)', 'rgba(100, 200, 255, 0.5)', 1);
          } else if (isHovered && !drag) {
            drawTileDiamond(ctx, col, row, 'rgba(100, 200, 100, 0.15)', 'rgba(100, 200, 100, 0.3)', 0.5);
          } else if (!isOccupied) {
            // Empty cell inside district = grass
            if (grassSprite) {
              const { x, y } = gridToScreen(col, row);
              ctx.drawImage(grassSprite, x - tw / 2, y - th / 2, tw, th);
            } else {
              drawTileDiamond(ctx, col, row, 'rgba(90, 160, 60, 0.1)', null, 0);
            }
          }
          // Occupied cells: no ground tile drawn (building renders on top)
        }
      }
    }

    function drawTileDiamond(c: CanvasRenderingContext2D, col: number, row: number, fill: string | null, stroke: string | null, lineW: number) {
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
  }

  function drawDistrict(ctx: CanvasRenderingContext2D, district: CityDistrict) {
    for (const building of district.buildings) {
      // 3. Library (behind, upper-left)
      if (building.project.documents.length > 0) {
        drawLibrary(ctx, building);
      } else {
        drawEmptyLot(ctx, building.libraryPos);
      }
      // 4. Townhall (left)
      if (building.project.covenants.length > 0) {
        drawTownhall(ctx, building);
      } else {
        drawEmptyLot(ctx, building.townhallPos);
      }
      // 5. Main building (center)
      drawBuilding(ctx, building);
      // 6. Shop (right, front-most)
      if (building.syndicateSize !== 'none') {
        drawShop(ctx, building);
      } else {
        drawEmptyLot(ctx, building.shopPos);
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
      const craneSprite = getSprite('crane');
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

    // Sprite by size
    const spriteKey: SpriteKey = syndicateSize === 'mall' ? 'shop_lg' : syndicateSize === 'shop' ? 'shop_md' : 'shop_sm';
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

    // Sprite by size
    const spriteKey: SpriteKey = librarySize === 'large' ? 'library_lg' : librarySize === 'medium' ? 'library_md' : 'library_sm';
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

  /** Draw a sprite centered in its grid footprint.
   *  Scale = fit sprite width into footprint iso width (cols * ISO_TILE_W).
   *  Sprite is always horizontally centered on the grid origin point.
   *  yOff controls vertical anchor (higher = base sits lower on the ground). */
  function drawSpriteOnGrid(ctx: CanvasRenderingContext2D, spriteKey: SpriteKey) {
    const sprite = getSprite(spriteKey);
    if (!sprite) return false;
    const [footCols] = STRUCTURE_SIZES[spriteKey] ?? [2, 2];
    const footprintW = footCols * ISO_TILE_W;
    const anchor = SPRITE_ANCHOR[spriteKey] ?? { baseRatio: 0.8, yOff: 0.8, xOff: 0 };
    // Scale so the iso BASE of the sprite (not full width) fills the footprint
    const baseW = sprite.width * anchor.baseRatio;
    const scale = footprintW / baseW;
    const sw = sprite.width * scale;
    const sh = sprite.height * scale;
    ctx.drawImage(sprite, -sw / 2 + ISO_TILE_W * anchor.xOff, -sh + ISO_TILE_H * anchor.yOff, sw, sh);
    return true;
  }

  function drawEmptyLot(ctx: CanvasRenderingContext2D, pos: { x: number; y: number }) {
    const w = EMPTY_LOT_W;
    const h = EMPTY_LOT_H;
    ctx.save();
    ctx.translate(pos.x, pos.y);

    // Dashed diamond outline
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

    // Subtle fill
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fill();

    // "+" label
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

  const cursorStyle = dragRef.current.active && dragRef.current.moved ? 'grabbing' : hoveredTargetRef.current ? 'pointer' : 'grab';

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', cursor: cursorStyle }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { dragRef.current = { ...dragRef.current, active: false }; hoveredTargetRef.current = null; needsRedrawRef.current = true; }}
      onWheel={handleWheel}
    />
  );
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '\u2026' : s;
}
