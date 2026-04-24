import { useState } from 'react';
import type { CellType } from '../types/portfolio';

// ─── Catalogue organisé par catégorie ───

interface DecoItem {
  type: CellType;
  label: string;
  sprite: string;
  size: [number, number];
}

interface Category {
  id: string;
  label: string;
  icon: string;
  items: DecoItem[];
}

const CATEGORIES: Category[] = [
  {
    id: 'routes',
    label: 'Routes',
    icon: '🛣',
    items: [
      { type: 'road', label: 'Route', sprite: '/sprites/roads/road-straight-1.png', size: [1, 1] },
    ],
  },
  {
    id: 'trottoirs',
    label: 'Trottoirs',
    icon: '⬜',
    items: [
      { type: 'sidewalk_1', label: 'Trottoir 1', sprite: '/sprites/sidewalks/Sidewalk_Tile1.png', size: [1, 1] },
      { type: 'sidewalk_2', label: 'Trottoir 2', sprite: '/sprites/sidewalks/Sidewalk_Tile2.png', size: [1, 1] },
      { type: 'sidewalk_3', label: 'Trottoir 3', sprite: '/sprites/sidewalks/Sidewalk_Tile3.png', size: [1, 1] },
      { type: 'sidewalk_4', label: 'Trottoir 4', sprite: '/sprites/sidewalks/Sidewalk_Tile4.png', size: [1, 1] },
      { type: 'sidewalk_5', label: 'Trottoir 5', sprite: '/sprites/sidewalks/Sidewalk_Tile5.png', size: [1, 1] },
      { type: 'sidewalk_6', label: 'Trottoir 6', sprite: '/sprites/sidewalks/Sidewalk_Tile6.png', size: [1, 1] },
      { type: 'sidewalk_7', label: 'Trottoir 7', sprite: '/sprites/sidewalks/Sidewalk_Tile7.png', size: [1, 1] },
      { type: 'sidewalk_8', label: 'Trottoir 8', sprite: '/sprites/sidewalks/Sidewalk_Tile8.png', size: [1, 1] },
      { type: 'sidewalk_9', label: 'Trottoir 9', sprite: '/sprites/sidewalks/Sidewalk_Tile9.png', size: [1, 1] },
    ],
  },
  {
    id: 'nature',
    label: 'Nature',
    icon: '🌳',
    items: [
      { type: 'tree_palm', label: 'Palmier',  sprite: '/sprites/nature/Palm3.png',  size: [1, 1] },
      { type: 'tree_3',    label: 'Arbre 3',  sprite: '/sprites/nature/Tree3.png',  size: [1, 1] },
      { type: 'tree_14',   label: 'Arbre 14', sprite: '/sprites/nature/Tree14.png', size: [1, 1] },
    ],
  },
  {
    id: 'deco',
    label: 'Décorations',
    icon: '⛲',
    items: [
      { type: 'park_fountain', label: 'Fontaine',  sprite: '/sprites/deco/Park_Fountain.png', size: [2, 2] },
      { type: 'park_pond',     label: 'Bassin',    sprite: '/sprites/deco/Park_Pond.png',     size: [2, 2] },
    ],
  },
  {
    id: 'utilities',
    label: 'Utilitaires',
    icon: '🅿',
    items: [
      { type: 'carpark_sign', label: 'Panneau P',  sprite: '/sprites/utilities/Carpark_1x2_Sign.png',      size: [2, 1] },
      { type: 'carpark_gate', label: 'Barrière P', sprite: '/sprites/utilities/Carpark_Fancy_GateUp.png',  size: [2, 2] },
    ],
  },
];

// ─── Props ───

interface Props {
  selectedDeco: CellType | null;
  eraserActive: boolean;
  onSelect: (deco: CellType | null) => void;
  onToggleEraser: () => void;
}

// ─── Component ───

export default function DecorationPalette({ selectedDeco, eraserActive, onSelect, onToggleEraser }: Props) {
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(['routes']));

  function toggleCategory(id: string) {
    setOpenCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div style={styles.container}>
      <div style={styles.title}>Décorations</div>

      {CATEGORIES.map((cat) => {
        const isOpen = openCategories.has(cat.id);
        return (
          <div key={cat.id}>
            {/* Category header */}
            <button
              style={styles.catHeader}
              onClick={() => toggleCategory(cat.id)}
            >
              <span style={styles.catIcon}>{cat.icon}</span>
              <span style={styles.catLabel}>{cat.label}</span>
              <span style={styles.catChevron}>{isOpen ? '▾' : '▸'}</span>
            </button>

            {/* Category items */}
            {isOpen && (
              <div style={styles.items}>
                {cat.items.map((item) => {
                  const isActive = selectedDeco === item.type && !eraserActive;
                  return (
                    <button
                      key={item.type}
                      style={{ ...styles.item, ...(isActive ? styles.itemActive : {}) }}
                      onClick={() => onSelect(isActive ? null : item.type)}
                      title={`${item.label} (${item.size[0]}×${item.size[1]})`}
                    >
                      <img src={item.sprite} alt={item.label} style={styles.sprite} />
                      <span style={styles.label}>{item.label}</span>
                      <span style={styles.size}>{item.size[0]}×{item.size[1]}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div style={styles.divider} />

      {/* Eraser */}
      <button
        style={{ ...styles.item, ...(eraserActive ? styles.eraserActive : {}) }}
        onClick={onToggleEraser}
        title="Gomme — Supprimer des décorations"
      >
        <span style={styles.eraserIcon}>✕</span>
        <span style={styles.label}>Gomme</span>
      </button>

      <div style={styles.hint}>Clic droit = supprimer</div>
    </div>
  );
}

// ─── Styles ───

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 80,
    left: 16,
    width: 148,
    background: 'rgba(10, 15, 25, 0.88)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: '10px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    zIndex: 10,
    maxHeight: 'calc(100vh - 120px)',
    overflowY: 'auto',
  },
  title: {
    color: '#6AB0F0',
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  catHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    padding: '5px 6px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 7,
    cursor: 'pointer',
    color: '#AAA',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  catIcon: {
    fontSize: 12,
    lineHeight: 1,
  },
  catLabel: {
    flex: 1,
    textAlign: 'left',
  },
  catChevron: {
    fontSize: 9,
    color: '#666',
  },
  items: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    paddingLeft: 6,
    marginBottom: 4,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '5px 7px',
    background: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 7,
    cursor: 'pointer',
    color: '#CCC',
    fontFamily: 'monospace',
    fontSize: 10,
    transition: 'all 0.12s',
  },
  itemActive: {
    background: 'rgba(74,144,217,0.22)',
    borderColor: 'rgba(74,144,217,0.5)',
    color: '#6AB0F0',
  },
  eraserActive: {
    background: 'rgba(255,65,54,0.18)',
    borderColor: 'rgba(255,65,54,0.4)',
    color: '#FF4136',
  },
  sprite: {
    width: 26,
    height: 26,
    objectFit: 'contain',
    imageRendering: 'pixelated',
    flexShrink: 0,
  },
  label: {
    flex: 1,
    fontSize: 10,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  size: {
    fontSize: 9,
    color: '#666',
    flexShrink: 0,
  },
  eraserIcon: {
    width: 26,
    height: 26,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    flexShrink: 0,
  },
  divider: {
    height: 1,
    background: 'rgba(255,255,255,0.08)',
    margin: '2px 0',
  },
  hint: {
    color: '#555',
    fontFamily: 'monospace',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 1,
  },
};
