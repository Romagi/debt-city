# Debt City — Référence Système de Grille ISO

> Mis à jour à chaque changement du système de rendu.
> Lire CE fichier en priorité avant de toucher CityCanvas.tsx.

---

## 1. Constantes fondamentales

```
ISO_TILE_W = 64   // largeur du diamant iso (px écran)
ISO_TILE_H = 38   // hauteur du diamant iso (px écran) — ~30.5° dimetric (NON 2:1)
                  // Mesuré sur tile-grass.png : face supérieure = 60.17% de 64px = 38.5px ✓
GRID_SIZE  = 20   // taille de la grille (cellules)
```

> **Attention** : ISO_TILE_H = 38, pas 32. La librairie d'assets utilise la projection 30.5° dimetric.
> `gridToScreen` donne `y = (col+row) * 19` (ISO_TILE_H/2 = 19, pas 16).

---

## 2. Projection iso — gridToScreen

```typescript
// src/types/portfolio.ts
gridToScreen(col, row) = { x: (col - row) * 32, y: (col + row) * 16 }
```

### Points clés d'une cellule (col, row)

| Point | x | y |
|---|---|---|
| Centre | `(col-row)*32` | `(col+row)*19` |
| Pointe Nord | `(col-row)*32` | `(col+row)*19 - 19` |
| Pointe Sud | `(col-row)*32` | `(col+row)*19 + 19` |
| Pointe Est | `(col-row)*32 + 32` | `(col+row)*19` |
| Pointe Ouest | `(col-row)*32 - 32` | `(col+row)*19` |
| South tip (= gridToScreen(col+0.5, row+0.5)) | `(col-row)*32` | `(col+row+1)*19` |

### Voisinage

| Voisin | Delta centre |
|---|---|
| col+1 (droite écran) | `(+32, +19)` |
| row+1 (gauche écran) | `(-32, +19)` |
| col-1 | `(-32, -19)` |
| row-1 | `(+32, -19)` |

### South tip d'une empreinte N×N au coin (col, row)

```
gridToScreen(col + N - 0.5, row + N - 0.5)
```

---

## 3. Système de sprites — drawSpriteOnGrid

### Formule d'affichage

Le contexte canvas est **pré-translaté** à l'anchor point avant d'appeler `drawSpriteOnGrid`.

```typescript
// drawSpriteOnGrid place le sprite à :
dx = -sw/2 + ISO_TILE_W * xOff    // centré horizontalement
dy = -sh + ISO_TILE_H * yOff      // vertical : yOff contrôle le calage

// → sprite occupe [anchor+dx .. anchor+dx+sw] × [anchor+dy .. anchor+dy+sh]
// → sprite BOTTOM = anchor_y + ISO_TILE_H * yOff
```

### SPRITE_ANCHOR — table complète (état actuel)

**Convention universelle : SOUTH-TIP** = `gridToScreen(col + N - 0.5, row + M - 0.5)` pour footprint N×M

Scale invariant lib : `scale = 0.125` pour tous les sprites lib, quelle que soit la taille.

| Sprite | PNG | Footprint | baseRatio | yOff | Anchor | Notes |
|---|---|---|---|---|---|---|
| `tile_grass` | 512×512 | 1×1 | 1.0 | **0.5** | South-tip | ✅ calibré Figma |
| `building_xs` | 512×1024 | 1×1 | 1.0 | 0.5 | South-tip | lib, à calibrer visuellement |
| `building_sm` | 768×1280 | 2×1 | 1.0 | 0.5 | South-tip | lib |
| `building_md` | 768×1280 | 2×1 | 1.0 | 0.5 | South-tip | lib |
| `building_lg` | 1024×1280 | 2×2 | 1.0 | 0.5 | South-tip | lib |
| `building_xl` | 1024×1536 | 2×2 | 1.0 | 0.5 | South-tip | lib |
| `townhall` | 1024×1280 | 2×2 | 1.0 | 0.5 | South-tip | lib |
| `shop_kiosk` | 512×768 | 1×1 | 1.0 | 0.5 | South-tip | lib |
| `shop_store` | 768×1280 | 2×1 | 1.0 | 0.5 | South-tip | lib |
| `shop_mall` | 1024×1280 | 2×2 | 1.0 | 0.5 | South-tip | lib |
| `library_md` | 1024×1024 | 2×2 | 1.0 | 0.5 | South-tip | lib, modèle unique |
| `construction_1x1` | 512×512 | 1×1 | 1.0 | 0.5 | South-tip | lib |
| `construction_2x1` | 768×1024 | 2×1 | 1.0 | 0.5 | South-tip | lib |
| `construction_2x2` | 1024×1024 | 2×2 | 1.0 | 0.5 | South-tip | lib |
| `road_straight_1` | 2048×2048 | 1×1 | 0.1875 | 0.56 | South-tip | Legacy |
| `road_straight_2` | 2048×2048 | 1×1 | 0.1875 | 0.56 | South-tip | Legacy |
| `road_cross` | 2048×2048 | 1×1 | 0.1875 | 0.56 | South-tip | Legacy |
| `road_turn` | 2048×2048 | 1×1 | 0.1875 | 0.56 | South-tip | Legacy |
| `tile_sidewalk_flat` | 2048×2048 | 1×1 | 0.1875 | 0.56 | South-tip | Placeholder (tile-concrete) |
| `tree_sm/lg` | 2048×2048 | 1×1 | 0.1875 | 0.56 | South-tip | Legacy |
| `bush` | 2048×2048 | 1×1 | 0.1875 | 0.56 | South-tip | Legacy |
| `park` | 2048×2048 | 2×2 | 0.375 | 1.56 | South-tip | Legacy |

### Calcul de scale

```
footprintW = (footCols + footRows) * (ISO_TILE_W / 2)   // ← formule correcte N×M
baseW      = sprite.width * baseRatio
scale      = footprintW / baseW
sw         = sprite.width  * scale
sh         = sprite.height * scale

// Pour lib sprites (baseRatio=1.0) :
// scale = (footCols+footRows)*32 / sprite.width = 0.125 (invariant)
```

### Calibration tile_grass (512×512) — mesures Figma

```
PNG 512×512, scale = 0.125 → sprite 64×64px écran

N tip  = 11.13% × 64 = 7.12px depuis sprite top
S tip  = 71.3%  × 64 = 45.6px depuis sprite top
Face   = 38.5px = ISO_TILE_H ✓ (38)
Cube   = 28.7%  × 64 = 18.4px ≈ ISO_TILE_H/2 = 19px ✓

South-tip anchor (y = center_y + 19), yOff=0.5 :
  dy = -64 + 38*0.5 = -45
  sprite top = south_tip - 45 = center_y - 26
  N tip @7.12px = center_y - 26 + 7.12 = center_y - 18.9 ≈ iso N tip (center_y - 19) ✓
  S tip @45.6px = center_y - 26 + 45.6 = center_y + 19.6 ≈ iso S tip (center_y + 19) ✓
  cube bottom   = south_tip + ISO_TILE_H*0.5 = iso_south + 19px ✓
```

Convention actuelle dans le code : **South-tip** pour la couche Ground (Layer 1).

---

## 4. Architecture 3 couches

```
drawScene()
├── drawGrid()          → Layer 1 (Ground) + Layer 2 (Hover overlays)
└── drawDecorations()   → Layer 2 (Sidewalk overlay) + Layer 3 (Objects)
```

### Layer 1 — Ground (dans drawGrid)

```typescript
const { x, y } = gridToScreen(col + 0.5, row + 0.5)   // South-tip anchor
ctx.translate(x, y)
// → tile_grass partout
// → road_* sur les cellules road (auto-tiling)
```

**Tri** : `allCells.sort((a,b) => (a.row+a.col) - (b.row+b.col))` — painter's algo

### Layer 2 — Hover/Ghost (dans drawGrid)

Diamants colorés overlay : drag ghost, hover structure, hovered cell.

`drawTileHighlight` utilise l'anchor **Centre** (`gridToScreen(col, row)`).

### Layer 2 — Sidewalk (dans drawDecorations)

```typescript
anchor = gridToScreen(col+0.5, row+0.5)   // South-tip
ctx.translate(anchor.x, anchor.y)
drawSpriteOnGrid(ctx, 'tile_sidewalk_flat')
```

### Layer 3 — Objects (dans drawDecorations)

```typescript
anchor = gridToScreen(col + fw/2, row + fh/2)   // Centre de l'empreinte
ctx.translate(anchor.x, anchor.y)
drawSpriteOnGrid(ctx, spriteKey)
```

**Ghost placement** : sprite à `globalAlpha=0.6` + outline diamant vert/rouge.

---

## 5. Road Auto-Tiling

**Fichier** : `src/city/roadAutoTile.ts`

```
Bitmask 4 bits : N=8, E=4, S=2, W=1
isRoad(col,row-1) → bit N  /  isRoad(col+1,row) → bit E  /  etc.
```

### 16 variants → sprite mapping (getRoadSpriteKey)

| Variants | Sprite utilisé |
|---|---|
| `road_straight_ns`, ends, isolated | `road_straight_1` |
| `road_straight_ew` | `road_straight_2` |
| `road_cross`, `road_t_*` | `road_cross` |
| `road_turn_*` | `road_turn` |

**Retiling** : 5 cellules (croix) à recalculer après placement/suppression.

---

## 6. Sprites en attente (librairie new)

| Sprite | Fichier attendu | Footprint | baseRatio | yOff à calibrer |
|---|---|---|---|---|
| Maison | `house.png` | **2×1** (2 cols, 1 row) | 1.0 | Mesurer S_tip% dans Figma → `cube_px/38` |
| Route lib | `road-*.png` | 1×1 | 1.0 | Mesurer → probablement ~0 (tile plate) |
| Sidewalk plat | `sidewalk-flat.png` | 1×1 | 1.0 | ~0 (pas de cube depth) |
| Arbre lib | `tree-new.png` | 1×1 | 1.0 | Mesurer |

### Règle de calibration pour sprites 512×512 (format lib) — convention SOUTH-TIP

```
baseRatio = 1.0  (le diamant remplit la largeur du PNG)
scale     = ISO_TILE_W / sprite.width = 64/512 = 0.125
sw = sh   = 64  (sprite carré)

Mesurer dans Figma (en % du PNG) :
  N_tip_pct  = % depuis le haut où se trouve la pointe nord de la face supérieure
  S_tip_pct  = % depuis le haut où se trouve la pointe sud de la face supérieure
  cube_depth = 100% - S_tip_pct (partie cube sous la surface)

Calcul yOff (south-tip anchor) :
  N_tip_px  = N_tip_pct × 64  (en px écran)
  S_tip_px  = S_tip_pct × 64
  face_h    = S_tip_px - N_tip_px  → doit ≈ ISO_TILE_H (38px)
  cube_px   = (100 - S_tip_pct) × 64  → doit ≈ ISO_TILE_H/2 (19px)
  yOff      = cube_px / ISO_TILE_H

Exemple tile_grass :
  N_tip = 11.13% → 7.12px
  S_tip = 71.3%  → 45.6px
  face_h = 38.5px ≈ 38 ✓
  cube_px = 18.4px ≈ 19 ✓
  yOff = 18.4/38 = 0.484 ≈ 0.5  ✓
```

> Pour les bâtiments (objets Layer 3) avec anchor = CENTRE footprint, contacter §9 Checklist.

---

## 7. Sprites path mapping

```typescript
// SPRITE_PATHS dans CityCanvas.tsx
tile_grass:         '/sprites/tile-grass.png'        // ✅ intégré
tile_sidewalk_flat: '/sprites/tile-concrete.png'      // placeholder
road_straight_1:    '/sprites/road-straight-1.png'   // 2048×2048
road_straight_2:    '/sprites/road-straight-2.png'   // 2048×2048
road_cross:         '/sprites/road-cross.png'         // 2048×2048
road_turn:          '/sprites/road-turn.png'          // 2048×2048
tree_sm:            '/sprites/tree-sm.png'            // 2048×2048
tree_lg:            '/sprites/tree-lg.png'            // 2048×2048
bush:               '/sprites/bush.png'               // 2048×2048
park:               '/sprites/park.png'               // 2048×2048
```

---

## 8. CellType et DECORATION_TYPES

```typescript
// Actifs
type CellType = 'building' | 'townhall' | 'shop' | 'library'
              | 'road' | 'sidewalk'
              | 'tree_sm' | 'tree_lg' | 'park' | 'bush'
              | 'ground' | 'tile_concrete' | 'tile_sidewalk'

// Supprimés (migrés → 'road' au chargement)
// 'road_2', 'road_cross'

// Layer routing
road     → Layer 1 Ground (auto-tile sprite)
sidewalk → Layer 2 Overlay
tree_sm, tree_lg, park, bush → Layer 3 Objects
```

## 9. STRUCTURE_SIZES — état actuel

| Sprite | Footprint [cols, rows] | PNG |
|---|---|---|
| `building_xs` | [1, 1] | 512×1024 |
| `building_sm` | [2, 1] | 768×1280 |
| `building_md` | [2, 1] | 768×1280 |
| `building_lg` | [2, 2] | 1024×1280 |
| `building_xl` | [2, 2] | 1024×1536 |
| `townhall` | [2, 2] | 1024×1280 |
| `shop_kiosk` | [1, 1] | 512×768 |
| `shop_store` | [2, 1] | 768×1280 |
| `shop_mall` | [2, 2] | 1024×1280 |
| `library_md` | [2, 2] | 1024×1024 |
| `construction_1x1` | [1, 1] | 512×512 |
| `construction_2x1` | [2, 1] | 768×1024 |
| `construction_2x2` | [2, 2] | 1024×1024 |
| `tree_sm/lg/bush` | [1, 1] | 2048×2048 |
| `park` | [2, 2] | 2048×2048 |
| `road/*` | [1, 1] | 2048×2048 |

---

## 9. Checklist quand on ajoute un nouveau sprite

1. Ajouter `key: '/sprites/fichier.png'` dans `SPRITE_PATHS`
2. Ajouter `key: { baseRatio, yOff, xOff }` dans `SPRITE_ANCHOR`
3. Si 1×1 et nouveau format 512×512 → `baseRatio=1.0`, calculer yOff avec formule §6
4. Ajouter `key: [w, h]` dans `STRUCTURE_SIZES` (portfolio.ts) si footprint ≠ 1×1
5. Ajouter CellType si nouveau type (portfolio.ts)
6. Router vers le bon layer dans drawGrid / drawDecorations
7. Mettre à jour cette table §3 et §7
