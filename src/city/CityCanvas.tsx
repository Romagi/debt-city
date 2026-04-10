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

  function screenToWorld(screenX: number, screenY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const cam = cameraRef.current;
    return {
      x: (screenX - rect.width / 2 - cam.x) / cam.zoom,
      y: (screenY - rect.height * 0.35 - cam.y) / cam.zoom,
    };
  }

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

    // Only render cells inside districts (skip the vast empty grid)
    for (const d of grid.districts) {
      // Draw district boundary — thicker outline
      for (let edge = 0; edge < d.size; edge++) {
        // Top edge
        drawTileDiamond(ctx, d.col + edge, d.row, 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.15)', 0.8);
        // Bottom edge
        drawTileDiamond(ctx, d.col + edge, d.row + d.size - 1, 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.15)', 0.8);
        // Left edge
        drawTileDiamond(ctx, d.col, d.row + edge, 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.15)', 0.8);
        // Right edge
        drawTileDiamond(ctx, d.col + d.size - 1, d.row + edge, 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.15)', 0.8);
      }

      // Draw interior tiles
      for (let row = d.row; row < d.row + d.size; row++) {
        for (let col = d.col; col < d.col + d.size; col++) {
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
              // Valid = inside same district + no collision with other structures
              const dragDistrict = getDistrictForProject(grid, drag.building.project.id);
              isDragValid = !!dragDistrict && fitsInDistrict(dragDistrict, gc, gr, drag.gridW, drag.gridH);
              if (isDragValid) {
                for (let dc = gc; dc < gc + drag.gridW && isDragValid; dc++) {
                  for (let dr = gr; dr < gr + drag.gridH && isDragValid; dr++) {
                    const c = grid.cells[dr]?.[dc];
                    if (c && c.entityId === drag.building.project.id && c.type === drag.structureKind) continue; // Own cells are OK
                    if (c) isDragValid = false;
                  }
                }
              }
            }
          }

          if (isDragGhost) {
            drawTileDiamond(ctx, col, row,
              isDragValid ? 'rgba(100, 200, 100, 0.3)' : 'rgba(255, 80, 80, 0.3)',
              isDragValid ? 'rgba(100, 200, 100, 0.6)' : 'rgba(255, 80, 80, 0.6)', 1);
          } else if (isHovered && !drag) {
            drawTileDiamond(ctx, col, row, 'rgba(100, 200, 100, 0.2)', 'rgba(100, 200, 100, 0.4)', 1);
          } else if (isOccupied) {
            drawTileDiamond(ctx, col, row, 'rgba(80, 100, 80, 0.06)', null, 0);
          } else {
            drawTileDiamond(ctx, col, row, null, 'rgba(255, 255, 255, 0.03)', 0.5);
          }
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

  function drawDistrictGround(ctx: CanvasRenderingContext2D, district: CityDistrict) {
    const b = district.buildings[0];
    if (!b) return;
    const s = district.scale;
    const w = b.width; // TILE_WIDTH
    const gw = w * 2.8 * s;

    ctx.save();
    ctx.translate(b.x, b.y);

    // Sprite ground or fallback
    const groundSprite = getSprite('ground');
    if (groundSprite) {
      const gh = gw * (groundSprite.height / groundSprite.width);
      ctx.drawImage(groundSprite, -gw / 2, -gh * 0.35, gw, gh);
    } else {
      // Fallback: green isometric diamond
      ctx.fillStyle = 'rgba(60, 120, 60, 0.12)';
      ctx.strokeStyle = 'rgba(100, 160, 100, 0.15)';
      ctx.lineWidth = 1;
      const hw = gw / 2;
      const hh = gw / 4;
      ctx.beginPath();
      ctx.moveTo(0, -hh * 0.3);
      ctx.lineTo(hw, hh * 0.7 - hh * 0.3);
      ctx.lineTo(0, hh * 1.4 - hh * 0.3);
      ctx.lineTo(-hw, hh * 0.7 - hh * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawDistrictTrees(ctx: CanvasRenderingContext2D, district: CityDistrict, layer: 'back' | 'front') {
    const b = district.buildings[0];
    if (!b) return;
    const s = district.scale;
    const w = b.width; // TILE_WIDTH

    // Deterministic "random" positions based on project id
    const seed = b.project.id.charCodeAt(1) + b.project.id.charCodeAt(0);
    const treePositions = [
      // Back trees (drawn before buildings)
      { x: b.x + w * 0.6 * s, y: b.y - w * 0.4 * s, back: true, big: false },
      { x: b.x + w * 1.1 * s, y: b.y - w * 0.1 * s, back: true, big: (seed % 3 === 0) },
      // Front trees (drawn after buildings)
      { x: b.x - w * 0.4 * s, y: b.y + w * 0.8 * s, back: false, big: (seed % 2 === 0) },
      { x: b.x + w * 0.5 * s, y: b.y + w * 0.9 * s, back: false, big: false },
    ];

    const trees = treePositions.filter(t => (layer === 'back') === t.back);

    for (const t of trees) {
      const spriteKey: SpriteKey = t.big ? 'tree_lg' : 'tree_sm';
      const sprite = getSprite(spriteKey);
      if (sprite) {
        const ts = t.big ? 0.5 : 0.35;
        const tw = sprite.width * ts;
        const th = sprite.height * ts;
        ctx.drawImage(sprite, t.x - tw / 2, t.y - th + 5, tw, th);
      } else {
        // Fallback: simple canvas tree
        ctx.save();
        ctx.translate(t.x, t.y);
        const sz = t.big ? 8 : 5;
        // Trunk
        ctx.fillStyle = 'rgba(120, 80, 40, 0.6)';
        ctx.fillRect(-1, -sz, 2, sz);
        // Canopy
        ctx.fillStyle = 'rgba(60, 140, 60, 0.5)';
        ctx.beginPath();
        ctx.arc(0, -sz - sz * 0.6, sz * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function drawDistrict(ctx: CanvasRenderingContext2D, district: CityDistrict) {
    // 1. Ground tile
    drawDistrictGround(ctx, district);

    // 2. Back trees
    drawDistrictTrees(ctx, district, 'back');

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

    // 7. Front trees
    drawDistrictTrees(ctx, district, 'front');

    // 8. District label
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
    const isHovered = hoveredTargetRef.current?.kind === 'building' && hoveredTargetRef.current?.building.project.id === project.id;
    const bw = w * 0.9;
    const bh = h;

    ctx.save();
    ctx.translate(x, y);

    // Draw sprite
    const spriteKey = getBuildingSpriteKey(bh);
    const sprite = getSprite(spriteKey);
    if (sprite) {
      // The sprite is 64x64 with the building roughly centered.
      // Scale so the sprite height matches bh + some ground margin.
      const targetH = bh + bw / 4;
      const scale = targetH / (sprite.height * 0.85);
      const sw = sprite.width * scale;
      const sh = sprite.height * scale;
      ctx.drawImage(sprite, -sw / 2, -bh - sh * 0.15, sw, sh);
    } else {
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

    // Hover glow
    if (isHovered) {
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 2); ctx.lineTo(bw / 2 + 2, bw / 4 + 2); ctx.lineTo(bw / 2 + 2, bw / 4 - bh - 2);
      ctx.lineTo(0, -bh - 2); ctx.lineTo(-bw / 2 - 2, bw / 4 - bh - 2); ctx.lineTo(-bw / 2 - 2, bw / 4 + 2);
      ctx.closePath(); ctx.stroke();
    }

    ctx.restore();
  }

  // ─── Townhall (mairie) — sprite + traffic light + alerts ───

  function drawTownhall(ctx: CanvasRenderingContext2D, building: CityBuilding) {
    const { townhallPos, alertLevel, trafficLight, project } = building;
    const isHovered = hoveredTargetRef.current?.kind === 'townhall' && hoveredTargetRef.current?.building.project.id === project.id;
    const tw = TOWNHALL_W;
    const th = TOWNHALL_H;
    const covenantCount = project.covenants.length;

    ctx.save();
    ctx.translate(townhallPos.x, townhallPos.y);

    // Sprite or fallback
    const sprite = getSprite('townhall');
    if (sprite) {
      const targetH = th + tw / 4;
      const scale = targetH / (sprite.height * 0.7);
      const sw = sprite.width * scale;
      const sh = sprite.height * scale;
      ctx.drawImage(sprite, -sw / 2, -th - sh * 0.2, sw, sh);
    } else {
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

    if (isHovered) drawHoverOutline(ctx, tw, th);
    ctx.restore();
  }

  // ─── Shop (syndicate) — sprite-based ───

  function drawShop(ctx: CanvasRenderingContext2D, building: CityBuilding) {
    const { shopPos, syndicateSize, project } = building;
    const isHovered = hoveredTargetRef.current?.kind === 'shop' && hoveredTargetRef.current?.building.project.id === project.id;
    const lenderCount = project.lenders.length;
    const sizeConfig = SHOP_SIZES[syndicateSize];
    if (!sizeConfig) return;
    const { sw, sh } = sizeConfig;

    ctx.save();
    ctx.translate(shopPos.x, shopPos.y);

    // Sprite by size
    const spriteKey: SpriteKey = syndicateSize === 'mall' ? 'shop_lg' : syndicateSize === 'shop' ? 'shop_md' : 'shop_sm';
    const sprite = getSprite(spriteKey);
    if (sprite) {
      const targetH = sh + sw / 4;
      const scale = targetH / (sprite.height * 0.7);
      const sprW = sprite.width * scale;
      const sprH = sprite.height * scale;
      ctx.drawImage(sprite, -sprW / 2, -sh - sprH * 0.2, sprW, sprH);
    } else {
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

    if (isHovered) drawHoverOutline(ctx, sw, sh);
    ctx.restore();
  }

  // ─── Library (bibliothèque / dataroom) — sprite-based ───

  function drawLibrary(ctx: CanvasRenderingContext2D, building: CityBuilding) {
    const { libraryPos, librarySize, project } = building;
    const isHovered = hoveredTargetRef.current?.kind === 'library' && hoveredTargetRef.current?.building.project.id === project.id;
    const docCount = project.documents.length;
    const sizeConfig = LIBRARY_SIZES[librarySize];
    if (!sizeConfig) return;
    const { lw, lh } = sizeConfig;

    ctx.save();
    ctx.translate(libraryPos.x, libraryPos.y);

    // Sprite by size
    const spriteKey: SpriteKey = librarySize === 'large' ? 'library_lg' : librarySize === 'medium' ? 'library_md' : 'library_sm';
    const sprite = getSprite(spriteKey);
    if (sprite) {
      const targetH = lh + lw / 4;
      const scale = targetH / (sprite.height * 0.7);
      const sprW = sprite.width * scale;
      const sprH = sprite.height * scale;
      ctx.drawImage(sprite, -sprW / 2, -lh - sprH * 0.2, sprW, sprH);
    } else {
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

    if (isHovered) drawHoverOutline(ctx, lw, lh);
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

  function drawHoverOutline(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 2); ctx.lineTo(w / 2 + 2, w / 4 + 2); ctx.lineTo(w / 2 + 2, w / 4 - h - 2);
    ctx.lineTo(0, -h - 2); ctx.lineTo(-w / 2 - 2, w / 4 - h - 2); ctx.lineTo(-w / 2 - 2, w / 4 + 2);
    ctx.closePath(); ctx.stroke();
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

  // ─── Hit testing — check townhall, shop, then building ───

  function hitTestIsoBox(wx: number, wy: number, cx: number, cy: number, w: number, h: number): boolean {
    const dx = wx - cx;
    const dy = wy - cy;
    return dx > -w / 2 - 6 && dx < w / 2 + 6 && dy > -h - 8 && dy < w / 4 + 6;
  }

  function findTargetAt(clientX: number, clientY: number): ClickTarget | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const { x: wx, y: wy } = screenToWorld(clientX - rect.left, clientY - rect.top);

    for (const district of [...cityState.districts].reverse()) {
      for (const b of [...district.buildings].reverse()) {
        // Check shop first (front-most visually)
        if (b.syndicateSize !== 'none') {
          const sh = SHOP_SIZES[b.syndicateSize]?.sh ?? 14;
          const sw = SHOP_SIZES[b.syndicateSize]?.sw ?? 28;
          if (hitTestIsoBox(wx, wy, b.shopPos.x, b.shopPos.y, sw, sh)) {
            return { kind: 'shop', building: b };
          }
        } else if (hitTestIsoBox(wx, wy, b.shopPos.x, b.shopPos.y, EMPTY_LOT_W, EMPTY_LOT_H)) {
          return { kind: 'shop', building: b };
        }
        // Check townhall
        if (b.project.covenants.length > 0) {
          if (hitTestIsoBox(wx, wy, b.townhallPos.x, b.townhallPos.y, TOWNHALL_W, TOWNHALL_H)) {
            return { kind: 'townhall', building: b };
          }
        } else if (hitTestIsoBox(wx, wy, b.townhallPos.x, b.townhallPos.y, EMPTY_LOT_W, EMPTY_LOT_H)) {
          return { kind: 'townhall', building: b };
        }
        // Check main building
        const bw = b.width * 0.9;
        if (hitTestIsoBox(wx, wy, b.x, b.y, bw, b.height)) {
          return { kind: 'building', building: b };
        }
        // Check library (behind the building — tested last)
        if (b.project.documents.length > 0) {
          const lc = LIBRARY_SIZES[b.librarySize];
          if (lc && hitTestIsoBox(wx, wy, b.libraryPos.x, b.libraryPos.y, lc.lw, lc.lh)) {
            return { kind: 'library', building: b };
          }
        } else if (hitTestIsoBox(wx, wy, b.libraryPos.x, b.libraryPos.y, EMPTY_LOT_W, EMPTY_LOT_H)) {
          return { kind: 'library', building: b };
        }
      }
    }
    return null;
  }

  // ─── Event handlers ───

  function handleMouseDown(e: React.MouseEvent) {
    const target = findTargetAt(e.clientX, e.clientY);
    if (target) {
      // Click on a building — prepare for potential drag
      const sizeKey = target.kind === 'building'
        ? getBuildingSpriteKey(target.building.height)
        : target.kind === 'townhall' ? 'townhall'
        : target.kind === 'shop' ? (target.building.syndicateSize === 'mall' ? 'shop_mall' : target.building.syndicateSize === 'shop' ? 'shop_store' : 'shop_kiosk')
        : (target.building.librarySize === 'large' ? 'library_lg' : target.building.librarySize === 'medium' ? 'library_md' : 'library_sm');
      const size = STRUCTURE_SIZES[sizeKey] ?? [2, 2];
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
