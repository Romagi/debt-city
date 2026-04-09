import type { Portfolio } from '../types/portfolio';
import { formatMoney } from '../city/utils';

interface Props {
  portfolio: Portfolio;
}

export default function PortfolioOverview({ portfolio }: Props) {
  const { termStateCount, totalFunding, projects, borrowers } = portfolio;
  const activeProjects = projects.filter(p => p.currentStatus === 'published').length;
  const drafts = projects.filter(p => p.currentStatus === 'draft').length;

  return (
    <div style={styles.bar}>
      <div style={styles.section}>
        <span style={styles.label}>Portfolio</span>
        <span style={styles.value}>{formatMoney(totalFunding.amount)}</span>
      </div>
      <div style={styles.divider} />
      <div style={styles.section}>
        <span style={styles.label}>Deals</span>
        <span style={styles.value}>{activeProjects} active · {drafts} draft</span>
      </div>
      <div style={styles.divider} />
      <div style={styles.section}>
        <span style={styles.label}>Borrowers</span>
        <span style={styles.value}>{borrowers.length}</span>
      </div>
      <div style={styles.divider} />
      <Indicator label="Breached" count={termStateCount.breached} color="#FF4136" />
      <Indicator label="Late" count={termStateCount.late} color="#FF851B" />
      <Indicator label="Ending" count={termStateCount.ending} color="#FFDC00" />
      <Indicator label="To Check" count={termStateCount.resultToCheck} color="#87CEEB" />
    </div>
  );
}

function Indicator({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={styles.indicator}>
      <span style={{ ...styles.indicatorDot, backgroundColor: count > 0 ? color : '#444' }} />
      <span style={{ ...styles.indicatorCount, color: count > 0 ? color : '#666' }}>{count}</span>
      <span style={styles.indicatorLabel}>{label}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    background: 'rgba(10, 15, 25, 0.9)',
    backdropFilter: 'blur(10px)',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    gap: 16,
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#FFF',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    color: '#666',
    fontSize: 9,
    textTransform: 'uppercase',
  },
  value: {
    fontWeight: 600,
    fontSize: 12,
  },
  divider: {
    width: 1,
    height: 28,
    background: 'rgba(255,255,255,0.1)',
  },
  indicator: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
  },
  indicatorCount: {
    fontWeight: 700,
    fontSize: 14,
  },
  indicatorLabel: {
    color: '#888',
    fontSize: 10,
  },
};
