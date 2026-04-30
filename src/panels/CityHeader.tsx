import { memo, useState, useEffect, useRef, useCallback } from 'react';
import type { Portfolio, WeatherState } from '../types/portfolio';
import HeaderDrawer from './HeaderDrawer';
import MoneyDrawer from './MoneyDrawer';
import WeatherDrawer from './WeatherDrawer';
import DirectoryDrawer from './DirectoryDrawer';
import SwitchCityModal from '../screens/SwitchCityModal';
import { tokens } from '../styles/tokens';

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
 *
 * Wrapped in React.memo (see bottom of file): when GameScreen re-renders due to
 * activeTarget / modal / placementMode / focusRequest changes, this component
 * skips re-rendering as long as its own props (slug, portfolio, weather, callbacks)
 * are stable. The callbacks are useCallback'd in App.tsx for that reason.
 */
function CityHeader({
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

  // ─── Stable handlers (useCallback) ─────────────────────────────────────────
  // Drawer children are wrapped in React.memo, so passing inline lambdas would
  // bypass the memo and force re-renders on every CityHeader render. Stabilising
  // these handlers keeps the memo effective.

  const closeDrawer     = useCallback(() => setOpenDrawer(null), []);
  const toggleMenu      = useCallback(() => setMenuOpen(o => !o), []);
  const openSwitchCity  = useCallback(() => { setMenuOpen(false); setShowSwitchModal(true); }, []);
  const closeSwitchCity = useCallback(() => setShowSwitchModal(false), []);
  const onQuitClick     = useCallback(() => { setMenuOpen(false); onQuit(); }, [onQuit]);

  const onMoneyClick     = useCallback(() => setOpenDrawer(prev => prev === 'money'     ? null : 'money'),     []);
  const onWeatherClick   = useCallback(() => setOpenDrawer(prev => prev === 'weather'   ? null : 'weather'),   []);
  const onDirectoryClick = useCallback(() => setOpenDrawer(prev => prev === 'directory' ? null : 'directory'), []);

  const handleSwitchSelected = useCallback((newSlug: string, p: Portfolio) => {
    setShowSwitchModal(false);
    setMenuOpen(false);
    onSwitchCity(newSlug, p);
  }, [onSwitchCity]);

  // arrowOffset reads layout — runs during render, no need to memoise.
  const arrowOffset = (ref: React.RefObject<HTMLButtonElement | null>): number | undefined => {
    const el = ref.current;
    const header = headerRef.current;
    if (!el || !header) return undefined;
    const elRect = el.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    return elRect.left + elRect.width / 2 - (headerRect.left + headerRect.width / 2);
  };

  return (
    <>
      <div ref={headerRef} style={styles.header}>
        {/* City card with menu */}
        <div style={styles.cityCardWrap}>
          <button style={styles.cityCard} onClick={toggleMenu}>
            <span style={styles.cityIcon}>🏛️</span>
            <span style={styles.cityName}>{slug}</span>
            <span style={styles.chevron}>{menuOpen ? '▴' : '▾'}</span>
          </button>

          {menuOpen && (
            <div style={styles.menu}>
              <button style={styles.menuItem} onClick={openSwitchCity}>
                <span style={styles.menuIcon}>🔄</span> Changer de ville
              </button>
              <div style={styles.menuDivider} />
              <button
                style={{ ...styles.menuItem, color: '#FF8B7B' }}
                onClick={onQuitClick}
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
            onClick={onMoneyClick}
          />
          <ActionButton
            ref={weatherBtnRef}
            icon="🌤"
            label="Météo"
            active={openDrawer === 'weather'}
            onClick={onWeatherClick}
          />
          <ActionButton
            ref={directoryBtnRef}
            icon="🗺"
            label="Annuaire"
            active={openDrawer === 'directory'}
            onClick={onDirectoryClick}
          />
        </div>
      </div>

      {/* Drawers */}
      {openDrawer === 'money' && (
        <HeaderDrawer
          arrowAtX={arrowOffset(moneyBtnRef)}
          width={360}
          onClose={closeDrawer}
        >
          <MoneyDrawer portfolio={portfolio} />
        </HeaderDrawer>
      )}
      {openDrawer === 'weather' && (
        <HeaderDrawer
          arrowAtX={arrowOffset(weatherBtnRef)}
          width={360}
          onClose={closeDrawer}
        >
          <WeatherDrawer portfolio={portfolio} weather={weather} />
        </HeaderDrawer>
      )}
      {openDrawer === 'directory' && (
        <HeaderDrawer
          arrowAtX={arrowOffset(directoryBtnRef)}
          width={420}
          onClose={closeDrawer}
        >
          <DirectoryDrawer
            portfolio={portfolio}
            onFocusDistrict={onFocusDistrict}
            onAddDeal={onAddDeal}
            onAddBorrower={onAddBorrower}
            onClose={closeDrawer}
          />
        </HeaderDrawer>
      )}

      {showSwitchModal && (
        <SwitchCityModal
          currentSlug={slug}
          onClose={closeSwitchCity}
          onSwitch={handleSwitchSelected}
        />
      )}
    </>
  );
}

export default memo(CityHeader);

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
    background: tokens.color.surface,
    backdropFilter: tokens.blur.strong,
    border: `1px solid ${tokens.color.border}`,
    borderRadius: tokens.radius.xl,
    boxShadow: tokens.shadow.lg,
    fontFamily: tokens.font.family,
    color: tokens.color.text,
    zIndex: tokens.z.hud,
  },

  cityCardWrap: {
    position: 'relative',
  },
  cityCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    background: tokens.color.primaryBg,
    border: `1px solid ${tokens.color.primaryBd}`,
    borderRadius: tokens.radius.pill,
    color: tokens.color.primary,
    fontFamily: tokens.font.family,
    fontSize: tokens.font.size.md,
    fontWeight: tokens.font.weight.bold,
    cursor: 'pointer',
    minWidth: 120,
    transition: 'all 0.15s',
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
    top: 'calc(100% + 10px)',
    left: 0,
    minWidth: 220,
    background: tokens.color.surfaceHi,
    border: `1px solid ${tokens.color.border}`,
    borderRadius: tokens.radius.lg,
    padding: 6,
    boxShadow: tokens.shadow.xl,
    zIndex: tokens.z.drawer,
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '10px 14px',
    background: 'transparent',
    border: 'none',
    borderRadius: tokens.radius.md,
    color: tokens.color.textMid,
    fontFamily: tokens.font.family,
    fontSize: tokens.font.size.sm,
    fontWeight: tokens.font.weight.semibold,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.12s',
  },
  menuIcon: {
    fontSize: 16,
  },
  menuDivider: {
    height: 1,
    background: tokens.color.border,
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
    padding: '8px 14px',
    background: tokens.color.surfaceLo,
    border: `1px solid ${tokens.color.border}`,
    borderRadius: tokens.radius.pill,
    color: tokens.color.textMid,
    fontFamily: tokens.font.family,
    fontSize: tokens.font.size.xs,
    fontWeight: tokens.font.weight.bold,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  actionBtnActive: {
    background: tokens.color.primaryBg,
    borderColor: tokens.color.primaryBd,
    color: tokens.color.primary,
  },
  actionIcon: { fontSize: 14 },
  actionLabel: {},
};
