import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { CityState, CityBuilding, ClickTarget, CellType } from '../types/portfolio';
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

// (STATE_OVERLAY removed — the polygon overlay was sized for the old iso-box
//  rendering and didn't match the new sprite footprints, leaving ghost shapes
//  on the ground next to draft/archived/finished buildings.)
// (TRAFFIC_LIGHT_COLORS removed — traffic-light dot dropped from townhalls)

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

// (EMPTY_LOT_W / EMPTY_LOT_H removed — empty-lot placeholders dropped)

/** Per-sprite rendering calibration — SOUTH-TIP anchor convention.
 *
 *  Calibré via /calibrate.html :
 *    1×1  → yOff: 0.50, xOff:  0.00  (grass, routes, trottoirs, building_xs)
 *    2×1  → yOff: 0.46, xOff: -0.24  (building_sm/md, shop_store, construction_2x1)
 *    2×2  → yOff: 0.43, xOff:  0.00  (building_lg/xl, townhall, shop_mall…)
 *  Nouveaux sprites (trees, deco, utilities) → à calibrer dans /calibrate.html
 */
const SPRITE_ANCHOR: Record<string, { baseRatio: number; yOff: number; xOff: number }> = {
  // ── Footprint 1×1 — calibrés ─────────────────────────────────────────────
  building_xs:      { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  shop_kiosk:       { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  construction_1x1: { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  tile_grass:       { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },  // ✅ calibré
  // Routes 1×1
  road_straight_1:  { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  road_straight_2:  { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  road_cross:       { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  road_turn_1:      { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  road_turn_2:      { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  road_turn_3:      { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  road_turn_4:      { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  road_t_1:         { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  road_t_2:         { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  road_t_3:         { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  road_t_4:         { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  road_end_1:       { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  road_end_2:       { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  road_end_3:       { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  road_end_4:       { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  // Trottoirs 1×1 (512×512 = même format tile_grass) — ✅ calibrés
  sidewalk_1:       { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  sidewalk_2:       { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  sidewalk_3:       { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  sidewalk_4:       { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  sidewalk_5:       { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  sidewalk_6:       { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  sidewalk_7:       { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  sidewalk_8:       { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  sidewalk_9:       { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  sidewalk_10:      { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  sidewalk_11:      { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  sidewalk_12:      { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  sidewalk_13:      { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  // Nature 1×1 ✅ calibré
  tree_palm:        { baseRatio: 1.970, yOff: -0.32, xOff:  0.00 },  // 152×224
  tree_3:           { baseRatio: 1.970, yOff: -0.32, xOff:  0.00 },  // 154×227
  tree_14:          { baseRatio: 1.970, yOff: -0.32, xOff:  0.00 },  // 154×224
  // ── Footprint 2×1 — calibrés ─────────────────────────────────────────────
  building_sm:      { baseRatio: 1.0, yOff: 0.46, xOff: -0.24 },  // ✅ calibré
  building_md:      { baseRatio: 1.0, yOff: 0.46, xOff: -0.24 },
  shop_store:       { baseRatio: 1.0, yOff: 0.46, xOff: -0.24 },
  construction_2x1: { baseRatio: 1.0, yOff: 0.46, xOff: -0.24 },
  // ── Footprint 2×1 ─────────────────────────────────────────────────────────
  carpark_sign:         { baseRatio: 1.000, yOff: 0.46, xOff: -0.25 },  // 768×1024 ✅ calibré
  // Utilitaires 2×1 ✅ calibrés
  bar:                  { baseRatio: 1.0, yOff: 0.50, xOff: -0.24 },
  post_office:          { baseRatio: 1.0, yOff: 0.50, xOff: -0.24 },
  recycling:            { baseRatio: 1.0, yOff: 0.50, xOff: -0.24 },
  gas_station:          { baseRatio: 1.0, yOff: 0.50, xOff: -0.24 },
  restaurant_breakfast: { baseRatio: 1.0, yOff: 0.50, xOff: -0.24 },
  restaurant_pizza:     { baseRatio: 1.0, yOff: 0.50, xOff: -0.24 },
  restaurant_ramen:     { baseRatio: 1.0, yOff: 0.50, xOff: -0.24 },
  restaurant_sandwich:  { baseRatio: 1.0, yOff: 0.50, xOff: -0.24 },
  restaurant_sushi:     { baseRatio: 1.0, yOff: 0.50, xOff: -0.24 },
  // Utilitaires 1×1 ✅ calibrés
  tele_tower:           { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  street_flowers:       { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  street_icecream:      { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  // ── Footprint 2×2 — calibrés ─────────────────────────────────────────────
  building_lg:      { baseRatio: 1.0, yOff: 0.43, xOff:  0.00 },
  building_xl:      { baseRatio: 1.0, yOff: 0.43, xOff:  0.00 },  // ✅ calibré
  townhall:         { baseRatio: 1.0, yOff: 0.43, xOff:  0.00 },
  shop_mall:        { baseRatio: 1.0, yOff: 0.43, xOff:  0.00 },
  library_md:       { baseRatio: 1.0, yOff: 0.43, xOff:  0.00 },
  construction_2x2: { baseRatio: 1.0, yOff: 0.43, xOff:  0.00 },
  park_fountain:    { baseRatio: 1.000, yOff: 0.46, xOff:  0.00 },  // 1024×768  ✅ calibré
  park_pond:        { baseRatio: 1.000, yOff: 0.46, xOff:  0.00 },  // 1024×1024 ✅ calibré
  carpark_gate:     { baseRatio: 1.000, yOff: 0.46, xOff:  0.00 },  // 1024×1024 ✅ calibré
  // Utilitaires 2×2 ✅ calibrés
  hospital:                  { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  fire_station:              { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  police_station:            { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  prison:                    { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  cinema:                    { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  museum:                    { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  stadium_athletics:         { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  stadium_football_american: { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  stadium_football_soccer:   { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  stadium_tennis:            { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  // ── Clôtures 1×1 (262×255) ✅ calibrés — rendu tile-center ────────────────
  picket_fence_1:   { baseRatio: 1.760, yOff: 0.00, xOff:  0.24 },
  picket_fence_2:   { baseRatio: 1.760, yOff: 0.00, xOff: -0.26 },
  // ── Legacy aliases (grids existantes) — redirects vers nouveaux sprites ───
  tree_sm:          { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  tree_lg:          { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  bush:             { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  ground:           { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  tile_concrete:    { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  tile_sidewalk:    { baseRatio: 1.0, yOff: 0.50, xOff:  0.00 },
  tile_sidewalk_flat: { baseRatio: 1.0, yOff: 0.50, xOff: 0.00 },
  park:             { baseRatio: 1.0, yOff: 0.43, xOff:  0.00 },
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
  // ── Buildings auto-générés (non plaçables par le joueur) ──────────────────
  building_xs:      '/sprites/buildings_default/building-xs.png',   // 512×1024  1×1
  building_sm:      '/sprites/buildings_default/building-sm.png',   // 768×1280  2×1
  building_md:      '/sprites/buildings_default/building-md.png',   // 768×1280  2×1
  building_lg:      '/sprites/buildings_default/building-lg.png',   // 1024×1280 2×2
  building_xl:      '/sprites/buildings_default/building-xl.png',   // 1024×1536 2×2
  townhall:         '/sprites/buildings_default/townhall.png',       // 1024×1280 2×2
  shop_kiosk:       '/sprites/buildings_default/shop-kiosk.png',    // 512×768   1×1
  shop_store:       '/sprites/buildings_default/shop-store.png',    // 768×1280  2×1
  shop_mall:        '/sprites/buildings_default/shop-mall.png',     // 1024×1280 2×2
  library_md:       '/sprites/buildings_default/library-md.png',    // 1024×1024 2×2
  construction_1x1: '/sprites/buildings_default/construction_1x1.png', // 512×512  1×1
  construction_2x1: '/sprites/buildings_default/construction_2x1.png', // 768×1024 2×1
  construction_2x2: '/sprites/buildings_default/construction_2x2.png', // 1024×1024 2×2
  crane:            '/sprites/buildings_default/crane.png',             // 304×517  overlay chantier
  // ── Sol ──────────────────────────────────────────────────────────────────
  tile_grass:       '/sprites/ground/tile-grass.png',               // 512×512  1×1 ✅ calibré
  // ── Routes (auto-tiling 16 variantes) ────────────────────────────────────
  road_straight_1:  '/sprites/roads/road-straight-1.png',
  road_straight_2:  '/sprites/roads/road-straight-2.png',
  road_cross:       '/sprites/roads/road-cross.png',
  road_turn_1:      '/sprites/roads/road-turn-1.png',
  road_turn_2:      '/sprites/roads/road-turn-2.png',
  road_turn_3:      '/sprites/roads/road-turn-3.png',
  road_turn_4:      '/sprites/roads/road-turn-4.png',
  road_t_1:         '/sprites/roads/road-t-1.png',
  road_t_2:         '/sprites/roads/road-t-2.png',
  road_t_3:         '/sprites/roads/road-t-3.png',
  road_t_4:         '/sprites/roads/road-t-4.png',
  road_end_1:       '/sprites/roads/road-end-1.png',  // road_end_w (fermé E)
  road_end_2:       '/sprites/roads/road-end-2.png',  // road_end_s (fermé N)
  road_end_3:       '/sprites/roads/road-end-3.png',  // road_end_e (fermé W)
  road_end_4:       '/sprites/roads/road-end-4.png',  // road_end_n (fermé S)
  // ── Trottoirs (13 variantes, plaçables) ──────────────────────────────────
  sidewalk_1:       '/sprites/sidewalks/Sidewalk_Tile1.png',
  sidewalk_2:       '/sprites/sidewalks/Sidewalk_Tile2.png',
  sidewalk_3:       '/sprites/sidewalks/Sidewalk_Tile3.png',
  sidewalk_4:       '/sprites/sidewalks/Sidewalk_Tile4.png',
  sidewalk_5:       '/sprites/sidewalks/Sidewalk_Tile5.png',
  sidewalk_6:       '/sprites/sidewalks/Sidewalk_Tile6.png',
  sidewalk_7:       '/sprites/sidewalks/Sidewalk_Tile7.png',
  sidewalk_8:       '/sprites/sidewalks/Sidewalk_Tile8.png',
  sidewalk_9:       '/sprites/sidewalks/Sidewalk_Tile9.png',
  sidewalk_10:      '/sprites/sidewalks/Sidewalk_Tile10.png',
  sidewalk_11:      '/sprites/sidewalks/Sidewalk_Tile11.png',
  sidewalk_12:      '/sprites/sidewalks/Sidewalk_Tile12.png',
  sidewalk_13:      '/sprites/sidewalks/Sidewalk_Tile13.png',
  // ── Nature ───────────────────────────────────────────────────────────────
  tree_palm:        '/sprites/nature/Palm3.png',                    // 152×224  1×1 à calibrer
  tree_3:           '/sprites/nature/Tree3.png',                    // 154×227  1×1 à calibrer
  tree_14:          '/sprites/nature/Tree14.png',                   // 154×224  1×1 à calibrer
  // ── Décorations ──────────────────────────────────────────────────────────
  park_fountain:    '/sprites/deco/Park_Fountain.png',              // 1024×768  2×2 à calibrer
  park_pond:        '/sprites/deco/Park_Pond.png',                  // 1024×1024 2×2 à calibrer
  // ── Utilitaires — Parking ────────────────────────────────────────────────
  carpark_sign:              '/sprites/utilities/Carpark_1x2_Sign.png',
  carpark_gate:              '/sprites/utilities/Carpark_Fancy_GateUp.png',
  // ── Utilitaires — Services ────────────────────────────────────────────────
  bar:                       '/sprites/utilities/Bar.png',
  hospital:                  '/sprites/utilities/Doctor_Hospital.png',
  post_office:               '/sprites/utilities/PostOffice.png',
  recycling:                 '/sprites/utilities/Recycling.png',
  gas_station:               '/sprites/utilities/GasStation.png',
  tele_tower:                '/sprites/utilities/TeleTower.png',
  // ── Utilitaires — Urgences ────────────────────────────────────────────────
  fire_station:              '/sprites/utilities/Emergency_FireStation.png',
  police_station:            '/sprites/utilities/Emergency_PoliceStation.png',
  prison:                    '/sprites/utilities/Emergency_Prison.png',
  // ── Utilitaires — Loisirs ─────────────────────────────────────────────────
  cinema:                    '/sprites/utilities/Leasure_Cinema.png',
  museum:                    '/sprites/utilities/Leasure_Museum.png',
  stadium_athletics:         '/sprites/utilities/Stadium_Athletics.png',
  stadium_football_american: '/sprites/utilities/Stadium_FootballAmerican.png',
  stadium_football_soccer:   '/sprites/utilities/Stadium_FootballSocker.png',
  stadium_tennis:            '/sprites/utilities/Stadium_Tennis.png',
  // ── Utilitaires — Restauration ────────────────────────────────────────────
  restaurant_breakfast:      '/sprites/utilities/Restaurant_Breakfast.png',
  restaurant_pizza:          '/sprites/utilities/Restaurant_Pizza.png',
  restaurant_ramen:          '/sprites/utilities/Restaurant_Ramen.png',
  restaurant_sandwich:       '/sprites/utilities/Restaurant_Sandwich.png',
  restaurant_sushi:          '/sprites/utilities/Restaurant_Sushi.png',
  street_flowers:            '/sprites/utilities/StreetStand_Flowers.png',
  street_icecream:           '/sprites/utilities/StreetStand_Icecream.png',
  // ── Clôtures (1×1 — 262×255px) ───────────────────────────────────────────
  picket_fence_1:   '/sprites/fences/PicketFence1.png',  // orientation NW-SE (top/bottom)
  picket_fence_2:   '/sprites/fences/PicketFence2.png',  // orientation NE-SW (left/right)
  // ── Legacy aliases (compatibilité grids existantes) ───────────────────────
  tree_sm:          '/sprites/nature/Tree3.png',
  tree_lg:          '/sprites/nature/Tree14.png',
  bush:             '/sprites/nature/Palm3.png',
  park:             '/sprites/deco/Park_Pond.png',
  ground:           '/sprites/ground/tile-grass.png',
  tile_concrete:    '/sprites/sidewalks/Sidewalk_Tile1.png',
  tile_sidewalk:    '/sprites/sidewalks/Sidewalk_Tile1.png',
  tile_sidewalk_flat: '/sprites/sidewalks/Sidewalk_Tile1.png',
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
  flip?: boolean;
}

interface Props {
  cityState: CityState;
  onTargetClick?: (target: ClickTarget) => void;
  onMoveStructure?: (entityId: string, structureType: string, toCol: number, toRow: number, width: number, height: number) => void;
  placementMode?: PlacementMode | null;
  onPlaceDecoration?: (col: number, row: number, projectId: string) => void;
  onRemoveDecoration?: (col: number, row: number) => void;
  /** Request to animate the camera onto a specific district.
   *  Bumping `ts` re-triggers the animation even if `projectId` is the same. */
  focusRequest?: { projectId: string; ts: number } | null;
}

const DRAG_THRESHOLD = 4;

/** Sidewalk cell types → sprite key mapping.
 *  Defined at module level so drawDecorations and drawUnifiedObjects can both reference it. */
const SIDEWALK_SPRITE_MAP: Partial<Record<CellType, SpriteKey>> = {
  sidewalk:    'tile_sidewalk_flat',
  sidewalk_1:  'sidewalk_1',  sidewalk_2:  'sidewalk_2',  sidewalk_3:  'sidewalk_3',
  sidewalk_4:  'sidewalk_4',  sidewalk_5:  'sidewalk_5',  sidewalk_6:  'sidewalk_6',
  sidewalk_7:  'sidewalk_7',  sidewalk_8:  'sidewalk_8',  sidewalk_9:  'sidewalk_9',
  sidewalk_10: 'sidewalk_10', sidewalk_11: 'sidewalk_11',
  sidewalk_12: 'sidewalk_12', sidewalk_13: 'sidewalk_13',
};

/** Map CellType to SpriteKey for decoration objects (Layer 3 — objects).
 *  Roads and sidewalks are NOT here — they're handled in the ground/overlay layers. */
const DECO_SPRITE_MAP: Partial<Record<CellType, SpriteKey>> = {
  // ── Nature ────────────────────────────────────────────────────────────────
  tree_palm:    'tree_palm',
  tree_3:       'tree_3',
  tree_14:      'tree_14',
  // ── Décorations ──────────────────────────────────────────────────────────
  park_fountain: 'park_fountain',
  park_pond:     'park_pond',
  // ── Utilitaires — Parking ─────────────────────────────────────────────────
  carpark_sign:  'carpark_sign',
  carpark_gate:  'carpark_gate',
  // ── Utilitaires — Services ────────────────────────────────────────────────
  bar:           'bar',
  hospital:      'hospital',
  post_office:   'post_office',
  recycling:     'recycling',
  gas_station:   'gas_station',
  tele_tower:    'tele_tower',
  // ── Utilitaires — Urgences ────────────────────────────────────────────────
  fire_station:   'fire_station',
  police_station: 'police_station',
  prison:         'prison',
  // ── Utilitaires — Loisirs ─────────────────────────────────────────────────
  cinema:                    'cinema',
  museum:                    'museum',
  stadium_athletics:         'stadium_athletics',
  stadium_football_american: 'stadium_football_american',
  stadium_football_soccer:   'stadium_football_soccer',
  stadium_tennis:            'stadium_tennis',
  // ── Utilitaires — Restauration ────────────────────────────────────────────
  restaurant_breakfast: 'restaurant_breakfast',
  restaurant_pizza:     'restaurant_pizza',
  restaurant_ramen:     'restaurant_ramen',
  restaurant_sandwich:  'restaurant_sandwich',
  restaurant_sushi:     'restaurant_sushi',
  street_flowers:       'street_flowers',
  street_icecream:      'street_icecream',
  // ── Clôtures ──────────────────────────────────────────────────────────────
  fence_1: 'picket_fence_1',
  fence_2: 'picket_fence_2',
  // ── Legacy aliases ────────────────────────────────────────────────────────
  tree_sm: 'tree_sm',
  tree_lg: 'tree_lg',
  park:    'park',
  bush:    'bush',
};

// ─── Render commands (perf optimisation) ─────────────────────────────────────
//
// Instead of scanning the entire grid (200×200) on every frame, we pre-compute
// a flat list of typed render commands once per cityState change. The render
// loop then just iterates and dispatches by `kind`. This:
//   • avoids per-frame closure allocation (no GC pressure)
//   • avoids re-scanning sparse arrays
//   • lets the painter's-algo sort run once instead of 60×/sec
// See drawStaticGround / drawStaticSidewalks / drawStaticObjects below.

type GroundCmd =
  | { kind: 'grass'; col: number; row: number }
  | { kind: 'road';  col: number; row: number; spriteKey: SpriteKey };

interface SidewalkCmd { col: number; row: number; spriteKey: SpriteKey }

type ObjectCmd =
  | { kind: 'deco';         x: number; y: number; spriteKey: SpriteKey; flip: boolean; sortY: number }
  | { kind: 'fence1';       x: number; y: number; sortY: number }
  | { kind: 'fence2';       x: number; y: number; sortY: number }
  | { kind: 'library';      building: CityBuilding; sortY: number }
  | { kind: 'townhall';     building: CityBuilding; sortY: number }
  | { kind: 'mainBuilding'; building: CityBuilding; sortY: number }
  | { kind: 'shop';         building: CityBuilding; sortY: number };

interface RenderScene {
  groundCmds:   GroundCmd[];
  sidewalkCmds: SidewalkCmd[];
  objectCmds:   ObjectCmd[];
}

export default function CityCanvas({ cityState, onTargetClick, onMoveStructure, placementMode, onPlaceDecoration, onRemoveDecoration, focusRequest }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
  // PERF — `forceRender` is intentionally retained for the sprite-load callback
  // (one-time on mount). Cursor changes no longer trigger React re-renders;
  // see updateCursor() below.
  const [, forceRender] = useState(0);
  const hoveredTargetRef = useRef<ClickTarget | null>(null);
  /** District being hovered (cursor inside its bounds, no specific structure under the pointer).
   *  Drives the hover-only district tooltip. Stays null while placementMode is active. */
  const hoveredDistrictRef = useRef<{ projectId: string } | null>(null);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, camX: 0, camY: 0, moved: false });
  const needsRedrawRef = useRef(true);
  const canvasSizeRef = useRef({ w: 0, h: 0 });
  const lastMoveTimeRef = useRef(0);
  const hoveredCellRef = useRef<{ col: number; row: number } | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  // Paint mode: continuous road placement while mouse button is held
  const paintedCellsRef = useRef(new Set<string>());

  /** Camera-focus + district-highlight animation state. Set by the focusRequest effect.
   *  Total duration = CAM_DUR (camera pan) + HIGHLIGHT_DUR (pulsing diamond outline). */
  const focusAnimRef = useRef<{
    projectId: string;
    startTs: number;
    fromCam: { x: number; y: number };
    toCam:   { x: number; y: number };
  } | null>(null);

  // Fix 3 — Pre-sort districts (memoized, not per-frame)
  const sortedDistricts = useMemo(
    () => [...cityState.districts].sort((a, b) => a.y - b.y),
    [cityState]
  );

  // (smoke/fire animation removed → no need for a continuous-redraw flag anymore)

  // ─── Pre-computed render scene (PERF) ──────────────────────────────────────
  // Built once per cityState change. The draw loop iterates these arrays
  // instead of re-scanning the 200×200 grid on every frame.
  const renderScene = useMemo<RenderScene>(() => {
    const grid = cityState.grid;
    const groundCmds:   GroundCmd[]   = [];
    const sidewalkCmds: SidewalkCmd[] = [];
    const objectCmds:   ObjectCmd[]   = [];

    // ── Ground (Layer 1) — only the bounding box of all districts ──
    if (grid.districts.length > 0) {
      let minCol = Infinity, minRow = Infinity, maxCol = -Infinity, maxRow = -Infinity;
      for (const d of grid.districts) {
        minCol = Math.min(minCol, d.col);
        minRow = Math.min(minRow, d.row);
        maxCol = Math.max(maxCol, d.col + d.size);
        maxRow = Math.max(maxRow, d.row + d.size);
      }
      for (let row = minRow; row < maxRow; row++) {
        for (let col = minCol; col < maxCol; col++) {
          const cell = grid.cells[row]?.[col];
          if (cell?.type === 'road') {
            groundCmds.push({ kind: 'road', col, row, spriteKey: getRoadSpriteKey(getRoadVariant(grid, col, row)) });
          } else {
            groundCmds.push({ kind: 'grass', col, row });
          }
        }
      }
      groundCmds.sort((a, b) => (a.row + a.col) - (b.row + b.col));
    }

    // ── One pass for sidewalks (Layer 2) + decos (Layer 3) ──
    for (let r = 0; r < grid.size; r++) {
      const rowCells = grid.cells[r];
      if (!rowCells) continue;
      for (let c = 0; c < grid.size; c++) {
        const cell = rowCells[c];
        if (!cell) continue;
        if (cell.type in SIDEWALK_SPRITE_MAP) {
          sidewalkCmds.push({ col: c, row: r, spriteKey: SIDEWALK_SPRITE_MAP[cell.type] ?? 'tile_sidewalk_flat' });
          continue;
        }
        if (
          DECORATION_TYPES.has(cell.type) &&
          cell.type !== 'road' &&
          cell.originCol == null &&
          cell.originRow == null
        ) {
          const spriteKey = DECO_SPRITE_MAP[cell.type];
          if (!spriteKey) continue;
          const rawSize = STRUCTURE_SIZES[cell.type] ?? [1, 1] as [number, number];
          const flip = cell.flip ?? false;
          const [fw, fh] = (flip && rawSize[0] !== rawSize[1]) ? [rawSize[1], rawSize[0]] : rawSize;
          const { x, y } = gridToScreen(c + fw - 0.5, r + fh - 0.5);
          objectCmds.push({ kind: 'deco', x, y, spriteKey, flip, sortY: y });
        }
      }
    }
    sidewalkCmds.sort((a, b) => (a.row + a.col) - (b.row + b.col));

    // ── Fences (Layer 4) ──
    if (grid.fenceOverlay) {
      for (let r = 0; r < grid.size; r++) {
        const overlayRow = grid.fenceOverlay[r];
        if (!overlayRow) continue;
        for (let c = 0; c < grid.size; c++) {
          const fence = overlayRow[c];
          if (!fence || (!fence.fence1_e && !fence.fence2_s)) continue;
          const { x, y } = gridToScreen(c + 0.5, r + 0.5);
          if (fence.fence1_e) objectCmds.push({ kind: 'fence1', x, y, sortY: y });
          if (fence.fence2_s) objectCmds.push({ kind: 'fence2', x, y, sortY: y + 0.5 });
        }
      }
    }

    // ── Buildings (Layer 5) ──
    for (const district of cityState.districts) {
      for (const building of district.buildings) {
        objectCmds.push({ kind: 'library',      building, sortY: building.libraryPos.y });
        objectCmds.push({ kind: 'townhall',     building, sortY: building.townhallPos.y });
        objectCmds.push({ kind: 'mainBuilding', building, sortY: building.y });
        objectCmds.push({ kind: 'shop',         building, sortY: building.shopPos.y });
      }
    }

    // Painter's algo: ascending screen Y → back-to-front
    objectCmds.sort((a, b) => a.sortY - b.sortY);

    return { groundCmds, sidewalkCmds, objectCmds };
  }, [cityState]);

  // Mark redraw needed when city state or placement mode changes
  useEffect(() => { needsRedrawRef.current = true; }, [cityState, placementMode]);

  // Load sprites on mount
  useEffect(() => { loadAllSprites().then(() => { needsRedrawRef.current = true; forceRender(n => n + 1); }); }, []);

  /** PERF — update the canvas cursor imperatively, skipping a React re-render.
   *  Called from mouse handlers when hover/drag state changes, and from the
   *  effect below when `placementMode` flips. */
  const updateCursor = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.cursor = placementMode
      ? (placementMode.eraser ? 'crosshair' : 'copy')
      : dragRef.current.active && dragRef.current.moved ? 'grabbing'
      : hoveredTargetRef.current ? 'pointer'
      : 'grab';
  }, [placementMode]);

  // Sync cursor whenever placementMode changes (mounting + prop updates)
  useEffect(() => { updateCursor(); }, [updateCursor]);

  // Camera focus on a specific district (triggered from CityHeader → DirectoryDrawer)
  useEffect(() => {
    if (!focusRequest) return;
    const district = cityState.grid.districts.find(d => d.projectId === focusRequest.projectId);
    if (!district) return;

    // Target world position = visual centre of the district diamond
    const center = gridToScreen(district.col + district.size / 2, district.row + district.size / 2);
    const cam = cameraRef.current;
    // We want this world point to land at the canvas anchor (width/2, height*0.35).
    // After scale by zoom, point lands at (width/2 + cam.x + center.x*zoom, …) →
    // setting cam.x = -center.x * zoom puts it back at width/2.
    const toCam = { x: -center.x * cam.zoom, y: -center.y * cam.zoom };

    focusAnimRef.current = {
      projectId: focusRequest.projectId,
      startTs: performance.now(),
      fromCam: { x: cam.x, y: cam.y },
      toCam,
    };

    const CAM_DUR = 400;       // ms — camera pan
    const HIGHLIGHT_DUR = 1500; // ms — pulsing diamond afterwards
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = () => {
      const anim = focusAnimRef.current;
      if (!anim) return;
      const elapsed = performance.now() - anim.startTs;
      // Phase 1: camera lerp
      if (elapsed < CAM_DUR) {
        const e = easeOutCubic(elapsed / CAM_DUR);
        cameraRef.current.x = anim.fromCam.x + (anim.toCam.x - anim.fromCam.x) * e;
        cameraRef.current.y = anim.fromCam.y + (anim.toCam.y - anim.fromCam.y) * e;
      } else {
        cameraRef.current.x = anim.toCam.x;
        cameraRef.current.y = anim.toCam.y;
      }
      needsRedrawRef.current = true;
      // Phase 2: keep alive for highlight pulse
      if (elapsed < CAM_DUR + HIGHLIGHT_DUR) {
        requestAnimationFrame(tick);
      } else {
        focusAnimRef.current = null;
        needsRedrawRef.current = true;
      }
    };
    requestAnimationFrame(tick);
  }, [focusRequest, cityState.grid.districts]);


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

    // Layer 1 — Ground (grass + roads) + hover highlights
    drawGrid(ctx, cityState.grid);

    // Layer 2 — Sidewalk overlay (flat, on top of ground, below all objects)
    drawDecorations(ctx, cityState.grid);

    // Layers 3-5 — Unified depth-sorted pass: decos + fences + buildings
    drawUnifiedObjects(ctx, cityState.grid);

    // Ghost / eraser preview (always on top of scene objects)
    drawGhostAndEraser(ctx, cityState.grid);

    // Permanent district labels removed (Lot 4) — replaced by hover-only tooltips below.

    // Focus highlight (pulsing diamond outline around the focused district)
    drawFocusHighlight(ctx);

    // Tooltip — structure tooltip takes priority over district tooltip.
    // District tooltip is also suppressed in placement mode to avoid noise during construction.
    const hovered = hoveredTargetRef.current;
    if (hovered) {
      drawTooltip(ctx, hovered);
    } else if (!placementMode && hoveredDistrictRef.current) {
      drawDistrictTooltip(ctx, hoveredDistrictRef.current);
    }

    ctx.restore();
    // HUD intentionally removed — all of it (title, legend, weather) lives in <CityHeader/>
  }, [cityState, sortedDistricts, placementMode]);

  /** Pulsing diamond outline drawn around the focused district while the focus
   *  animation is running. Phase-aware: camera pan = no pulse, highlight = pulse. */
  function drawFocusHighlight(ctx: CanvasRenderingContext2D) {
    const anim = focusAnimRef.current;
    if (!anim) return;
    const district = cityState.grid.districts.find(d => d.projectId === anim.projectId);
    if (!district) return;

    const elapsed = performance.now() - anim.startTs;
    const CAM_DUR = 400;
    const HIGHLIGHT_DUR = 1500;
    if (elapsed > CAM_DUR + HIGHLIGHT_DUR) return;
    // After camera pan, fade out from full opacity to 0 with a sine pulse on top
    const tHL = Math.max(0, elapsed - CAM_DUR) / HIGHLIGHT_DUR; // 0..1
    const baseFade = 1 - tHL;                 // linear fade
    const pulse = 0.5 + 0.5 * Math.sin(elapsed / 90); // 0..1
    const alpha = baseFade * (0.55 + 0.35 * pulse);

    const { col, row, size } = district;
    // Iso diamond corners of an N×N block at (col, row)
    const tw = ISO_TILE_W, th = ISO_TILE_H;
    const nTip = gridToScreen(col, row);                       nTip.y -= th / 2;
    const eTip = gridToScreen(col + size - 1, row);            eTip.x += tw / 2;
    const sTip = gridToScreen(col + size - 1, row + size - 1); sTip.y += th / 2;
    const wTip = gridToScreen(col, row + size - 1);            wTip.x -= tw / 2;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(nTip.x, nTip.y);
    ctx.lineTo(eTip.x, eTip.y);
    ctx.lineTo(sTip.x, sTip.y);
    ctx.lineTo(wTip.x, wTip.y);
    ctx.closePath();
    ctx.strokeStyle = `rgba(106, 176, 240, ${alpha})`;
    ctx.lineWidth = 4;
    ctx.shadowColor = `rgba(106, 176, 240, ${alpha * 0.8})`;
    ctx.shadowBlur = 16;
    ctx.stroke();
    ctx.restore();
  }

  function drawGrid(ctx: CanvasRenderingContext2D, grid: import('../types/portfolio').GridState) {
    const hCell = hoveredCellRef.current;
    const tw = ISO_TILE_W;
    const th = ISO_TILE_H;
    const drag = dragStateRef.current;

    if (grid.districts.length === 0) return;

    // ── Layer 1: Ground — iterate pre-computed renderScene.groundCmds ──
    // (the bounding-box scan + sort happens once in useMemo, not per frame)
    for (const cmd of renderScene.groundCmds) {
      const { x: tx, y: ty } = gridToScreen(cmd.col + 0.5, cmd.row + 0.5);
      ctx.save();
      ctx.translate(tx, ty);
      const spriteKey: SpriteKey = cmd.kind === 'road' ? cmd.spriteKey : 'tile_grass';
      if (!drawSpriteOnGrid(ctx, spriteKey)) {
        const fill = cmd.kind === 'road' ? 'rgba(80,80,100,0.6)' : 'rgba(90,160,60,0.3)';
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

  /** Layer 2 — Sidewalk overlay only.
   *  Iterates the pre-computed renderScene.sidewalkCmds (no per-frame grid scan). */
  function drawDecorations(ctx: CanvasRenderingContext2D, _grid: import('../types/portfolio').GridState) {
    for (const cmd of renderScene.sidewalkCmds) {
      const { x, y } = gridToScreen(cmd.col + 0.5, cmd.row + 0.5);
      ctx.save();
      ctx.translate(x, y);
      drawSpriteOnGrid(ctx, cmd.spriteKey);
      ctx.restore();
    }
  }

  /** Layers 3-5 — Unified depth-sorted pass.
   *
   *  Iterates the pre-computed and pre-sorted renderScene.objectCmds list and dispatches
   *  by `kind`. The list is built once per cityState change (in useMemo above) so the
   *  per-frame cost is just the dispatch loop — no closures, no allocations, no scan.
   */
  function drawUnifiedObjects(ctx: CanvasRenderingContext2D, _grid: import('../types/portfolio').GridState) {
    for (const cmd of renderScene.objectCmds) {
      switch (cmd.kind) {
        case 'deco':
          ctx.save(); ctx.translate(cmd.x, cmd.y);
          drawSpriteOnGrid(ctx, cmd.spriteKey, cmd.flip);
          ctx.restore();
          break;
        case 'fence1':
          ctx.save(); ctx.translate(cmd.x, cmd.y);
          drawSpriteOnGrid(ctx, 'picket_fence_1');
          ctx.restore();
          break;
        case 'fence2':
          ctx.save(); ctx.translate(cmd.x, cmd.y);
          drawSpriteOnGrid(ctx, 'picket_fence_2');
          ctx.restore();
          break;
        // Sub-structures are drawn ONLY when they have content (covenants/docs/lenders).
        // Empty placeholders (construction sprites) were dropped entirely — they looked
        // like stale stubs regardless of deal status. The user will use the contextual
        // panels to discover where to add docs / covenants / lenders.
        case 'library':
          if (cmd.building.project.documents.length > 0) drawLibrary(ctx, cmd.building);
          break;
        case 'townhall':
          if (cmd.building.project.covenants.length > 0) drawTownhall(ctx, cmd.building);
          break;
        case 'mainBuilding':
          drawBuilding(ctx, cmd.building);
          break;
        case 'shop':
          // Skip the kiosk sprite (1-2 lenders) — it visually reads as a placeholder
          // due to its sandwich-board look. We only draw a shop for 3+ lenders, where
          // the shop_store / shop_mall sprites actually look like real buildings.
          if (cmd.building.syndicateSize === 'shop' || cmd.building.syndicateSize === 'mall') {
            drawShop(ctx, cmd.building);
          }
          break;
      }
    }
  }

  /** Ghost preview + eraser highlight — drawn on top of all scene objects. */
  function drawGhostAndEraser(ctx: CanvasRenderingContext2D, grid: import('../types/portfolio').GridState) {
    const hCell = hoveredCellRef.current;
    const tw = ISO_TILE_W;
    const th = ISO_TILE_H;

    // Ghost preview for placement mode
    if (placementMode && !placementMode.eraser && hCell) {
      const ghostFlip = placementMode.flip ?? false;
      const rawGhostSize = STRUCTURE_SIZES[placementMode.deco] ?? [1, 1] as [number, number];
      const [pw, ph] = (ghostFlip && rawGhostSize[0] !== rawGhostSize[1])
        ? [rawGhostSize[1], rawGhostSize[0]]
        : rawGhostSize;
      const gc = hCell.col - Math.floor(pw / 2);
      const gr = hCell.row - Math.floor(ph / 2);
      const district = getDistrictAt(grid, hCell.col, hCell.row);
      const fitsDistrict = district ? fitsInDistrict(district, gc, gr, pw, ph) : true;
      const valid = placementMode.deco === 'road'
        ? canPlace(grid, gc, gr, pw, ph)
        : fitsDistrict && canPlace(grid, gc, gr, pw, ph);

      const ghostSpriteKey: SpriteKey | undefined = placementMode.deco === 'road'
        ? 'road_straight_2'
        : DECO_SPRITE_MAP[placementMode.deco];

      if (ghostSpriteKey) {
        const { x, y } = gridToScreen(gc + pw - 0.5, gr + ph - 0.5);
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.translate(x, y);
        drawSpriteOnGrid(ctx, ghostSpriteKey, ghostFlip);
        ctx.restore();
      }

      for (let dc = gc; dc < gc + pw; dc++) {
        for (let dr = gr; dr < gr + ph; dr++) {
          const { x, y } = gridToScreen(dc, dr);
          ctx.beginPath();
          ctx.moveTo(x, y - th / 2); ctx.lineTo(x + tw / 2, y);
          ctx.lineTo(x, y + th / 2); ctx.lineTo(x - tw / 2, y);
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
          const rawOriginSize = STRUCTURE_SIZES[origin.type] ?? [1, 1] as [number, number];
          const [fw, fh] = (origin.flip && rawOriginSize[0] !== rawOriginSize[1])
            ? [rawOriginSize[1], rawOriginSize[0]]
            : rawOriginSize;
          for (let dc = oc; dc < oc + fw; dc++) {
            for (let dr = or_; dr < or_ + fh; dr++) {
              const { x, y } = gridToScreen(dc, dr);
              ctx.beginPath();
              ctx.moveTo(x, y - th / 2); ctx.lineTo(x + tw / 2, y);
              ctx.lineTo(x, y + th / 2); ctx.lineTo(x - tw / 2, y);
              ctx.closePath();
              ctx.fillStyle = 'rgba(255, 80, 80, 0.3)'; ctx.fill();
              ctx.strokeStyle = 'rgba(255, 80, 80, 0.6)'; ctx.lineWidth = 1; ctx.stroke();
            }
          }
        }
      }
    }
  }

  /** Hover-only district tooltip (Lot 4) — replaces the previous always-on label.
   *  Renders a rich card above the district's main building with the deal title,
   *  borrower, amount, covenant + tranche + lender counts, and a breach badge.
   *  Suppressed while in placement mode (handled by the caller). */
  function drawDistrictTooltip(ctx: CanvasRenderingContext2D, hovered: { projectId: string }) {
    const district = cityState.districts.find(d => d.buildings[0]?.project.id === hovered.projectId);
    if (!district) return;
    const b = district.buildings[0];
    if (!b) return;

    const project = b.project;
    const breached = project.covenants.some(c => c.terms.some(t => t.currentStatus === 'breached'));
    const totalTerms = project.covenants.reduce((s, c) => s + c.terms.length, 0);

    const title = truncate(project.title, 32);
    const subtitle = `${district.borrower.corporateName} · ${formatMoney(project.globalFundingAmount.amount)}`;
    const meta = [
      `${project.tranches.length} tranche${project.tranches.length > 1 ? 's' : ''}`,
      `${project.lenders.length} lender${project.lenders.length > 1 ? 's' : ''}`,
      `${project.covenants.length} covenant${project.covenants.length > 1 ? 's' : ''} · ${totalTerms} term${totalTerms > 1 ? 's' : ''}`,
    ];

    // Position above the main building (south-tip y - height - margin)
    const tx = b.x;
    const ty = b.y - b.height - 32;

    ctx.save();
    ctx.font = '700 13px Quicksand, system-ui, sans-serif';
    const titleW = ctx.measureText(title + (breached ? '   ⚠️' : '')).width;
    ctx.font = '500 11px Quicksand, system-ui, sans-serif';
    const subW = ctx.measureText(subtitle).width;
    const metaW = Math.max(...meta.map(m => ctx.measureText(m).width));
    const innerW = Math.max(titleW, subW, metaW);
    const padX = 14, padY = 12;
    const rowH = 16;
    const titleH = 18;
    const totalH = titleH + 4 + rowH + 8 + meta.length * rowH + padY * 2;
    const tooltipW = innerW + padX * 2;
    const left = tx - tooltipW / 2;
    const top = ty - totalH;

    // Card background — warm dark, rounded, soft shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = 'rgba(28, 22, 18, 0.96)';
    ctx.beginPath();
    ctx.roundRect(left, top, tooltipW, totalH, 12);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Hairline border
    ctx.strokeStyle = 'rgba(255, 235, 200, 0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(left + 0.5, top + 0.5, tooltipW - 1, totalH - 1, 12);
    ctx.stroke();

    // Pointer arrow
    ctx.fillStyle = 'rgba(28, 22, 18, 0.96)';
    ctx.beginPath();
    ctx.moveTo(tx - 6, top + totalH);
    ctx.lineTo(tx, top + totalH + 6);
    ctx.lineTo(tx + 6, top + totalH);
    ctx.closePath();
    ctx.fill();

    // Title row
    let cy = top + padY + 4;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#F5EFE5';
    ctx.font = '700 13px Quicksand, system-ui, sans-serif';
    ctx.fillText(title, left + padX, cy + 12);
    if (breached) {
      ctx.font = '500 12px Quicksand, system-ui, sans-serif';
      ctx.fillStyle = '#FF7461';
      ctx.fillText('⚠️', left + padX + ctx.measureText(title).width + 8, cy + 12);
    }
    cy += titleH + 4;

    // Subtitle (borrower + amount)
    ctx.fillStyle = '#B8AC9A';
    ctx.font = '600 11px Quicksand, system-ui, sans-serif';
    ctx.fillText(subtitle, left + padX, cy + 11);
    cy += rowH + 8;

    // Meta lines
    ctx.font = '500 11px Quicksand, system-ui, sans-serif';
    ctx.fillStyle = '#7A6F5F';
    for (const line of meta) {
      ctx.fillText(line, left + padX, cy + 11);
      cy += rowH;
    }

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

    // (Removed) — the previous STATE_OVERLAY polygon was sized for the old
    // iso-box rendering (`bw=72`, `bh=funding-derived`) and no longer matched the
    // sprite footprint, leaving a coloured "ghost footprint" on the ground next
    // to draft / archived / finished buildings. It was broken AND it was the
    // residue the user kept seeing. Dropped entirely; the crane below remains
    // for draft state, and archived / finished buildings just keep their normal
    // sprite (status is conveyed in the Annuaire and contextual panels).

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

  // ─── Townhall (mairie) — sprite + covenant count badge ───

  function drawTownhall(ctx: CanvasRenderingContext2D, building: CityBuilding) {
    const { townhallPos, project } = building;

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

    // Traffic light + smoke/fire animation removed.
    // The alert state remains visible via the ⚠️ marker in the Annuaire and via
    // the WeatherDrawer (deals en alerte). The trafficLight data field is still
    // computed in utils.ts in case we want to repurpose it later.

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
   *    yOff=0.5 → cube bottom sits ISO_TILE_H/2 = 19px below south tip (matches tile_grass).
   *
   *  flip: horizontal mirror. Uses ctx.scale(-1,1) + negated xOff to keep the
   *    sprite visually centred on the same anchor point. */
  function drawSpriteOnGrid(ctx: CanvasRenderingContext2D, spriteKey: SpriteKey, flip = false) {
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
    const dy = -sh + ISO_TILE_H * anchor.yOff;
    if (flip) {
      // Mirror horizontally: ctx.scale(-1,1) flips the x-axis, so +xOff in draw coords
      // becomes -xOff in screen space — which auto-inverts the offset correctly.
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, -sw / 2 + ISO_TILE_W * anchor.xOff, dy, sw, sh);
    } else {
      ctx.drawImage(sprite, -sw / 2 + ISO_TILE_W * anchor.xOff, dy, sw, sh);
    }
    return true;
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

  // drawHUD removed \u2014 title, legend, and weather icon are now rendered by <CityHeader/> in React.

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
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) {
        drag.moved = true;
        updateCursor(); // becomes 'grabbing' once a real drag starts
      }
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
        // Imperative cursor update — no React re-render needed.
        updateCursor();
      }
      // Track hovered grid cell + hovered district (for the hover-only district tooltip)
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const cam = cameraRef.current;
        const wx = (e.clientX - rect.left - rect.width / 2 - cam.x) / cam.zoom;
        const wy = (e.clientY - rect.top - rect.height * 0.35 - cam.y) / cam.zoom;
        const cell = screenToGrid(wx, wy);
        const prevCell = hoveredCellRef.current;
        const inGrid = cell.col >= 0 && cell.col < GRID_SIZE && cell.row >= 0 && cell.row < GRID_SIZE;
        if (!prevCell || prevCell.col !== cell.col || prevCell.row !== cell.row) {
          hoveredCellRef.current = inGrid ? cell : null;
          needsRedrawRef.current = true;
        }
        // District hover — only when not in placement mode (suppressed during construction).
        const newDistrict = (!placementMode && inGrid)
          ? getDistrictAt(cityState.grid, cell.col, cell.row)
          : null;
        const prevDistrictId = hoveredDistrictRef.current?.projectId ?? null;
        const newDistrictId = newDistrict?.projectId ?? null;
        if (prevDistrictId !== newDistrictId) {
          hoveredDistrictRef.current = newDistrict ? { projectId: newDistrict.projectId } : null;
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
            const clickFlip = placementMode.flip ?? false;
            const rawClickSize = STRUCTURE_SIZES[placementMode.deco] ?? [1, 1] as [number, number];
            // Apply same flip permutation as the ghost preview (2×1 → 1×2)
            const [pw, ph] = (clickFlip && rawClickSize[0] !== rawClickSize[1])
              ? [rawClickSize[1], rawClickSize[0]]
              : rawClickSize;
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
    updateCursor();
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

  // ─── Stable rAF loop (PERF) ───
  //
  // The canvas is event-driven: it only redraws when something explicitly sets
  // `needsRedrawRef.current = true` (user action, state change, focus tick, …).
  // When idle, rAF keeps running but skips the draw entirely — near-zero CPU.
  //
  // The `draw` callback's identity changes whenever cityState / sortedDistricts /
  // placementMode change. To avoid tearing down the rAF loop on every dispatch,
  // we keep `draw` in a ref and read from it inside `render()`. The effect now
  // mounts ONCE per CityCanvas lifetime.
  const drawRef = useRef(draw);
  useEffect(() => { drawRef.current = draw; }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    let id: number;

    function render() {
      if (needsRedrawRef.current) {
        const dpr = window.devicePixelRatio || 1;
        const { w, h } = canvasSizeRef.current;
        ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawRef.current(ctx!, w, h);
        needsRedrawRef.current = false;
      }
      id = requestAnimationFrame(render);
    }
    needsRedrawRef.current = true;
    render();
    return () => cancelAnimationFrame(id);
  }, []);

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

  // Cursor is now set imperatively in updateCursor() — no JSX cursor style needed.
  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { dragRef.current = { ...dragRef.current, active: false }; hoveredTargetRef.current = null; hoveredDistrictRef.current = null; needsRedrawRef.current = true; updateCursor(); }}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
    />
  );
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '\u2026' : s;
}
