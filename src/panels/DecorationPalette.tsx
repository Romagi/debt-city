import type { CellType } from '../types/portfolio';

interface DecoItem {
  type: CellType;
  label: string;
  sprite: string;
  size: [number, number];
}

const DECORATION_CATALOG: DecoItem[] = [
  { type: 'tree_sm', label: 'Petit arbre', sprite: '/sprites/tree-sm.png', size: [1, 1] },
  { type: 'tree_lg', label: 'Grand arbre', sprite: '/sprites/tree-lg.png', size: [1, 1] },
  { type: 'park', label: 'Parc', sprite: '/sprites/park.png', size: [2, 2] },
  { type: 'road', label: 'Route 1', sprite: '/sprites/road-straight-1.png', size: [1, 1] },
  { type: 'road_2', label: 'Route 2', sprite: '/sprites/road-straight-2.png', size: [1, 1] },
  { type: 'road_cross', label: 'Carrefour', sprite: '/sprites/road-cross.png', size: [1, 1] },
  { type: 'sidewalk', label: 'Trottoir', sprite: '/sprites/tile-concrete.png', size: [1, 1] },
];

interface Props {
  selectedDeco: CellType | null;
  eraserActive: boolean;
  onSelect: (deco: CellType | null) => void;
  onToggleEraser: () => void;
}

export default function DecorationPalette({ selectedDeco, eraserActive, onSelect, onToggleEraser }: Props) {
  return (
    <div style={styles.container}>
      <div style={styles.title}>Décorations</div>
      <div style={styles.items}>
        {DECORATION_CATALOG.map((item) => {
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
      <div style={styles.divider} />
      <button
        style={{ ...styles.item, ...(eraserActive ? styles.eraserActive : {}) }}
        onClick={onToggleEraser}
        title="Gomme — Supprimer des décorations"
      >
        <span style={styles.eraserIcon}>✕</span>
        <span style={styles.label}>Gomme</span>
      </button>
      <div style={styles.hint}>
        Clic droit = supprimer
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 80,
    left: 16,
    width: 140,
    background: 'rgba(10, 15, 25, 0.85)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: '12px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    zIndex: 10,
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
  items: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    background: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    cursor: 'pointer',
    color: '#CCC',
    fontFamily: 'monospace',
    fontSize: 11,
    transition: 'all 0.15s',
  },
  itemActive: {
    background: 'rgba(74,144,217,0.25)',
    borderColor: 'rgba(74,144,217,0.5)',
    color: '#6AB0F0',
  },
  eraserActive: {
    background: 'rgba(255,65,54,0.2)',
    borderColor: 'rgba(255,65,54,0.4)',
    color: '#FF4136',
  },
  sprite: {
    width: 28,
    height: 28,
    objectFit: 'contain',
    imageRendering: 'pixelated',
  },
  label: {
    flex: 1,
    fontSize: 10,
  },
  size: {
    fontSize: 9,
    color: '#888',
  },
  eraserIcon: {
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    background: 'rgba(255,255,255,0.08)',
    margin: '4px 0',
  },
  hint: {
    color: '#666',
    fontFamily: 'monospace',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 2,
  },
};
