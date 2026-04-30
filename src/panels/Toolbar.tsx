import { memo, useCallback, useEffect, useState } from 'react';
import type { CellType } from '../types/portfolio';
import type { PlacementMode } from '../city/CityCanvas';
import { tokens } from '../styles/tokens';

// ─── Catalogue (4 onglets : Nature · Voirie · Services · Vie) ────────────────

type CatalogTab = 'nature' | 'voirie' | 'services' | 'vie';

interface CatalogItem {
  type: CellType;
  label: string;
  sprite: string;
  size: [number, number];
  tab: CatalogTab;
  group?: string; // sous-groupe affiché dans le drawer
}

const CATALOG: CatalogItem[] = [
  // ── 🌳 Nature ────────────────────────────────────────────────────────────
  { type: 'tree_palm',    label: 'Palmier',  sprite: '/sprites/nature/Palm3.png',         size: [1, 1], tab: 'nature', group: 'Arbres' },
  { type: 'tree_3',       label: 'Arbre 3',  sprite: '/sprites/nature/Tree3.png',         size: [1, 1], tab: 'nature', group: 'Arbres' },
  { type: 'tree_14',      label: 'Arbre 14', sprite: '/sprites/nature/Tree14.png',        size: [1, 1], tab: 'nature', group: 'Arbres' },
  { type: 'park_fountain',label: 'Fontaine', sprite: '/sprites/deco/Park_Fountain.png',   size: [2, 2], tab: 'nature', group: 'Parcs'  },
  { type: 'park_pond',    label: 'Bassin',   sprite: '/sprites/deco/Park_Pond.png',       size: [2, 2], tab: 'nature', group: 'Parcs'  },

  // ── 🛣️ Voirie ────────────────────────────────────────────────────────────
  { type: 'road',         label: 'Route',    sprite: '/sprites/roads/road-straight-1.png',          size: [1, 1], tab: 'voirie', group: 'Routes'    },
  { type: 'fence_1',      label: 'Clôture A',sprite: '/sprites/fences/PicketFence1.png',            size: [1, 1], tab: 'voirie', group: 'Clôtures'  },
  { type: 'fence_2',      label: 'Clôture B',sprite: '/sprites/fences/PicketFence2.png',            size: [1, 1], tab: 'voirie', group: 'Clôtures'  },
  { type: 'sidewalk_1',   label: 'Trottoir 1',  sprite: '/sprites/sidewalks/Sidewalk_Tile1.png',    size: [1, 1], tab: 'voirie', group: 'Trottoirs' },
  { type: 'sidewalk_2',   label: 'Trottoir 2',  sprite: '/sprites/sidewalks/Sidewalk_Tile2.png',    size: [1, 1], tab: 'voirie', group: 'Trottoirs' },
  { type: 'sidewalk_3',   label: 'Trottoir 3',  sprite: '/sprites/sidewalks/Sidewalk_Tile3.png',    size: [1, 1], tab: 'voirie', group: 'Trottoirs' },
  { type: 'sidewalk_4',   label: 'Trottoir 4',  sprite: '/sprites/sidewalks/Sidewalk_Tile4.png',    size: [1, 1], tab: 'voirie', group: 'Trottoirs' },
  { type: 'sidewalk_5',   label: 'Trottoir 5',  sprite: '/sprites/sidewalks/Sidewalk_Tile5.png',    size: [1, 1], tab: 'voirie', group: 'Trottoirs' },
  { type: 'sidewalk_6',   label: 'Trottoir 6',  sprite: '/sprites/sidewalks/Sidewalk_Tile6.png',    size: [1, 1], tab: 'voirie', group: 'Trottoirs' },
  { type: 'sidewalk_7',   label: 'Trottoir 7',  sprite: '/sprites/sidewalks/Sidewalk_Tile7.png',    size: [1, 1], tab: 'voirie', group: 'Trottoirs' },
  { type: 'sidewalk_8',   label: 'Trottoir 8',  sprite: '/sprites/sidewalks/Sidewalk_Tile8.png',    size: [1, 1], tab: 'voirie', group: 'Trottoirs' },
  { type: 'sidewalk_9',   label: 'Trottoir 9',  sprite: '/sprites/sidewalks/Sidewalk_Tile9.png',    size: [1, 1], tab: 'voirie', group: 'Trottoirs' },
  { type: 'sidewalk_10',  label: 'Trottoir 10', sprite: '/sprites/sidewalks/Sidewalk_Tile10.png',   size: [1, 1], tab: 'voirie', group: 'Trottoirs' },
  { type: 'sidewalk_11',  label: 'Trottoir 11', sprite: '/sprites/sidewalks/Sidewalk_Tile11.png',   size: [1, 1], tab: 'voirie', group: 'Trottoirs' },
  { type: 'sidewalk_12',  label: 'Trottoir 12', sprite: '/sprites/sidewalks/Sidewalk_Tile12.png',   size: [1, 1], tab: 'voirie', group: 'Trottoirs' },
  { type: 'sidewalk_13',  label: 'Trottoir 13', sprite: '/sprites/sidewalks/Sidewalk_Tile13.png',   size: [1, 1], tab: 'voirie', group: 'Trottoirs' },

  // ── 🏢 Services (utilitaires civiques) ───────────────────────────────────
  { type: 'hospital',       label: 'Hôpital',  sprite: '/sprites/utilities/Doctor_Hospital.png',          size: [2, 2], tab: 'services', group: 'Santé'    },
  { type: 'fire_station',   label: 'Pompiers', sprite: '/sprites/utilities/Emergency_FireStation.png',    size: [2, 2], tab: 'services', group: 'Urgences' },
  { type: 'police_station', label: 'Police',   sprite: '/sprites/utilities/Emergency_PoliceStation.png',  size: [2, 2], tab: 'services', group: 'Urgences' },
  { type: 'prison',         label: 'Prison',   sprite: '/sprites/utilities/Emergency_Prison.png',         size: [2, 2], tab: 'services', group: 'Urgences' },
  { type: 'post_office',    label: 'Poste',    sprite: '/sprites/utilities/PostOffice.png',               size: [2, 1], tab: 'services', group: 'Public'   },
  { type: 'recycling',      label: 'Recyclage',sprite: '/sprites/utilities/Recycling.png',                size: [2, 1], tab: 'services', group: 'Public'   },
  { type: 'gas_station',    label: 'Station',  sprite: '/sprites/utilities/GasStation.png',               size: [2, 1], tab: 'services', group: 'Public'   },
  { type: 'tele_tower',     label: 'Antenne',  sprite: '/sprites/utilities/TeleTower.png',                size: [1, 1], tab: 'services', group: 'Public'   },
  { type: 'carpark_sign',   label: 'Panneau P',sprite: '/sprites/utilities/Carpark_1x2_Sign.png',         size: [2, 1], tab: 'services', group: 'Parking'  },
  { type: 'carpark_gate',   label: 'Barrière P',sprite:'/sprites/utilities/Carpark_Fancy_GateUp.png',     size: [2, 2], tab: 'services', group: 'Parking'  },

  // ── 🍽️ Vie (loisirs + restauration) ─────────────────────────────────────
  { type: 'cinema',                    label: 'Cinéma',     sprite: '/sprites/utilities/Leasure_Cinema.png',           size: [2, 2], tab: 'vie', group: 'Loisirs' },
  { type: 'museum',                    label: 'Musée',      sprite: '/sprites/utilities/Leasure_Museum.png',           size: [2, 2], tab: 'vie', group: 'Loisirs' },
  { type: 'stadium_athletics',         label: 'Athlétisme', sprite: '/sprites/utilities/Stadium_Athletics.png',        size: [2, 2], tab: 'vie', group: 'Loisirs' },
  { type: 'stadium_football_american', label: 'Football US',sprite: '/sprites/utilities/Stadium_FootballAmerican.png', size: [2, 2], tab: 'vie', group: 'Loisirs' },
  { type: 'stadium_football_soccer',   label: 'Football',   sprite: '/sprites/utilities/Stadium_FootballSocker.png',   size: [2, 2], tab: 'vie', group: 'Loisirs' },
  { type: 'stadium_tennis',            label: 'Tennis',     sprite: '/sprites/utilities/Stadium_Tennis.png',           size: [2, 2], tab: 'vie', group: 'Loisirs' },
  { type: 'bar',                       label: 'Bar',        sprite: '/sprites/utilities/Bar.png',                      size: [2, 1], tab: 'vie', group: 'Restos' },
  { type: 'restaurant_breakfast',      label: 'Brunch',     sprite: '/sprites/utilities/Restaurant_Breakfast.png',     size: [2, 1], tab: 'vie', group: 'Restos' },
  { type: 'restaurant_pizza',          label: 'Pizza',      sprite: '/sprites/utilities/Restaurant_Pizza.png',         size: [2, 1], tab: 'vie', group: 'Restos' },
  { type: 'restaurant_ramen',          label: 'Ramen',      sprite: '/sprites/utilities/Restaurant_Ramen.png',         size: [2, 1], tab: 'vie', group: 'Restos' },
  { type: 'restaurant_sandwich',       label: 'Sandwich',   sprite: '/sprites/utilities/Restaurant_Sandwich.png',      size: [2, 1], tab: 'vie', group: 'Restos' },
  { type: 'restaurant_sushi',          label: 'Sushi',      sprite: '/sprites/utilities/Restaurant_Sushi.png',         size: [2, 1], tab: 'vie', group: 'Restos' },
  { type: 'street_flowers',            label: 'Fleurs',     sprite: '/sprites/utilities/StreetStand_Flowers.png',      size: [1, 1], tab: 'vie', group: 'Restos' },
  { type: 'street_icecream',           label: 'Glaces',     sprite: '/sprites/utilities/StreetStand_Icecream.png',     size: [1, 1], tab: 'vie', group: 'Restos' },
];

const TABS: { id: CatalogTab; icon: string; label: string }[] = [
  { id: 'nature',   icon: '🌳', label: 'Nature'   },
  { id: 'voirie',   icon: '🛣️', label: 'Voirie'   },
  { id: 'services', icon: '🏢', label: 'Services' },
  { id: 'vie',      icon: '🍽️', label: 'Vie'      },
];

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  placementMode: PlacementMode | null;
  onSelectItem: (deco: CellType) => void;
  onErase: () => void;
  onCancel: () => void;
  onFlip: () => void;
  /** Reactive flags from useUndoStack — drive button affordance (disabled state). */
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

/**
 * Bottom-center toolbar — two exclusive modes:
 *
 *   IDLE          → just two big buttons : 🏗️ Construction / 🚜 Bulldozer
 *   CONSTRUCTION  → catalog drawer (4 sub-tabs) STAYS OPEN during placement.
 *                   Switch items by clicking another one — no need to re-open.
 *   BULLDOZER     → minimal panel: "Cliquez sur un élément pour supprimer".
 *
 * Persistence rules:
 *   • Selecting an item from the catalog enters placement mode but keeps the
 *     catalog visible — the user can chain placements or switch items freely.
 *   • Clicking the active mode button again → exits the mode and closes panel.
 *   • Esc closes everything (handled in App.tsx, where placementMode lives).
 */
function Toolbar({
  placementMode, onSelectItem, onErase, onCancel, onFlip,
  canUndo, canRedo, onUndo, onRedo,
}: Props) {
  /** What top-level mode is active. Independent from placementMode (that's per-item). */
  const [mode, setMode] = useState<'idle' | 'construction' | 'bulldozer'>('idle');
  /** Currently active sub-tab when in construction mode. */
  const [activeTab, setActiveTab] = useState<CatalogTab>('nature');

  // Sync mode with placementMode prop — if parent kills placement (Esc handler in
  // App.tsx, etc.), we close the panel too. But selecting another item while in
  // construction mode should NOT close the panel.
  useEffect(() => {
    if (!placementMode) {
      // No active placement → only stay open if user explicitly is in construction
      // mode browsing the catalog (not yet picked an item). Leave mode alone.
      return;
    }
    if (placementMode.eraser) {
      setMode('bulldozer');
    } else {
      setMode('construction');
    }
  }, [placementMode]);

  // ─── Mode toggles ──────────────────────────────────────────────────────────

  const toggleConstruction = useCallback(() => {
    if (mode === 'construction') {
      // Exit construction: cancel placement and close panel
      setMode('idle');
      onCancel();
    } else {
      // Enter construction: show catalog, no item selected yet
      setMode('construction');
      // If we were in bulldozer, cancel that mode first
      if (placementMode?.eraser) onCancel();
    }
  }, [mode, placementMode, onCancel]);

  const toggleBulldozer = useCallback(() => {
    if (mode === 'bulldozer') {
      setMode('idle');
      onCancel();
    } else {
      setMode('bulldozer');
      onErase();
    }
  }, [mode, onErase, onCancel]);

  const handleItemClick = useCallback((item: CatalogItem) => {
    onSelectItem(item.type);
    // mode stays 'construction' — catalog remains open for chained placements
  }, [onSelectItem]);

  const handleTabClick = useCallback((tab: CatalogTab) => {
    setActiveTab(tab);
  }, []);

  const filteredItems = CATALOG.filter(i => i.tab === activeTab);
  const groups: string[] = [];
  filteredItems.forEach(i => {
    if (i.group && !groups.includes(i.group)) groups.push(i.group);
  });

  const placingItem = placementMode && !placementMode.eraser
    ? CATALOG.find(i => i.type === placementMode.deco)
    : null;

  return (
    <div style={styles.wrapper}>
      {/* ── CONSTRUCTION DRAWER (catalog with sub-tabs) ── */}
      {mode === 'construction' && (
        <div style={styles.drawer}>
          {/* Sub-tabs */}
          <div style={styles.tabs}>
            {TABS.map(t => (
              <button
                key={t.id}
                style={{ ...styles.tab, ...(activeTab === t.id ? styles.tabActive : {}) }}
                onClick={() => handleTabClick(t.id)}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Item grid (with sub-group headers) */}
          <div style={styles.groupedContainer}>
            {groups.length > 0 ? groups.map(group => (
              <div key={group}>
                <div style={styles.groupHeader}>{group}</div>
                <div style={styles.itemGrid}>
                  {filteredItems.filter(i => i.group === group).map(item => (
                    <ItemButton
                      key={item.type}
                      item={item}
                      active={placingItem?.type === item.type}
                      onSelect={handleItemClick}
                    />
                  ))}
                </div>
              </div>
            )) : (
              <div style={styles.itemGrid}>
                {filteredItems.map(item => (
                  <ItemButton
                    key={item.type}
                    item={item}
                    active={placingItem?.type === item.type}
                    onSelect={handleItemClick}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Hint */}
          <div style={styles.hint}>
            {placingItem
              ? `🏗 ${placingItem.label} — clique pour placer · F pour flip · Cmd+Z pour annuler · Esc pour quitter`
              : '👆 Choisis un élément à construire'}
          </div>
        </div>
      )}

      {/* ── BULLDOZER PANEL (minimal) ── */}
      {mode === 'bulldozer' && (
        <div style={styles.bulldozerPanel}>
          <div style={styles.bulldozerIcon}>🚜</div>
          <div>
            <div style={styles.bulldozerTitle}>Mode démolition</div>
            <div style={styles.bulldozerHint}>
              Clique sur un élément placé pour le supprimer · Cmd+Z pour annuler · Esc pour quitter
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN TOOLBAR STRIP ── */}
      <div style={styles.strip}>
        {/* Construction button */}
        <button
          style={{ ...styles.modeBtn, ...(mode === 'construction' ? styles.modeBtnConstructionActive : {}) }}
          onClick={toggleConstruction}
        >
          🏗️ <span style={styles.modeLabel}>Construction</span>
        </button>

        {/* Bulldozer button */}
        <button
          style={{ ...styles.modeBtn, ...(mode === 'bulldozer' ? styles.modeBtnBulldozerActive : {}) }}
          onClick={toggleBulldozer}
        >
          🚜 <span style={styles.modeLabel}>Bulldozer</span>
        </button>

        {/* Undo/Redo (visible only when a mode is active) */}
        {mode !== 'idle' && (
          <>
            <div style={styles.divider} />
            <button
              style={{ ...styles.iconBtn, ...(canUndo ? {} : styles.iconBtnDisabled) }}
              onClick={onUndo}
              disabled={!canUndo}
              title="Annuler (Cmd+Z)"
            >
              ↶
            </button>
            <button
              style={{ ...styles.iconBtn, ...(canRedo ? {} : styles.iconBtnDisabled) }}
              onClick={onRedo}
              disabled={!canRedo}
              title="Rétablir (Cmd+Shift+Z)"
            >
              ↷
            </button>
          </>
        )}

        {/* Flip button (visible only while placing a flippable item) */}
        {placingItem && (
          <>
            <div style={styles.divider} />
            <button
              style={{ ...styles.iconBtn, ...(placementMode?.flip ? styles.iconBtnActive : {}) }}
              onClick={onFlip}
              title="Flip horizontal (F)"
            >
              ↔
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── ItemButton ──────────────────────────────────────────────────────────────

const ItemButton = memo(function ItemButton({
  item, active, onSelect,
}: {
  item: CatalogItem;
  active: boolean;
  onSelect: (i: CatalogItem) => void;
}) {
  return (
    <button
      style={{ ...styles.itemBtn, ...(active ? styles.itemBtnActive : {}) }}
      onClick={() => onSelect(item)}
      title={`${item.label} — ${item.size[0]}×${item.size[1]} tuile${item.size[0] > 1 ? 's' : ''}`}
    >
      <img src={item.sprite} alt={item.label} style={styles.itemSprite} />
      <span style={styles.itemLabel}>{item.label}</span>
      {item.type === 'road' && <span style={styles.badge}>auto</span>}
      <span style={styles.sizeTag}>{item.size[0]}×{item.size[1]}</span>
    </button>
  );
});

export default memo(Toolbar);

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'fixed',
    bottom: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    zIndex: tokens.z.hud,
    pointerEvents: 'none',
  },
  drawer: {
    background: tokens.color.surface,
    backdropFilter: tokens.blur.strong,
    border: `1px solid ${tokens.color.border}`,
    borderRadius: tokens.radius.xl,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    pointerEvents: 'all',
    minWidth: 440,
    maxWidth: 600,
    boxShadow: tokens.shadow.xl,
    fontFamily: tokens.font.family,
  },
  tabs: { display: 'flex', gap: 5 },
  tab: {
    flex: '1 1 auto',
    padding: '7px 12px',
    background: tokens.color.surfaceLo,
    border: `1px solid ${tokens.color.border}`,
    borderRadius: tokens.radius.pill,
    color: tokens.color.textDim,
    fontFamily: tokens.font.family,
    fontSize: tokens.font.size.xs,
    fontWeight: tokens.font.weight.semibold,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.12s',
  },
  tabActive: {
    background: tokens.color.primaryBg,
    borderColor: tokens.color.primaryBd,
    color: tokens.color.primary,
  },
  groupedContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 10,
    maxHeight: 320,
    overflowY: 'auto' as const,
  },
  groupHeader: {
    color: tokens.color.textDim,
    fontFamily: tokens.font.family,
    fontSize: tokens.font.size.xxs,
    fontWeight: tokens.font.weight.bold,
    textTransform: 'uppercase' as const,
    letterSpacing: tokens.font.tracking.wide,
    marginBottom: 6,
    paddingLeft: 2,
  },
  itemGrid: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  itemBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '6px 8px',
    background: tokens.color.surfaceLo,
    border: `1px solid ${tokens.color.border}`,
    borderRadius: tokens.radius.md,
    cursor: 'pointer',
    color: tokens.color.text,
    fontFamily: tokens.font.family,
    transition: 'all 0.12s',
    minWidth: 64,
  },
  itemBtnActive: {
    background: tokens.color.primaryBg,
    borderColor: tokens.color.primaryBd,
    boxShadow: `0 0 0 1px ${tokens.color.primaryBd}`,
  },
  itemSprite: {
    width: 40,
    height: 40,
    objectFit: 'contain',
    imageRendering: 'pixelated',
  },
  itemLabel: {
    fontSize: tokens.font.size.xxs,
    color: tokens.color.textMid,
    textAlign: 'center',
  },
  sizeTag: {
    fontSize: 9,
    color: tokens.color.textDim,
    fontVariantNumeric: 'tabular-nums',
  },
  badge: {
    fontSize: 9,
    color: tokens.color.primary,
    background: tokens.color.primaryBg,
    border: `1px solid ${tokens.color.primaryBd}`,
    borderRadius: tokens.radius.sm,
    padding: '1px 5px',
    fontWeight: tokens.font.weight.bold,
  },
  hint: {
    color: tokens.color.textDim,
    fontFamily: tokens.font.family,
    fontSize: tokens.font.size.xxs,
    textAlign: 'center',
    padding: '6px 0 0 0',
    borderTop: `1px solid ${tokens.color.border}`,
    marginTop: 2,
  },
  bulldozerPanel: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '14px 20px',
    background: tokens.color.dangerBg,
    backdropFilter: tokens.blur.strong,
    border: `1px solid ${tokens.color.dangerBd}`,
    borderRadius: tokens.radius.xl,
    pointerEvents: 'all',
    boxShadow: tokens.shadow.lg,
    fontFamily: tokens.font.family,
  },
  bulldozerIcon: { fontSize: 28 },
  bulldozerTitle: {
    color: tokens.color.danger,
    fontFamily: tokens.font.family,
    fontSize: tokens.font.size.md,
    fontWeight: tokens.font.weight.bold,
  },
  bulldozerHint: {
    color: tokens.color.textMid,
    fontFamily: tokens.font.family,
    fontSize: tokens.font.size.xs,
    marginTop: 2,
  },
  strip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    background: tokens.color.surface,
    backdropFilter: tokens.blur.strong,
    border: `1px solid ${tokens.color.border}`,
    borderRadius: tokens.radius.pill,
    pointerEvents: 'all',
    boxShadow: tokens.shadow.lg,
  },
  modeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 18px',
    background: tokens.color.surfaceLo,
    border: `1px solid ${tokens.color.border}`,
    borderRadius: tokens.radius.pill,
    color: tokens.color.text,
    fontFamily: tokens.font.family,
    fontSize: tokens.font.size.sm,
    fontWeight: tokens.font.weight.bold,
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  },
  modeBtnConstructionActive: {
    background: tokens.color.primaryBg,
    borderColor: tokens.color.primaryBd,
    color: tokens.color.primary,
  },
  modeBtnBulldozerActive: {
    background: tokens.color.dangerBg,
    borderColor: tokens.color.dangerBd,
    color: tokens.color.danger,
  },
  modeLabel: { fontSize: tokens.font.size.sm },
  iconBtn: {
    width: 34,
    height: 34,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: tokens.color.surfaceLo,
    border: `1px solid ${tokens.color.border}`,
    borderRadius: tokens.radius.pill,
    color: tokens.color.text,
    fontFamily: tokens.font.family,
    fontSize: tokens.font.size.lg,
    fontWeight: tokens.font.weight.bold,
    cursor: 'pointer',
    transition: 'all 0.12s',
  },
  iconBtnActive: {
    background: tokens.color.primaryBg,
    borderColor: tokens.color.primaryBd,
    color: tokens.color.primary,
  },
  iconBtnDisabled: {
    opacity: 0.35,
    cursor: 'not-allowed',
  },
  divider: {
    width: 1,
    height: 22,
    background: tokens.color.border,
    margin: '0 2px',
  },
};
