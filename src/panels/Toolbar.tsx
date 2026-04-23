import { useState } from 'react';
import type { CellType } from '../types/portfolio';
import type { PlacementMode } from '../city/CityCanvas';

// ─── Catalog ───────────────────────────────────────────────────────────────

type CatalogTab = 'nature' | 'roads';

interface CatalogItem {
  type: CellType;
  label: string;
  sprite: string;
  size: [number, number];
  tab: CatalogTab;
}

const CATALOG: CatalogItem[] = [
  // Nature tab
  { type: 'tree_sm',  label: 'Petit arbre',  sprite: '/sprites/tree-sm.png',         size: [1, 1], tab: 'nature' },
  { type: 'tree_lg',  label: 'Grand arbre',  sprite: '/sprites/tree-lg.png',         size: [1, 1], tab: 'nature' },
  { type: 'park',     label: 'Parc',         sprite: '/sprites/park.png',            size: [2, 2], tab: 'nature' },
  { type: 'bush',     label: 'Buisson',      sprite: '/sprites/bush.png',            size: [1, 1], tab: 'nature' },
  // Roads tab
  { type: 'road',     label: 'Route',        sprite: '/sprites/road-straight-1.png', size: [1, 1], tab: 'roads'  },
  { type: 'sidewalk', label: 'Trottoir',     sprite: '/sprites/tile-concrete.png',   size: [1, 1], tab: 'roads'  },
];

// ─── Types ────────────────────────────────────────────────────────────────

type ToolbarState = 'idle' | 'catalog' | 'placing';

interface Props {
  placementMode: PlacementMode | null;
  onSelectItem: (deco: CellType) => void;
  onErase: () => void;
  onCancel: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────

export default function Toolbar({ placementMode, onSelectItem, onErase, onCancel }: Props) {
  const [activeTab, setActiveTab] = useState<CatalogTab>('nature');

  // Derive toolbar state
  let toolbarState: ToolbarState = 'idle';
  if (placementMode) toolbarState = 'placing';

  const [catalogOpen, setCatalogOpen] = useState(false);
  const isOpen = catalogOpen && toolbarState !== 'placing';

  function handleTabClick(tab: CatalogTab) {
    setActiveTab(tab);
    if (!isOpen) setCatalogOpen(true);
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
      {/* ── Catalog drawer (slides up) ── */}
      {isOpen && (
        <div style={styles.drawer}>
          <div style={styles.tabs}>
            <button
              style={{ ...styles.tab, ...(activeTab === 'nature' ? styles.tabActive : {}) }}
              onClick={() => setActiveTab('nature')}
            >
              🌳 Nature
            </button>
            <button
              style={{ ...styles.tab, ...(activeTab === 'roads' ? styles.tabActive : {}) }}
              onClick={() => setActiveTab('roads')}
            >
              🛣 Routes
            </button>
          </div>
          <div style={styles.itemGrid}>
            {filteredItems.map(item => (
              <button
                key={item.type}
                style={styles.itemBtn}
                onClick={() => handleItemClick(item)}
                title={`${item.label} — ${item.size[0]}×${item.size[1]} tuile${item.size[0] > 1 ? 's' : ''}`}
              >
                <img src={item.sprite} alt={item.label} style={styles.itemSprite} />
                <span style={styles.itemLabel}>{item.label}</span>
                {item.tab === 'roads' && item.type === 'road' && (
                  <span style={styles.badge}>auto-tiling</span>
                )}
              </button>
            ))}
          </div>
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
            <div style={styles.divider} />
            <button style={{ ...styles.btn, ...styles.btnCancel }} onClick={handleCancel}>
              ✕ Annuler
            </button>
          </>
        ) : (
          /* IDLE / CATALOG state */
          <>
            <button
              style={{ ...styles.btn, ...(isOpen && activeTab === 'nature' ? styles.btnActive : {}) }}
              onClick={() => handleTabClick('nature')}
              title="Nature — arbres, parcs, buissons"
            >
              🌳 <span style={styles.btnLabel}>Nature</span>
            </button>
            <button
              style={{ ...styles.btn, ...(isOpen && activeTab === 'roads' ? styles.btnActive : {}) }}
              onClick={() => handleTabClick('roads')}
              title="Routes — auto-tiling et trottoirs"
            >
              🛣 <span style={styles.btnLabel}>Routes</span>
            </button>
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
    pointerEvents: 'none', // children override this
  },
  drawer: {
    background: 'rgba(12, 16, 28, 0.92)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    pointerEvents: 'all',
    minWidth: 280,
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    animation: 'slideUp 0.18s ease-out',
  },
  tabs: {
    display: 'flex',
    gap: 6,
  },
  tab: {
    flex: 1,
    padding: '6px 10px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: '#AAA',
    fontFamily: 'monospace',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  tabActive: {
    background: 'rgba(74,144,217,0.25)',
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
    minWidth: 70,
  },
  itemSprite: {
    width: 40,
    height: 40,
    objectFit: 'contain',
    imageRendering: 'pixelated',
  },
  itemLabel: {
    fontSize: 10,
    color: '#AAA',
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
    gap: 6,
    padding: '8px 14px',
    background: 'rgba(12, 16, 28, 0.92)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 50,
    pointerEvents: 'all',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '8px 14px',
    background: 'rgba(255,255,255,0.06)',
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
    background: 'rgba(74,144,217,0.25)',
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
    padding: '8px 10px',
    color: '#666',
  },
  btnLabel: {
    fontSize: 11,
  },
  divider: {
    width: 1,
    height: 20,
    background: 'rgba(255,255,255,0.1)',
  },
  placingHint: {
    color: '#AAA',
    fontFamily: 'monospace',
    fontSize: 11,
    padding: '0 8px',
  },
};
