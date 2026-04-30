import { useEffect, useRef } from 'react';
import { tokens } from '../styles/tokens';

interface Props {
  /** Approximate left X (in px) of the trigger button — used to position the arrow */
  arrowAtX?: number;
  /** Width hint for the drawer. Default 360. */
  width?: number;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Drawer panel that slides down from the CityHeader.
 * Closes on Escape key and click outside.
 *
 * Positioning: anchored top-center of the viewport, just below the header.
 * The CityHeader sits at top: 16px and is ~56px tall, so the drawer starts at top: 84px.
 */
export default function HeaderDrawer({ arrowAtX, width = 360, onClose, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    // Defer click handler to next tick so the click that opened us doesn't immediately close
    const t = setTimeout(() => window.addEventListener('mousedown', onClick), 0);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
      clearTimeout(t);
    };
  }, [onClose]);

  // Arrow positioning: relative to the drawer's left edge.
  // arrowAtX is the trigger's center in viewport px → translate to drawer-local.
  const arrowStyle: React.CSSProperties | null = arrowAtX != null
    ? {
        position: 'absolute',
        top: -7,
        left: '50%',
        transform: `translateX(calc(-50% + ${arrowAtX}px))`,
        width: 14,
        height: 14,
        background: tokens.color.surface,
        borderTop: `1px solid ${tokens.color.border}`,
        borderLeft: `1px solid ${tokens.color.border}`,
        rotate: '45deg',
      }
    : null;

  return (
    <div ref={ref} style={{ ...styles.drawer, width }} className="header-drawer-anim">
      {arrowStyle && <div style={arrowStyle} />}
      {children}
      <style>{animationCss}</style>
    </div>
  );
}

const animationCss = `
@keyframes drawerSlideDown {
  from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}
.header-drawer-anim {
  animation: drawerSlideDown 180ms ease-out;
}
`;

const styles: Record<string, React.CSSProperties> = {
  drawer: {
    position: 'fixed',
    top: 84,
    left: '50%',
    transform: 'translateX(-50%)',
    background: tokens.color.surface,
    backdropFilter: tokens.blur.strong,
    border: `1px solid ${tokens.color.border}`,
    borderRadius: tokens.radius.xl,
    padding: 20,
    color: tokens.color.text,
    fontFamily: tokens.font.family,
    fontSize: tokens.font.size.sm,
    boxShadow: tokens.shadow.xl,
    zIndex: tokens.z.drawer,
    maxHeight: 'calc(100vh - 120px)',
    overflowY: 'auto',
  },
};
