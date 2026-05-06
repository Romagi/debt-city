import { memo, type CSSProperties } from 'react';
import { tokens } from '../styles/tokens';

interface Props {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onCenter?: () => void;
}

/**
 * Zoom-bar — vertical pill on the right side of the canvas, near the bottom.
 *
 * Three icons : zoom in / zoom out / re-center. Handlers are pass-through
 * (CityCanvas owns the camera state today; we'll wire them up if/when needed).
 * Without handlers the buttons stay clickable but no-op — placeholder UI.
 */
function Zoombar({ onZoomIn, onZoomOut, onCenter }: Props) {
  return (
    <div style={styles.bar}>
      <button
        style={styles.btn}
        onClick={onZoomIn}
        disabled={!onZoomIn}
        title="Zoomer"
        aria-label="Zoomer"
      >
        +
      </button>
      <div style={styles.divider} />
      <button
        style={styles.btn}
        onClick={onZoomOut}
        disabled={!onZoomOut}
        title="Dézoomer"
        aria-label="Dézoomer"
      >
        −
      </button>
      <div style={styles.divider} />
      <button
        style={styles.btn}
        onClick={onCenter}
        disabled={!onCenter}
        title="Recentrer"
        aria-label="Recentrer"
      >
        ⌂
      </button>
    </div>
  );
}

export default memo(Zoombar);

// ─── Styles ──────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  bar: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 6,
    background: tokens.color.surfaceHi,
    border: `1px solid ${tokens.color.hairline2}`,
    borderRadius: tokens.radius.pill,
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
    zIndex: tokens.z.hud,
  },
  btn: {
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: tokens.color.text,
    fontFamily: tokens.font.ui,
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
    borderRadius: tokens.radius.pill,
    transition: 'background 0.15s',
  },
  divider: {
    width: 22,
    height: 1,
    background: tokens.color.hairline,
    margin: '2px 0',
  },
};
