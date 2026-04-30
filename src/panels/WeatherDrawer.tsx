import { memo, useMemo } from 'react';
import type { Portfolio, WeatherState } from '../types/portfolio';
import { tokens } from '../styles/tokens';

interface Props {
  portfolio: Portfolio;
  weather: WeatherState;
}

const WEATHER_META: Record<WeatherState, { icon: string; label: string; color: string; desc: string }> = {
  sunny:  { icon: '☀️',  label: 'Ensoleillé', color: '#FFD700', desc: 'Tout va bien dans le portfolio.' },
  cloudy: { icon: '☁️',  label: 'Nuageux',     color: '#9AB',    desc: 'Quelques covenants nécessitent ton attention.' },
  stormy: { icon: '⛈️',  label: 'Tempête',     color: '#FF6B6B', desc: 'Plusieurs breaches sans waiver — action urgente.' },
};

/**
 * Drawer "🌤 Météo" — détail de la santé du portfolio (covenants & terms).
 * La météo de la ville est conditionnée par les states de termes (breached, late, …).
 *
 * Wrapped in React.memo + useMemo — see MoneyDrawer for rationale.
 */
function WeatherDrawer({ portfolio, weather }: Props) {
  const { termStateCount, projects } = portfolio;
  const meta = WEATHER_META[weather];

  // Single pass over projects → covenants → terms (avoid 3 nested reduces + 1 filter)
  const stats = useMemo(() => {
    let covenantCount = 0;
    let termCount = 0;
    const redProjects: typeof projects = [];
    for (const p of projects) {
      covenantCount += p.covenants.length;
      let breached = false;
      for (const c of p.covenants) {
        termCount += c.terms.length;
        if (!breached) {
          for (const t of c.terms) {
            if (t.currentStatus === 'breached') { breached = true; break; }
          }
        }
      }
      if (breached) redProjects.push(p);
    }
    return { covenantCount, termCount, redProjects };
  }, [projects]);
  const { covenantCount, termCount, redProjects } = stats;

  return (
    <div>
      <div style={styles.title}>🌤 Météo de la ville</div>

      {/* Headline weather */}
      <div style={{ ...styles.bigCard, borderColor: `${meta.color}55` }}>
        <div style={styles.bigCardLeft}>
          <div style={{ fontSize: 32 }}>{meta.icon}</div>
        </div>
        <div style={styles.bigCardRight}>
          <div style={{ ...styles.weatherLabel, color: meta.color }}>{meta.label}</div>
          <div style={styles.weatherDesc}>{meta.desc}</div>
        </div>
      </div>

      {/* Term states */}
      <div style={styles.sectionTitle}>États des termes ({termCount})</div>
      <div style={styles.indicators}>
        <Indicator label="Breached"  count={termStateCount.breached}      color="#FF4136" hint="terms en violation" />
        <Indicator label="Late"      count={termStateCount.late}          color="#FF851B" hint="échéance dépassée" />
        <Indicator label="Ending"    count={termStateCount.ending}        color="#FFDC00" hint="bientôt à échéance" />
        <Indicator label="To Check"  count={termStateCount.resultToCheck} color="#87CEEB" hint="résultat à valider" />
      </div>

      {/* Covenant context */}
      <div style={styles.sectionTitle}>Couverture covenant</div>
      <div style={styles.coverage}>
        <div style={styles.coverageRow}>
          <span style={styles.coverageLabel}>Covenants suivis</span>
          <span style={styles.coverageValue}>{covenantCount}</span>
        </div>
        <div style={styles.coverageRow}>
          <span style={styles.coverageLabel}>Termes actifs</span>
          <span style={styles.coverageValue}>{termCount}</span>
        </div>
        <div style={styles.coverageRow}>
          <span style={styles.coverageLabel}>Deals en alerte</span>
          <span style={{ ...styles.coverageValue, color: redProjects.length > 0 ? '#FF4136' : '#5CB85C' }}>
            {redProjects.length}
          </span>
        </div>
      </div>

      {redProjects.length > 0 && (
        <>
          <div style={styles.sectionTitle}>Deals en alerte</div>
          <div style={styles.alertList}>
            {redProjects.slice(0, 5).map(p => (
              <div key={p.id} style={styles.alertRow}>
                <span style={styles.alertDot} />
                <span style={styles.alertName}>{p.title}</span>
              </div>
            ))}
            {redProjects.length > 5 && (
              <div style={styles.alertMore}>+{redProjects.length - 5} autres</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default memo(WeatherDrawer);

function Indicator({ label, count, color, hint }: { label: string; count: number; color: string; hint: string }) {
  const active = count > 0;
  return (
    <div style={{
      ...styles.indicator,
      borderColor: active ? `${color}55` : 'rgba(255,255,255,0.06)',
      background: active ? `${color}10` : 'rgba(255,255,255,0.03)',
    }}>
      <div style={{ ...styles.indicatorCount, color: active ? color : '#666' }}>{count}</div>
      <div style={styles.indicatorLabel}>{label}</div>
      <div style={styles.indicatorHint}>{hint}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  title: {
    fontSize: tokens.font.size.md,
    fontWeight: tokens.font.weight.bold,
    color: tokens.color.primary,
    letterSpacing: tokens.font.tracking.wide,
    marginBottom: 14,
  },
  bigCard: {
    display: 'flex',
    gap: 14,
    alignItems: 'center',
    background: tokens.color.surfaceLo,
    border: `1px solid ${tokens.color.border}`,
    borderRadius: tokens.radius.lg,
    padding: '14px 18px',
    marginBottom: 14,
  },
  bigCardLeft: { flexShrink: 0 },
  bigCardRight: { flex: 1 },
  weatherLabel: {
    fontSize: tokens.font.size.lg,
    fontWeight: tokens.font.weight.bold,
  },
  weatherDesc: {
    fontSize: tokens.font.size.xs,
    color: tokens.color.textDim,
    marginTop: 2,
    lineHeight: 1.4,
  },
  sectionTitle: {
    fontSize: tokens.font.size.xxs,
    fontWeight: tokens.font.weight.bold,
    color: tokens.color.textDim,
    textTransform: 'uppercase',
    letterSpacing: tokens.font.tracking.wide,
    marginBottom: 6,
    marginTop: 4,
  },
  indicators: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    marginBottom: 14,
  },
  indicator: {
    border: '1px solid',
    borderRadius: tokens.radius.md,
    padding: '12px 14px',
  },
  indicatorCount: {
    fontSize: tokens.font.size.xxl,
    fontWeight: tokens.font.weight.bold,
    fontVariantNumeric: 'tabular-nums',
  },
  indicatorLabel: {
    fontSize: tokens.font.size.xs,
    color: tokens.color.text,
    fontWeight: tokens.font.weight.bold,
  },
  indicatorHint: {
    fontSize: tokens.font.size.xxs,
    color: tokens.color.textDim,
    marginTop: 2,
  },
  coverage: {
    background: tokens.color.surfaceLo,
    border: `1px solid ${tokens.color.border}`,
    borderRadius: tokens.radius.md,
    padding: '10px 14px',
    marginBottom: 14,
  },
  coverageRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    fontSize: tokens.font.size.xs,
  },
  coverageLabel: { color: tokens.color.textDim },
  coverageValue: {
    color: tokens.color.text,
    fontWeight: tokens.font.weight.bold,
    fontVariantNumeric: 'tabular-nums',
  },
  alertList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  alertRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    background: tokens.color.dangerBg,
    border: `1px solid ${tokens.color.dangerBd}`,
    borderRadius: tokens.radius.sm,
    fontSize: tokens.font.size.xs,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: tokens.color.danger,
    flexShrink: 0,
  },
  alertName: {
    color: tokens.color.text,
    fontWeight: tokens.font.weight.semibold,
  },
  alertMore: {
    fontSize: tokens.font.size.xxs,
    color: tokens.color.textDim,
    textAlign: 'center',
    padding: '4px 0',
  },
};
