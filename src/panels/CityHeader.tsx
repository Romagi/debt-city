import { useState, useEffect, useRef } from 'react';
import type { Portfolio, WeatherState } from '../types/portfolio';
import HeaderDrawer from './HeaderDrawer';
import MoneyDrawer from './MoneyDrawer';
import WeatherDrawer from './WeatherDrawer';
import DirectoryDrawer from './DirectoryDrawer';
import SwitchCityModal from '../screens/SwitchCityModal';

type DrawerKind = 'money' | 'weather' | 'directory' | null;

interface Props {
  /** Slug of the active session (used as the displayed city name). */
  slug: string;
  portfolio: Portfolio;
  weather: WeatherState;
  /** Triggered when the user clicks a deal in the directory. */
  onFocusDistrict: (projectId: string) => void;
  /** Open the +Deal modal. */
  onAddDeal: () => void;
  /** Open the +Borrower modal. */
  onAddBorrower: () => void;
  /** Switch to another saved city (replaces current GameScreen state). */
  onSwitchCity: (slug: string, portfolio: Portfolio) => void;
  /** Quit to the landing screen. */
  onQuit: () => void;
}

const WEATHER_ICON: Record<WeatherState, string> = {
  sunny: '☀️',
  cloudy: '☁️',
  stormy: '⛈️',
};

/**
 * Top-center HUD bandeau — replaces the old top-right legend, top-right weather/title,
 * the bottom PortfolioOverview bar, and the bottom-left FAB action buttons.
 *
 * Layout: [🏛 City Name ▼]  [☀️]  [💰] [🌤] [🗺]
 *           ↓ menu                  ↓ each opens a drawer below the bandeau
 */
export default function CityHeader({
  slug, portfolio, weather,
  onFocusDistrict, onAddDeal, onAddBorrower, onSwitchCity, onQuit,
}: Props) {
  const [openDrawer, setOpenDrawer] = useState<DrawerKind>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  // Refs to know each button's center X (for drawer arrow alignment)
  const moneyBtnRef    = useRef<HTMLButtonElement>(null);
  const weatherBtnRef  = useRef<HTMLButtonElement>(null);
  const directoryBtnRef = useRef<HTMLButtonElement>(null);
  const headerRef      = useRef<HTMLDivElement>(null);

  // Close any drawer on Escape (the drawer also listens, but we handle the menu here)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (menuOpen) setMenuOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  // Click outside the city menu closes it
  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    const t = setTimeout(() => window.addEventListener('mousedown', onClick), 0);
    return () => {
      window.removeEventListener('mousedown', onClick);
      clearTimeout(t);
    };
  }, [menuOpen]);

  const toggleDrawer = (kind: DrawerKind) => {
    setOpenDrawer(prev => (prev === kind ? null : kind));
  };

  const arrowOffset = (ref: React.RefObject<HTMLButtonElement | null>): number | undefined => {
    const el = ref.current;
    const header = headerRef.current;
    if (!el || !header) return undefined;
    const elRect = el.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    // Offset of the button center from the viewport center (header is centered too)
    return elRect.left + elRect.width / 2 - (headerRect.left + headerRect.width / 2);
  };

  const handleSwitchSelected = (newSlug: string, portfolio: Portfolio) => {
    setShowSwitchModal(false);
    setMenuOpen(false);
    onSwitchCity(newSlug, portfolio);
  };

  return (
    <>
      <div ref={headerRef} style={styles.header}>
        {/* City card with menu */}
        <div style={styles.cityCardWrap}>
          <button style={styles.cityCard} onClick={() => setMenuOpen(o => !o)}>
            <span style={styles.cityIcon}>🏛️</span>
            <span style={styles.cityName}>{slug}</span>
            <span style={styles.chevron}>{menuOpen ? '▴' : '▾'}</span>
          </button>

          {menuOpen && (
            <div style={styles.menu}>
              <button
                style={styles.menuItem}
                onClick={() => { setMenuOpen(false); setShowSwitchModal(true); }}
              >
                <span style={styles.menuIcon}>🔄</span> Changer de ville
              </button>
              <div style={styles.menuDivider} />
              <button
                style={{ ...styles.menuItem, color: '#FF8B7B' }}
                onClick={() => { setMenuOpen(false); onQuit(); }}
              >
                <span style={styles.menuIcon}>🚪</span> Quitter la partie
              </button>
            </div>
          )}
        </div>

        {/* Weather badge */}
        <div style={styles.weatherBadge} title={`Météo: ${weather}`}>
          {WEATHER_ICON[weather]}
        </div>

        {/* Action buttons */}
        <div style={styles.actions}>
          <ActionButton
            ref={moneyBtnRef}
            icon="💰"
            label="Argent"
            active={openDrawer === 'money'}
            onClick={() => toggleDrawer('money')}
          />
          <ActionButton
            ref={weatherBtnRef}
            icon="🌤"
            label="Météo"
            active={openDrawer === 'weather'}
            onClick={() => toggleDrawer('weather')}
          />
          <ActionButton
            ref={directoryBtnRef}
            icon="🗺"
            label="Annuaire"
            active={openDrawer === 'directory'}
            onClick={() => toggleDrawer('directory')}
          />
        </div>
      </div>

      {/* Drawers */}
      {openDrawer === 'money' && (
        <HeaderDrawer
          arrowAtX={arrowOffset(moneyBtnRef)}
          width={360}
          onClose={() => setOpenDrawer(null)}
        >
          <MoneyDrawer portfolio={portfolio} />
        </HeaderDrawer>
      )}
      {openDrawer === 'weather' && (
        <HeaderDrawer
          arrowAtX={arrowOffset(weatherBtnRef)}
          width={360}
          onClose={() => setOpenDrawer(null)}
        >
          <WeatherDrawer portfolio={portfolio} weather={weather} />
        </HeaderDrawer>
      )}
      {openDrawer === 'directory' && (
        <HeaderDrawer
          arrowAtX={arrowOffset(directoryBtnRef)}
          width={420}
          onClose={() => setOpenDrawer(null)}
        >
          <DirectoryDrawer
            portfolio={portfolio}
            onFocusDistrict={onFocusDistrict}
            onAddDeal={onAddDeal}
            onAddBorrower={onAddBorrower}
            onClose={() => setOpenDrawer(null)}
          />
        </HeaderDrawer>
      )}

      {showSwitchModal && (
        <SwitchCityModal
          currentSlug={slug}
          onClose={() => setShowSwitchModal(false)}
          onSwitch={handleSwitchSelected}
        />
      )}
    </>
  );
}

// ─── ActionButton (forwardRef) ───

import { forwardRef } from 'react';

const ActionButton = forwardRef<HTMLButtonElement, {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}>(({ icon, label, active, onClick }, ref) => (
  <button
    ref={ref}
    style={{ ...styles.actionBtn, ...(active ? styles.actionBtnActive : {}) }}
    onClick={onClick}
    title={label}
  >
    <span style={styles.actionIcon}>{icon}</span>
    <span style={styles.actionLabel}>{label}</span>
  </button>
));
ActionButton.displayName = 'ActionButton';

const styles: Record<string, React.CSSProperties> = {
  header: {
    position: 'fixed',
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 12px',
    background: 'rgba(15, 20, 35, 0.85)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
    fontFamily: 'monospace',
    color: '#DDD',
    zIndex: 20,
  },

  cityCardWrap: {
    position: 'relative',
  },
  cityCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 14px',
    background: 'rgba(74,144,217,0.15)',
    border: '1px solid rgba(74,144,217,0.3)',
    borderRadius: 12,
    color: '#6AB0F0',
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    minWidth: 120,
  },
  cityIcon: { fontSize: 14 },
  cityName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 180,
    textAlign: 'left',
  },
  chevron: {
    fontSize: 10,
    opacity: 0.7,
  },

  menu: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: 0,
    minWidth: 200,
    background: 'rgba(15, 20, 35, 0.96)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 6,
    boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
    zIndex: 25,
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '8px 12px',
    background: 'transparent',
    border: 'none',
    borderRadius: 8,
    color: '#CCC',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'left',
  },
  menuIcon: {
    fontSize: 14,
  },
  menuDivider: {
    height: 1,
    background: 'rgba(255,255,255,0.08)',
    margin: '4px 0',
  },

  weatherBadge: {
    fontSize: 22,
    padding: '4px 8px',
    cursor: 'help',
  },

  actions: {
    display: 'flex',
    gap: 6,
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    color: '#CCC',
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  actionBtnActive: {
    background: 'rgba(74,144,217,0.25)',
    borderColor: 'rgba(74,144,217,0.45)',
    color: '#6AB0F0',
  },
  actionIcon: { fontSize: 14 },
  actionLabel: {},
};
