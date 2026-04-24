import { useState } from 'react';
import type { CellType } from '../types/portfolio';
import type { PlacementMode } from '../city/CityCanvas';

// ─── Catalogue organisé par onglet ────────────────────────────────────────

type CatalogTab = 'nature' | 'trottoirs' | 'deco' | 'utilities' | 'routes' | 'clotures';

interface CatalogItem {
  type: CellType;
  label: string;
  sprite: string;
  size: [number, number];
  tab: CatalogTab;
  group?: string; // sous-groupe affiché dans le drawer
}

const CATALOG: CatalogItem[] = [
  // ── Nature ──────────────────────────────────────────────────────────────
  { type: 'tree_palm', label: 'Palmier',  sprite: '/sprites/nature/Palm3.png',  size: [1, 1], tab: 'nature' },
  { type: 'tree_3',    label: 'Arbre 3',  sprite: '/sprites/nature/Tree3.png',  size: [1, 1], tab: 'nature' },
  { type: 'tree_14',   label: 'Arbre 14', sprite: '/sprites/nature/Tree14.png', size: [1, 1], tab: 'nature' },
  // ── Trottoirs ────────────────────────────────────────────────────────────
  { type: 'sidewalk_1',  label: 'Trottoir 1',  sprite: '/sprites/sidewalks/Sidewalk_Tile1.png',  size: [1, 1], tab: 'trottoirs' },
  { type: 'sidewalk_2',  label: 'Trottoir 2',  sprite: '/sprites/sidewalks/Sidewalk_Tile2.png',  size: [1, 1], tab: 'trottoirs' },
  { type: 'sidewalk_3',  label: 'Trottoir 3',  sprite: '/sprites/sidewalks/Sidewalk_Tile3.png',  size: [1, 1], tab: 'trottoirs' },
  { type: 'sidewalk_4',  label: 'Trottoir 4',  sprite: '/sprites/sidewalks/Sidewalk_Tile4.png',  size: [1, 1], tab: 'trottoirs' },
  { type: 'sidewalk_5',  label: 'Trottoir 5',  sprite: '/sprites/sidewalks/Sidewalk_Tile5.png',  size: [1, 1], tab: 'trottoirs' },
  { type: 'sidewalk_6',  label: 'Trottoir 6',  sprite: '/sprites/sidewalks/Sidewalk_Tile6.png',  size: [1, 1], tab: 'trottoirs' },
  { type: 'sidewalk_7',  label: 'Trottoir 7',  sprite: '/sprites/sidewalks/Sidewalk_Tile7.png',  size: [1, 1], tab: 'trottoirs' },
  { type: 'sidewalk_8',  label: 'Trottoir 8',  sprite: '/sprites/sidewalks/Sidewalk_Tile8.png',  size: [1, 1], tab: 'trottoirs' },
  { type: 'sidewalk_9',  label: 'Trottoir 9',  sprite: '/sprites/sidewalks/Sidewalk_Tile9.png',  size: [1, 1], tab: 'trottoirs' },
  { type: 'sidewalk_10', label: 'Trottoir 10', sprite: '/sprites/sidewalks/Sidewalk_Tile10.png', size: [1, 1], tab: 'trottoirs' },
  { type: 'sidewalk_11', label: 'Trottoir 11', sprite: '/sprites/sidewalks/Sidewalk_Tile11.png', size: [1, 1], tab: 'trottoirs' },
  { type: 'sidewalk_12', label: 'Trottoir 12', sprite: '/sprites/sidewalks/Sidewalk_Tile12.png', size: [1, 1], tab: 'trottoirs' },
  { type: 'sidewalk_13', label: 'Trottoir 13', sprite: '/sprites/sidewalks/Sidewalk_Tile13.png', size: [1, 1], tab: 'trottoirs' },
  // ── Décorations ──────────────────────────────────────────────────────────
  { type: 'park_fountain', label: 'Fontaine', sprite: '/sprites/deco/Park_Fountain.png', size: [2, 2], tab: 'deco' },
  { type: 'park_pond',     label: 'Bassin',   sprite: '/sprites/deco/Park_Pond.png',     size: [2, 2], tab: 'deco' },
  // ── Utilitaires — Parking ─────────────────────────────────────────────────
  { type: 'carpark_sign', label: 'Panneau P',  sprite: '/sprites/utilities/Carpark_1x2_Sign.png',     size: [2, 1], tab: 'utilities', group: 'Parking' },
  { type: 'carpark_gate', label: 'Barrière P', sprite: '/sprites/utilities/Carpark_Fancy_GateUp.png', size: [2, 2], tab: 'utilities', group: 'Parking' },
  // ── Utilitaires — Services ────────────────────────────────────────────────
  { type: 'hospital',    label: 'Hôpital',   sprite: '/sprites/utilities/Doctor_Hospital.png',    size: [2, 2], tab: 'utilities', group: 'Services' },
  { type: 'post_office', label: 'Poste',     sprite: '/sprites/utilities/PostOffice.png',         size: [2, 1], tab: 'utilities', group: 'Services' },
  { type: 'recycling',   label: 'Recyclage', sprite: '/sprites/utilities/Recycling.png',          size: [2, 1], tab: 'utilities', group: 'Services' },
  { type: 'gas_station', label: 'Station',   sprite: '/sprites/utilities/GasStation.png',         size: [2, 1], tab: 'utilities', group: 'Services' },
  { type: 'tele_tower',  label: 'Antenne',   sprite: '/sprites/utilities/TeleTower.png',          size: [1, 1], tab: 'utilities', group: 'Services' },
  // ── Utilitaires — Urgences ────────────────────────────────────────────────
  { type: 'fire_station',   label: 'Pompiers',  sprite: '/sprites/utilities/Emergency_FireStation.png',   size: [2, 2], tab: 'utilities', group: 'Urgences' },
  { type: 'police_station', label: 'Police',    sprite: '/sprites/utilities/Emergency_PoliceStation.png', size: [2, 2], tab: 'utilities', group: 'Urgences' },
  { type: 'prison',         label: 'Prison',    sprite: '/sprites/utilities/Emergency_Prison.png',        size: [2, 2], tab: 'utilities', group: 'Urgences' },
  // ── Utilitaires — Loisirs ─────────────────────────────────────────────────
  { type: 'cinema',                    label: 'Cinéma',     sprite: '/sprites/utilities/Leasure_Cinema.png',           size: [2, 2], tab: 'utilities', group: 'Loisirs' },
  { type: 'museum',                    label: 'Musée',      sprite: '/sprites/utilities/Leasure_Museum.png',           size: [2, 2], tab: 'utilities', group: 'Loisirs' },
  { type: 'stadium_athletics',         label: 'Athlétisme', sprite: '/sprites/utilities/Stadium_Athletics.png',        size: [2, 2], tab: 'utilities', group: 'Loisirs' },
  { type: 'stadium_football_american', label: 'Football US',sprite: '/sprites/utilities/Stadium_FootballAmerican.png', size: [2, 2], tab: 'utilities', group: 'Loisirs' },
  { type: 'stadium_football_soccer',   label: 'Football',   sprite: '/sprites/utilities/Stadium_FootballSocker.png',   size: [2, 2], tab: 'utilities', group: 'Loisirs' },
  { type: 'stadium_tennis',            label: 'Tennis',     sprite: '/sprites/utilities/Stadium_Tennis.png',           size: [2, 2], tab: 'utilities', group: 'Loisirs' },
  // ── Utilitaires — Restauration ────────────────────────────────────────────
  { type: 'bar',                  label: 'Bar',       sprite: '/sprites/utilities/Bar.png',                    size: [2, 1], tab: 'utilities', group: 'Restos' },
  { type: 'restaurant_breakfast', label: 'Brunch',    sprite: '/sprites/utilities/Restaurant_Breakfast.png',   size: [2, 1], tab: 'utilities', group: 'Restos' },
  { type: 'restaurant_pizza',     label: 'Pizza',     sprite: '/sprites/utilities/Restaurant_Pizza.png',       size: [2, 1], tab: 'utilities', group: 'Restos' },
  { type: 'restaurant_ramen',     label: 'Ramen',     sprite: '/sprites/utilities/Restaurant_Ramen.png',       size: [2, 1], tab: 'utilities', group: 'Restos' },
  { type: 'restaurant_sandwich',  label: 'Sandwich',  sprite: '/sprites/utilities/Restaurant_Sandwich.png',    size: [2, 1], tab: 'utilities', group: 'Restos' },
  { type: 'restaurant_sushi',     label: 'Sushi',     sprite: '/sprites/utilities/Restaurant_Sushi.png',       size: [2, 1], tab: 'utilities', group: 'Restos' },
  { type: 'street_flowers',       label: 'Fleurs',    sprite: '/sprites/utilities/StreetStand_Flowers.png',    size: [1, 1], tab: 'utilities', group: 'Restos' },
  { type: 'street_icecream',      label: 'Glaces',    sprite: '/sprites/utilities/StreetStand_Icecream.png',   size: [1, 1], tab: 'utilities', group: 'Restos' },
  // ── Routes ───────────────────────────────────────────────────────────────
  { type: 'road', label: 'Route', sprite: '/sprites/roads/road-straight-1.png', size: [1, 1], tab: 'routes' },
  // ── Clôtures ─────────────────────────────────────────────────────────────
  { type: 'fence_1', label: 'Clôture A', sprite: '/sprites/fences/PicketFence1.png', size: [1, 1], tab: 'clotures' },
  { type: 'fence_2', label: 'Clôture B', sprite: '/sprites/fences/PicketFence2.png', size: [1, 1], tab: 'clotures' },
];

const TABS: { id: CatalogTab; icon: string; label: string }[] = [
  { id: 'nature',    icon: '🌳', label: 'Nature'      },
  { id: 'trottoirs', icon: '⬜', label: 'Trottoirs'   },
  { id: 'deco',      icon: '⛲', label: 'Déco'        },
  { id: 'utilities', icon: '🅿', label: 'Utilitaires' },
  { id: 'routes',    icon: '🛣', label: 'Routes'      },
  { id: 'clotures',  icon: '🚧', label: 'Clôtures'   },
];

// ─── Types ────────────────────────────────────────────────────────────────

type ToolbarState = 'idle' | 'catalog' | 'placing';

interface Props {
  placementMode: PlacementMode | null;
  onSelectItem: (deco: CellType) => void;
  onErase: () => void;
  onCancel: () => void;
  onFlip: () => void;
}

// ─── ItemButton helper ────────────────────────────────────────────────────

function ItemButton({ item, onSelect }: { item: CatalogItem; onSelect: (i: CatalogItem) => void }) {
  return (
    <button
      style={styles.itemBtn}
      onClick={() => onSelect(item)}
      title={`${item.label} — ${item.size[0]}×${item.size[1]} tuile${item.size[0] > 1 ? 's' : ''}`}
    >
      <img src={item.sprite} alt={item.label} style={styles.itemSprite} />
      <span style={styles.itemLabel}>{item.label}</span>
      {item.type === 'road' && <span style={styles.badge}>auto-tiling</span>}
      <span style={styles.sizeTag}>{item.size[0]}×{item.size[1]}</span>
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────

export default function Toolbar({ placementMode, onSelectItem, onErase, onCancel, onFlip }: Props) {
  const [activeTab, setActiveTab] = useState<CatalogTab>('nature');
  const [catalogOpen, setCatalogOpen] = useState(false);

  // Derive toolbar state
  const toolbarState: ToolbarState = placementMode ? 'placing' : 'idle';
  const isOpen = catalogOpen && toolbarState !== 'placing';

  function handleTabClick(tab: CatalogTab) {
    setActiveTab(tab);
    if (!catalogOpen) setCatalogOpen(true);
  }

  function handleItemClick(item: CatalogItem) {
    onSelectItem(item.type);
    setCatalogOpen(false);
  }

  function handleEraseClick() {
    onErase();
    setCatalogOpen(false);
  }

  function handleCancel() {
    onCancel();
    setCatalogOpen(false);
  }

  const filteredItems = CATALOG.filter(i => i.tab === activeTab);

  return (
    <div style={styles.wrapper}>

      {/* ── Catalog drawer (slides up above toolbar) ── */}
      {isOpen && (
        <div style={styles.drawer}>
          {/* Tab bar */}
          <div style={styles.tabs}>
            {TABS.map(t => (
              <button
                key={t.id}
                style={{ ...styles.tab, ...(activeTab === t.id ? styles.tabActive : {}) }}
                onClick={() => setActiveTab(t.id)}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Item grid — with optional sub-group headers for utilities */}
          {activeTab === 'utilities' ? (
            <div style={styles.groupedContainer}>
              {(() => {
                const groups: string[] = [];
                filteredItems.forEach(i => { if (i.group && !groups.includes(i.group)) groups.push(i.group); });
                return groups.map(group => (
                  <div key={group}>
                    <div style={styles.groupHeader}>{group}</div>
                    <div style={styles.itemGrid}>
                      {filteredItems.filter(i => i.group === group).map(item => (
                        <ItemButton key={item.type} item={item} onSelect={handleItemClick} />
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          ) : (
            <div style={styles.itemGrid}>
              {filteredItems.map(item => (
                <ItemButton key={item.type} item={item} onSelect={handleItemClick} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Main toolbar strip ── */}
      <div style={styles.strip}>
        {toolbarState === 'placing' ? (
          /* PLACING state */
          <>
            <div style={styles.placingHint}>
              {placementMode?.eraser ? '🗑 Cliquez pour effacer' : '🏗 Cliquez pour placer'}
            </div>
            {!placementMode?.eraser && (
              <>
                <div style={styles.divider} />
                <button
                  style={{ ...styles.btn, ...(placementMode?.flip ? styles.btnActive : {}) }}
                  onClick={onFlip}
                  title="Flip horizontal (touche F)"
                >
                  ↔ <span style={styles.btnLabel}>Flip</span>
                </button>
              </>
            )}
            <div style={styles.divider} />
            <button style={{ ...styles.btn, ...styles.btnCancel }} onClick={handleCancel}>
              ✕ Annuler
            </button>
          </>
        ) : (
          /* IDLE / CATALOG state */
          <>
            {TABS.map(t => (
              <button
                key={t.id}
                style={{ ...styles.btn, ...(isOpen && activeTab === t.id ? styles.btnActive : {}) }}
                onClick={() => handleTabClick(t.id)}
                title={t.label}
              >
                {t.icon} <span style={styles.btnLabel}>{t.label}</span>
              </button>
            ))}
            <div style={styles.divider} />
            <button
              style={{ ...styles.btn, ...styles.btnErase }}
              onClick={handleEraseClick}
              title="Gomme — supprimer décorations (clic droit aussi disponible)"
            >
              🗑 <span style={styles.btnLabel}>Gomme</span>
            </button>
            {isOpen && (
              <button style={{ ...styles.btn, ...styles.btnClose }} onClick={() => setCatalogOpen(false)}>
                ✕
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'fixed',
    bottom: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    zIndex: 20,
    pointerEvents: 'none',
  },
  drawer: {
    background: 'rgba(12, 16, 28, 0.93)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    pointerEvents: 'all',
    minWidth: 340,
    maxWidth: 520,
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  },
  tabs: {
    display: 'flex',
    gap: 5,
    flexWrap: 'wrap',
  },
  tab: {
    flex: '1 1 auto',
    padding: '5px 8px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    color: '#888',
    fontFamily: 'monospace',
    fontSize: 11,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.12s',
  },
  tabActive: {
    background: 'rgba(74,144,217,0.22)',
    borderColor: 'rgba(74,144,217,0.5)',
    color: '#6AB0F0',
  },
  itemGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  itemBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '8px 10px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    cursor: 'pointer',
    color: '#CCC',
    fontFamily: 'monospace',
    transition: 'all 0.15s',
    minWidth: 68,
  },
  itemSprite: {
    width: 44,
    height: 44,
    objectFit: 'contain',
    imageRendering: 'pixelated',
  },
  itemLabel: {
    fontSize: 10,
    color: '#AAA',
    textAlign: 'center',
  },
  sizeTag: {
    fontSize: 8,
    color: '#555',
  },
  groupedContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 10,
    maxHeight: 320,
    overflowY: 'auto' as const,
  },
  groupHeader: {
    color: '#556',
    fontFamily: 'monospace',
    fontSize: 9,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 6,
    paddingLeft: 2,
  },
  badge: {
    fontSize: 8,
    color: '#6AB0F0',
    background: 'rgba(74,144,217,0.15)',
    border: '1px solid rgba(74,144,217,0.3)',
    borderRadius: 4,
    padding: '1px 4px',
  },
  strip: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '8px 12px',
    background: 'rgba(12, 16, 28, 0.93)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 50,
    pointerEvents: 'all',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '7px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 40,
    color: '#CCC',
    fontFamily: 'monospace',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  },
  btnActive: {
    background: 'rgba(74,144,217,0.22)',
    borderColor: 'rgba(74,144,217,0.5)',
    color: '#6AB0F0',
  },
  btnErase: {
    color: '#FF8C78',
  },
  btnCancel: {
    background: 'rgba(255,65,54,0.15)',
    borderColor: 'rgba(255,65,54,0.3)',
    color: '#FF4136',
  },
  btnClose: {
    padding: '7px 10px',
    color: '#555',
  },
  btnLabel: {
    fontSize: 11,
  },
  divider: {
    width: 1,
    height: 20,
    background: 'rgba(255,255,255,0.1)',
    margin: '0 2px',
  },
  placingHint: {
    color: '#AAA',
    fontFamily: 'monospace',
    fontSize: 11,
    padding: '0 8px',
  },
};
