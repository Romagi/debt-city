import { memo, useState, useMemo, useEffect, useRef, forwardRef, type CSSProperties, type ReactNode } from 'react';
import type { Portfolio, WeatherState } from '../types/portfolio';
import { tokens, tabularNums } from '../styles/tokens';
import { formatMoney } from '../city/utils';
import HeaderDrawer from './HeaderDrawer';
import MoneyDrawer from './MoneyDrawer';

// ─── Types ───────────────────────────────────────────────────────────────

interface Props {
  slug: string;
  portfolio: Portfolio;
  weather: WeatherState;
  /** Open the SwitchCityModal. */
  onSwitchCity: () => void;
  /** Quit to the landing screen. */
  onQuit: () => void;
  /** Reset onboarding and re-trigger it. */
  onReplayOnboarding: () => void;
  /** "Mayor's report" button — for now reuses the finance drawer. */
  onOpenMayorReport?: () => void;
  /** Optional: shown as a tiny pill on the right (autosave indicator). */
  saveStatus?: 'idle' | 'saving' | 'saved';
}

const WEATHER_ICON: Record<WeatherState, string> = {
  sunny: '☀️',
  cloudy: '☁️',
  stormy: '⛈️',
};

const WEATHER_LABEL: Record<WeatherState, string> = {
  sunny: 'Beau temps',
  cloudy: 'Couvert',
  stormy: 'Orageux',
};

// ─── Component ───────────────────────────────────────────────────────────

/**
 * Top bar — 80px, full width, replaces the old floating CityHeader pill.
 *
 * Layout:  [DC▪ slug]   [KPI×3]   [☀] [↻] [⚙] [Rapport Maire]
 *
 * The ⚙ menu is the consolidation hub for global session actions:
 *   • Changer de ville → SwitchCityModal
 *   • Rappelle-moi le tour → resetOnboarding + replay
 *   • Quitter la partie  → back to landing
 */
function Topbar({
  slug, portfolio, weather,
  onSwitchCity, onQuit, onReplayOnboarding, onOpenMayorReport,
  saveStatus,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moneyOpen, setMoneyOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const moneyBtnRef = useRef<HTMLButtonElement>(null);

  // Close menu on Escape / click outside
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    const onClick = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const t = setTimeout(() => window.addEventListener('mousedown', onClick), 0);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
      clearTimeout(t);
    };
  }, [menuOpen]);

  // ─── KPIs ──────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const cityValue = portfolio.totalFunding.amount;
    const debtExposed = portfolio.projects
      .filter(p => p.currentStatus === 'published')
      .reduce((sum, p) => sum + p.globalFundingAmount.amount, 0);
    const citizens = portfolio.borrowers.length;
    return { cityValue, debtExposed, citizens };
  }, [portfolio]);

  // Mayor report: if no handler given, default to opening the money drawer
  const handleMayorReport = onOpenMayorReport ?? (() => setMoneyOpen(true));

  // Drawer arrow alignment
  const moneyArrowOffset = (): number | undefined => {
    if (!moneyBtnRef.current || !headerRef.current) return undefined;
    const a = moneyBtnRef.current.getBoundingClientRect();
    const b = headerRef.current.getBoundingClientRect();
    return a.left + a.width / 2 - (b.left + b.width / 2);
  };

  return (
    <>
      <div ref={headerRef} style={styles.bar}>
        {/* ─── LEFT — Brand + session ─────────────────────────────────── */}
        <div style={styles.left}>
          <div style={styles.miniLogo}>
            <span style={styles.miniLogoGlyph}>DC</span>
            <span style={styles.miniLogoDot} />
          </div>
          <div style={styles.sessionBlock}>
            <div style={styles.sessionName}>{slug}</div>
            <div style={styles.sessionLabel}>PARTIE EN COURS</div>
          </div>
        </div>

        {/* ─── CENTER — KPIs ──────────────────────────────────────────── */}
        <div style={styles.center}>
          <Kpi label="VALEUR DE LA VILLE" value={formatMoney(kpis.cityValue)} />
          <Kpi
            label="DETTE EXPOSÉE"
            value={formatMoney(kpis.debtExposed)}
            valueColor={tokens.color.debt}
          />
          <Kpi
            label="CITOYENS"
            value={kpis.citizens.toString()}
            suffix={kpis.citizens > 1 ? 'borrowers' : 'borrower'}
          />
        </div>

        {/* ─── RIGHT — Weather + actions ──────────────────────────────── */}
        <div style={styles.right}>
          {saveStatus && saveStatus !== 'idle' && (
            <div style={styles.savePill}>
              {saveStatus === 'saving' ? '⏳' : '💾'}
              <span style={styles.savePillLabel}>
                {saveStatus === 'saving' ? 'Sauvegarde…' : 'Sauvegardé'}
              </span>
            </div>
          )}

          <div style={styles.weatherBadge} title={WEATHER_LABEL[weather]}>
            <span style={{ fontSize: 20 }}>{WEATHER_ICON[weather]}</span>
          </div>

          <IconBtn
            ref={moneyBtnRef}
            label="Détails financiers"
            onClick={() => setMoneyOpen(o => !o)}
            active={moneyOpen}
          >
            ↻
          </IconBtn>

          <IconBtn
            label="Réglages"
            onClick={() => setMenuOpen(o => !o)}
            active={menuOpen}
          >
            ⚙
          </IconBtn>

          <button style={styles.mayorBtn} onClick={handleMayorReport}>
            <span style={styles.mayorBtnIcon}>📊</span>
            <span>Rapport du Maire</span>
          </button>

          {/* Settings dropdown */}
          {menuOpen && (
            <div style={styles.menu}>
              <MenuItem
                icon="🔄"
                label="Changer de ville"
                onClick={() => { setMenuOpen(false); onSwitchCity(); }}
              />
              <MenuItem
                icon="🎓"
                label="Rappelle-moi le tour"
                onClick={() => { setMenuOpen(false); onReplayOnboarding(); }}
              />
              <div style={styles.menuDivider} />
              <MenuItem
                icon="🚪"
                label="Quitter la partie"
                onClick={() => { setMenuOpen(false); onQuit(); }}
                danger
              />
            </div>
          )}
        </div>
      </div>

      {/* Money drawer (kept as the existing reusable component) */}
      {moneyOpen && (
        <HeaderDrawer
          arrowAtX={moneyArrowOffset()}
          width={380}
          onClose={() => setMoneyOpen(false)}
        >
          <MoneyDrawer portfolio={portfolio} />
        </HeaderDrawer>
      )}
    </>
  );
}

export default memo(Topbar);

// ─── Sub-components ──────────────────────────────────────────────────────

interface KpiProps {
  label: string;
  value: string;
  valueColor?: string;
  suffix?: string;
}

function Kpi({ label, value, valueColor, suffix }: KpiProps) {
  return (
    <div style={styles.kpi}>
      <div style={styles.kpiLabel}>{label}</div>
      <div style={{
        ...styles.kpiValue,
        color: valueColor ?? tokens.color.text,
      }}>
        {value}
      </div>
      {suffix && <div style={styles.kpiSuffix}>{suffix}</div>}
    </div>
  );
}

interface IconBtnProps {
  children: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}

const IconBtn = forwardRef<HTMLButtonElement, IconBtnProps>(
  ({ children, label, onClick, active }, ref) => (
    <button
      ref={ref}
      style={{ ...styles.iconBtn, ...(active ? styles.iconBtnActive : {}) }}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  ),
);
IconBtn.displayName = 'IconBtn';

interface MenuItemProps {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

function MenuItem({ icon, label, onClick, danger }: MenuItemProps) {
  return (
    <button
      style={{
        ...styles.menuItem,
        ...(danger ? { color: tokens.color.debt } : {}),
      }}
      onClick={onClick}
    >
      <span style={styles.menuItemIcon}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  bar: {
    height: 80,
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
    gap: 24,
    background: tokens.color.surface,
    borderBottom: `1px solid ${tokens.color.hairline}`,
    fontFamily: tokens.font.ui,
    color: tokens.color.text,
    position: 'relative',
    zIndex: tokens.z.hud,
  },

  // Left
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    minWidth: 240,
  },
  miniLogo: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 12,
    background: tokens.color.citizen,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  miniLogoGlyph: {
    fontFamily: tokens.font.display,
    fontWeight: 800,
    fontSize: 22,
    color: tokens.color.bg,
    letterSpacing: '-0.02em',
  },
  miniLogoDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: tokens.color.debt,
    boxShadow: `0 0 0 3px ${tokens.color.surface}`,
  },
  sessionBlock: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  sessionName: {
    fontFamily: tokens.font.display,
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: '-0.01em',
    color: tokens.color.text,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 200,
  },
  sessionLabel: {
    fontFamily: tokens.font.mono,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.18em',
    color: tokens.color.textDim,
    marginTop: 1,
  },

  // Center
  center: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  kpi: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    minWidth: 140,
  },
  kpiLabel: {
    fontFamily: tokens.font.mono,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.18em',
    color: tokens.color.textDim,
    marginBottom: 3,
  },
  kpiValue: {
    fontFamily: tokens.font.display,
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: '-0.01em',
    lineHeight: 1.05,
    ...tabularNums,
  },
  kpiSuffix: {
    fontFamily: tokens.font.mono,
    fontSize: 10,
    fontWeight: 500,
    color: tokens.color.textDim,
    marginTop: 2,
  },

  // Right
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 280,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  savePill: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    background: tokens.color.surfaceLo,
    border: `1px solid ${tokens.color.hairline}`,
    borderRadius: tokens.radius.pill,
    fontFamily: tokens.font.mono,
    fontSize: 10,
    fontWeight: 700,
    color: tokens.color.textDim,
  },
  savePillLabel: {
    letterSpacing: '0.05em',
  },
  weatherBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    cursor: 'help',
  },
  iconBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    background: tokens.color.surfaceLo,
    border: `1px solid ${tokens.color.hairline}`,
    borderRadius: tokens.radius.md,
    color: tokens.color.textMid,
    fontFamily: tokens.font.ui,
    fontSize: 16,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  iconBtnActive: {
    background: tokens.color.citizenBg,
    borderColor: tokens.color.citizenBd,
    color: tokens.color.citizen,
  },
  mayorBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 18px',
    background: tokens.color.citizen,
    border: 'none',
    borderRadius: tokens.radius.pill,
    color: tokens.color.bg,
    fontFamily: tokens.font.ui,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.01em',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(255, 192, 58, 0.28)',
    transition: 'transform 0.12s, box-shadow 0.12s',
  },
  mayorBtnIcon: {
    fontSize: 14,
  },

  // Menu (dropdown)
  menu: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    minWidth: 240,
    background: tokens.color.surfaceHi,
    border: `1px solid ${tokens.color.hairline2}`,
    borderRadius: tokens.radius.lg,
    padding: 6,
    boxShadow: tokens.shadow.xl,
    zIndex: tokens.z.drawer,
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '10px 14px',
    background: 'transparent',
    border: 'none',
    borderRadius: tokens.radius.md,
    color: tokens.color.textMid,
    fontFamily: tokens.font.ui,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.12s',
  },
  menuItemIcon: {
    fontSize: 14,
  },
  menuDivider: {
    height: 1,
    background: tokens.color.hairline,
    margin: '4px 0',
  },
};
