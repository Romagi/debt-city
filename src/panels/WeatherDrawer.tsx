import type { Portfolio, WeatherState } from '../types/portfolio';

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
 */
export default function WeatherDrawer({ portfolio, weather }: Props) {
  const { termStateCount, projects } = portfolio;
  const meta = WEATHER_META[weather];

  // Compte les covenants et terms totaux pour le contexte
  const covenantCount = projects.reduce((s, p) => s + p.covenants.length, 0);
  const termCount = projects.reduce(
    (s, p) => s + p.covenants.reduce((sc, c) => sc + c.terms.length, 0),
    0,
  );

  // Projets par traffic-light dérivé (rouge = au moins 1 term breached)
  const redProjects = projects.filter(p =>
    p.covenants.some(c => c.terms.some(t => t.currentStatus === 'breached')),
  );

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
    fontSize: 13,
    fontWeight: 700,
    color: '#6AB0F0',
    letterSpacing: 1,
    marginBottom: 14,
  },
  bigCard: {
    display: 'flex',
    gap: 14,
    alignItems: 'center',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: '14px 16px',
    marginBottom: 14,
  },
  bigCardLeft: { flexShrink: 0 },
  bigCardRight: { flex: 1 },
  weatherLabel: {
    fontSize: 16,
    fontWeight: 800,
  },
  weatherDesc: {
    fontSize: 11,
    color: '#889',
    marginTop: 2,
    lineHeight: 1.4,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: '#778',
    textTransform: 'uppercase',
    letterSpacing: 1,
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
    borderRadius: 10,
    padding: '10px 12px',
  },
  indicatorCount: {
    fontSize: 22,
    fontWeight: 800,
  },
  indicatorLabel: {
    fontSize: 11,
    color: '#CCC',
    fontWeight: 700,
  },
  indicatorHint: {
    fontSize: 9,
    color: '#778',
    marginTop: 2,
  },
  coverage: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    padding: '8px 12px',
    marginBottom: 14,
  },
  coverageRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    fontSize: 11,
  },
  coverageLabel: { color: '#889' },
  coverageValue: {
    color: '#DDD',
    fontWeight: 700,
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
    padding: '6px 10px',
    background: 'rgba(255, 65, 54, 0.08)',
    border: '1px solid rgba(255, 65, 54, 0.25)',
    borderRadius: 8,
    fontSize: 11,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#FF4136',
    flexShrink: 0,
  },
  alertName: {
    color: '#DDD',
    fontWeight: 600,
  },
  alertMore: {
    fontSize: 10,
    color: '#778',
    textAlign: 'center',
    padding: '4px 0',
  },
};
